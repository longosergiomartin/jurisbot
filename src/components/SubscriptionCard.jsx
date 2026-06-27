export default function SubscriptionCard({ subscription, onCancel }) {
  const isCancelled = subscription?.status === 'cancelled'
  const periodEnd = subscription?.current_period_end

  const periodEndStr = periodEnd
    ? new Date(periodEnd).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '18px 20px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Mi Suscripción</span>
        </div>
        <span style={{
          background: isCancelled ? 'rgba(251,146,60,0.15)' : 'rgba(139,92,246,0.15)',
          color: isCancelled ? '#fb923c' : 'var(--primary)',
          border: `1px solid ${isCancelled ? 'rgba(251,146,60,0.3)' : 'rgba(139,92,246,0.3)'}`,
          borderRadius: 20,
          padding: '3px 10px',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {isCancelled ? 'Cancelada' : 'Activa'}
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
        Plan Pro · <strong style={{ color: 'var(--text)' }}>$12.000 ARS/mes</strong>
      </div>

      {periodEndStr && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          {isCancelled
            ? <>Acceso hasta el <strong style={{ color: 'var(--text)' }}>{periodEndStr}</strong></>
            : <>Próxima renovación: <strong style={{ color: 'var(--text)' }}>{periodEndStr}</strong></>
          }
        </div>
      )}

      {!isCancelled && (
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 13,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500,
          }}
        >
          Cancelar suscripción
        </button>
      )}
    </div>
  )
}
