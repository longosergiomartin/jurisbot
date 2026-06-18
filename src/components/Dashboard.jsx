import { useMemo } from 'react'
import { getDueCards } from '../services/fsrs'
import WeeklyCalendar from './WeeklyCalendar'

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

function getSessionEstimate(totalDue) {
  if (totalDue <= 10) return '~3 min'
  if (totalDue <= 20) return '~5 min'
  return '~8 min'
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

  // Streak-at-risk banner logic
  const today = new Date().toISOString().slice(0, 10)
  const studiedToday = user.lastStudyDate === today
  const showStreakBanner = user.streak > 0 && !studiedToday && totalDue > 0

  const sessionEstimate = getSessionEstimate(totalDue)

  return (
    <div className="screen" style={{ paddingTop: 20 }}>
      <div className="container animate-fade">

        {/* Streak-at-risk banner */}
        {showStreakBanner && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(251,146,60,0.22) 0%, rgba(239,68,68,0.22) 100%)',
              border: '1px solid rgba(251,146,60,0.45)',
              borderRadius: 16,
              padding: '14px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animation: 'streak-pulse 2.4s ease-in-out infinite',
            }}
          >
            <style>{`
              @keyframes streak-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(251,146,60,0); }
                50% { box-shadow: 0 0 16px 4px rgba(251,146,60,0.25); }
              }
            `}</style>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fb923c', marginBottom: 2 }}>
                ⚡ ¡Tu racha de {user.streak} {user.streak === 1 ? 'día' : 'días'} vence hoy!
              </div>
              <div style={{ fontSize: 12, color: 'rgba(251,146,60,0.8)' }}>
                No pierdas el progreso que ya construiste
              </div>
            </div>
            <button
              className="btn"
              onClick={() => bestDeckToStudy && onStudy(bestDeckToStudy.id)}
              style={{
                background: 'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)',
                color: '#fff',
                fontSize: 12,
                padding: '8px 14px',
                borderRadius: 10,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                flexDirection: 'column',
                gap: 0,
                lineHeight: 1.4,
              }}
            >
              <span>Estudiar ahora</span>
              <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 11 }}>toma solo 5 min</span>
            </button>
          </div>
        )}

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
            {
              label: 'Para hoy',
              value: totalDue,
              icon: '📚',
              color: totalDue > 0 ? 'var(--teal)' : 'var(--success)',
              iconBg: 'var(--teal-dim)',
              borderColor: 'rgba(34,211,238,0.2)',
            },
            {
              label: 'Sesiones',
              value: user.totalSessions,
              icon: '✅',
              color: 'var(--text-soft)',
              iconBg: 'var(--success-dim)',
              borderColor: 'rgba(52,211,153,0.15)',
            },
            {
              label: 'XP total',
              value: user.xp,
              icon: '⭐',
              color: 'var(--accent)',
              iconBg: 'var(--accent-dim)',
              borderColor: 'rgba(251,191,36,0.2)',
            },
          ].map(({ label, value, icon, color, iconBg, borderColor }) => (
            <div key={label} style={{ background: 'var(--card)', border: `1px solid ${borderColor}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 6, width: 44, height: 44, background: iconBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
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
          <div style={{ marginBottom: 20 }}>
            <button
              className="btn btn-primary"
              onClick={() => onStudy(bestDeckToStudy.id)}
              style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 16, position: 'relative', overflow: 'hidden' }}
            >
              <span>⚡ Estudiar ahora</span>
              <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>
                {totalDue} tarjeta{totalDue !== 1 ? 's' : ''}
              </span>
            </button>
            <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              {sessionEstimate} · sesión rápida
            </div>
          </div>
        )}

        {totalDue === 0 && decks.length > 0 && (
          <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>¡Todo al día!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tenés tarjetas pendientes por ahora. Volvé más tarde o agrega nuevo material.</div>
          </div>
        )}

        {/* Weekly calendar */}
        {decks.length > 0 && <WeeklyCalendar decks={decks} />}

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

function getDomainColor(progress) {
  if (progress < 30) return { color: '#f87171', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' }
  if (progress < 60) return { color: '#fb923c', gradient: 'linear-gradient(90deg, #fb923c, #fbbf24)' }
  return { color: '#34d399', gradient: 'linear-gradient(90deg, #34d399, #22d3ee)' }
}

function DeckCard({ deck, onStudy }) {
  const progress = deck.total > 0 ? Math.round((deck.learned / deck.total) * 100) : 0
  const { gradient: topGradient } = getDomainColor(progress)

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${deck.dueCount > 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => deck.dueCount > 0 && onStudy(deck.id)}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
    >
      {/* Top gradient border based on mastery level */}
      <div style={{ height: 3, background: topGradient, width: '100%' }} />

      <div style={{ padding: '14px 16px' }}>
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
            <span style={{
              background: 'linear-gradient(135deg, var(--primary), var(--pink))',
              color: '#fff',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              marginLeft: 8,
              boxShadow: '0 2px 8px var(--primary-glow)',
              letterSpacing: '0.3px',
            }}>
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
    </div>
  )
}
