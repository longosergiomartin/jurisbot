export const LEVELS = [
  { level: 1,  minXp: 0,    name: 'Novato',       emoji: '🌱' },
  { level: 2,  minXp: 150,  name: 'Estudiante',   emoji: '📚' },
  { level: 3,  minXp: 400,  name: 'Aplicado',     emoji: '✏️' },
  { level: 4,  minXp: 800,  name: 'Dedicado',     emoji: '🎯' },
  { level: 5,  minXp: 1400, name: 'Experto',      emoji: '⚡' },
  { level: 6,  minXp: 2200, name: 'Maestro',      emoji: '🏆' },
  { level: 7,  minXp: 3200, name: 'Erudito',      emoji: '🔮' },
  { level: 8,  minXp: 4500, name: 'Sabio',        emoji: '🧙' },
  { level: 9,  minXp: 6000, name: 'Leyenda',      emoji: '⭐' },
  { level: 10, minXp: 8000, name: 'Gran Maestro', emoji: '👑' },
]

export function getLevel(xp) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl
    else break
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1
  const next = LEVELS[nextIdx] || null
  const xpInLevel = xp - current.minXp
  const xpNeeded = next ? next.minXp - current.minXp : 1
  const xpToNext = next ? next.minXp - xp : 0
  const progress = next ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100
  return { ...current, next, xpToNext, progress, xpInLevel, xpNeeded }
}
