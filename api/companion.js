import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser, supabaseAdmin } from './_supabase.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FREE_DAILY_COMPANION = 20

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { deckTitle, cards, messages } = req.body

  // Plan limit check (authenticated users only)
  const authUser = await getAuthUser(req)
  if (authUser) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, companion_daily_count, companion_reset_date')
      .eq('id', authUser.id)
      .single()

    if (profile && profile.plan === 'free') {
      const today = new Date().toISOString().slice(0, 10)
      const isSameDay = profile.companion_reset_date === today
      const count = isSameDay ? (profile.companion_daily_count || 0) : 0

      if (count >= FREE_DAILY_COMPANION) {
        return res.status(403).json({
          error: `Límite de ${FREE_DAILY_COMPANION} mensajes diarios con Kuma alcanzado.`,
          code: 'KUMA_DAILY_LIMIT',
          limit: FREE_DAILY_COMPANION,
        })
      }

      // Increment counter
      await supabaseAdmin
        .from('profiles')
        .update({
          companion_daily_count: count + 1,
          companion_reset_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id)
    }
  }

  const cardContext = (cards || [])
    .slice(0, 50)
    .map((c, i) => `${i + 1}. P: ${c.front || c.question || ''}\n   R: ${c.back || c.explanation || ''}`)
    .join('\n\n')

  const systemPrompt = `Sos Kuma, una shiba inu simpática y apasionada por aprender. Estudiaste el material "${deckTitle}" junto al usuario y podés hablar sobre él con confianza.

MATERIAL QUE ESTUDIAMOS JUNTOS:
${cardContext}

TU FORMA DE SER:
- Sos una compañera de estudio, no una profesora. Hablás de igual a igual.
- Explicás con ejemplos concretos y analogías simples cuando algo es complejo.
- Hacés preguntas abiertas para explorar juntos: "¿Y vos cómo lo entendiste?", "Interesante, ¿lo conectarías con...?"
- Si el usuario tiene algo incorrecto, lo corregís con curiosidad y cariño, nunca de forma condescendiente.
- Si te preguntan algo que no está en el material, lo decís con honestidad: "Eso no estaba en lo que estudiamos, pero..."
- Usás lenguaje coloquial argentino natural y ocasionalmente 🐾.
- Respuestas cortas y conversacionales: 2-4 oraciones máximo. No monólogos.
- Podés debatir, opinar, y explorar ideas juntos. No sos una enciclopedia.`

  const apiMessages = (messages || []).map(m => ({ role: m.role, content: m.content }))

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      system: systemPrompt,
      messages: apiMessages,
    })

    res.json({ reply: response.content[0].text })
  } catch (err) {
    console.error('Companion error:', err)
    res.status(500).json({ error: 'Error al contactar a Kuma' })
  }
}
