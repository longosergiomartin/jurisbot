const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, fileData, existingCards = [] } = req.body

  if (!text && !fileData) {
    return res.status(400).json({ error: 'Se requiere el material original' })
  }

  const covered = existingCards.length > 0
    ? `\n\nConceptos que YA están cubiertos por otras tarjetas del mazo (no repetir):\n${existingCards.map((c, i) => `${i + 1}. ${c.front}`).join('\n')}`
    : ''

  const instructions = `Eres un experto en pedagogía. Analizá el material y generá exactamente 1 tarjeta de estudio nueva que cubra un concepto importante aún no cubierto.${covered}

Elegí el tipo más adecuado:
- "flashcard": concepto clave o definición
- "mcq": pregunta con 4 opciones (una correcta)
- "short_answer": pregunta abierta que requiere construir la respuesta

REGLAS:
- La pregunta debe ser concreta y sin ambigüedad
- La respuesta máximo 3 oraciones
- Para MCQ: opciones incorrectas plausibles pero claramente distintas

FORMATO — solo JSON puro, sin markdown:
flashcard:     {"type":"flashcard","front":"...","back":"..."}
mcq:           {"type":"mcq","front":"...","options":["A","B","C","D"],"correctIndex":0,"back":"explicación"}
short_answer:  {"type":"short_answer","front":"...","back":"..."}

Respondé SOLO con el objeto JSON, nada más.`

  let messageContent
  if (fileData?.mimeType === 'application/pdf') {
    messageContent = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileData.base64 } },
      { type: 'text', text: instructions },
    ]
  } else if (fileData?.mimeType && IMAGE_MIME_TYPES.includes(fileData.mimeType)) {
    messageContent = [
      { type: 'image', source: { type: 'base64', media_type: fileData.mimeType, data: fileData.base64 } },
      { type: 'text', text: instructions },
    ]
  } else {
    messageContent = [{ type: 'text', text: `${instructions}\n\nMATERIAL:\n${text}` }]
  }

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
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: 'Error al regenerar tarjeta' })

    const rawText = data.content?.find(b => b.type === 'text')?.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Respuesta inesperada de la IA' })

    const card = JSON.parse(jsonMatch[0])
    if (!card.type || !card.front) return res.status(500).json({ error: 'Tarjeta inválida generada' })

    res.status(200).json({ card })
  } catch (err) {
    console.error('Regenerate error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
}
