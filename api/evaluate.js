export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { question, correctAnswer, userAnswer, isCorrect } = req.body

  if (!question || !correctAnswer) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  // Two prompt branches: definitive wrong (isCorrect===false) vs. AI-evaluated (short answer)
  const prompt = isCorrect === false
    ? `Eres Kuma, tutora shiba inu. El estudiante eligió una respuesta incorrecta.

Pregunta: ${question}
Respuesta correcta: ${correctAnswer}
Lo que eligió (INCORRECTO): ${userAnswer}

Reglas absolutas:
- NUNCA uses palabras de elogio: "muy bien", "correcto", "excelente", "perfecto", "exacto", "¡sí!", "así es", "acertaste".
- NO repitas la respuesta correcta — la UI ya la muestra. En cambio, explicá en una oración corta POR QUÉ la respuesta del estudiante era incorrecta o en qué se diferencia del concepto correcto.
- Ancla tu feedback al contenido de ESTA pregunta, no a otro concepto.
- Máximo 2 oraciones. Tono empático y directo.

Responde SOLO con JSON válido:
{"feedback": "Mensaje de Kuma (máximo 2 oraciones)"}`

    : `Eres Kuma, tutora shiba inu. Evaluá la respuesta del estudiante y dá feedback preciso.

Pregunta: ${question}
Respuesta esperada: ${correctAnswer}
Respuesta del estudiante: ${userAnswer || '(no escribió respuesta)'}

Reglas:
- Si la respuesta es incorrecta o incompleta: señalá el error con empatía y mencioná qué era lo correcto.
- Si es correcta o muy cercana: felicitá brevemente y agregá un dato memorable sobre el concepto.
- NUNCA felicites si la respuesta claramente no corresponde al concepto correcto.
- Ancla tu feedback al contenido de ESTA pregunta específicamente.
- Máximo 2 oraciones. Tono rioplatense informal.

Responde SOLO con JSON válido:
{"feedback": "Mensaje de Kuma"}`

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
    let feedback = parsed.feedback || null

    // Safety net: override if model still returned praise despite instructions.
    // Log raw text first to characterize open-vocab praise in production (QA instrument — remove once sample is collected).
    if (isCorrect === false && feedback) {
      console.log('[evaluate] MCQ-wrong raw LLM feedback:', feedback)
      const praisePattern = /\b(muy bien|excelente|correcto|perfecto|exacto|acertaste|¡sí|así es|genial|bravo)\b/i
      if (praisePattern.test(feedback)) {
        console.log('[evaluate] praise override fired')
        feedback = null
      }
    }

    res.status(200).json({ feedback })
  } catch (err) {
    console.error('Evaluate error:', err)
    res.status(200).json({ feedback: null })
  }
}
