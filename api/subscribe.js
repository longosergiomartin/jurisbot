import { getAuthUser, supabaseAdmin } from './_supabase.js'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const MP_PLAN_PRICE = Number(process.env.MP_PLAN_PRICE) || 12000
const APP_URL = process.env.APP_URL || 'https://jurisbot-nine.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const authUser = await getAuthUser(req)
  if (!authUser) return res.status(401).json({ error: 'No autenticado.' })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('plan').eq('id', authUser.id).single()

  if (profile?.plan === 'pro') {
    return res.status(400).json({ error: 'Ya tenés el plan Pro activo.' })
  }

  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Pagos no configurados en este entorno.' })
  }

  try {
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        reason: 'Cognify Pro — Acceso ilimitado',
        payer_email: authUser.email,
        external_reference: authUser.id,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: MP_PLAN_PRICE,
          currency_id: 'ARS',
        },
        back_url: `${APP_URL}?upgraded=true`,
        status: 'pending',
      }),
    })

    const data = await mpRes.json()

    if (!mpRes.ok) {
      console.error('MP error:', data)
      return res.status(500).json({ error: 'No se pudo iniciar el pago. Intentá de nuevo.' })
    }

    res.json({ checkoutUrl: data.init_point })
  } catch (err) {
    console.error('Subscribe error:', err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}
