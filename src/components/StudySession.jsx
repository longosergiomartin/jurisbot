import { useState, useEffect, useCallback, useRef } from 'react'
import { scheduleCard, retrievability } from '../services/fsrs'
import SocraticSession from './SocraticSession'

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null


const RATING_CONFIG = [
  { value: 1, label: 'Otra vez', emoji: '🔄', color: 'var(--danger)', bg: 'var(--danger-dim)', hint: 'Volverá a aparecer pronto' },
  { value: 2, label: 'Difícil', emoji: '😬', color: '#f97316', bg: 'rgba(249,115,22,0.12)', hint: 'Lo verás en unos días' },
  { value: 3, label: 'Bien', emoji: '✅', color: 'var(--success)', bg: 'var(--success-dim)', hint: '~1 semana hasta verlo de nuevo' },
  { value: 4, label: 'Fácil', emoji: '⭐', color: 'var(--accent)', bg: 'var(--accent-dim)', hint: 'Lo tenés dominado — intervalo largo' },
]

const CARD_LABELS = {
  flashcard: '🃏 Flashcard',
  mcq: '🔘 Opción múltiple',
  short_answer: '✍️ Respuesta corta',
}

export default function StudySession({ cards, deckId, onComplete, onExit }) {
  const [queue] = useState(() => [...cards])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [mcqResult, setMcqResult] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [shortAnswerSubmitted, setShortAnswerSubmitted] = useState(false)
  const [showSocratic, setShowSocratic] = useState(false)
  const [pendingRating, setPendingRating] = useState(null)
  const [updatedCards, setUpdatedCards] = useState([])
  const [results, setResults] = useState({ correct: 0, wrong: 0 })
  const [xpBonus, setXpBonus] = useState(0)
  const [startTime] = useState(Date.now())
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [undoState, setUndoState] = useState(null)
  const [canUndo, setCanUndo] = useState(false)
  const [showCoachmark, setShowCoachmark] = useState(
    () => !localStorage.getItem('cognify_rating_coach_seen')
  )
  const [isListening, setIsListening] = useState(false)
  const [voiceToast, setVoiceToast] = useState(null)
  const recognitionRef = useRef(null)
  const answerInputRef = useRef(null)

  const current = queue[currentIndex]
  const total = cards.length
  const progress = Math.round((currentIndex / total) * 100)
  const question = current?.front || current?.question || ''

  // CG-2: potential bonus XP for recalling this card correctly (shown after reveal)
  const currentBonus = (() => {
    if (!current || current.state !== 'review' || !current.stability || !current.lastReview) return 0
    const elapsed = Math.max(0, (Date.now() - new Date(current.lastReview).getTime()) / 86400000)
    const r = retrievability(current.stability, elapsed)
    return Math.round(Math.max(0, 1 - r) * 20)
  })()

  useEffect(() => {
    setRevealed(false)
    setSelectedOption(null)
    setMcqResult(null)
    setAiFeedback(null)
    setUserAnswer('')
    setShortAnswerSubmitted(false)
    setShowSocratic(false)
    setPendingRating(null)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [currentIndex])

  useEffect(() => {
    if (!voiceToast) return
    const t = setTimeout(() => setVoiceToast(null), 3500)
    return () => clearTimeout(t)
  }, [voiceToast])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  function handleMicClick() {
    if (!SpeechRecognitionAPI) {
      setVoiceToast({ type: 'warning', message: 'Tu navegador no soporta dictado por voz. Usá el teclado.' })
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'es-ES'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setUserAnswer(prev => (prev ? `${prev} ${transcript}` : transcript))
      answerInputRef.current?.blur()
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setVoiceToast({ type: 'warning', message: 'Permiso de micrófono denegado. Usa el teclado.' })
      } else if (event.error === 'no-speech') {
        setVoiceToast({ type: 'info', message: 'No te escuchamos. Toca el botón y habla de nuevo.' })
      }
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  async function fetchFeedback(q, correctAns, userAns, isCorrect) {
    setLoadingFeedback(true)
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, correctAnswer: correctAns, userAnswer: userAns, isCorrect }),
      })
      const data = await res.json()
      setAiFeedback(data.feedback || null)
    } catch {
      // Feedback is a bonus, fail silently
    }
    setLoadingFeedback(false)
  }

  function handleReveal() {
    setCanUndo(false)
    setUndoState(null)
    setRevealed(true)
  }

  function handleMCQSelect(index) {
    if (mcqResult) return
    setCanUndo(false)
    setUndoState(null)
    setSelectedOption(index)
    const correct = index === current.correctIndex
    setMcqResult(correct ? 'correct' : 'wrong')
    setRevealed(true)
    if (!correct) {
      fetchFeedback(question, current.back || current.explanation, current.options[index], false)
    }
  }

  async function handleShortAnswerSubmit() {
    if (!userAnswer.trim()) return
    setCanUndo(false)
    setUndoState(null)
    setShortAnswerSubmitted(true)
    setRevealed(true)
    await fetchFeedback(question, current.back, userAnswer)
  }

  function selectRating(value) {
    if (pendingRating !== null) return
    setUndoState({ currentIndex, updatedCards: [...updatedCards], results: { ...results }, xpBonus })
    setPendingRating(value)
    setTimeout(() => handleRate(value), 480)
  }

  const handleRate = useCallback((rating) => {
    // CG-2: compute pre-schedule retrievability bonus for review cards recalled correctly
    let cardBonus = 0
    if (rating >= 3 && current.state === 'review' && current.stability > 0 && current.lastReview) {
      const elapsed = Math.max(0, (Date.now() - new Date(current.lastReview).getTime()) / 86400000)
      const r = retrievability(current.stability, elapsed)
      cardBonus = Math.round(Math.max(0, 1 - r) * 20)
    }
    const newXpBonus = xpBonus + cardBonus

    const scheduled = scheduleCard(current, rating, new Date())
    const newUpdatedCards = [...updatedCards, scheduled]
    setUpdatedCards(newUpdatedCards)
    setXpBonus(newXpBonus)

    const isCorrect = rating >= 3
    const newResults = {
      correct: results.correct + (isCorrect ? 1 : 0),
      wrong: results.wrong + (isCorrect ? 0 : 1),
    }
    setResults(newResults)

    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete({
        updatedCards: newUpdatedCards,
        correct: newResults.correct,
        wrong: newResults.wrong,
        total,
        timeSeconds: Math.round((Date.now() - startTime) / 1000),
        xpEarned: newResults.correct * 10 + total * 2 + newXpBonus,
        xpBonus: newXpBonus,
        startTime: new Date(startTime).toISOString(),
      })
    } else {
      setCurrentIndex(nextIndex)
      setCanUndo(true)
    }
  }, [current, currentIndex, queue, updatedCards, results, xpBonus, total, startTime, onComplete])

  function handleUndo() {
    if (!canUndo || !undoState) return
    setCurrentIndex(undoState.currentIndex)
    setUpdatedCards(undoState.updatedCards)
    setResults(undoState.results)
    setXpBonus(undoState.xpBonus ?? 0)
    setCanUndo(false)
    setUndoState(null)
    setPendingRating(null)
  }

  function dismissCoachmark() {
    localStorage.setItem('cognify_rating_coach_seen', '1')
    setShowCoachmark(false)
  }

  if (!current) return null

