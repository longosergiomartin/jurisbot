import mammoth from 'mammoth'

export const config = { maxDuration: 60 }

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const CHUNK_SIZE = 2800

function buildInstructions(count) {
  return `Eres un experto en pedagogía y aprendizaje activo. Analiza el siguiente material educativo y genera exactamente ${count} tarjetas de estudio de alta calidad.

TIPOS DE TARJETAS:
- "flashcard": Concepto clave al frente ("front"), explicación clara al dorso ("back"). Ideal para definiciones, procesos, fórmulas.
- "mcq": Pregunta al frente ("front"), opciones múltiples (solo una correcta), y explicación de la respuesta correcta en ("back").
- "short_answer": Pregunta abierta en ("front") que requiere que el estudiante construya su respuesta con sus propias palabras. La respuesta modelo va en ("back"). Usar para aplicaciones, análisis y conexiones entre conceptos.

REGLAS PEDAGÓGICAS:
1. Prioriza la comprensión sobre la memorización mecánica.
2. Las preguntas deben ser concretas y sin ambigüedad.
3. Las opciones incorrectas de MCQ deben ser plausibles pero claramente distintas.
4. Las respuestas deben ser completas pero concisas (máx 3 oraciones).
5. Varía entre conceptos fundamentales, aplicaciones y conexiones entre ideas.
6. Incluye aproximadamente 40% flashcards, 25% MCQ y 35% short_answer.
7. IDIOMA: Genera todas las tarjetas exactamente en el mismo idioma del texto original. No traduzcas ni mezcles idiomas bajo ninguna circunstancia.
8. FUENTES: Basate única y exclusivamente en el texto proporcionado. No incluyas información externa, juicios de valor ni suposiciones que no estén explícitamente en el material.

FORMATO DE RESPUESTA — solo JSON, sin markdown, sin texto adicional:
[
  {
    "type": "flashcard",
    "front": "¿Cuál es el principio de...",
    "back": "El principio establece que..."
  },
  {
    "type": "mcq",
    "front": "¿Cuál de las siguientes afirmaciones sobre X es correcta?",
    "options": ["opción A", "opción B", "opción C", "opción D"],
    "correctIndex": 2,
    "back": "La respuesta es C porque..."
  },
  {
    "type": "short_answer",
    "front": "Explicá con tus propias palabras cómo funciona...",
    "back": "Se espera que el estudiante mencione: ..."
  }
]

Genera las ${count} tarjetas ahora. Responde SOLO con el array JSON, sin texto antes ni después.`
}

function chunkText(text) {
  if (text.length <= CHUNK_SIZE) return [text]

  const chunks = []
  let remaining = text.trim()

  while (remaining.length > CHUNK_SIZE) {
    let cut = remaining.lastIndexOf('\n\n', CHUNK_SIZE)
    if (cut < CHUNK_SIZE * 0.4) cut = remaining.lastIndexOf('\n', CHUNK_SIZE)
    if (cut < CHUNK_SIZE * 0.4) cut = remaining.lastIndexOf(' ', CHUNK_SIZE)
    if (cut <= 0) cut = CHUNK_SIZE

    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }

  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}

function validateCards(cards) {
  if (!Array.isArray(cards)) return []
  return cards.filter(c => {
    if (c.type === 'flashcard') return c.front && c.back
    if (c.type === 'mcq') return c.front && Array.isArray(c.options) && c.options.length >= 2 && typeof c.correctIndex === 'number'
    if (c.type === 'short_answer') return c.front && c.back
    return false
  })
}

async function callClaude(messageContent) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: messageContent }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic API error')

  const rawText = data.content?.find(b => b.type === 'text')?.text || ''
  const jsonMatch = rawText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array in response')

  return validateCards(JSON.parse(jsonMatch[0]))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, fileData, url, cardCount = 15 } = req.body

  if (!text && !fileData && !url) {
    return res.status(400).json({ error: 'Se requiere texto, archivo o URL' })
  }

  const count = Math.min(Math.max(Number(cardCount) || 15, 5), 30)

  // Extract text from DOCX
  let docxText = null
  if (fileData?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const buffer = Buffer.from(fileData.base64, 'base64')
      const result = await mammoth.extractRawText({ buffer })
      docxText = result.value?.trim()
      if (!docxText) return res.status(400).json({ error: 'No se pudo extraer texto del archivo Word.' })
    } catch (err) {
      console.error('DOCX extract error:', err)
      return res.status(400).json({ error: 'Error al procesar el archivo Word.' })
    }
  }

  // Fetch and extract text from URL
  let urlText = null
  if (url) {
    try {
      const urlRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!urlRes.ok) return res.status(400).json({ error: `No se pudo acceder a la URL (${urlRes.status}).` })
      const html = await urlRes.text()
      urlText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (!urlText) return res.status(400).json({ error: 'No se pudo extraer texto de la URL.' })
    } catch (err) {
      console.error('URL fetch error:', err)
      return res.status(400).json({ error: 'No se pudo acceder a la URL. Verificá que sea accesible.' })
    }
  }

  // Switch to SSE streaming mode
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    let allCards = []

    if (fileData?.mimeType === 'application/pdf') {
      const content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileData.base64 } },
        { type: 'text', text: buildInstructions(count) },
      ]
      allCards = await callClaude(content)
      send({ type: 'progress', chunk: 1, total: 1, cards: allCards.length })

    } else if (fileData?.mimeType && IMAGE_MIME_TYPES.includes(fileData.mimeType)) {
      const content = [
        { type: 'image', source: { type: 'base64', media_type: fileData.mimeType, data: fileData.base64 } },
        { type: 'text', text: buildInstructions(count) },
      ]
      allCards = await callClaude(content)
      send({ type: 'progress', chunk: 1, total: 1, cards: allCards.length })

    } else {
      const sourceText = text || docxText || urlText
      const chunks = chunkText(sourceText)
      const perChunk = Math.ceil(count / chunks.length)

      for (let i = 0; i < chunks.length; i++) {
        const content = [{ type: 'text', text: `${buildInstructions(perChunk)}\n\nMATERIAL:\n${chunks[i]}` }]
        const chunkCards = await callClaude(content)
        allCards.push(...chunkCards)
        send({ type: 'progress', chunk: i + 1, total: chunks.length, cards: allCards.length })
      }

      allCards = allCards.slice(0, count)
    }

    if (allCards.length === 0) {
      send({ type: 'error', message: 'No se generaron tarjetas válidas. Probá con un texto más largo o diferente.' })
    } else {
      send({ type: 'done', cards: allCards })
    }
  } catch (err) {
    console.error('Generate handler error:', err)
    send({ type: 'error', message: 'Error interno del servidor.' })
  }

  res.end()
}
