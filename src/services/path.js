// Learning path derivation — Duolingo-style node map per deck.
// Lessons are derived from card order + FSRS state; nothing new is persisted,
// so the path works with existing localStorage/Supabase data as-is.

import { getDueCards, getDeckMastery } from './fsrs'

const TARGET_LESSON_SIZE = 7 // lessons end up between 6 and 8 cards
const REVIEW_EVERY = 2 // interleave a review node after every N lessons

// A card counts as "seen" once it has been rated at least once.
function isCardSeen(card) {
  return (card.reps ?? 0) >= 1
}

// Split cards into contiguous lessons of ~6-8 cards, preserving deck order.
export function chunkIntoLessons(cards) {
  const n = cards.length
  if (n === 0) return []
  const count = Math.max(1, Math.round(n / TARGET_LESSON_SIZE))
  const base = Math.floor(n / count)
  const extra = n % count
  const lessons = []
  let offset = 0
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0)
    lessons.push(cards.slice(offset, offset + size))
    offset += size
  }
  return lessons
}

// Build the full node list for a deck. Node shape:
// { key, type: 'lesson'|'review'|'mastery', title, subtitle, cards,
//   status: 'done'|'active'|'locked', dueCount? , mastery? }
export function buildPath(deck, now = new Date()) {
  const lessons = chunkIntoLessons(deck.cards)
  const nodes = []
  let allPreviousDone = true
  const seenSoFar = [] // cards covered by lessons before the current review node

  lessons.forEach((lessonCards, i) => {
    const done = lessonCards.every(isCardSeen)
    const status = done ? 'done' : allPreviousDone ? 'active' : 'locked'
    nodes.push({
      key: `lesson_${i}`,
      type: 'lesson',
      title: `Lección ${i + 1}`,
      subtitle: `${lessonCards.length} tarjetas`,
      cards: lessonCards,
      status,
    })
    if (!done) allPreviousDone = false
    seenSoFar.push(...lessonCards)

    // Interleave review nodes covering everything studied so far
    const isLast = i === lessons.length - 1
    if (!isLast && (i + 1) % REVIEW_EVERY === 0) {
      const scope = [...seenSoFar]
      const due = getDueCards(scope, now).filter(isCardSeen)
      nodes.push({
        key: `review_${i}`,
        type: 'review',
        title: 'Repaso',
        subtitle: due.length > 0 ? `${due.length} para repasar` : 'Práctica libre',
        // Review = due cards first; if everything is fresh, practice a sample
        cards: due.length > 0 ? due.slice(0, 12) : scope.slice(0, 8),
        dueCount: due.length,
        status: allPreviousDone ? 'active' : 'locked',
      })
    }
  })

  // Final mastery node — the deck's "trophy"
  const allDone = lessons.length > 0 && nodes.filter(n => n.type === 'lesson').every(n => n.status === 'done')
  const due = getDueCards(deck.cards, now).filter(isCardSeen)
  nodes.push({
    key: 'mastery',
    type: 'mastery',
    title: 'Dominio',
    subtitle: allDone ? `${getDeckMastery(deck.cards, now) ?? 0}% dominado` : 'Completá todas las lecciones',
    cards: due.length > 0 ? due.slice(0, 20) : deck.cards.slice(0, 10),
    dueCount: due.length,
    mastery: getDeckMastery(deck.cards, now),
    status: allDone ? (due.length > 0 ? 'active' : 'done') : 'locked',
  })

  return nodes
}

// Progress summary for deck cards on the Dashboard.
export function getPathProgress(deck) {
  const lessons = chunkIntoLessons(deck.cards)
  const done = lessons.filter(l => l.every(isCardSeen)).length
  return { done, total: lessons.length }
}
