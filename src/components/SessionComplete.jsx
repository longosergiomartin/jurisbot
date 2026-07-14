import { getLevel } from '../services/levels'
import KumaAvatar from './KumaAvatar'

const CONFETTI_PIECES = [
  { color: '#8b5cf6', left: '10%', delay: '0s',   duration: '1.1s' },
  { color: '#f43f5e', left: '25%', delay: '0.15s', duration: '1.3s' },
  { color: '#fbbf24', left: '40%', delay: '0.05s', duration: '1.0s' },
  { color: '#34d399', left: '55%', delay: '0.25s', duration: '1.2s' },
  { color: '#22d3ee', left: '70%', delay: '0.1s',  duration: '1.4s' },
  { color: '#fb7185', left: '82%', delay: '0.2s',  duration: '1.1s' },
  { color: '#a78bfa', left: '92%', delay: '0.08s', duration: '1.3s' },
]

const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365]

export default function SessionComplete({ results, user, authUser, onDone, onShowAuth }) {
  const { correct, wrong, total, timeSeconds, xpEarned, xpBonus, levelUp, shieldUsed, newUnlocks } = results

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const mins = Math.floor(timeSeconds / 60)
  const secs = timeSeconds % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : null

  const levelInfo = getLevel(user.xp)
  const streakMilestone = STREAK_MILESTONES.includes(user.streak) ? user.streak : null
  const showConfetti = accuracy >= 80 || !!levelUp || !!streakMilestone

  function getMessage() {
    if (levelUp) return `¡Subiste al nivel ${levelUp.level}! ${levelUp.emoji} ${levelUp.name}. Seguí así.`
    if (streakMilestone) return `¡${streakMilestone} días seguidos! Eso es disciplina de verdad. 🐾`
    if (accuracy >= 90) return '¡Dominio impresionante! Estás construyendo memorias de largo plazo.'
    if (accuracy >= 70) return '¡Muy bien! Las tarjetas difíciles volverán mañana para reforzarse.'
    if (accuracy >= 50) return 'Buen trabajo. La repetición espaciada hará su magia con el tiempo.'
    return 'No te preocupes, las tarjetas que fallaste volverán pronto. Así funciona el aprendizaje.'
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {showConfetti && CONFETTI_PIECES.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            position: 'absolute',
            top: '-16px',
            left: p.left,
            width: 10,
            height: 10,
            background: p.color,
            borderRadius: i % 2 === 0 ? '50%' : '2px',
            animation: `confettiFall ${p.duration} ease-in ${p.delay} both`,
            transform: `rotate(${i * 37}deg)`,
            opacity: 0,
          }}
        />
      ))}

      <div className="container animate-up" style={{ textAlign: 'center', maxWidth: 400 }}>

        {/* Celebration emoji */}
        <div style={{ fontSize: 72, marginBottom: 12, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          {levelUp ? levelUp.emoji : streakMilestone ? '🔥' : accuracy >= 80 ? '🎉' : accuracy >= 60 ? '💪' : '🧠'}
        </div>

        {/* Level-up banner */}
        {levelUp && (
          <div
            className="animate-pop"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(139,92,246,0.2) 100%)',
              border: '1.5px solid rgba(251,191,36,0.5)',
              borderRadius: 16,
              padding: '12px 20px',
              marginBottom: newUnlocks?.length > 0 ? 8 : 16,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--accent)',
            }}
          >
            ⬆️ ¡Nivel {levelUp.level} desbloqueado! — {levelUp.name}
          </div>
        )}

        {/* CG-3: newly unlocked items on level-up */}
        {newUnlocks?.length > 0 && (
          <div
            className="animate-pop"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(251,191,36,0.1) 100%)',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 8 }}>
              🎁 Lo que desbloqueaste
            </div>
            {newUnlocks.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{u.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{u.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Streak milestone banner */}
        {streakMilestone && !levelUp && (
          <div
            className="animate-pop"
            style={{
              background: 'linear-gradient(135deg, rgba(251,146,60,0.2) 0%, rgba(239,68,68,0.2) 100%)',
              border: '1.5px solid rgba(251,146,60,0.5)',
              borderRadius: 16,
              padding: '12px 20px',
              marginBottom: 16,
              fontSize: 15,
              fontWeight: 700,
              color: '#fb923c',
            }}
          >
            🔥 ¡{streakMilestone} días de racha!
          </div>
        )}

        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          ¡Sesión completada!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          {timeStr ? `${timeStr} de estudio enfocado` : '¡Sesión relámpago! ⚡'}
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Correctas', value: correct, icon: '✅', color: 'var(--success)', bg: 'var(--success-dim)', border: 'rgba(52,211,153,0.2)' },
            { label: 'Precisión', value: `${accuracy}%`, icon: '🎯', color: accuracy >= 70 ? 'var(--success)' : 'var(--accent)', bg: accuracy >= 70 ? 'var(--success-dim)' : 'var(--accent-dim)', border: accuracy >= 70 ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)' },
            { label: 'XP ganados', value: `+${xpEarned}`, icon: '⭐', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(251,191,36,0.2)' },
          ].map(({ label, value, icon, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 8px' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CG-2: bonus XP breakdown */}
        {xpBonus > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 12, color: 'var(--accent)', fontWeight: 600,
            marginTop: -12, marginBottom: 16,
          }}>
            🔥 Incluye +{xpBonus} XP por tarjetas recuperadas
          </div>
        )}

        {/* XP level progress bar */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 16,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
              {levelInfo.emoji} Nv.{levelInfo.level} {levelInfo.name}
            </span>
            {levelInfo.next && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {levelInfo.xpToNext} XP para Nv.{levelInfo.next.level}
              </span>
            )}
          </div>
          <div style={{ height: 6, background: 'var(--fill-strong)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${levelInfo.progress}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                borderRadius: 3,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
        </div>

        {/* Streak + shield */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div className="streak-badge">
            🔥 Racha: {user.streak} día{user.streak !== 1 ? 's' : ''}
          </div>
          {(user.streakShields ?? 0) > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: 20, padding: '4px 10px', fontSize: 13,
              color: 'var(--teal)', fontWeight: 600,
            }}>
              🛡️ ×{user.streakShields}
            </div>
          )}
        </div>

        {/* Shield-used notification */}
        {shieldUsed && (
          <div style={{
            background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)',
            borderRadius: 12, padding: '11px 14px', marginBottom: 14,
            fontSize: 13, color: 'var(--teal)', textAlign: 'left',
          }}>
            🛡️ Tu <strong>escudo de racha</strong> absorbió el día de ayer. Tu racha se mantiene intacta.
          </div>
        )}

        {/* Kuma message */}
        <div className="kai-bubble" style={{ marginBottom: 24, textAlign: 'left' }}>
          <KumaAvatar user={user} />
          <div className="kai-text">{getMessage()}</div>
        </div>

        {/* FSRS info */}
        {wrong > 0 && (
          <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--primary-light)', textAlign: 'left' }}>
            🧠 Las <strong>{wrong} tarjeta{wrong !== 1 ? 's' : ''}</strong> que fallaste fueron reprogramadas automáticamente para reforzarlas.
          </div>
        )}

        {authUser ? (
          /* Usuario registrado — flujo de continuidad */
          <button
            className="btn btn-primary"
            onClick={onDone}
            style={{ width: '100%', padding: '15px', fontSize: 16 }}
          >
            Continuar estudiando →
          </button>
        ) : (
          /* Invitado — flujo de conversión */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={onShowAuth}
              style={{
                width: '100%', padding: '15px', fontSize: 16,
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              }}
            >
              ☁️ Crear cuenta para no perder tu progreso
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Tus puntos, escudos y mazos se perderán si limpiás el caché.<br />
              Guardalos gratis en la nube.
            </p>
            <button
              onClick={onDone}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 13,
                cursor: 'pointer', textDecoration: 'underline',
                padding: '4px', fontFamily: 'inherit',
              }}
            >
              Volver al inicio sin guardar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
