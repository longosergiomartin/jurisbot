const KEYS = {
  USER: 'cognify_user',
  DECKS: 'cognify_decks',
}

function load(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// User
export function getUser() {
  return load(KEYS.USER)
}

export function createUser(name) {
  const user = {
    name,
    streak: 0,
    lastStudyDate: null,
    totalCards: 0,
    totalSessions: 0,
    xp: 0,
    streakShields: 1,
    lastShieldWeek: null,
    createdAt: new Date().toISOString(),
  }
  save(KEYS.USER, user)
  return user
}

export function saveUser(user) {
  save(KEYS.USER, user)
}

export function updateStreak(user) {
  const today = new Date().toISOString().slice(0, 10)
  const thisWeek = getISOWeek(today)
  const last = user.lastStudyDate

  // Refresh weekly shield (max 2)
  let shields = user.streakShields ?? 1
  const lastShieldWeek = user.lastShieldWeek ?? null
  if (lastShieldWeek !== thisWeek && shields < 2) {
    shields = Math.min(shields + 1, 2)
  }

  let streak = user.streak
  let shieldUsed = false
  if (last === today) {
    // Already studied today, no change
  } else if (last === getPreviousDay(today)) {
    streak++
  } else if (last === getPreviousDay(getPreviousDay(today)) && shields > 0) {
    // Missed exactly 1 day — shield absorbs the miss
    shields--
    shieldUsed = true
  } else {
    streak = 1
  }

  const updated = {
    ...user,
    streak,
    lastStudyDate: today,
    totalSessions: user.totalSessions + 1,
    streakShields: shields,
    lastShieldWeek: thisWeek,
  }
  save(KEYS.USER, updated)
  return { ...updated, shieldUsed }
}

export function addXP(user, amount) {
  const updated = { ...user, xp: user.xp + amount, totalCards: user.totalCards + 1 }
  save(KEYS.USER, updated)
  return updated
}

// Decks
export function getDecks() {
  return load(KEYS.DECKS, [])
}

export function saveDecks(decks) {
  save(KEYS.DECKS, decks)
}

export function addDeck(deck) {
  const decks = getDecks()
  const updated = [...decks, deck]
  save(KEYS.DECKS, updated)
  return updated
}

export function updateCards(deckId, updatedCards) {
  const decks = getDecks()
  const updated = decks.map(d =>
    d.id === deckId
      ? { ...d, cards: d.cards.map(c => updatedCards.find(u => u.id === c.id) || c) }
      : d
  )
  save(KEYS.DECKS, updated)
  return updated
}

export function deleteDeck(deckId) {
  const updated = getDecks().filter(d => d.id !== deckId)
  save(KEYS.DECKS, updated)
  return updated
}

function getPreviousDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function getISOWeek(dateStr) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}
