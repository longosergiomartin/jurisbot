// CG-3: Level unlock registry + S2-1: streak milestone unlocks.
// Add entries here to introduce new unlockables — no other code changes needed.
// Types: 'kuma_skin' | 'theme' | 'badge'

export const UNLOCK_REGISTRY = [
  // Level-based
  { id: 'kuma_estudioso', level: 2, type: 'kuma_skin', name: 'Kuma Estudioso',   emoji: '📚', description: 'Kuma con su libreta de apuntes siempre lista.' },
  { id: 'badge_aplicado', level: 3, type: 'badge',     name: 'Insignia Aplicado', emoji: '✏️', description: 'Demostraste constancia en tus primeros pasos.' },
  { id: 'badge_dedicado', level: 4, type: 'badge',     name: 'Insignia Dedicado', emoji: '🎯', description: 'Tu compromiso con el aprendizaje es real.' },
  { id: 'kuma_nocturno',  level: 5, type: 'kuma_skin', name: 'Kuma Nocturno',    emoji: '🌙', description: 'Kuma modo noche, para las sesiones a deshora.' },
  { id: 'badge_experto',  level: 5, type: 'badge',     name: 'Insignia Experto',  emoji: '⚡', description: 'Dominás el arte del estudio activo.' },
  { id: 'badge_maestro',  level: 6, type: 'badge',     name: 'Insignia Maestro',  emoji: '🏆', description: 'Un nivel que pocos alcanzan. Bien merecido.' },
  { id: 'kuma_sabio',     level: 8, type: 'kuma_skin', name: 'Kuma Sabio',       emoji: '🧙', description: 'Kuma con su sombrero de mago. Un clásico.' },
  { id: 'badge_leyenda',  level: 9, type: 'badge',     name: 'Insignia Leyenda',  emoji: '⭐', description: 'Tu dedicación es una inspiración para los demás.' },

  // Streak milestone-based (milestone = exact streak day count)
  { id: 'streak_7',   milestone: 7,   type: 'badge',     name: 'Racha Constante',   emoji: '🔥', description: '7 días seguidos. Kuma dice que la racha ya es tuya.' },
  { id: 'streak_14',  milestone: 14,  type: 'kuma_skin', name: 'Kuma Maratonista',  emoji: '🏃', description: '2 semanas sin parar. Kuma se pone las zapatillas.' },
  { id: 'streak_30',  milestone: 30,  type: 'badge',     name: 'Habit Loop',        emoji: '🗓️', description: 'Un mes entero. El hábito ya está instalado en tu cerebro.' },
  { id: 'streak_60',  milestone: 60,  type: 'kuma_skin', name: 'Kuma Montañista',   emoji: '🧗', description: '60 días. Kuma llegó a la cima.' },
  { id: 'streak_100', milestone: 100, type: 'badge',     name: 'Triple Dígito',     emoji: '💯', description: '100 días. Pocos llegan acá. Sos de los serios.' },
  { id: 'streak_365', milestone: 365, type: 'kuma_skin', name: 'Kuma Sempai',       emoji: '🌸', description: 'Un año. Kuma se convirtió en maestra.' },
]

export function getUnlocksForLevel(level) {
  return UNLOCK_REGISTRY.filter(u => u.level === level)
}

// Returns all level unlocks earned by going from prevLevel → newLevel (exclusive lower, inclusive upper).
export function getNewUnlocks(prevLevel, newLevel) {
  return UNLOCK_REGISTRY.filter(u => u.level != null && u.level > prevLevel && u.level <= newLevel)
}

// Returns the unlock for an exact streak milestone hit (fires only once, when streak === milestone).
export function getStreakMilestoneUnlocks(streak) {
  return UNLOCK_REGISTRY.filter(u => u.milestone === streak)
}
