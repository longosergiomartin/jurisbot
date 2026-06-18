import { useMemo } from 'react'
import { getDueCards } from '../services/fsrs'

const KAI_MESSAGES = [
  name => `¡Hola ${name}! Tenés tarjetas esperando. Tu cerebro está listo para aprender.`,
  name => `${name}, la repetición espaciada es tu superpoder. ¡Vamos!`,
  name => `Hey ${name}! Cada sesión de hoy vale más que estudiar 3 horas mañana.`,
  name => `¡Buenas ${name}! El hábito se construye un día a la vez. 🔥`,
]

function getDailyMessage(name) {
  const dayIndex = new Date().getDay()
  return KAI_MESSAGES[dayIndex % KAI_MESSAGES.length](name)
}

export default function Dashboard({ user, decks, onStudy, onNewDeck }) {
  const deckStats = useMemo(() => {
    return decks.map(deck => {
      const due = getDueCards(deck.cards)
      const total = deck.cards.length
      const learned = deck.cards.filter(c => c.state === 'review').length
      return { ...deck, dueCount: due.length, total, learned }
    })
  }, [decks])

  const totalDue = deckStats.reduce((sum, d) => sum + d.dueCount, 0)

  // Find the deck with most due cards to study
  const bestDeckToStudy = [...deckStats].sort((a, b) => b.dueCount - a.dueCount)[0]

  return (
    <div className="screen" style={{ paddingTop: 20 }}>
      <div className="container animate-fade">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
              ¡Hola, {user.name}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="streak-badge">
            🔥 {user.streak} {user.streak === 1 ? 'día' : 'días'}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Para hoy', value: totalDue, icon: '📚', color: totalDue > 0 ? 'var(--primary-light)' : 'var(--success)' },
            { label: 'Sesiones', value: user.totalSessions, icon: '✅', color: 'var(--text-soft)' },
            { label: 'XP total', value: user.xp, icon: '⭐', color: 'var(--accent)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Kai bubble */}
        <div className="kai-bubble" style={{ marginBottom: 20 }}>
          <span className="kai-avatar">🐶</span>
          <div className="kai-text">{getDailyMessage(user.name)}</div>
        </div>

        {/* Main CTA */}
        {totalDue > 0 && bestDeckToStudy && (
          <button
            className="btn btn-primary"
            onClick={() => onStudy(bestDeckToStudy.id)}
            style={{ width: '100%', padding: '16px', fontSize: 16, marginBottom: 20, borderRadius: 16, position: 'relative', overflow: 'hidden' }}
          >
            <span>⚡ Estudiar ahora</span>
            <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>
              {totalDue} tarjeta{totalDue !== 1 ? 's' : ''}
            </span>
          </button>
        )}

        {totalDue === 0 && decks.length > 0 && (
          <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>¡Todo al día!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tenés tarjetas pendientes por ahora. Volvé más tarde o agrega nuevo material.</div>
          </div>
        )}

        {/* Decks list */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Mis mazos</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{decks.length} mazo{decks.length !== 1 ? 's' : ''}</span>
          </div>

          {decks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Todavía no tenés mazos</div>
              <div style={{ fontSize: 13 }}>Subí tu primer material para empezar</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deckStats.map(deck => (
                <DeckCard key={deck.id} deck={deck} onStudy={onStudy} />
              ))}
            </div>
          )}
        </div>

        {/* Add deck button */}
        <button
          className="btn btn-ghost"
          onClick={onNewDeck}
          style={{ width: '100%', padding: '13px' }}
        >
          + Agregar material
        </button>

      </div>
    </div>
  )
}

function DeckCard({ deck, onStudy }) {
  const progress = deck.total > 0 ? Math.round((deck.learned / deck.total) * 100) : 0

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${deck.dueCount > 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
        borderRadius: 16,
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => deck.dueCount > 0 && onStudy(deck.id)}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deck.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {deck.total} tarjetas · {progress}% dominado
          </div>
        </div>
        {deck.dueCount > 0 && (
          <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
            {deck.dueCount} hoy
          </span>
        )}
        {deck.dueCount === 0 && (
          <span style={{ fontSize: 16 }}>✅</span>
        )}
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
