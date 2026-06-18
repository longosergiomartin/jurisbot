import { useState } from 'react'

export default function Welcome({ onSetupComplete }) {
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSetupComplete(trimmed)
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', background: 'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(245,158,11,0.08) 0%, transparent 50%)' }}>
      <div className="container animate-up" style={{ textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          {/* Kuma with circular gradient background */}
          <div style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0.08) 60%, transparent 100%)',
            border: '1.5px solid rgba(139,92,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px rgba(139,92,246,0.2)',
          }}>
            <span style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite', display: 'block' }}>🐶</span>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #a78bfa, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Cognify
          </h1>
          <p style={{ color: 'var(--primary-light)', fontSize: 14, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Estudia inteligente. Recuerda para siempre.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36, textAlign: 'left' }}>
          {[
            { icon: '🧠', text: 'Tarjetas generadas por IA desde cualquier material', bg: 'var(--primary-dim)', border: 'rgba(139,92,246,0.25)' },
            { icon: '⏱️', text: 'Repetición espaciada con algoritmo FSRS — estudio eficiente', bg: 'var(--pink-dim)', border: 'rgba(244,63,94,0.2)' },
            { icon: '🔥', text: 'Rachas diarias que mantienen el hábito de estudio', bg: 'var(--accent-dim)', border: 'rgba(251,191,36,0.2)' },
            { icon: '🐶', text: 'Kuma, tu tutora IA shiba inu disponible 24/7 sin juicios', bg: 'var(--teal-dim)', border: 'rgba(34,211,238,0.2)' },
          ].map(({ icon, text, bg, border }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <span style={{
                fontSize: 18,
                width: 36,
                height: 36,
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>{icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text-soft)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Setup form */}
        <div className="card" style={{ textAlign: 'left' }}>
          <div className="kai-bubble" style={{ marginBottom: 20 }}>
            <span className="kai-avatar">🐶</span>
            <div className="kai-text">
              ¡Hola! Soy <strong>Kuma</strong>, tu compañera shiba inu de aprendizaje. 🐾 ¿Cómo te llamas para empezar?
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                background: 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 16,
                outline: 'none',
                transition: 'border-color 0.2s',
                width: '100%',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim()}
              style={{ width: '100%', padding: '14px', fontSize: 16 }}
            >
              Comenzar →
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
