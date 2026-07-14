import { useState } from 'react'

export default function Welcome({ onSetupComplete, onTryExample }) {
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)

  const trimmed = name.trim()

  function handleUpload(e) {
    e.preventDefault()
    if (trimmed) onSetupComplete(trimmed)
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', background: 'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(245,158,11,0.08) 0%, transparent 50%)' }}>
      <div className="container animate-up" style={{ textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0.08) 60%, transparent 100%)',
            border: '1.5px solid rgba(139,92,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 0 32px rgba(139,92,246,0.2)',
          }}>
            <span style={{ fontSize: 44, animation: 'float 3s ease-in-out infinite', display: 'block' }}>🐶</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #a78bfa, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>
            Cognify
          </h1>
          <p style={{ color: 'var(--primary-light)', fontSize: 13, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Estudia inteligente. Recuerda para siempre.
          </p>
        </div>

        {/* Setup form — above the fold */}
        <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
          <div className="kai-bubble" style={{ marginBottom: 20 }}>
            <span className="kai-avatar">🐶</span>
            <div className="kai-text">
              ¡Hola! Soy <strong>Kuma</strong>, tu compañera shiba inu de aprendizaje. 🐾 ¿Cómo te llamas para empezar?
            </div>
          </div>

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Tu nombre"
              maxLength={30}
              autoFocus
              style={{
                background: 'var(--fill)',
                border: `1.5px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 16,
                outline: 'none',
                transition: 'border-color 0.2s',
                width: '100%',
              }}
            />

            {trimmed ? (
              <>
                <button
                  type="button"
                  onClick={() => onTryExample(trimmed)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: 16 }}
                >
                  🧠 Probar con un ejemplo
                </button>
                <button
                  type="submit"
                  className="btn btn-ghost"
                  style={{ width: '100%', padding: '13px', fontSize: 15 }}
                >
                  📄 Subir mi material →
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                  El ejemplo muestra los 3 tipos de tarjeta — sin subir nada
                </p>
              </>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled
                style={{ width: '100%', padding: '14px', fontSize: 16 }}
              >
                Comenzar →
              </button>
            )}
          </form>
        </div>

        {/* Features — below the fold is fine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {[
            { icon: '🧠', text: 'Tarjetas generadas por IA desde cualquier material' },
            { icon: '⏱️', text: 'Repetición espaciada: estudiás justo antes de olvidar' },
            { icon: '🔥', text: 'Rachas diarias que mantienen el hábito de estudio' },
            { icon: '🐶', text: 'Kuma, tu tutora IA shiba inu disponible 24/7 sin juicios' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--fill-soft)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
