import { useMemo, useEffect, useState, useRef } from 'react'
import { getDueCards } from '../services/fsrs'
import { getLevel } from '../services/levels'
import WeeklyCalendar from './WeeklyCalendar'
import { requestNotificationPermission, showReminderIfDue } from '../services/notifications'
import SyncStatus from './SyncStatus'
import SubscriptionCard from './SubscriptionCard'

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

export default function Dashboard({ user, decks, onStudy, onCompanion, onNewDeck, authUser, syncState, lastSynced, onShowAuth, onRetry, onDeleteDeck, onUpgrade, upgrading, subscription, onCancelSubscription }) {
  const deckStats = useMemo(() => {
    return decks.map(deck => {
      const due = getDueCards(deck.cards)
      const total = deck.cards.length
      const learned = deck.cards.filter(c => c.state === 'review').length
      return { ...deck, dueCount: due.length, total, learned }
    })
  }, [decks])

  const totalDue = deckStats.reduce((sum, d) => sum + d.dueCount, 0)

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState(
    () => ('Notification' in window ? Notification.permission : 'denied')
  )

  // UX-14: shield tooltip on first appearance
  const [shieldTooltipSeen, setShieldTooltipSeen] = useState(
    () => !!localStorage.getItem('cognify_shield_seen')
  )
  const [showShieldTooltip, setShowShieldTooltip] = useState(false)
  const shieldRef = useRef(null)

  // UX-15: sync prompt
  const [syncPromptDismissed, setSyncPromptDismissed] = useState(
    () => !!localStorage.getItem('cognify_sync_prompt_dismissed')
  )

  useEffect(() => {
    showReminderIfDue(totalDue)
    // Show shield tooltip once when user first has shields
    if ((user.streakShields ?? 0) > 0 && !shieldTooltipSeen) {
      setShowShieldTooltip(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function dismissShieldTooltip() {
    localStorage.setItem('cognify_shield_seen', '1')
    setShieldTooltipSeen(true)
    setShowShieldTooltip(false)
  }

  function dismissSyncPrompt() {
    localStorage.setItem('cognify_sync_prompt_dismissed', '1')
    setSyncPromptDismissed(true)
  }

  function handleRequestNotif() {
    requestNotificationPermission().then(granted => {
      setNotifPermission(granted ? 'granted' : 'denied')
    })
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notifPermission !== 'granted' && (
              <button
                onClick={handleRequestNotif}
                title="Activar recordatorio diario"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '6px 10px',
                  fontSize: 14,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontFamily: 'inherit',
                  lineHeight: 1,
                }}
              >
                🔔
              </button>
            )}
            {/* Cloud sync status */}
            {authUser ? (
              <SyncStatus state={syncState} lastSynced={lastSynced} onRetry={onRetry} />
            ) : (
              <button
                onClick={onShowAuth}
                title="Sincronizar en la nube"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '6px 10px',
                  fontSize: 14,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontFamily: 'inherit',
                  lineHeight: 1,
                }}
              >
                ☁️
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="streak-badge">
                🔥 {user.streak} {user.streak === 1 ? 'día' : 'días'}
              </div>
              {(user.streakShields ?? 0) > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={shieldRef}
                    onClick={() => setShowShieldTooltip(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)',
                      borderRadius: 20, padding: '4px 8px', fontSize: 12,
                      color: 'var(--teal)', fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    🛡️{user.streakShields > 1 ? ` ×${user.streakShields}` : ''}
                  </button>
                  {/* UX-14: Shield tooltip */}
                  {showShieldTooltip && (
                    <div
                      style={{
                        position: 'absolute', top: 36, right: 0, zIndex: 50,
                        background: 'var(--card)', border: '1px solid rgba(34,211,238,0.4)',
                        borderRadius: 12, padding: '12px 14px', width: 220,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>🛡️ Escudo de racha</span>
                        <button
                          onClick={dismissShieldTooltip}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                        >×</button>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6, margin: 0 }}>
                        Si te saltás un día de estudio, el escudo absorbe la falta y protege tu racha. Se recarga cada semana.
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--teal)', marginTop: 6, fontWeight: 600 }}>
                        Tenés {user.streakShields} escudo{user.streakShields > 1 ? 's' : ''} disponible{user.streakShields > 1 ? 's' : ''}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
            (() => {
              const lvl = getLevel(user.xp)
              return {
                label: `Nv.${lvl.level} ${lvl.name}`,
                value: lvl.emoji,
                icon: lvl.emoji,
                color: 'var(--accent)',
                iconBg: 'var(--accent-dim)',
                borderColor: 'rgba(251,191,36,0.2)',
                isLevel: true,
                lvl,
              }
            })(),
          ].map(({ label, value, icon, color, iconBg, borderColor, isLevel, lvl }) => (
            <div key={label} style={{ background: 'var(--card)', border: `1px solid ${borderColor}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 6, width: 44, height: 44, background: iconBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{icon}</div>
              <div style={{ fontSize: isLevel ? 22 : 24, fontWeight: 800, color }}>{isLevel ? `Nv.${lvl.level}` : value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{isLevel ? lvl.name : label}</div>
              {isLevel && lvl.next && (
                <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${lvl.progress}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 2 }} />
                </div>
              )}
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

        {/* UX-15: Cloud sync prompt — shown after second deck is created */}
        {decks.length >= 2 && !authUser && !syncPromptDismissed && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(34,211,238,0.1) 100%)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-light)', marginBottom: 2 }}>
                ☁️ Guardá tu progreso en la nube
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Ya tenés {decks.length} mazos — protegé tu trabajo para no perderlo si cambiás de dispositivo.
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
                className="btn"
                onClick={onShowAuth}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--teal))',
                  color: '#fff', fontSize: 12, padding: '7px 14px',
                  borderRadius: 10, fontWeight: 700,
                }}
              >
                Activar
              </button>
            </div>
          </div>
        )}

        {/* Weekly calendar */}
        {decks.length > 0 && <WeeklyCalendar decks={decks} />}

        {/* Course/Book Progress */}
        {(() => {
          const chaptersWithProgress = deckStats.filter(d => d.chapter)
          if (chaptersWithProgress.length === 0) return null
          return (
            <div style={{ background: 'var(--card)', border: '1px solid var(--teal-dim)', borderRadius: 16, padding: '16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--teal)' }}>
                📖 Progreso del libro/curso
              </div>
              {chaptersWithProgress.map(d => {
                const prog = d.total > 0 ? Math.round((d.learned / d.total) * 100) : 0
                const color = prog >= 80 ? 'var(--success)' : prog >= 40 ? 'var(--accent)' : 'var(--text-muted)'
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1 }}>Cap. {d.chapter.current}: {d.title}</span>
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{prog}%</span>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Guest persistent banner */}
        {!authUser && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.14) 0%, rgba(249,115,22,0.12) 100%)',
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24', marginBottom: 3 }}>
                ⚠️ Modo invitado
              </div>
              <div style={{ fontSize: 12, color: 'rgba(251,191,36,0.8)', lineHeight: 1.5 }}>
                Si cambiás de dispositivo o limpiás el navegador, perderás tus mazos y rachas.
              </div>
            </div>
            <button
              className="btn"
              onClick={onShowAuth}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: '#fff', fontSize: 12, padding: '8px 14px',
                borderRadius: 10, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Guardar gratis ☁️
            </button>
          </div>
        )}

        {/* Pro upgrade banner — shown to logged-in free users */}
        {authUser && user.plan === 'free' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(34,211,238,0.1) 100%)',
            border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: 16, padding: '14px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-light)', marginBottom: 3 }}>
                ✨ Cognify Pro
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Mazos y chats con Kuma ilimitados, sincronización en todos tus dispositivos.
              </div>
            </div>
            <button
              className="btn"
              onClick={onUpgrade}
              disabled={upgrading}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--teal))',
                color: '#fff', fontSize: 12, padding: '8px 14px',
                borderRadius: 10, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0,
                opacity: upgrading ? 0.7 : 1,
              }}
            >
              {upgrading ? 'Redirigiendo...' : 'Actualizar ✨'}
            </button>
          </div>
        )}

        {/* Subscription management — shown to Pro users */}
        {authUser && user.plan === 'pro' && subscription && (
          <SubscriptionCard subscription={subscription} onCancel={onCancelSubscription} />
        )}

        {/* Decks list */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Mis mazos</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{decks.length} mazo{decks.length !== 1 ? 's' : ''}</span>
          </div>
          {authUser && user?.plan !== 'pro' && (() => {
            const used = user?.monthlyGenerationsUsed ?? 0
            const remaining = Math.max(0, 2 - used)
            const color = remaining === 0 ? 'var(--danger)' : remaining === 1 ? 'var(--accent)' : 'var(--teal)'
            const bg = remaining === 0 ? 'rgba(239,68,68,0.08)' : remaining === 1 ? 'var(--accent-dim)' : 'var(--teal-dim)'
            const border = remaining === 0 ? 'rgba(239,68,68,0.25)' : remaining === 1 ? 'rgba(251,191,36,0.3)' : 'rgba(34,211,238,0.2)'
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 10, marginBottom: 12, fontSize: 12, color }}>
                {remaining === 0 ? '⚠️' : '✨'}
                <span style={{ fontWeight: 600 }}>
                  {remaining === 0
                    ? 'Sin generaciones disponibles este mes'
                    : `${remaining} generación${remaining !== 1 ? 'es' : ''} disponible${remaining !== 1 ? 's' : ''} este mes`}
                </span>
              </div>
            )
          })()}

          {decks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Todavía no tenés mazos</div>
              <div style={{ fontSize: 13 }}>Subí tu primer material para empezar</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deckStats.map(deck => (
                <DeckCard key={deck.id} deck={deck} onStudy={onStudy} onCompanion={onCompanion} onDelete={onDeleteDeck} />
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
    color: onTrack ? 'var(--success)' : 'var(--accent)',
    icon: onTrack ? '🟢' : '🟡',
  }
}

function DeckCard({ deck, onStudy, onCompanion, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const progress = deck.total > 0 ? Math.round((deck.learned / deck.total) * 100) : 0
  const nextDue = deck.dueCount === 0
    ? deck.cards
        .filter(c => c.dueDate)
        .map(c => new Date(c.dueDate))
        .filter(d => d > new Date())
        .sort((a, b) => a - b)[0] || null
    : null
  const { gradient: topGradient } = getDomainColor(progress)
  const goalStatus = getGoalStatus(deck.goal, progress, deck.total, deck.learned)

  return (
    <>
    {/* UX-11: Delete confirm modal */}
    {confirmDelete && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 16px 24px',
      }}>
        <div className="card animate-pop" style={{ maxWidth: 380, width: '100%', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¿Eliminar mazo?</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.6 }}>
            Se eliminará <strong>"{deck.title}"</strong> y todo su progreso.
          </p>
          <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1, fontSize: 14 }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete && onDelete(deck.id) }}
              style={{
                flex: 1, fontSize: 14, fontWeight: 600,
                background: 'var(--danger)',
                border: 'none', color: '#fff',
                borderRadius: 12, padding: '11px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${deck.dueCount > 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
    >
      {/* Top gradient border based on mastery level */}
      <div style={{ height: 3, background: topGradient, width: '100%' }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {deck.chapter && (
              <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600, marginBottom: 4 }}>
                📖 Cap. {deck.chapter.current} de {deck.chapter.total}
              </div>
            )}
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deck.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {deck.total} tarjetas · {progress}% dominado
              {deck.createdAt && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  · {new Date(deck.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
              )}
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

        {/* Progress bar */}
        <div className="progress-bar" style={{ marginBottom: goalStatus ? 10 : 12 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
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
              <span style={{ fontSize: 12, color: goalStatus.color, fontWeight: 600 }}>
                {goalStatus.label}
              </span>
              {goalStatus.onTrack && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Vas bien 🐾
                </span>
              )}
            </div>
            {goalStatus.dailyTarget > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, paddingLeft: 2 }}>
                Estudiá ~{goalStatus.dailyTarget} tarjeta{goalStatus.dailyTarget !== 1 ? 's' : ''} hoy para llegar a tiempo
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          <button
            onClick={() => onStudy(deck.id)}
            title={deck.dueCount === 0 && nextDue
              ? `Sin tarjetas para hoy — próxima revisión el ${nextDue.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}`
              : deck.dueCount === 0 ? 'Sin tarjetas para hoy' : ''}
            style={{
              background: deck.dueCount > 0 ? 'linear-gradient(135deg, var(--primary), var(--pink))' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${deck.dueCount > 0 ? 'transparent' : 'var(--border)'}`,
              borderRadius: 10,
              padding: '9px 12px',
              color: deck.dueCount > 0 ? '#fff' : 'var(--text-soft)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              boxShadow: deck.dueCount > 0 ? '0 2px 10px var(--primary-glow)' : 'none',
            }}
          >
            {deck.dueCount > 0 ? '⚡ Repasar' : '✓ Al día'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onCompanion(deck.id) }}
            style={{
              background: 'var(--teal-dim)',
              border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: 10,
              padding: '9px 12px',
              color: 'var(--teal)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            🐶 Charlar
          </button>
          <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Eliminar mazo"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10,
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
