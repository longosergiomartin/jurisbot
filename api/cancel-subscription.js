import { getAuthUser, supabaseAdmin } from './_supabase.js'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const authUser = await getAuthUser(req)
  if (!authUser) return res.status(401).json({ error: 'No autenticado.' })

  try {
    // Get active subscription from DB
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('mp_preapproval_id, status, current_period_end')
      .eq('user_id', authUser.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !sub) {
      return res.status(404).json({ error: 'No se encontró suscripción activa.' })
    }

    if (sub.status === 'cancelled') {
      return res.status(400).json({ error: 'La suscripción ya fue cancelada.' })
    }

    // GET from MP to get the real next_payment_date
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const preapproval = await mpRes.json()

    if (!mpRes.ok) {
      console.error('MP GET preapproval error:', preapproval)
      return res.status(502).json({ error: 'Error al consultar estado de suscripción.' })
    }

    const currentPeriodEnd = preapproval.next_payment_date || sub.current_period_end || null

    // PUT to MP to cancel
    const cancelRes = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const cancelData = await cancelRes.json()

    if (!cancelRes.ok) {
      console.error('MP cancel error:', cancelData)
      return res.status(502).json({ error: 'No se pudo cancelar la suscripción en MercadoPago.' })
    }

    const now = new Date().toISOString()

    // Update subscriptions table — keep current_period_end (grace period), don't touch profiles.plan
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        current_period_end: currentPeriodEnd,
        cancelled_at: now,
        updated_at: now,
      })
      .eq('mp_preapproval_id', sub.mp_preapproval_id)

    return res.status(200).json({ ok: true, periodEnd: currentPeriodEnd })
  } catch (err) {
    console.error('Cancel subscription error:', err)
    return res.status(500).json({ error: 'Error interno al cancelar la suscripción.' })
  }
}
