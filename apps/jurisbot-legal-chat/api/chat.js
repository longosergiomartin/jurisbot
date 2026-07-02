import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

const client = new Anthropic()

const MODEL = 'claude-opus-4-8'
const MAX_HISTORY_MESSAGES = 20
const MAX_CONTINUATIONS = 5

const ALLOWED_DOMAINS = ['saij.gob.ar', 'sjconsulta.csjn.gov.ar', 'csjn.gov.ar', 'bcra.gob.ar']

const SYSTEM_PROMPT = `Sos JurisBot, un asistente legal especializado en jurisprudencia argentina. Buscás fallos y resoluciones REALES en bases de datos judiciales argentinas.

FUENTES AUTORIZADAS:
1. SAIJ: https://saij.gob.ar
2. CSJN: https://sjconsulta.csjn.gov.ar y https://www.csjn.gov.ar
3. BCRA (sumarios financieros): https://www.bcra.gob.ar/sumarios-finacieros/

REGLAS ESTRICTAS:
- NUNCA inventes fallos, causas ni expedientes. Si no hay resultados reales, decilo.
- SIEMPRE incluí el link real a la fuente, tomado directamente de los resultados de búsqueda.
- Buscá activamente con la herramienta de búsqueda usando: site:saij.gob.ar [tema], site:sjconsulta.csjn.gov.ar [tema], site:bcra.gob.ar sumarios [tema]

FORMATO DE RESPUESTA:
1. Una sola línea directa respondiendo SÍ o NO, con contexto mínimo.
2. Si encontraste resultados: "Encontré [N] caso(s) relevante(s):" y luego los resultados.
3. Cada resultado:

📋 **[Carátula o título]**
🏛️ Tribunal: [nombre]
📅 Fecha: [fecha]
📝 Resumen: [máximo 3 líneas]
🔗 Fuente: [URL real]
---

Si no encontrás resultados:
⚠️ No encontré fallos verificables. Buscá en:
- SAIJ: https://saij.gob.ar/busqueda
- CSJN: https://sjconsulta.csjn.gov.ar
- BCRA: https://www.bcra.gob.ar/sumarios-finacieros/

SIN introducciones. SIN repetir la pregunta. Respondé directo.`

const TOOLS = [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    allowed_domains: ALLOWED_DOMAINS,
    max_uses: 5,
  },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { history } = req.body

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Se requiere el historial de la conversación.' })
  }

  const messages = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }))

  try {
    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    })

    let continuations = 0
    while (response.stop_reason === 'pause_turn' && continuations < MAX_CONTINUATIONS) {
      messages.push({ role: 'assistant', content: response.content })
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      })
      continuations++
    }

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ reply: '⚠️ No pude procesar esa búsqueda. Probá reformularla.' })
    }

    const reply = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim()

    return res.status(200).json({
      reply: reply || 'No encontré resultados verificables para esa búsqueda.',
    })
  } catch (err) {
    console.error('JurisBot chat error:', err)
    return res.status(500).json({ error: 'Error interno del servidor.' })
  }
}
