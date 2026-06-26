import { supabaseAdmin } from '../_supabase.js'
import crypto from 'crypto'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = req.body || {}

  // Verify MP signature
  if (MP_WEBHOOK_SECRET) {
    const xSignature = req.headers['x-signature'] || ''
    const xRequestId = req.headers['x-request-id'] || ''
    const dataId = body?.data?.id?.toString() || ''
    const tsMatch = xSignature.match(/ts=(\d+)/)
    const v1Match = xSignature.match(/v1=([a-f0-9]+)/)

    if (!tsMatch || !v1Match) {
      console.error('MP webhook: missing signature headers')
      return res.status(401).json({ error: 'Missing signature' })
    }

    const ts = tsMatch[1]
    const v1 = v1Match[1]
    const template = `id:${dataId};request-id:${xRequestId};ts:${ts}`
    const hash = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(template).digest('hex')

    if (hash !== v1) {
      console.error('MP webhook: invalid signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  const { type, data } = body

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
