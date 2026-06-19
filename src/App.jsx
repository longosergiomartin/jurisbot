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
import { fetchProfile, fetchDecks, upsertProfile, upsertCards, migrateLocalToCloud } from './services/cloud'
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
  const [showAuth, setShowAuth] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

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
        syncFromCloud(session.user, u, d)
      }
    })

    // Listen for auth changes (magic link callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const su = session?.user ?? null
      setAuthUser(su)
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
      const cloudProfile = await fetchProfile(supabaseUser.id)
      const cloudDecks = await fetchDecks(supabaseUser.id)

      if (!cloudProfile && !cloudDecks?.length) {
        // First login — migrate local data
        await migrateLocalToCloud(supabaseUser.id, localUser, localDecks)
        setLastSynced(new Date())
      } else {
        // Load cloud data into app
        if (cloudProfile) {
          const merged = {
            ...(localUser || {}),
            name: cloudProfile.name || localUser?.name || 'Estudiante',
            streak: cloudProfile.streak ?? localUser?.streak ?? 0,
            lastStudyDate: cloudProfile.last_study_date || localUser?.lastStudyDate || null,
            totalSessions: cloudProfile.total_sessions ?? localUser?.totalSessions ?? 0,
            xp: cloudProfile.xp ?? localUser?.xp ?? 0,
          }
          storage.saveUser(merged)
          setUser(merged)
        }
        if (cloudDecks?.length) {
          storage.saveDecks(cloudDecks)
          setDecks(cloudDecks)
        }
        setLastSynced(new Date())
      }
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
    const updatedDecks = storage.addDeck(deck)
    setDecks(updatedDecks)
    setActiveDeckId(deck.id)
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

  function handleDeleteDeck(deckId) {
    const updatedDecks = storage.deleteDeck(deckId)
    setDecks(updatedDecks)
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

    // Sync updated cards + profile to cloud in background
    if (authUser) {
      try {
        await upsertCards(authUser.id, activeDeckId, results.updatedCards)
        await upsertProfile(authUser.id, userWithXP)
        setLastSynced(new Date())
      } catch (err) {
        console.error('Post-session sync error:', err)
      }
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
          onStart={handlePreviewStart}
          onBack={() => setScreen('upload')}
        />
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
          onDone={handleSessionDone}
        />
      )}
      {screen === 'companion' && companionDeckId && (
        <CompanionChat
          deck={decks.find(d => d.id === companionDeckId)}
          onClose={() => setScreen('dashboard')}
        />
      )}
      {showAuth && isSupabaseEnabled() && (
        <Auth onClose={() => setShowAuth(false)} />
      )}
    </>
  )
}
