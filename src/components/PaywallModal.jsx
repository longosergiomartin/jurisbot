export default function PaywallModal({ onClose, onUpgrade, upgrading, authUser, onShowAuth }) {
  const benefits = [
    { icon: '🃏', text: 'Mazos ilimitados' },
    { icon: '🐶', text: 'Kuma sin límites de mensajes' },
    { icon: '⚡', text: 'Generación de tarjetas ilimitada' },
    { icon: '☁️', text: 'Sincronización en la nube' },
    { icon: '🏆', text: 'Acceso prioritario a nuevas funciones' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 24, maxWidth: 420, width: '100%',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.2)',
        animation: 'pop 0.3s ease',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6d28d9, #0d9488)',
          padding: '28px 28px 24px', textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700,
            color: '#fff', marginBottom: 16, letterSpacing: 0.5,
          }}>
            ⭐ EARLY ADOPTER · SOLO 200 LUGARES
          </div>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚀</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Cognify Pro</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
            Desbloqueá el potencial completo de tu estudio
          </p>
        </div>

        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {benefits.map(b => (
              <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 10, background: 'var(--primary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>{b.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 500 }}>{b.text}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 16, padding: '16px 20px', textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary-light)' }}>
              $12.000 ARS<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mes</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Descuento especial para los primeros 200 usuarios
            </div>
          </div>

          {authUser ? (
            <button
              onClick={onUpgrade}
              disabled={upgrading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, marginBottom: 10 }}
            >
              {upgrading ? 'Redirigiendo a MercadoPago...' : 'Activar Pro ahora →'}
            </button>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
                Iniciá sesión para activar tu plan
              </p>
              <button
                onClick={() => { onClose(); onShowAuth() }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, marginBottom: 10 }}
              >
                Crear cuenta gratis
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ width: '100%', padding: '11px', fontSize: 13 }}
          >
            Tal vez después
          </button>
        </div>
      </div>
    </div>
  )
}
