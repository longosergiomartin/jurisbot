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
    createdAt: new Date().toISOString(),
  }
  save(KEYS.USER, user)
  return user
}

export function updateStreak(user) {
  const today = new Date().toISOString().slice(0, 10)
  const last = user.lastStudyDate

  let streak = user.streak
  if (last === today) {
    // Already studied today, no change
  } else if (last === getPreviousDay(today)) {
    streak++
  } else {
    streak = 1
  }

  const updated = { ...user, streak, lastStudyDate: today, totalSessions: user.totalSessions + 1 }
  save(KEYS.USER, updated)
  return updated
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
