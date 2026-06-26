import { useState } from 'react'
import { supabase, isSupabaseEnabled } from '../services/supabase'

export default function Auth({ onClose }) {
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
            La sincronización en la nube no está configurada en este entorno.
          </p>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%' }}>Cerrar</button>
        </div>
      </div>
    )
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) {
      setError('No se pudo conectar con Google. Intentá de nuevo.')
      setLoading(false)
    }
    // On success, browser redirects to Google — no need to setLoading(false)
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Guardar tu progreso</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Kuma guarda tus mazos, racha y XP en la nube para que los tengas en cualquier dispositivo.
        </p>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            padding: '13px 16px',
            fontSize: 15, fontWeight: 600,
            color: '#1a1a2e',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'inherit',
            marginBottom: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        <button
          className="btn btn-ghost"
          onClick={onClose}
          style={{ width: '100%', fontSize: 13 }}
        >
          Seguir sin cuenta
        </button>
      </div>
    </div>
  )
}
