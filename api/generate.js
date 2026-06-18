export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, fileData, cardCount = 15 } = req.body

  if (!text && !fileData) {
    return res.status(400).json({ error: 'Se requiere texto o archivo' })
  }

  const count = Math.min(Math.max(Number(cardCount) || 15, 5), 30)

  const instructions = `Eres un experto en pedagogía y aprendizaje activo. Analiza el siguiente material educativo y genera exactamente ${count} tarjetas de estudio de alta calidad.

TIPOS DE TARJETAS:
- "flashcard": Concepto clave al frente, explicación clara al dorso. Ideal para definiciones, procesos, fórmulas.
- "mcq": Pregunta de opción múltiple con 4 opciones (solo una correcta) y una breve explicación de la respuesta correcta.

REGLAS PEDAGÓGICAS:
1. Prioriza la comprensión sobre la memorización mecánica.
2. Las preguntas deben ser concretas y sin ambigüedad.
3. Las opciones incorrectas de MCQ deben ser plausibles pero claramente distintas.
4. Las respuestas de flashcard deben ser completas pero concisas (máx 3 oraciones).
5. Varía entre conceptos fundamentales, aplicaciones y conexiones entre ideas.
6. Incluye aproximadamente 60% flashcards y 40% MCQ.

FORMATO DE RESPUESTA — solo JSON, sin markdown, sin texto adicional:
[
  {
    "type": "flashcard",
    "front": "¿Cuál es el principio de...",
    "back": "El principio establece que..."
  },
  {
    "type": "mcq",
    "question": "¿Cuál de las siguientes afirmaciones sobre X es correcta?",
    "options": ["opción A", "opción B", "opción C", "opción D"],
    "correctIndex": 2,
    "explanation": "La respuesta es C porque..."
  }
]

Genera las ${count} tarjetas ahora. Responde SOLO con el array JSON, sin texto antes ni después.`

  const messageContent = fileData
    ? [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: fileData.base64,
          },
        },
        { type: 'text', text: instructions },
      ]
    : [{ type: 'text', text: `${instructions}\n\nMATERIAL:\n${text}` }]

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic error:', data)
      return res.status(500).json({ error: data.error?.message || 'Error al generar tarjetas' })
    }

    const rawText = data.content?.find(b => b.type === 'text')?.text || ''

    // Extract JSON array from response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in response:', rawText.slice(0, 200))
      return res.status(500).json({ error: 'Respuesta inesperada de la IA' })
    }

    const cards = JSON.parse(jsonMatch[0])

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(500).json({ error: 'No se generaron tarjetas válidas' })
    }

    // Validate and clean cards
    const validCards = cards.filter(c => {
      if (c.type === 'flashcard') return c.front && c.back
      if (c.type === 'mcq') return c.question && Array.isArray(c.options) && c.options.length >= 2 && typeof c.correctIndex === 'number'
      return false
    })

    res.status(200).json({ cards: validCards })
  } catch (err) {
    console.error('Generate handler error:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
