import { useState, useEffect, useRef } from 'react'
import Welcome from './components/Welcome'
import Upload from './components/Upload'
import Processing from './components/Processing'
import Dashboard from './components/Dashboard'
import CardPreview from './components/CardPreview'
import StudySession from './components/StudySession'
import SessionComplete from './components/SessionComplete'
import CompanionChat from './components/CompanionChat'
import PaywallModal from './components/PaywallModal'
import Auth from './components/Auth'
import CancelSubscriptionModal from './components/CancelSubscriptionModal'
import * as storage from './services/storage'
import { getDueCards } from './services/fsrs'
import { getLevel } from './services/levels'
import { getNewUnlocks } from './services/unlocks'
import { supabase, isSupabaseEnabled } from './services/supabase'
import { fetchProfile, fetchDecks, fetchSubscription, upsertProfile, upsertCards, migrateLocalToCloud, insertSession, deleteDeck as deleteDeckFromCloud } from './services/cloud'
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
  const [syncState, setSyncState] = useState(() => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline'
      return localStorage.getItem('sync_pending_errors') ? 'error' : 'idle'
    } catch { return 'idle' }
  })
  const [lastSynced, setLastSynced] = useState(null)
  const [showSyncToast, setShowSyncToast] = useState(false)
  const syncQueueRef = useRef(null)
  const authUserRef = useRef(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradedBanner, setUpgradedBanner] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallContext, setPaywallContext] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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

  useEffect(() => {
    function handleOffline() {
      setSyncState('offline')
    }
    function handleOnline() {
      if (authUserRef.current) {
        retrySync()
      } else {
        setSyncState('idle')
      }
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  authUserRef.current = authUser

  function getSyncQueue() {
    if (!syncQueueRef.current) {
      try {
        const stored = localStorage.getItem('sync_pending_errors')
        syncQueueRef.current = stored ? JSON.parse(stored) : { cards: null, profile: null, session: null }
      } catch {
        syncQueueRef.current = { cards: null, profile: null, session: null }
      }
    }
    return syncQueueRef.current
  }

  function saveSyncQueue(q) {
    syncQueueRef.current = q
    try {
      const hasPending = q.cards !== null || q.profile !== null || q.session !== null
      if (hasPending) {
        localStorage.setItem('sync_pending_errors', JSON.stringify(q))
      } else {
        localStorage.removeItem('sync_pending_errors')
      }
    } catch {}
  }

  async function retrySync() {
    const u = authUserRef.current
    if (!u) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline')
      return
    }
    const q = getSyncQueue()
    if (!q.cards && !q.profile && !q.session) {
      setSyncState('synced')
      return
    }
    setSyncState('syncing')
    const newQ = { ...q }
    let anyFailed = false

    if (q.cards) {
      try {
        const currentDecks = storage.getDecks()
        const deck = currentDecks.find(d => d.id === q.cards.deckId)
        if (deck) await upsertCards(u.id, q.cards.deckId, deck.cards)
        newQ.cards = null
      } catch { anyFailed = true }
    }
    if (q.profile) {
      try {
        const currentUser = storage.getUser()
        if (currentUser) await upsertProfile(u.id, currentUser)
        newQ.profile = null
      } catch { anyFailed = true }
    }
    if (q.session) {
      try {
        await insertSession(u.id, q.session.deckId, {
          startTime: q.session.startTime,
          endTime: q.session.endTime,
          cardsStudied: q.session.cardsStudied,
          correctAnswers: q.session.correctAnswers,
        })
        newQ.session = null
      } catch { anyFailed = true }
    }

    saveSyncQueue(newQ)
    if (anyFailed) {
      setSyncState('error')
    } else {
      setSyncState('synced')
      setLastSynced(new Date())
    }
  }

  async function syncFromCloud(supabaseUser, localUser, localDecks) {
    setSyncState('syncing')
    try {
      // Always run migration: handles empty cloud, conflict resolution, and new decks
      await migrateLocalToCloud(supabaseUser.id, localUser, localDecks)

      // Cloud is now the source of truth — load everything fresh
      const [cloudProfile, cloudDecks, cloudSub] = await Promise.all([
        fetchProfile(supabaseUser.id),
        fetchDecks(supabaseUser.id),
        fetchSubscription(supabaseUser.id),
      ])
      setSubscription(cloudSub)

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
          monthlyGenerationsUsed: cloudProfile.monthly_generations_used ?? 0,
        }
        storage.saveUser(merged)
        setUser(merged)
      }
      if (cloudDecks?.length) {
        storage.saveDecks(cloudDecks)
        setDecks(cloudDecks)
      }
      setLastSynced(new Date())
      setSyncState('synced')
    } catch (err) {
      console.error('Sync error:', err)
      setSyncState('error')
    }
  }

  async function pushToCloud() {
    if (!authUser || syncState === 'syncing') return
    setSyncState('syncing')
    try {
      const currentUser = storage.getUser()
      const currentDecks = storage.getDecks()
      await migrateLocalToCloud(authUser.id, currentUser, currentDecks)
      saveSyncQueue({ cards: null, profile: null, session: null })
      setSyncState('synced')
      setLastSynced(new Date())
    } catch (err) {
      console.error('Push sync error:', err)
      setSyncState('error')
    }
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
  
  function handleShowPaywall(ctx) {
    setPaywallContext(ctx ?? null)
    setShowPaywall(true)
  }

  function handleClosePaywall() {
    setShowPaywall(false)
    setPaywallContext(null)
  }

  async function handleCancelSubscription(reason) {
    if (!authUser || cancelling) return
    setCancelling(true)
    try {
      const token = authSession?.access_token
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'No se pudo cancelar la suscripción.')
        setCancelling(false)
        return
      }
      // Update local subscription state — keep Pro access until period end
      setSubscription(prev => ({
        ...prev,
        status: 'cancelled',
        current_period_end: data.periodEnd || prev?.current_period_end,
        cancelled_at: new Date().toISOString(),
      }))
      setShowCancelModal(false)
    } catch {
      alert('Error al conectar con el servidor.')
    }
    setCancelling(false)
  }

  function handlePaywallToAuth() {
    setShowPaywall(false)
    setShowAuth(true)
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

    // CG-3: detect new unlocks from level-up and persist them
    const levelUp = levelAfter.level > levelBefore.level ? levelAfter : null
    const newUnlocks = levelUp ? getNewUnlocks(levelBefore.level, levelAfter.level) : []
    const userFinal = newUnlocks.length > 0
      ? { ...userWithXP, unlockedIds: [...(userWithXP.unlockedIds ?? []), ...newUnlocks.map(u => u.id)] }
      : userWithXP
    if (newUnlocks.length > 0) storage.saveUser(userFinal)
    setUser(userFinal)

    setSessionResults({ ...results, xpEarned: results.xpEarned, levelUp, shieldUsed, newUnlocks })
    setScreen('complete')

    // Sync updated cards + profile + session log to cloud in background
    if (authUser) {
      const endTime = new Date().toISOString()
      setSyncState('syncing')
      const q = { cards: null, profile: null, session: null }
      let anyFailed = false

      try {
        await upsertCards(authUser.id, activeDeckId, results.updatedCards)
      } catch {
        anyFailed = true
        q.cards = { deckId: activeDeckId }
      }
      try {
        await upsertProfile(authUser.id, userWithXP)
      } catch {
        anyFailed = true
        q.profile = true
      }
      try {
        await insertSession(authUser.id, activeDeckId, {
          startTime: results.startTime,
          endTime,
          cardsStudied: results.total,
          correctAnswers: results.correct,
        })
      } catch {
        anyFailed = true
        q.session = {
          deckId: activeDeckId,
          startTime: results.startTime,
          endTime,
          cardsStudied: results.total,
          correctAnswers: results.correct,
        }
      }

      saveSyncQueue(q)
      if (anyFailed) {
        setSyncState('error')
      } else {
        setSyncState('synced')
        setLastSynced(new Date())
        setShowSyncToast(true)
        setTimeout(() => setShowSyncToast(false), 5000)
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
          onPaywall={handleShowPaywall}
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
          syncState={syncState}
          lastSynced={lastSynced}
          onShowAuth={() => setShowAuth(true)}
          onRetry={retrySync}
          onDeleteDeck={handleDeleteDeck}
          onUpgrade={handleUpgrade}
          upgrading={upgrading}
          subscription={subscription}
          onCancelSubscription={() => setShowCancelModal(true)}
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
          onPaywall={handleShowPaywall}
        />
      )}
      {showSyncToast && authUser && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, var(--success), var(--teal))',
          color: '#fff', padding: '12px 20px', borderRadius: 14, fontWeight: 600,
          fontSize: 13, boxShadow: '0 4px 24px rgba(52,211,153,0.4)',
          animation: 'pop 0.3s ease',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          ☁️ Tu progreso de hoy está guardado en la nube. ¡Buena racha!
        </div>
      )}
      {showAuth && (
        <Auth onClose={() => setShowAuth(false)} />
      )}
      {showPaywall && (
        <PaywallModal
          context={paywallContext}
          onClose={handleClosePaywall}
          onUpgrade={handleUpgrade}
          upgrading={upgrading}
          authUser={authUser}
          onShowAuth={handlePaywallToAuth}
        />
      )}
      {showCancelModal && subscription && (
        <CancelSubscriptionModal
          subscription={subscription}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          cancelling={cancelling}
        />
      )}
    </>
  )
}
