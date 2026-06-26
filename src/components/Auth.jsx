import { useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseEnabled } from '../services/supabase'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Auth({ onClose }) {
  const [error, setError] = useState(null)
  const [gsiReady, setGsiReady] = useState(false)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseEnabled() || !GOOGLE_CLIENT_ID) return

    let cancelled = false

    function init() {
      if (cancelled) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError(null)
          const { error: err } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
          })
          if (err) {
            setError('No se pudo conectar con Google. Intentá de nuevo.')
          } else {
            onClose()
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      setGsiReady(true)
    }

    if (window.google?.accounts?.id) {
      init()
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer)
          init()
        }
      }, 100)
      return () => { cancelled = true; clearInterval(timer) }
    }
  }, [onClose])

  useEffect(() => {
    if (gsiReady && btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'es',
        width: 320,
      })
    }
  }, [gsiReady])

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }

  if (!isSupabaseEnabled()) {
    return (
      <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
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

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card animate-pop" style={{ maxWidth: 380, width: '100%', padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🐶</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Guardar tu progreso</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Kuma guarda tus mazos, racha y XP en la nube para que los tengas en cualquier dispositivo.
        </p>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>
        )}

        {/* Google renders their branded button here — popup flow, no Supabase redirect */}
        <div
          ref={btnRef}
          style={{
            display: 'flex', justifyContent: 'center',
            marginBottom: 10, minHeight: 44,
          }}
        />

        {!gsiReady && GOOGLE_CLIENT_ID && (
          <div style={{
            width: '100%', height: 44, borderRadius: 12,
            background: 'var(--surface-2)', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 13,
          }}>
            Cargando...
          </div>
        )}

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
