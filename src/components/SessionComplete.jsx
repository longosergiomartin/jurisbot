const CONFETTI_PIECES = [
  { color: '#8b5cf6', left: '10%', delay: '0s',   duration: '1.1s' },
  { color: '#f43f5e', left: '25%', delay: '0.15s', duration: '1.3s' },
  { color: '#fbbf24', left: '40%', delay: '0.05s', duration: '1.0s' },
  { color: '#34d399', left: '55%', delay: '0.25s', duration: '1.2s' },
  { color: '#22d3ee', left: '70%', delay: '0.1s',  duration: '1.4s' },
  { color: '#fb7185', left: '82%', delay: '0.2s',  duration: '1.1s' },
  { color: '#a78bfa', left: '92%', delay: '0.08s', duration: '1.3s' },
]

export default function SessionComplete({ results, user, onDone }) {
  const { correct, wrong, total, timeSeconds, xpEarned } = results

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const mins = Math.floor(timeSeconds / 60)
  const secs = timeSeconds % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  function getMessage() {
    if (accuracy >= 90) return '¡Dominio impresionante! Estás construyendo memorias de largo plazo.'
    if (accuracy >= 70) return '¡Muy bien! Las tarjetas difíciles volverán mañana para reforzarse.'
    if (accuracy >= 50) return 'Buen trabajo. La repetición espaciada hará su magia con el tiempo.'
    return 'No te preocupes, las tarjetas que fallaste volverán pronto. Así funciona el aprendizaje.'
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Confetti animation for accuracy >= 80% */}
      {accuracy >= 80 && CONFETTI_PIECES.map((p, i) => (
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

        {/* Celebration */}
        <div style={{ fontSize: 72, marginBottom: 12, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '💪' : '🧠'}
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          ¡Sesión completada!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
          {timeStr} de estudio enfocado
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
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

        {/* Streak info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <div className="streak-badge">
            🔥 Racha: {user.streak} día{user.streak !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Kai message */}
        <div className="kai-bubble" style={{ marginBottom: 28, textAlign: 'left' }}>
          <span className="kai-avatar">🐶</span>
          <div className="kai-text">{getMessage()}</div>
        </div>

        {/* FSRS info */}
        {wrong > 0 && (
          <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--primary-light)', textAlign: 'left' }}>
            🧠 Las <strong>{wrong} tarjeta{wrong !== 1 ? 's' : ''}</strong> que fallaste fueron reprogramadas automáticamente para reforzarlas. El algoritmo FSRS las mostrará justo antes de que las olvides.
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={onDone}
          style={{ width: '100%', padding: '15px', fontSize: 16 }}
        >
          Volver al inicio
        </button>

      </div>
    </div>
  )
}
