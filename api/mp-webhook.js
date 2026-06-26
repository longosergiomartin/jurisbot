import { supabaseAdmin } from './_supabase.js'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Acknowledge immediately — MP retries if we don't respond within 5s
  res.status(200).end()

  const { type, data } = req.body || {}
  if (type !== 'subscription_preapproval' || !data?.id) return

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const subscription = await mpRes.json()

    if (!mpRes.ok) {
      console.error('MP fetch subscription error:', subscription)
      return
    }

    const userId = subscription.external_reference
    if (!userId) return

    // Upsert subscription record
    await supabaseAdmin.from('subscriptions').upsert({
      user_id: userId,
      mp_preapproval_id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.next_payment_date || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'mp_preapproval_id' })

    // Sync plan on profile
    const isPro = subscription.status === 'authorized'
    await supabaseAdmin
      .from('profiles')
      .update({ plan: isPro ? 'pro' : 'free', updated_at: new Date().toISOString() })
      .eq('id', userId)

  } catch (err) {
    console.error('Webhook processing error:', err)
  }
}
