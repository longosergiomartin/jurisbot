import { useState } from 'react'
import { supabase, isSupabaseEnabled } from '../services/supabase'

export default function Auth({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isSupabaseEnabled()) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="card animate-pop" style={{ maxWidth: 380, width: '100%', padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔧</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Sincronización no disponible</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            La sincronización en la nube no está configurada en este entorno. Contactá al administrador de la app.
          </p>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%' }}>Cerrar</button>
        </div>
      </div>
    )
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    })
    setLoading(false)
    if (err) {
      setError(`Error: ${err.message || err.code || err.status || JSON.stringify(err, Object.getOwnPropertyNames(err))}`)
    } else {
      setSent(true)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card animate-pop" style={{ maxWidth: 380, width: '100%', padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🐶</div>

        {sent ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>¡Revisá tu email!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Te mandamos un link mágico a <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Hacé click en el link para iniciar sesión y sincronizar tus mazos en la nube.
            </p>
            <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%' }}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Sincronizar en la nube</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Kuma guarda tus mazos en la nube para que los tengas en cualquier dispositivo.
              Sin contraseña — te enviamos un link mágico.
            </p>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: '13px 16px',
                  color: 'var(--text)',
                  fontSize: 15,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !email.trim()}
                style={{ width: '100%', padding: '14px' }}
              >
                {loading ? 'Enviando...' : 'Enviar link mágico ✨'}
              </button>
            </form>

            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ width: '100%', marginTop: 8, fontSize: 13 }}
            >
              Seguir sin cuenta
            </button>
          </>
        )}
      </div>
    </div>
  )
}
