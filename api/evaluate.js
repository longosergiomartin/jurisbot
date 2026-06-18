export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { question, correctAnswer, userAnswer } = req.body

  if (!question || !correctAnswer) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  const prompt = `Eres Kai, un tutor de IA amigable y motivador. Evalúa la respuesta del estudiante y da feedback conciso.

Pregunta: ${question}
Respuesta correcta: ${correctAnswer}
Lo que respondió el estudiante: ${userAnswer || '(No escribió respuesta, solo vio la tarjeta)'}

Responde en JSON con este formato exacto:
{
  "feedback": "Mensaje de Kai: máximo 2 oraciones, tono amigable y constructivo. Si no hay respuesta del estudiante, comenta algo interesante sobre el concepto que le ayude a recordarlo."
}

Solo JSON, sin texto adicional.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({ error: 'Error de evaluación' })
    }

    const rawText = data.content?.find(b => b.type === 'text')?.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return res.status(200).json({ feedback: null })
    }

    const parsed = JSON.parse(jsonMatch[0])
    res.status(200).json({ feedback: parsed.feedback || null })
  } catch (err) {
    console.error('Evaluate error:', err)
    res.status(200).json({ feedback: null })
  }
}
