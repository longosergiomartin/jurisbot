export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, history } = req.body;

  const SYSTEM_PROMPT = `Sos JurisBot, un asistente legal especializado en jurisprudencia argentina. Buscás fallos y resoluciones REALES en bases de datos judiciales argentinas.

FUENTES AUTORIZADAS:
1. SAIJ: https://saij.gob.ar
2. CSJN: https://sjconsulta.csjn.gov.ar y https://www.csjn.gov.ar
3. BCRA (sumarios financieros): https://www.bcra.gob.ar/sumarios-finacieros/

REGLAS ESTRICTAS:
- NUNCA inventes fallos, causas ni expedientes. Si no hay resultados reales, decilo.
- SIEMPRE incluí el link real a la fuente.
- Buscá activamente con web_search usando: site:saij.gob.ar [tema], site:sjconsulta.csjn.gov.ar [tema], site:bcra.gob.ar sumarios [tema]

FORMATO DE RESPUESTA — seguí este orden exacto, sin agregar texto extra antes ni después:

1. Una sola línea directa respondiendo SÍ o NO a la consulta, con contexto mínimo.
2. Si encontraste resultados, una línea corta tipo "Encontré [N] caso(s) relevante(s):" y luego los resultados.
3. Cada resultado con esta estructura exacta:

📋 **[Carátula o título]**
🏛️ Tribunal: [nombre]
📅 Fecha: [fecha]
📝 Resumen: [máximo 3 líneas, solo lo esencial del planteo y la resolución]
🔗 Fuente: [URL real]
---

Si no encontrás resultados:
⚠️ No encontré fallos verificables sobre este tema. Buscá directamente en:
- SAIJ: https://saij.gob.ar/busqueda
- CSJN: https://sjconsulta.csjn.gov.ar
- BCRA: https://www.bcra.gob.ar/sumarios-finacieros/

SIN introducciones largas. SIN explicar qué vas a hacer. SIN repetir la pregunta del usuario. Respondé directo.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: history,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Error en la API' });
    }

    const reply = data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim() || 'No pude obtener resultados. Intentá reformular la búsqueda.';

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
