import { supabaseAdmin } from '../_supabase.js'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, data } = req.body

  if (type === 'test') return res.status(200).json({ ok: true })

  if (type === 'subscription_preapproval') {
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      })
      const preapproval = await mpRes.json()

      const userId = preapproval.external_reference
      const isActive = preapproval.status === 'authorized'

      if (!userId) return res.status(400).json({ error: 'No external_reference' })

      await supabaseAdmin
        .from('profiles')
        .update({ plan: isActive ? 'pro' : 'free' })
        .eq('id', userId)

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          mp_preapproval_id: preapproval.id,
          status: preapproval.status,
          plan: 'pro',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'mp_preapproval_id' })

      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('Webhook error:', err)
      return res.status(500).json({ error: 'Internal error' })
    }
  }

  res.status(200).json({ ok: true })
}
