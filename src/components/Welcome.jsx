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
          <div style={{ fontSize: 64, marginBottom: 8, animation: 'float 3s ease-in-out infinite' }}>🦊</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>
            Cognify
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
            Aprende más. Olvida menos.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36, textAlign: 'left' }}>
          {[
            ['🧠', 'Tarjetas generadas por IA desde cualquier material'],
            ['⏱️', 'Repetición espaciada con algoritmo FSRS — estudio eficiente'],
            ['🔥', 'Rachas diarias que mantienen el hábito de estudio'],
            ['🦊', 'Kai, tu tutor IA disponible 24/7 sin juicios'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text-soft)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Setup form */}
        <div className="card" style={{ textAlign: 'left' }}>
          <div className="kai-bubble" style={{ marginBottom: 20 }}>
            <span className="kai-avatar">🦊</span>
            <div className="kai-text">
              ¡Hola! Soy <strong>Kai</strong>, tu compañero de aprendizaje. ¿Cómo te llamas para empezar?
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
