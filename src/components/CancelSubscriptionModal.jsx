import { useState } from 'react'

const REASONS = [
  'No lo uso suficiente',
  'Es muy caro para mí',
  'Encontré otra alternativa',
  'Solo lo usé para probar',
  'Me faltaron funciones',
  'Otro motivo',
]

const SUPPORT_EMAIL = 'hola@cognify.ar'

export default function CancelSubscriptionModal({ subscription, onClose, onConfirm, cancelling }) {
  const [screen, setScreen] = useState(1)
  const [reason, setReason] = useState('')

  const periodEnd = subscription?.current_period_end
  const periodEndStr = periodEnd
    ? new Date(periodEnd).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  function handleConfirm() {
    onConfirm(reason)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 420,
          width: '100%',
          animation: 'pop 0.2s ease',
        }}
      >
        {/* Screen 1: value reminder + discount offer */}
        {screen === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💡</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                ¿Seguro que querés cancelar?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Con Pro podés generar tarjetas ilimitadas, estudiar sin límites y acceder a todas las funciones de Cognify.
              </p>
            </div>

            <div style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: 'var(--text)',
              lineHeight: 1.6,
            }}>
              ¿Te parece caro? Escribinos y te ofrecemos <strong>un mes de descuento</strong>.{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Solicito%20un%20mes%20de%20descuento&body=Hola%2C%20quisiera%20solicitar%20un%20mes%20de%20descuento%20en%20mi%20suscripci%C3%B3n%20Pro.`}
                style={{ color: 'var(--primary)', fontWeight: 700 }}
              >
                Contactar soporte →
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={onClose}
                className="btn"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--teal))', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 0' }}
              >
                Mantener mi suscripción
              </button>
              <button
                onClick={() => setScreen(2)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0',
                }}
              >
                Igual quiero cancelar
              </button>
            </div>
          </>
        )}

        {/* Screen 2: feedback reason */}
        {screen === 2 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
                ¿Por qué cancelás?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Tu respuesta nos ayuda a mejorar.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {REASONS.map(r => (
                <label
                  key={r}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${reason === r ? 'var(--primary)' : 'var(--border)'}`,
                    background: reason === r ? 'rgba(139,92,246,0.08)' : 'transparent',
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  {r}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setScreen(1)}
                style={{
                  flex: 1, background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 0', fontSize: 13, color: 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Atrás
              </button>
              <button
                onClick={() => setScreen(3)}
                disabled={!reason}
                className="btn"
                style={{
                  flex: 2, background: reason ? 'var(--primary)' : 'var(--border)',
                  color: reason ? '#fff' : 'var(--text-muted)',
                  fontSize: 14, fontWeight: 600, padding: '10px 0',
                  cursor: reason ? 'pointer' : 'not-allowed',
                }}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {/* Screen 3: final confirmation */}
        {screen === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>
                Confirmá la cancelación
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Tu suscripción se cancelará pero{' '}
                <strong style={{ color: 'var(--text)' }}>
                  seguís teniendo acceso Pro{periodEndStr ? ` hasta el ${periodEndStr}` : ' hasta fin del período'}.
                </strong>
              </p>
            </div>

            {periodEndStr && (
              <div style={{
                background: 'rgba(251,146,60,0.08)',
                border: '1px solid rgba(251,146,60,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13,
                color: '#fb923c',
                textAlign: 'center',
              }}>
                Acceso hasta el <strong>{periodEndStr}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setScreen(2)}
                style={{
                  flex: 1, background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 0', fontSize: 13, color: 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleConfirm}
                disabled={cancelling}
                style={{
                  flex: 2, background: cancelling ? 'var(--border)' : 'rgba(239,68,68,0.9)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 0', fontSize: 14, fontWeight: 700,
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {cancelling ? 'Cancelando...' : 'Sí, cancelar suscripción'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
