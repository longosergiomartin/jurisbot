export default async function handler(req, res) {
  res.status(410).json({ error: 'Este endpoint ya no está disponible. Usa /api/generate y /api/evaluate.' })
}
