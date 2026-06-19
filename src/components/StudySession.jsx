import { useState, useEffect, useCallback } from 'react'
import { scheduleCard } from '../services/fsrs'
import SocraticSession from './SocraticSession'
import PomodoroTimer from './PomodoroTimer'

const RATING_CONFIG = [
  { value: 1, label: 'No lo sabía', emoji: '❌', color: 'var(--danger)', bg: 'var(--danger-dim)' },
  { value: 2, label: 'Difícil', emoji: '😬', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 3, label: 'Bien', emoji: '✅', color: 'var(--success)', bg: 'var(--success-dim)' },
  { value: 4, label: 'Fácil', emoji: '⭐', color: 'var(--accent)', bg: 'var(--accent-dim)' },
]

const CARD_LABELS = {
  flashcard: '🃏 Flashcard',
  mcq: '🔘 Opción múltiple',
  short_answer: '✍️ Respuesta corta',
}

export default function StudySession({ cards, deckId, onComplete }) {
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
  const [startTime] = useState(Date.now())

  const current = queue[currentIndex]
  const total = cards.length
  const progress = Math.round((currentIndex / total) * 100)
  // Support both field names for backward compat with existing saved cards
  const question = current?.front || current?.question || ''

  useEffect(() => {
    setRevealed(false)
    setSelectedOption(null)
    setMcqResult(null)
    setAiFeedback(null)
    setUserAnswer('')
    setShortAnswerSubmitted(false)
    setShowSocratic(false)
    setPendingRating(null)
  }, [currentIndex])

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
    setRevealed(true)
    // No AI call — answer is already on the card; Kuma prompts rating below
  }

  function handleMCQSelect(index) {
    if (mcqResult) return
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
    setShortAnswerSubmitted(true)
    setRevealed(true)
    await fetchFeedback(question, current.back, userAnswer)
  }

  function selectRating(value) {
    if (pendingRating !== null) return
    setPendingRating(value)
    setTimeout(() => handleRate(value), 480)
  }

  const handleRate = useCallback((rating) => {
    const scheduled = scheduleCard(current, rating, new Date())
    setUpdatedCards(prev => [...prev, scheduled])

    const isCorrect = rating >= 3
    const newResults = {
      correct: results.correct + (isCorrect ? 1 : 0),
      wrong: results.wrong + (isCorrect ? 0 : 1),
    }
    setResults(newResults)

    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete({
        updatedCards: [...updatedCards, scheduled],
        correct: newResults.correct,
        wrong: newResults.wrong,
        total,
        timeSeconds: Math.round((Date.now() - startTime) / 1000),
        xpEarned: newResults.correct * 10 + total * 2,
      })
    } else {
      setCurrentIndex(nextIndex)
    }
  }, [current, currentIndex, queue, updatedCards, results, total, startTime, onComplete])

  if (!current) return null

  const mcqExplanation = current.back || current.explanation || ''

  return (
    <>
      <PomodoroTimer />
      {showSocratic && (
        <SocraticSession
          concept={question}
          modelAnswer={current.back}
          onClose={() => setShowSocratic(false)}
        />
      )}

      <div className="screen" style={{ paddingTop: 16 }}>
        <div className="container animate-fade">

          {/* Progress header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {currentIndex + 1} / {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
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
              <div style={{ marginTop: 20 }}>
                <textarea
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Escribí tu respuesta con tus propias palabras..."
                  rows={4}
                  className="short-answer-input"
                />
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
                        padding: '13px 8px',
                        color: isSelected ? '#fff' : r.color,
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        opacity: isDimmed ? 0.28 : 1,
                        boxShadow: isSelected ? `0 4px 16px ${r.color}55` : 'none',
                      }}
                    >
                      {isSelected ? '✓' : r.emoji} {r.label}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                Kuma usa tu respuesta para saber cuándo mostrarte esta tarjeta de nuevo 🐾
              </p>
            </div>
          )}

          {/* Rating buttons — MCQ */}
          {current.type === 'mcq' && mcqResult && (
            <div className="animate-pop" style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                ¿Qué tan fácil te resultó?
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
                        padding: '13px 8px',
                        color: isSelected ? '#fff' : r.color,
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        opacity: isDimmed ? 0.28 : 1,
                        boxShadow: isSelected ? `0 4px 16px ${r.color}55` : 'none',
                      }}
                    >
                      {isSelected ? '✓' : r.emoji} {r.label}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                Kuma usa tu respuesta para saber cuándo mostrarte esta tarjeta de nuevo 🐾
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
