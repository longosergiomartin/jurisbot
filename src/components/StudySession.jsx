import { useState, useEffect, useCallback } from 'react'
import { scheduleCard } from '../services/fsrs'

const RATING_CONFIG = [
  { value: 1, label: 'No lo sabía', emoji: '❌', color: 'var(--danger)', bg: 'var(--danger-dim)' },
  { value: 2, label: 'Difícil', emoji: '😬', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 3, label: 'Bien', emoji: '✅', color: 'var(--success)', bg: 'var(--success-dim)' },
  { value: 4, label: 'Fácil', emoji: '⭐', color: 'var(--accent)', bg: 'var(--accent-dim)' },
]

export default function StudySession({ cards, deckId, onComplete }) {
  const [queue, setQueue] = useState(() => [...cards])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [mcqResult, setMcqResult] = useState(null) // 'correct' | 'wrong'
  const [aiFeedback, setAiFeedback] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [updatedCards, setUpdatedCards] = useState([])
  const [results, setResults] = useState({ correct: 0, wrong: 0 })
  const [startTime] = useState(Date.now())
  const [cardStartTime, setCardStartTime] = useState(Date.now())

  const current = queue[currentIndex]
  const total = cards.length
  const progress = Math.round((currentIndex / total) * 100)

  useEffect(() => {
    setRevealed(false)
    setSelectedOption(null)
    setMcqResult(null)
    setAiFeedback(null)
    setCardStartTime(Date.now())
  }, [currentIndex])

  async function fetchFeedback(question, correctAnswer, userAnswer) {
    setLoadingFeedback(true)
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, correctAnswer, userAnswer }),
      })
      const data = await res.json()
      setAiFeedback(data.feedback || null)
    } catch {
      // Fail silently — feedback is a bonus
    }
    setLoadingFeedback(false)
  }

  function handleReveal() {
    setRevealed(true)
    fetchFeedback(current.front, current.back, '(sin respuesta del usuario)')
  }

  function handleMCQSelect(index) {
    if (mcqResult) return
    setSelectedOption(index)
    const correct = index === current.correctIndex
    setMcqResult(correct ? 'correct' : 'wrong')
    setRevealed(true)
    if (!correct) {
      fetchFeedback(current.front, current.back, current.options[index])
    }
  }

  const handleRate = useCallback((rating) => {
    const now = new Date()
    const scheduled = scheduleCard(current, rating, now)
    setUpdatedCards(prev => [...prev, scheduled])

    const isCorrect = rating >= 3
    setResults(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
    }))

    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      // Session done
      const allUpdated = [...updatedCards, scheduled]
      onComplete({
        updatedCards: allUpdated,
        correct: results.correct + (isCorrect ? 1 : 0),
        wrong: results.wrong + (isCorrect ? 0 : 1),
        total,
        timeSeconds: Math.round((Date.now() - startTime) / 1000),
        xpEarned: (results.correct + (isCorrect ? 1 : 0)) * 10 + total * 2,
      })
    } else {
      setCurrentIndex(nextIndex)
    }
  }, [current, currentIndex, queue, updatedCards, results, total, startTime, onComplete])

  if (!current) return null

  return (
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
          <span className={`chip chip-primary`} style={{ fontSize: 11 }}>
            {current.type === 'mcq' ? '🔘 Opción múltiple' : '🃏 Flashcard'}
          </span>
        </div>

        {/* Card */}
        <div
          className="card animate-fade"
          style={{ marginBottom: 16, minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 24px' }}
        >
          <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6, textAlign: 'center' }}>
            {current.front}
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

          {/* Flashcard revealed answer */}
          {current.type === 'flashcard' && revealed && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Respuesta:</p>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>{current.back}</p>
            </div>
          )}
        </div>

        {/* AI Feedback (Kai) */}
        {revealed && (
          <div className="kai-bubble animate-fade" style={{ marginBottom: 16 }}>
            <span className="kai-avatar">🦊</span>
            <div className="kai-text">
              {loadingFeedback ? (
                <span style={{ opacity: 0.6, animation: 'pulse 1.5s infinite' }}>Kai está pensando...</span>
              ) : (
                aiFeedback || (current.type === 'mcq' && mcqResult === 'correct'
                  ? '¡Excelente! Esa es la respuesta correcta.'
                  : current.type === 'mcq' && mcqResult === 'wrong'
                  ? `La respuesta correcta era: "${current.options[current.correctIndex]}". ${current.back}`
                  : 'Ahora calificá qué tan bien la sabías.')
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {current.type === 'flashcard' && !revealed && (
          <button
            className="btn btn-primary"
            onClick={handleReveal}
            style={{ width: '100%', padding: '15px', fontSize: 16 }}
          >
            Mostrar respuesta
          </button>
        )}

        {revealed && (
          <div className="animate-pop">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
              ¿Cómo te fue con esta tarjeta?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {RATING_CONFIG.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRate(r.value)}
                  style={{
                    background: r.bg,
                    border: `1px solid ${r.color}30`,
                    borderRadius: 12,
                    padding: '12px 8px',
                    color: r.color,
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MCQ auto-proceed after selecting */}
        {current.type === 'mcq' && mcqResult && (
          <div className="animate-pop" style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
              ¿Cómo te resultó la pregunta?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {RATING_CONFIG.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRate(r.value)}
                  style={{
                    background: r.bg,
                    border: `1px solid ${r.color}30`,
                    borderRadius: 12,
                    padding: '12px 8px',
                    color: r.color,
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
