import { useState, useEffect } from 'react'
import Welcome from './components/Welcome'
import Upload from './components/Upload'
import Processing from './components/Processing'
import Dashboard from './components/Dashboard'
import CardPreview from './components/CardPreview'
import StudySession from './components/StudySession'
import SessionComplete from './components/SessionComplete'
import CompanionChat from './components/CompanionChat'
import Auth from './components/Auth'
import * as storage from './services/storage'
import { getDueCards } from './services/fsrs'
import { getLevel } from './services/levels'
import { supabase, isSupabaseEnabled } from './services/supabase'
import { fetchProfile, fetchDecks, upsertProfile, upsertCards, migrateLocalToCloud, insertSession, deleteDeck as deleteDeckFromCloud } from './services/cloud'
import { DEMO_DECK, DEMO_CARDS } from './data/demoCards'

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [user, setUser] = useState(null)
  const [decks, setDecks] = useState([])
  const [uploadSource, setUploadSource] = useState(null)
  const [studyCards, setStudyCards] = useState([])
  const [activeDeckId, setActiveDeckId] = useState(null)
  const [sessionResults, setSessionResults] = useState(null)
  const [companionDeckId, setCompanionDeckId] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [authSession, setAuthSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradedBanner, setUpgradedBanner] = useState(false)

  useEffect(() => {
    if (window.location.search.includes('upgraded=true')) {
      setUpgradedBanner(true)
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setUpgradedBanner(false), 6000)
    }
  }, [])

  useEffect(() => {
    const u = storage.getUser()
    const d = storage.getDecks()
    setUser(u)
    setDecks(d)
    setScreen(u ? 'dashboard' : 'welcome')

    if (!isSupabaseEnabled()) return

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        setAuthSession(session)
        syncFromCloud(session.user, u, d)
      }
    })

    // Listen for auth changes (magic link callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const su = session?.user ?? null
      setAuthUser(su)
      setAuthSession(session)
      if (su) {
        const localUser = storage.getUser()
        const localDecks = storage.getDecks()
        syncFromCloud(su, localUser, localDecks)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function syncFromCloud(supabaseUser, localUser, localDecks) {
    setSyncing(true)
    try {
      // Always run migration: handles empty cloud, conflict resolution, and new decks
      await migrateLocalToCloud(supabaseUser.id, localUser, localDecks)

      // Cloud is now the source of truth — load everything fresh
      const cloudProfile = await fetchProfile(supabaseUser.id)
      const cloudDecks = await fetchDecks(supabaseUser.id)

      // Clear stale localStorage data (cloud is now canonical)
      storage.clearAll()

      if (cloudProfile) {
        const merged = {
          name: cloudProfile.name || localUser?.name || 'Estudiante',
          streak: cloudProfile.streak ?? 0,
          lastStudyDate: cloudProfile.last_study_date || null,
          totalSessions: cloudProfile.total_sessions ?? 0,
          xp: cloudProfile.xp ?? 0,
          streakShields: cloudProfile.streak_shields ?? 1,
          lastShieldWeek: cloudProfile.last_shield_week ?? null,
          plan: cloudProfile.plan ?? 'free',
        }
        storage.saveUser(merged)
        setUser(merged)
      }
      if (cloudDecks?.length) {
        storage.saveDecks(cloudDecks)
        setDecks(cloudDecks)
      }
      setLastSynced(new Date())
    } catch (err) {
      console.error('Sync error:', err)
    }
    setSyncing(false)
  }

  async function pushToCloud() {
    if (!authUser || syncing) return
    setSyncing(true)
    try {
      const currentUser = storage.getUser()
      const currentDecks = storage.getDecks()
      await migrateLocalToCloud(authUser.id, currentUser, currentDecks)
      setLastSynced(new Date())
    } catch (err) {
      console.error('Push sync error:', err)
    }
    setSyncing(false)
  }

  async function handleUpgrade() {
    if (!authUser || upgrading) return
    setUpgrading(true)
    try {
      const token = authSession?.access_token
      if (!token) {
        alert('Tu sesión expiró. Volvé a iniciar sesión.')
        setUpgrading(false)
        return
      }
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert(data.error || 'No se pudo iniciar el pago.')
        setUpgrading(false)
      }
    } catch {
      alert('Error al conectar con el servicio de pago.')
      setUpgrading(false)
    }
  }

  function handleSetupComplete(name) {
    const u = storage.createUser(name)
    setUser(u)
    setScreen('upload')
  }

  function handleTryExample(name) {
    const u = storage.createUser(name)
    setUser(u)
    // Add the demo deck to storage so it appears in Dashboard after the session
    const deck = { ...DEMO_DECK, cards: DEMO_CARDS, createdAt: new Date().toISOString() }
    const updatedDecks = storage.addDeck(deck)
    setDecks(updatedDecks)
    setStudyCards(DEMO_CARDS)
    setActiveDeckId(DEMO_DECK.id)
    setScreen('study')
  }

  function handleUploadReady(source) {
    setUploadSource(source)
    setScreen('processing')
  }

  function handleDeckCreated(deck) {
    const existingTitles = decks.map(d => d.title)
    let title = deck.title
    if (existingTitles.includes(title)) {
      let i = 2
      while (existingTitles.includes(`${deck.title} (${i})`)) i++
      title = `${deck.title} (${i})`
    }
    const finalDeck = title !== deck.title ? { ...deck, title } : deck
    const updatedDecks = storage.addDeck(finalDeck)
    setDecks(updatedDecks)
    setActiveDeckId(finalDeck.id)
    setScreen('preview')
  }

  function handlePreviewStart(modifiedCards) {
    const updatedDecks = decks.map(d =>
      d.id === activeDeckId ? { ...d, cards: modifiedCards, cardCount: modifiedCards.length } : d
    )
    storage.saveDecks(updatedDecks)
    setDecks(updatedDecks)
    const studySet = modifiedCards.slice(0, Math.min(modifiedCards.length, 20))
    setStudyCards(studySet)
    setScreen('study')
  }

  function handleStudyExit(partialUpdatedCards) {
    if (partialUpdatedCards.length > 0) {
      const updatedDecks = storage.updateCards(activeDeckId, partialUpdatedCards)
      setDecks(updatedDecks)
    }
    setScreen('dashboard')
  }

  async function handleDeleteDeck(deckId) {
    const updatedDecks = storage.deleteDeck(deckId)
    setDecks(updatedDecks)
    if (authUser) {
      try { await deleteDeckFromCloud(authUser.id, deckId) } catch (err) { console.error('Delete deck cloud error:', err) }
    }
  }

  function handleStudyDeck(deckId) {
    const deck = decks.find(d => d.id === deckId)
    if (!deck) return
    const due = getDueCards(deck.cards)
    setStudyCards(due.length > 0 ? due : deck.cards.slice(0, 10))
    setActiveDeckId(deckId)
    setScreen('study')
  }

  async function handleSessionComplete(results) {
    const updatedDecks = storage.updateCards(activeDeckId, results.updatedCards)
    setDecks(updatedDecks)

    const levelBefore = getLevel(user.xp)
    const streakResult = storage.updateStreak(user)
    const { shieldUsed, ...updatedUser } = streakResult
    const userWithXP = storage.addXP(updatedUser, results.xpEarned)
    const levelAfter = getLevel(userWithXP.xp)
    setUser(userWithXP)

    const levelUp = levelAfter.level > levelBefore.level ? levelAfter : null
    setSessionResults({ ...results, xpEarned: results.xpEarned, levelUp, shieldUsed })
    setScreen('complete')

    // Sync updated cards + profile + session log to cloud in background
    if (authUser) {
      const endTime = new Date().toISOString()
      try { await upsertCards(authUser.id, activeDeckId, results.updatedCards) } catch (err) { console.error('upsertCards error:', err) }
      try { await upsertProfile(authUser.id, userWithXP) } catch (err) { console.error('upsertProfile error:', err) }
      try {
        await insertSession(authUser.id, activeDeckId, {
          startTime: results.startTime,
          endTime,
          cardsStudied: results.total,
          correctAnswers: results.correct,
        })
      } catch (err) { console.error('insertSession error:', err) }
      setLastSynced(new Date())
    }
  }

  function handleSessionDone() {
    setSessionResults(null)
    setScreen('dashboard')
  }

  function handleOpenCompanion(deckId) {
    setCompanionDeckId(deckId)
    setScreen('companion')
  }

  if (screen === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <>
      {screen === 'welcome' && (
        <Welcome onSetupComplete={handleSetupComplete} onTryExample={handleTryExample} />
      )}
      {screen === 'upload' && (
        <Upload
          onReady={handleUploadReady}
          onBack={() => setScreen(user ? 'dashboard' : 'welcome')}
        />
      )}
      {screen === 'processing' && (
        <Processing
          source={uploadSource}
          onComplete={handleDeckCreated}
          onError={() => setScreen('upload')}
        />
      )}
      {screen === 'preview' && activeDeckId && (
        <CardPreview
          deck={decks.find(d => d.id === activeDeckId)}
          source={uploadSource}
          onStart={handlePreviewStart}
          onBack={() => setScreen('upload')}
        />
      )}
      {upgradedBanner && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'linear-gradient(135deg, var(--primary), var(--teal))',
          color: '#fff', padding: '12px 24px', borderRadius: 14, fontWeight: 700,
          fontSize: 14, boxShadow: '0 4px 24px rgba(139,92,246,0.4)',
          animation: 'pop 0.3s ease',
        }}>
          ✨ ¡Bienvenido a Cognify Pro! Tu cuenta ya está activa.
        </div>
      )}
      {screen === 'dashboard' && user && (
        <Dashboard
          user={user}
          decks={decks}
          onStudy={handleStudyDeck}
          onCompanion={handleOpenCompanion}
          onNewDeck={() => setScreen('upload')}
          authUser={authUser}
          syncing={syncing}
          lastSynced={lastSynced}
          onShowAuth={() => setShowAuth(true)}
          onSync={pushToCloud}
          onDeleteDeck={handleDeleteDeck}
          onUpgrade={handleUpgrade}
          upgrading={upgrading}
        />
      )}
      {screen === 'study' && (
        <StudySession
          cards={studyCards}
          deckId={activeDeckId}
          onComplete={handleSessionComplete}
          onExit={handleStudyExit}
        />
      )}
      {screen === 'complete' && sessionResults && (
        <SessionComplete
          results={sessionResults}
          user={user}
          authUser={authUser}
          onDone={handleSessionDone}
          onShowAuth={() => setShowAuth(true)}
        />
      )}
      {screen === 'companion' && companionDeckId && (
        <CompanionChat
          deck={decks.find(d => d.id === companionDeckId)}
          onClose={() => setScreen('dashboard')}
        />
      )}
      {showAuth && (
        <Auth onClose={() => setShowAuth(false)} />
      )}
    </>
  )
}
