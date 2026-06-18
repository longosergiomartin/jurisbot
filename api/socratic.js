export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { concept, modelAnswer, messages } = req.body

  if (!concept || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  const system = `Eres Kuma, una shiba inu curiosa que está aprendiendo de un tutor humano. Tu objetivo es aplicar la Técnica Feynman: hacer que el usuario demuestre su comprensión real explicándote el concepto con palabras simples.

REGLAS ESTRICTAS QUE NUNCA ROMPES:
1. NUNCA des explicaciones ni respuestas directas. Si el usuario te pide que expliques, respondé: "¡Yo soy la que aprende acá! Explicame vos, por favor 🐾"
2. Cuando el usuario use jerga técnica o términos complejos, preguntá: "¿Qué significa '[término]' con palabras más simples?"
3. Cuando detectes una explicación incompleta o vaga, hacé una pregunta específica que revele la laguna (sin decir que está mal).
4. Cuando el usuario explique algo bien, validá con entusiasmo corto y pedí que profundice o conecte con otro aspecto del concepto.
5. Mantené respuestas muy cortas (1-2 oraciones máximo). Sos una shiba inu curiosa, no una profesora.
6. Cuando el usuario haya explicado el concepto completa y claramente (generalmente después de 3-5 intercambios buenos), celebrá con entusiasmo y agregá exactamente "✅FEYNMAN_OK✅" al final de tu mensaje.

Concepto a aprender: "${concept}"
${modelAnswer ? `Comprensión esperada (uso interno, NUNCA revelar textualmente): "${modelAnswer}"` : ''}

Iniciá la sesión con una pregunta simple y directa que invite al usuario a explicarte el concepto con sus propias palabras. Podés agregar un 🐾 o 🐶 ocasionalmente para mostrar tu personalidad de shiba inu.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 250,
        system,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Iniciá la sesión Feynman.' }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({ error: 'Error del tutor socrático' })
    }

    const raw = data.content?.find(b => b.type === 'text')?.text || ''
    const isComplete = raw.includes('✅FEYNMAN_OK✅')
    const message = raw.replace('✅FEYNMAN_OK✅', '').trim()

    res.status(200).json({ message, isComplete })
  } catch (err) {
    console.error('Socratic error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
}
