// CG-3: Level unlock registry.
// Add entries here to introduce new unlockables — no other code changes needed.
// Types: 'kuma_skin' | 'theme' | 'badge'
export const UNLOCK_REGISTRY = [
  { id: 'kuma_estudioso', level: 2, type: 'kuma_skin', name: 'Kuma Estudioso',   emoji: '📚', description: 'Kuma con su libreta de apuntes siempre lista.' },
  { id: 'badge_aplicado', level: 3, type: 'badge',     name: 'Insignia Aplicado', emoji: '✏️', description: 'Demostraste constancia en tus primeros pasos.' },
  { id: 'badge_dedicado', level: 4, type: 'badge',     name: 'Insignia Dedicado', emoji: '🎯', description: 'Tu compromiso con el aprendizaje es real.' },
  { id: 'kuma_nocturno',  level: 5, type: 'kuma_skin', name: 'Kuma Nocturno',    emoji: '🌙', description: 'Kuma modo noche, para las sesiones a deshora.' },
  { id: 'badge_experto',  level: 5, type: 'badge',     name: 'Insignia Experto',  emoji: '⚡', description: 'Dominás el arte del estudio activo.' },
  { id: 'badge_maestro',  level: 6, type: 'badge',     name: 'Insignia Maestro',  emoji: '🏆', description: 'Un nivel que pocos alcanzan. Bien merecido.' },
  { id: 'kuma_sabio',     level: 8, type: 'kuma_skin', name: 'Kuma Sabio',       emoji: '🧙', description: 'Kuma con su sombrero de mago. Un clásico.' },
  { id: 'badge_leyenda',  level: 9, type: 'badge',     name: 'Insignia Leyenda',  emoji: '⭐', description: 'Tu dedicación es una inspiración para los demás.' },
]

export function getUnlocksForLevel(level) {
  return UNLOCK_REGISTRY.filter(u => u.level === level)
}

// Returns all unlocks earned by going from prevLevel → newLevel (exclusive lower, inclusive upper).
export function getNewUnlocks(prevLevel, newLevel) {
  return UNLOCK_REGISTRY.filter(u => u.level > prevLevel && u.level <= newLevel)
}
