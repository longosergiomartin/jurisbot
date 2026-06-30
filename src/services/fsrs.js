// Simplified FSRS-4.5 implementation
// Tracks stability (days to 90% retention) and difficulty per card

const INIT_STABILITY = { 1: 0.4, 2: 1.2, 3: 3.5, 4: 9.0 }
const INIT_DIFFICULTY = { 1: 8.0, 2: 6.5, 3: 5.0, 4: 3.0 }

export function retrievability(stability, elapsedDays) {
  if (!stability || stability <= 0) return 0
  return Math.pow(0.9, elapsedDays / stability)
}

function updateDifficulty(d, rating) {
  const delta = (-0.8 + 0.28 * d) * (4 - rating) / 9
  return Math.min(10, Math.max(1, d + delta))
}

function updateStability(s, d, r, rating) {
  const hardPenalty = rating === 2 ? 0.8 : 1.0
  const easyBonus = rating === 4 ? 1.3 : 1.0
  const increase = Math.exp(0.4) * (11 - d) * Math.pow(s, -0.9) * (Math.exp(0.2 * (1 - r)) - 1)
  return s * (1 + increase * hardPenalty * easyBonus)
}

export function scheduleCard(card, rating, now = new Date()) {
  // rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  let { stability = 0, difficulty = 5, state = 'new', reps = 0, lapses = 0 } = card
  const lastReview = card.lastReview ? new Date(card.lastReview) : now

  if (state === 'new') {
    stability = INIT_STABILITY[rating]
    difficulty = INIT_DIFFICULTY[rating]
    state = rating <= 2 ? 'learning' : 'review'
    reps = 1
  } else if (state === 'learning' || state === 'relearning') {
    if (rating >= 3) {
      stability = Math.max(stability * 1.5, 1.0)
      state = 'review'
    } else {
      stability = Math.max(stability * 0.5, 0.1)
    }
    reps++
  } else {
    const elapsed = Math.max(0, (now - lastReview) / 86400000)
    const r = retrievability(stability, elapsed)
    difficulty = updateDifficulty(difficulty, rating)

    if (rating === 1) {
      lapses++
      stability = stability * Math.max(0.3, 1 - difficulty / 10)
      state = 'relearning'
    } else {
      stability = updateStability(stability, difficulty, r, rating)
      state = 'review'
    }
    reps++
  }

  let daysUntilDue
  if (state === 'learning' || state === 'relearning') {
    daysUntilDue = rating === 1 ? 10 / 1440 : 10 / 1440  // 10 minutes
  } else {
    daysUntilDue = Math.max(1, Math.round(stability))
  }

  const due = new Date(now.getTime() + daysUntilDue * 86400000)

  return {
    ...card,
    stability,
    difficulty,
    state,
    reps,
    lapses,
    due: due.toISOString(),
    lastReview: now.toISOString(),
    scheduledDays: daysUntilDue,
  }
}

export function getDueCards(cards, now = new Date()) {
  return cards.filter(c => !c.due || new Date(c.due) <= now)
}

export function getNextReviewText(card) {
  if (!card.due) return 'Ahora'
  const diff = new Date(card.due) - new Date()
  if (diff <= 0) return 'Ahora'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `en ${mins} min`
  const hours = Math.round(diff / 3600000)
  if (hours < 24) return `en ${hours}h`
  const days = Math.round(diff / 86400000)
  return `en ${days} día${days !== 1 ? 's' : ''}`
}

// CG-5: Deck mastery = average predicted retrievability across all cards.
// new/learning/relearning cards contribute 0 (not yet mastered).
// Returns 0–100 (integer %) or null if deck has no cards.
export function getDeckMastery(cards, now = new Date()) {
  if (!cards || cards.length === 0) return null
  const total = cards.length
  let rSum = 0
  for (const card of cards) {
    if (card.state === 'review' && card.stability > 0 && card.lastReview) {
      const elapsed = Math.max(0, (now - new Date(card.lastReview)) / 86400000)
      rSum += retrievability(card.stability, elapsed)
    }
  }
  return Math.round((rSum / total) * 100)
}

export function createCard(rawCard, deckId) {
  return {
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deckId,
    type: rawCard.type,
    front: rawCard.front || rawCard.question || '',
    back: rawCard.back || rawCard.explanation || '',
    options: rawCard.options || null,
    correctIndex: rawCard.correctIndex ?? null,
    // FSRS scheduling
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 5,
    state: 'new',
    reps: 0,
    lapses: 0,
    lastReview: null,
    scheduledDays: 0,
  }
}
