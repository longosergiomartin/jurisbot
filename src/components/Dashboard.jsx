import { useMemo, useEffect, useState } from 'react'
import { getDueCards } from '../services/fsrs'
import { getLevel } from '../services/levels'
import { getISOWeek } from '../services/storage'
import { getPathProgress } from '../services/path'
import WeeklyCalendar from './WeeklyCalendar'
import { showReminderIfDue } from '../services/notifications'
import KumaAvatar from './KumaAvatar'

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

export default function Dashboard({ user, decks, onStudy, onOpenPath, onCompanion, onNewDeck, authUser, onShowAuth, onDeleteDeck }) {
  const deckStats = useMemo(() => {
    return decks.map(deck => {
      const due = getDueCards(deck.cards)
      const total = deck.cards.length
      const learned = deck.cards.filter(c => c.state === 'review').length
      const path = getPathProgress(deck)
      return { ...deck, dueCount: due.length, total, learned, path }
    })
  }, [decks])

  const totalDue = deckStats.reduce((sum, d) => sum + d.dueCount, 0)
  const lvl = getLevel(user.xp)

  // CG-1: streak banner frequency cap — max 2 impressions per ISO week
  const STREAK_WARN_MAX = 2
  const [streakBannerAllowed] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    const thisWeek = getISOWeek(today)
    try {
      const stored = JSON.parse(localStorage.getItem('cognify_streak_warn') || '{}')
      return stored.week !== thisWeek || (stored.count ?? 0) < STREAK_WARN_MAX
    } catch { return true }
  })

  // UX-15: sync prompt
  const [syncPromptDismissed, setSyncPromptDismissed] = useState(
    () => !!localStorage.getItem('cognify_sync_prompt_dismissed')
  )

  useEffect(() => {
    showReminderIfDue(totalDue)
    // CG-1: record banner impression if it will be shown
    if (user.streak > 0 && totalDue > 0 && streakBannerAllowed) {
      const today = new Date().toISOString().slice(0, 10)
      const thisWeek = getISOWeek(today)
      try {
        const stored = JSON.parse(localStorage.getItem('cognify_streak_warn') || '{}')
        const count = stored.week === thisWeek ? (stored.count ?? 0) : 0
        if (count < STREAK_WARN_MAX) {
          localStorage.setItem('cognify_streak_warn', JSON.stringify({ week: thisWeek, count: count + 1 }))
        }
      } catch { /* ignore */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function dismissSyncPrompt() {
    localStorage.setItem('cognify_sync_prompt_dismissed', '1')
    setSyncPromptDismissed(true)
  }

  // Find the deck with most due cards to study
  const bestDeckToStudy = [...deckStats].sort((a, b) => b.dueCount - a.dueCount)[0]

  // Streak-at-risk banner logic (CG-1: also gated by weekly impression cap)
  const today = new Date().toISOString().slice(0, 10)
  const studiedToday = user.lastStudyDate === today
  const showStreakBanner = user.streak > 0 && !studiedToday && totalDue > 0 && streakBannerAllowed

  const sessionEstimate = getSessionEstimate(totalDue)

  return (
    <div className="screen with-tabbar" style={{ paddingTop: 20 }}>
      <div className="container animate-fade">

        {/* Top bar: greeting + streak/shield/XP stat strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
              ¡Hola, {user.name}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2, fontWeight: 700 }}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div className="streak-badge" title={`Racha de ${user.streak} día${user.streak !== 1 ? 's' : ''}`}>
              🔥 {user.streak}
            </div>
            {(user.streakShields ?? 0) > 0 && (
              <div
                title={`${user.streakShields} escudo${user.streakShields > 1 ? 's' : ''} de racha — absorben un día salteado`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: 'var(--teal-dim)', border: '2px solid rgba(8,145,178,0.3)',
                  borderRadius: 20, padding: '4px 10px', fontSize: 13,
                  color: 'var(--teal)', fontWeight: 800,
                }}
              >
                🛡️{user.streakShields > 1 ? ` ×${user.streakShields}` : ''}
              </div>
            )}
            <div
              title={`${user.xp} XP — Nivel ${lvl.level} ${lvl.name}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'var(--primary-dim)', border: '2px solid rgba(124,58,237,0.3)',
                borderRadius: 20, padding: '4px 10px', fontSize: 13,
                color: 'var(--primary)', fontWeight: 800,
              }}
            >
              ⭐ {user.xp}
            </div>
          </div>
        </div>

        {/* CG-1: Streak-at-risk banner — Kuma voice, frequency-capped */}
        {showStreakBanner && (
          <div
            style={{
              background: 'var(--accent-dim)',
              border: '2px solid rgba(245,158,11,0.4)',
              borderRadius: 16,
              padding: '14px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>🐾</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-dark)', marginBottom: 2 }}>
                  Kuma extrañó estudiar con vos
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600 }}>
                  Tu racha de {user.streak} {user.streak === 1 ? 'día' : 'días'} todavía sigue en pie. ¿La seguimos?
                </div>
              </div>
            </div>
            <button
              className="btn btn-success"
              onClick={() => bestDeckToStudy && onStudy(bestDeckToStudy.id)}
              style={{ fontSize: 12, padding: '8px 14px', flexShrink: 0 }}
            >
              Estudiar · {sessionEstimate}
            </button>
          </div>
        )}

        {/* Kuma bubble */}
        <div className="kai-bubble" style={{ marginBottom: 16 }}>
          <KumaAvatar user={user} />
          <div className="kai-text">{getDailyMessage(user.name)}</div>
        </div>

        {/* Main CTA */}
        {totalDue > 0 && bestDeckToStudy && (
          <div style={{ marginBottom: 20 }}>
            <button
              className="btn btn-success"
              onClick={() => onStudy(bestDeckToStudy.id)}
              style={{ width: '100%', padding: '16px', fontSize: 16 }}
            >
              <span>⚡ Repasar lo de hoy</span>
              <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>
                {totalDue} tarjeta{totalDue !== 1 ? 's' : ''}
              </span>
            </button>
            <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
              {sessionEstimate} · sesión rápida
            </div>
          </div>
        )}

        {totalDue === 0 && decks.length > 0 && (
          <div style={{ background: 'var(--success-dim)', border: '2px solid rgba(88,204,2,0.3)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
            <div style={{ fontWeight: 800, color: 'var(--success-dark)', marginBottom: 4 }}>¡Todo al día!</div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>No tenés tarjetas pendientes. Seguí avanzando en el camino de tus unidades.</div>
          </div>
        )}

        {/* UX-15: Cloud sync prompt — shown after second deck is created */}
        {decks.length >= 2 && !authUser && !syncPromptDismissed && (
          <div style={{
            background: 'var(--primary-dim)',
            border: '2px solid rgba(124,58,237,0.3)',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)', marginBottom: 2 }}>
                ☁️ Guardá tu progreso en la nube
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5, fontWeight: 600 }}>
                Ya tenés {decks.length} unidades — protegé tu trabajo para no perderlo si cambiás de dispositivo.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={dismissSyncPrompt}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: 16,
                  cursor: 'pointer', padding: '4px',
                }}
              >×</button>
              <button
                className="btn btn-primary"
                onClick={onShowAuth}
                style={{ fontSize: 12, padding: '7px 14px' }}
              >
                Activar
              </button>
            </div>
          </div>
        )}

        {/* Weekly calendar */}
        {decks.length > 0 && <WeeklyCalendar decks={decks} />}

        {/* Units list */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>Mis unidades</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{decks.length} unidad{decks.length !== 1 ? 'es' : ''}</span>
          </div>

          {decks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: 16, border: '2px dashed var(--border)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>Todavía no tenés unidades</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Subí tu primer material para armar tu camino de estudio</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deckStats.map(deck => (
                <UnitCard key={deck.id} deck={deck} onOpenPath={onOpenPath} onCompanion={onCompanion} onDelete={onDeleteDeck} />
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

function getGoalStatus(goal, progress, total, learned) {
  if (!goal?.targetDate) return null
  const today = new Date()
  const target = new Date(goal.targetDate)
  const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'Fecha vencida', color: 'var(--danger)', icon: '⚠️', daysLeft: 0, dailyTarget: 0 }
  const expectedProgress = Math.max(0, 100 - (daysLeft / 30) * 100)
  const onTrack = progress >= expectedProgress - 10
  const cardsRemaining = total - learned
  const dailyTarget = (daysLeft > 0 && cardsRemaining > 0)
    ? Math.ceil(cardsRemaining / Math.max(daysLeft, 1))
    : 0
  return {
    daysLeft,
    onTrack,
    dailyTarget,
    label: daysLeft === 0 ? '¡Hoy es el día!' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restantes`,
    color: onTrack ? 'var(--success-dark)' : 'var(--accent-dark)',
    icon: onTrack ? '🟢' : '🟡',
  }
}

function UnitCard({ deck, onOpenPath, onCompanion, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const progress = deck.total > 0 ? Math.round((deck.learned / deck.total) * 100) : 0
  const pathPct = deck.path.total > 0 ? Math.round((deck.path.done / deck.path.total) * 100) : 0
  const goalStatus = getGoalStatus(deck.goal, progress, deck.total, deck.learned)

  return (
    <>
    {/* UX-11: Delete confirm modal */}
    {confirmDelete && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(43,43,63,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 16px 24px',
      }}>
        <div className="card animate-pop" style={{ maxWidth: 380, width: '100%', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>¿Eliminar unidad?</h3>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 6, lineHeight: 1.6 }}>
            Se eliminará <strong>"{deck.title}"</strong> y todo su progreso.
          </p>
          <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 20, fontWeight: 700 }}>Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1, fontSize: 14 }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => { setConfirmDelete(false); onDelete && onDelete(deck.id) }}
              style={{ flex: 1, fontSize: 14 }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    <div
      onClick={() => onOpenPath(deck.id)}
      style={{
        background: 'var(--card)',
        border: `2px solid ${deck.dueCount > 0 ? 'rgba(124,58,237,0.35)' : 'var(--border)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'all 0.15s',
        cursor: 'pointer',
        boxShadow: '0 3px 0 var(--border)',
      }}
    >
      <div style={{ padding: '16px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {deck.chapter && (
              <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 800, marginBottom: 4 }}>
                📖 Cap. {deck.chapter.current} de {deck.chapter.total}
              </div>
            )}
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2b2b3f' }}>
              {deck.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
              {deck.path.done}/{deck.path.total} lecciones · {progress}% dominado
            </div>
          </div>
          {deck.dueCount > 0 ? (
            <span style={{
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
              marginLeft: 8,
              boxShadow: '0 2px 0 var(--primary-dark)',
            }}>
              {deck.dueCount} hoy
            </span>
          ) : (
            <span style={{ fontSize: 16 }}>✅</span>
          )}
        </div>

        {/* Path progress bar */}
        <div className="progress-bar" style={{ marginBottom: goalStatus ? 10 : 12, height: 10 }}>
          <div className="progress-fill" style={{ width: `${pathPct}%` }} />
        </div>

        {/* Goal status */}
        {goalStatus && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: goalStatus.onTrack ? 'var(--success-dim)' : 'var(--accent-dim)',
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 12 }}>{goalStatus.icon}</span>
              <span style={{ fontSize: 12, color: goalStatus.color, fontWeight: 700 }}>
                {goalStatus.label}
              </span>
              {goalStatus.onTrack && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 700 }}>
                  Vas bien 🐾
                </span>
              )}
            </div>
            {goalStatus.dailyTarget > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, paddingLeft: 2, fontWeight: 600 }}>
                Estudiá ~{goalStatus.dailyTarget} tarjeta{goalStatus.dailyTarget !== 1 ? 's' : ''} hoy para llegar a tiempo
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={e => { e.stopPropagation(); onOpenPath(deck.id) }}
            style={{ fontSize: 13, padding: '9px 12px' }}
          >
            🗺️ Camino
          </button>
          <button
            className="btn btn-ghost"
            onClick={e => { e.stopPropagation(); onCompanion(deck.id) }}
            style={{ fontSize: 13, padding: '9px 12px' }}
          >
            🐶 Charlar
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
            title="Eliminar unidad"
            style={{
              background: 'var(--danger-dim)',
              border: '2px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              padding: '9px 10px',
              color: 'var(--danger)',
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
