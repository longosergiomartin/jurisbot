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
    <div className="screen" style={{ justifyContent: 'center' }}>
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
            { label: 'Correctas', value: correct, icon: '✅', color: 'var(--success)' },
            { label: 'Precisión', value: `${accuracy}%`, icon: '🎯', color: accuracy >= 70 ? 'var(--success)' : 'var(--accent)' },
            { label: 'XP ganados', value: `+${xpEarned}`, icon: '⭐', color: 'var(--accent)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 8px' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
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
