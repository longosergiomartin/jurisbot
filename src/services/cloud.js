import { supabase } from './supabase'

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function upsertProfile(userId, profile) {
  await supabase.from('profiles').upsert({
    id: userId,
    name: profile.name,
    streak: profile.streak,
    last_study_date: profile.lastStudyDate,
    total_sessions: profile.totalSessions,
    xp: profile.xp,
    streak_shields: profile.streakShields ?? 0,
    last_shield_week: profile.lastShieldWeek ?? null,
    plan: profile.plan ?? 'free',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
}

// ─── Decks + Cards ────────────────────────────────────────────────────────────

export async function fetchDecks(userId) {
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')

  if (!decks?.length) return []

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)

  return decks.map(deck => ({
    id: deck.id,
    title: deck.title,
    createdAt: deck.created_at,
    goal: deck.goal,
    chapter: deck.chapter,
    cards: (cards || [])
      .filter(c => c.deck_id === deck.id)
      .map(dbCardToCard),
  }))
}

export async function insertDeck(userId, deck) {
  await supabase.from('decks').upsert({
    id: deck.id,
    user_id: userId,
    title: deck.title,
    created_at: deck.createdAt,
    goal: deck.goal || null,
    chapter: deck.chapter || null,
  })

  if (deck.cards?.length) {
    await supabase.from('cards').upsert(
      deck.cards.map(c => cardToDb(c, deck.id, userId)),
      { onConflict: 'id' }
    )
  }
}

export async function upsertCards(userId, deckId, cards) {
  await supabase.from('cards').upsert(
    cards.map(c => cardToDb(c, deckId, userId)),
    { onConflict: 'id' }
  )
}

// ─── Sessions (analytics) ─────────────────────────────────────────────────────

export async function insertSession(userId, deckId, { startTime, endTime, cardsStudied, correctAnswers }) {
  await supabase.from('sessions').insert({
    user_id: userId,
    deck_id: deckId,
    start_time: startTime,
    end_time: endTime,
    cards_studied: cardsStudied,
    correct_answers: correctAnswers,
  })
}

// ─── Migration: localStorage → Supabase ──────────────────────────────────────

function getMaxCardReview(cards) {
  if (!cards?.length) return new Date(0)
  const dates = cards.filter(c => c.lastReview).map(c => new Date(c.lastReview))
  return dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(0)
}

export async function migrateLocalToCloud(userId, localUser, localDecks) {
  const [cloudProfile, cloudDecks] = await Promise.all([
    fetchProfile(userId),
    fetchDecks(userId),
  ])

  const hasCloudData = !!cloudProfile || cloudDecks?.length > 0

  if (!hasCloudData) {
    // Brand new account — push everything from localStorage
    if (localUser) await upsertProfile(userId, localUser)
    for (const deck of (localDecks || [])) {
      await insertDeck(userId, deck)
    }
    return
  }

  // Conflict resolution: "last modified wins"
  // Profile: compare updatedAt timestamps
  const localUpdatedAt = localUser?.updatedAt ? new Date(localUser.updatedAt) : new Date(0)
  const cloudUpdatedAt = cloudProfile?.updated_at ? new Date(cloudProfile.updated_at) : new Date(0)
  if (localUser && localUpdatedAt > cloudUpdatedAt) {
    await upsertProfile(userId, localUser)
  }

  // Decks: new local decks get pushed; existing decks compare max card lastReview
  const cloudDeckIds = new Set((cloudDecks || []).map(d => d.id))
  for (const localDeck of (localDecks || [])) {
    if (!cloudDeckIds.has(localDeck.id)) {
      await insertDeck(userId, localDeck)
    } else {
      const cloudDeck = cloudDecks.find(d => d.id === localDeck.id)
      const localMax = getMaxCardReview(localDeck.cards)
      const cloudMax = getMaxCardReview(cloudDeck?.cards)
      if (localMax > cloudMax) {
        await insertDeck(userId, localDeck)
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cardToDb(card, deckId, userId) {
  return {
    id: card.id,
    deck_id: deckId,
    user_id: userId,
    type: card.type,
    front: card.front || card.question || '',
    back: card.back || card.explanation || '',
    options: card.options || null,
    correct_index: card.correctIndex ?? null,
    state: card.state || 'new',
    due: card.due || null,
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: Math.round(card.elapsedDays || 0),
    scheduled_days: Math.round(card.scheduledDays || 0),
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    last_review: card.lastReview || null,
  }
}

function dbCardToCard(row) {
  return {
    id: row.id,
    type: row.type,
    front: row.front,
    back: row.back,
    options: row.options || undefined,
    correctIndex: row.correct_index ?? undefined,
    state: row.state,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    lastReview: row.last_review,
  }
}
