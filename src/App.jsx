import { useState, useEffect } from 'react'
import Welcome from './components/Welcome'
import Upload from './components/Upload'
import Processing from './components/Processing'
import Dashboard from './components/Dashboard'
import StudySession from './components/StudySession'
import SessionComplete from './components/SessionComplete'
import CompanionChat from './components/CompanionChat'
import * as storage from './services/storage'
import { getDueCards } from './services/fsrs'

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [user, setUser] = useState(null)
  const [decks, setDecks] = useState([])
  const [uploadSource, setUploadSource] = useState(null)
  const [studyCards, setStudyCards] = useState([])
  const [activeDeckId, setActiveDeckId] = useState(null)
  const [sessionResults, setSessionResults] = useState(null)
  const [companionDeckId, setCompanionDeckId] = useState(null)

  useEffect(() => {
    const u = storage.getUser()
    const d = storage.getDecks()
    setUser(u)
    setDecks(d)
    setScreen(u ? 'dashboard' : 'welcome')
  }, [])

  function handleSetupComplete(name) {
    const u = storage.createUser(name)
    setUser(u)
    setScreen('upload')
  }

  function handleUploadReady(source) {
    setUploadSource(source)
    setScreen('processing')
  }

  function handleDeckCreated(deck) {
    const updatedDecks = storage.addDeck(deck)
    setDecks(updatedDecks)
    // Start studying immediately after generating
    const cards = deck.cards.slice(0, Math.min(deck.cards.length, 20))
    setStudyCards(cards)
    setActiveDeckId(deck.id)
    setScreen('study')
  }

  function handleStudyDeck(deckId) {
    const deck = decks.find(d => d.id === deckId)
    if (!deck) return
    const due = getDueCards(deck.cards)
    setStudyCards(due.length > 0 ? due : deck.cards.slice(0, 10))
    setActiveDeckId(deckId)
    setScreen('study')
  }

  function handleSessionComplete(results) {
    const updatedDecks = storage.updateCards(activeDeckId, results.updatedCards)
    setDecks(updatedDecks)
    const updatedUser = storage.updateStreak(user)
    const userWithXP = storage.addXP(updatedUser, results.xpEarned)
    setUser(userWithXP)
    setSessionResults({ ...results, xpEarned: results.xpEarned })
    setScreen('complete')
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
        <Welcome onSetupComplete={handleSetupComplete} />
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
      {screen === 'dashboard' && user && (
        <Dashboard
          user={user}
          decks={decks}
          onStudy={handleStudyDeck}
          onCompanion={handleOpenCompanion}
          onNewDeck={() => setScreen('upload')}
        />
      )}
      {screen === 'study' && (
        <StudySession
          cards={studyCards}
          deckId={activeDeckId}
          onComplete={handleSessionComplete}
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
    </>
  )
}
