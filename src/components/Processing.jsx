import { useEffect, useState } from 'react'
import { createCard } from '../services/fsrs'

const MESSAGES = [
  'Leyendo tu material...',
  'Identificando los conceptos clave...',
  'Generando flashcards...',
  'Creando preguntas de opción múltiple...',
  'Ajustando dificultad...',
  '¡Casi listo!',
]

// Chips that appear sequentially as progress advances
// Each chip appears when msgIndex >= threshold
const PROGRESS_CHIPS = [
  { label: 'Análisis ✓',        threshold: 1, color: 'var(--primary-light)', bg: 'var(--primary-dim)',  border: 'rgba(139,92,246,0.3)' },
  { label: 'Flashcards ✓',      threshold: 2, color: 'var(--teal)',          bg: 'var(--teal-dim)',     border: 'rgba(34,211,238,0.3)'  },
  { label: 'Preguntas ✓',       threshold: 3, color: 'var(--pink-light)',    bg: 'var(--pink-dim)',     border: 'rgba(244,63,94,0.25)'  },
  { label: 'FSRS calibrado ✓',  threshold: 4, color: 'var(--accent)',        bg: 'var(--accent-dim)',   border: 'rgba(251,191,36,0.3)'  },
]

export default function Processing({ source, onComplete, onError }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dots, setDots] = useState('.')
  const [error, setError] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => Math.min(i + 1, MESSAGES.length - 1))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    generate()
  }, [])

  async function generate() {
    let res
    try {
      res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: source.text,
          fileData: source.fileData,
          cardCount: source.cardCount,
        }),
      })
    } catch {
      setError('Sin conexión — verificá tu internet y volvé a intentarlo.')
      return
    }

    if (res.status === 429) {
      setError('Demasiadas solicitudes — esperá un momento y volvé a intentarlo.')
      return
    }
    if (!res.ok) {
      setError('No pudimos leer ese material — probá pegando el texto directamente.')
      return
    }

    try {
      const data = await res.json()
      if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
        setError('No pudimos extraer tarjetas de ese material — probá con un texto más largo o diferente.')
        return
      }
      const deckId = `deck_${Date.now()}`
      const cards = data.cards.map(c => createCard(c, deckId))
      const deck = {
        id: deckId,
        title: source.title,
        createdAt: new Date().toISOString(),
        goal: source.goal || null,
        chapter: source.chapter || null,
        cards,
      }
      onComplete(deck)
    } catch {
      setError('Ocurrió un error inesperado — volvé a intentarlo.')
    }
  }

  const progress = ((msgIndex + 1) / MESSAGES.length) * 100

  if (error) {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <div className="container animate-fade" style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😔</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Algo salió mal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>{error}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => { setError(null); generate() }}
              style={{ width: '100%', padding: '13px', fontSize: 15 }}
            >
              🔄 Reintentar
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onError()}
              style={{ width: '100%', padding: '12px', fontSize: 14 }}
            >
              ← Volver a cargar material
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <div className="container animate-fade" style={{ textAlign: 'center', maxWidth: 400 }}>

        <div style={{ fontSize: 72, marginBottom: 24, animation: 'float 2s ease-in-out infinite' }}>🐶</div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Kuma está trabajando{dots}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 14, minHeight: 20, transition: 'all 0.3s' }}>
          {MESSAGES[msgIndex]}
        </p>

        <div className="progress-bar" style={{ marginBottom: 32 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', minHeight: 36 }}>
          {PROGRESS_CHIPS.map((chip) => {
            const visible = msgIndex >= chip.threshold
            return (
              <span
                key={chip.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 13px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  background: chip.bg,
                  color: chip.color,
                  border: `1px solid ${chip.border}`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.9)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  boxShadow: visible ? `0 2px 10px ${chip.bg}` : 'none',
                }}
              >
                {chip.label}
              </span>
            )
          })}
        </div>

      </div>
    </div>
  )
}