const mcqExplanation = current.back || current.explanation || ''

  return (
    <>
      {voiceToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000,
          background: voiceToast.type === 'warning' ? 'var(--danger)' : 'var(--primary)',
          color: '#fff', padding: '12px 20px', borderRadius: 14, fontWeight: 600,
          fontSize: 13, boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          animation: 'popIn 0.3s ease',
          maxWidth: '85vw', textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {voiceToast.type === 'warning' ? '⚠️ ' : 'ℹ️ '}{voiceToast.message}
        </div>
      )}

      {showSocratic && (
        <SocraticSession
          concept={question}
          modelAnswer={current.back}
          onClose={() => setShowSocratic(false)}
        />
      )}

      {/* UX-10: Exit confirm modal */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 16px 24px',
        }}>
          <div className="card animate-pop" style={{ maxWidth: 380, width: '100%', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¿Salir de la sesión?</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Vas a perder el progreso de esta sesión. Las tarjetas ya calificadas se guardan igual.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowExitConfirm(false)}
                style={{ flex: 1, fontSize: 14 }}
              >
                Seguir estudiando
              </button>
              <button
                onClick={() => onExit && onExit(updatedCards)}
                style={{
                  flex: 1, fontSize: 14, fontWeight: 600,
                  background: 'var(--danger-dim)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: 'var(--danger)',
                  borderRadius: 12, padding: '11px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="screen" style={{ paddingTop: 16 }}>
        <div className="container animate-fade">

          {/* Progress header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* UX-10: exit button */}
                <button
                  onClick={() => setShowExitConfirm(true)}
                  title="Salir de la sesión"
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontSize: 20,
                    cursor: 'pointer', padding: '0 2px', lineHeight: 1,
                  }}
                >
                  ×
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {currentIndex + 1} / {total}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* UX-13: undo button */}
                {canUndo && (
                  <button
                    onClick={handleUndo}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '3px 10px',
                      color: 'var(--text-muted)', fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ↩ Deshacer
                  </button>
                )}
                <span style={{ fontSize: 13, color: 'var(--success)' }}>✅ {results.correct}</span>
                <span style={{ fontSize: 13, color: 'var(--danger)' }}>❌ {results.wrong}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Card type badge */}
          <div style={{ marginBottom: 16 }}>
            <span className="chip chip-primary" style={{ fontSize: 11 }}>
              {CARD_LABELS[current.type] || '🃏 Flashcard'}
            </span>
          </div>

          {/* Card */}
          <div
            className="card animate-fade"
            style={{ marginBottom: 16, minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 24px' }}
          >
            <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6, textAlign: 'center' }}>
              {question}
            </p>

            {/* MCQ options */}
            {current.type === 'mcq' && current.options && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {current.options.map((opt, i) => {
                  const isSelected = selectedOption === i
                  const isCorrect = i === current.correctIndex
                  let bg = 'rgba(255,255,255,0.04)'
                  let border = 'var(--border)'
                  let color = 'var(--text)'
                  if (mcqResult) {
                    if (isCorrect) { bg = 'var(--success-dim)'; border = 'var(--success)'; color = 'var(--success)' }
                    else if (isSelected && !isCorrect) { bg = 'var(--danger-dim)'; border = 'var(--danger)'; color = 'var(--danger)' }
                  } else if (isSelected) {
                    bg = 'var(--primary-dim)'; border = 'var(--primary)'
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleMCQSelect(i)}
                      disabled={!!mcqResult}
                      style={{
                        background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
                        padding: '12px 16px', textAlign: 'left', color, fontSize: 14,
                        transition: 'all 0.2s', cursor: mcqResult ? 'default' : 'pointer',
                      }}
                    >
                      <span style={{ fontWeight: 600, marginRight: 8, opacity: 0.6 }}>{String.fromCharCode(65 + i)}.</span>
                      {opt}
                      {mcqResult && isCorrect && <span style={{ float: 'right' }}>✓</span>}
                      {mcqResult && isSelected && !isCorrect && <span style={{ float: 'right' }}>✗</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Short answer: input */}
            {current.type === 'short_answer' && !shortAnswerSubmitted && (
              <div style={{ marginTop: 20, position: 'relative' }}>
                <textarea
                  ref={answerInputRef}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Escribí tu respuesta con tus propias palabras..."
                  rows={4}
                  className="short-answer-input"
                  style={{ paddingRight: 48 }}
                />
                <button
                  onClick={handleMicClick}
                  title={isListening ? 'Detener dictado' : 'Dictar por voz'}
                  style={{
                    position: 'absolute', right: 8, bottom: 8,
                    width: 36, height: 36, borderRadius: '50%',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, transition: 'all 0.2s',
                    background: isListening ? 'var(--danger)' : 'var(--primary-dim)',
                    color: isListening ? '#fff' : 'var(--primary-light)',
                    boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.25)' : 'none',
                    animation: isListening ? 'pulse 1.2s infinite' : 'none',
                  }}
                >
                  🎤
                </button>
              </div>
            )}

            {/* Short answer: revealed */}
            {current.type === 'short_answer' && shortAnswerSubmitted && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Tu respuesta:</p>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic', marginBottom: 16 }}>
                  "{userAnswer}"
                </p>
                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Respuesta esperada:</p>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{current.back}</p>
                </div>
              </div>
            )}

            {/* Flashcard: revealed answer */}
            {current.type === 'flashcard' && revealed && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Respuesta:</p>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>{current.back}</p>
              </div>
            )}
          </div>

          {/* Kuma feedback bubble */}
          {revealed && (
            <div className="kai-bubble animate-fade" style={{ marginBottom: 16 }}>
              <span className="kai-avatar">🐶</span>
              <div className="kai-text">
                {loadingFeedback ? (
                  <span style={{ opacity: 0.6, animation: 'pulse 1.5s infinite' }}>Kuma está pensando...</span>
                ) : current.type === 'flashcard' ? (
                  '¿Cuánto sabías antes de ver la respuesta? Calificá honestamente. 🐾'
                ) : current.type === 'mcq' && mcqResult === 'correct' ? (
                  '¡Exacto! Esa es la respuesta correcta. 🎯'
                ) : current.type === 'mcq' && mcqResult === 'wrong' ? (
                  aiFeedback || `La respuesta correcta era: "${current.options[current.correctIndex]}". ${mcqExplanation}`
                ) : (
                  aiFeedback || '¿Cómo te fue? Calificá qué tan bien lo sabías.'
                )}
              </div>
            </div>
          )}

          {/* Explain-to-Kuma button (flashcard only, after reveal) */}
          {current.type === 'flashcard' && revealed && (
            <button
              className="btn btn-ghost"
              onClick={() => setShowSocratic(true)}
              style={{ width: '100%', marginBottom: 12, fontSize: 14 }}
            >
              🐶 ¿Lo podés explicar con tus palabras?
            </button>
          )}

          {/* Show answer button — flashcard */}
          {current.type === 'flashcard' && !revealed && (
            <button
              className="btn btn-primary"
              onClick={handleReveal}
              style={{ width: '100%', padding: '15px', fontSize: 16 }}
            >
              Mostrar respuesta
            </button>
          )}

          {/* Submit button — short answer */}
          {current.type === 'short_answer' && !shortAnswerSubmitted && (
            <button
              className="btn btn-primary"
              onClick={handleShortAnswerSubmit}
              disabled={!userAnswer.trim()}
              style={{ width: '100%', padding: '15px', fontSize: 16 }}
            >
              Evaluar mi respuesta
            </button>
          )}

          {/* Rating buttons — flashcard & short_answer */}
          {revealed && current.type !== 'mcq' && (
            <div className="animate-pop" style={{ marginTop: 8 }}>
              {/* CG-2: bonus XP indicator for review cards at risk */}
              {currentBonus > 0 && (
                <div style={{
                  textAlign: 'center', fontSize: 12, fontWeight: 700,
                  color: 'var(--accent)', marginBottom: 8,
                  background: 'var(--accent-dim)', border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 10, padding: '5px 10px',
                }}>
                  🔥 +{currentBonus} XP bonus si la recordás
                </div>
              )}
              {/* UX-07: First-session coachmark */}
              {showCoachmark && currentIndex === 0 && (
                <div
                  id="rating-coachmark"
                  style={{
                    background: 'var(--primary-dim)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    marginBottom: 12,
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={dismissCoachmark}
                    style={{
                      position: 'absolute', top: 8, right: 10,
                      background: 'none', border: 'none',
                      color: 'var(--text-muted)', fontSize: 16,
                      cursor: 'pointer', padding: 0, lineHeight: 1,
                    }}
                  >×</button>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 4 }}>
                    🐾 ¿Cómo calificar?
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6 }}>
                    Sé honesto — tu calificación le dice a Kuma cuándo mostrarte esta tarjeta de nuevo.{' '}
                    <strong style={{ color: 'var(--danger)' }}>🔄 Otra vez</strong> = pronto,{' '}
                    <strong style={{ color: 'var(--accent)' }}>⭐ Fácil</strong> = en semanas.
                  </p>
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                ¿Qué tan bien lo sabías?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {RATING_CONFIG.map(r => {
                  const isSelected = pendingRating === r.value
                  const isDimmed = pendingRating !== null && !isSelected
                  return (
                    <button
                      key={r.value}
                      onClick={() => selectRating(r.value)}
                      disabled={pendingRating !== null}
                      style={{
                        background: isSelected ? r.color : r.bg,
                        border: `1.5px solid ${isSelected ? r.color : r.color + '40'}`,
                        borderRadius: 14,
                        padding: '10px 8px 8px',
                        color: isSelected ? '#fff' : r.color,
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        opacity: isDimmed ? 0.28 : 1,
                        boxShadow: isSelected ? `0 4px 16px ${r.color}55` : 'none',
                        cursor: pendingRating !== null ? 'default' : 'pointer',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isSelected ? '✓' : r.emoji} {r.label}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 400,
                        opacity: isSelected ? 0.85 : 0.6,
                        color: isSelected ? '#fff' : r.color,
                        lineHeight: 1.3, textAlign: 'center',
                      }}>
                        {r.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rating — MCQ incorrecto: auto-rating Again, botón único para continuar */}
          {current.type === 'mcq' && mcqResult === 'wrong' && (
            <div className="animate-pop" style={{ marginTop: 8 }}>
              <div style={{
                background: 'var(--danger-dim)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, margin: 0 }}>
                  Kuma reprogramó esta tarjeta para refuerzo pronto
                </p>
              </div>
              <button
                onClick={() => selectRating(1)}
                disabled={pendingRating !== null}
                style={{
                  width: '100%',
                  background: pendingRating !== null ? 'rgba(239,68,68,0.18)' : 'var(--danger)',
                  border: 'none',
                  borderRadius: 14,
                  padding: '13px 8px',
                  color: pendingRating !== null ? 'var(--danger)' : '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: pendingRating !== null ? 'default' : 'pointer',
                  opacity: pendingRating !== null ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {pendingRating !== null ? '✓ Programado' : 'Continuar →'}
              </button>
            </div>
          )}

          {/* Rating — MCQ correcto: solo Bien / Fácil */}
          {current.type === 'mcq' && mcqResult === 'correct' && (
            <div className="animate-pop" style={{ marginTop: 8 }}>
              {currentBonus > 0 && (
                <div style={{
                  textAlign: 'center', fontSize: 12, fontWeight: 700,
                  color: 'var(--accent)', marginBottom: 8,
                  background: 'var(--accent-dim)', border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 10, padding: '5px 10px',
                }}>
                  🔥 +{currentBonus} XP bonus por esta recuperación
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                ¿Te costó pensarlo?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {RATING_CONFIG.filter(r => r.value === 3 || r.value === 4).map(r => {
                  const isSelected = pendingRating === r.value
                  const isDimmed = pendingRating !== null && !isSelected
                  return (
                    <button
                      key={r.value}
                      onClick={() => selectRating(r.value)}
                      disabled={pendingRating !== null}
                      style={{
                        background: isSelected ? r.color : r.bg,
                        border: `1.5px solid ${isSelected ? r.color : r.color + '40'}`,
                        borderRadius: 14,
                        padding: '10px 8px 8px',
                        color: isSelected ? '#fff' : r.color,
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        opacity: isDimmed ? 0.28 : 1,
                        boxShadow: isSelected ? `0 4px 16px ${r.color}55` : 'none',
                        cursor: pendingRating !== null ? 'default' : 'pointer',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isSelected ? '✓' : r.emoji} {r.label}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 400,
                        opacity: isSelected ? 0.85 : 0.6,
                        color: isSelected ? '#fff' : r.color,
                        lineHeight: 1.3, textAlign: 'center',
                      }}>
                        {r.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
