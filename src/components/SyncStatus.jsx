export default function SyncStatus({ state, lastSynced, onRetry }) {
  if (!state || state === 'idle') return null

  const timeStr = lastSynced
    ? lastSynced.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  if (state === 'syncing') {
    return (
      <div
        title="Guardando..."
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '6px 10px', lineHeight: 1,
          fontSize: 14, color: 'var(--primary-light)',
        }}
      >
        <span style={{ display: 'inline-block', animation: 'spin 0.9s linear infinite' }}>↻</span>
      </div>
    )
  }

  if (state === 'synced') {
    return (
      <div
        title={timeStr ? `Guardado a las ${timeStr}` : 'Guardado en la nube'}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '6px 10px', lineHeight: 1,
          fontSize: 14, color: 'var(--success)',
        }}
      >
        <span>☁️</span>
        {timeStr && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{timeStr}</span>
        )}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <button
        onClick={onRetry}
        title="Error al guardar — clic para reintentar"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 20, padding: '6px 10px', lineHeight: 1,
          fontSize: 12, color: 'var(--danger)', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span>⚠️</span>
        <span>Reintentar</span>
      </button>
    )
  }

  if (state === 'offline') {
    return (
      <div
        title="Sin conexión — se guardará cuando vuelva la red"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)',
          borderRadius: 20, padding: '6px 10px', lineHeight: 1,
          fontSize: 14, color: '#fb923c',
        }}
      >
        <span>📵</span>
        <span style={{ fontSize: 11, fontWeight: 500 }}>Sin red</span>
      </div>
    )
  }

  return null
}
