import { useState, useEffect, useRef } from 'react'

const STARTER_CHIPS = [
  '¿Qué es con tus palabras?',
  '¿Para qué sirve?',
  '¿Podés dar un ejemplo?',
]

export default function SocraticSession({ concept, modelAnswer, onClose }) {
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: `¡Hola! Explicame qué es "${concept}" con tus propias palabras, como si yo nunca hubiera escuchado ese término. 🐾` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    if (!input.trim() || loading || isComplete) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/socratic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, modelAnswer, messages: newMessages }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        if (data.isComplete) setIsComplete(true)
      }
    } catch {
      // fail silently
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleChip(chip) {
    setInput(chip)
    textareaRef.current?.focus()
  }

  return (
    <div className="socratic-overlay">
      <div className="socratic-container">

        {/* Header */}
        <div className="socratic-header">
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Técnica Feynman
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Explicale a Kuma 🐶
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 16px', fontSize: 13 }}>
            Cerrar
          </button>
        </div>

        {/* Concept */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span className="chip chip-primary" style={{ fontSize: 12 }}>{concept}</span>
        </div>

        {/* Messages */}
        <div className="socratic-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`socratic-msg ${msg.role}`}>
              {msg.role === 'assistant' && (
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🐶</span>
              )}
              <div className={`socratic-bubble ${msg.role}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="socratic-msg assistant">
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🐶</span>
              <div className="socratic-bubble assistant" style={{ opacity: 0.6 }}>
                <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>
                  Pensando...
                </span>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="animate-pop" style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: 36 }}>🎉</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', marginTop: 10 }}>
                ¡Lo explicaste perfecto!
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
                Dominaste la Técnica Feynman para este concepto. Cuando podés explicarlo simple, lo entendés de verdad.
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 20 }}>
                Volver al estudio
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Starter chips (shown at the start, before first user message) */}
        {!isComplete && messages.length === 1 && !loading && (
          <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STARTER_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                style={{
                  background: 'var(--primary-dim)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: 20,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: 'var(--primary-light)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        {!isComplete && (
          <div className="socratic-input-area">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? 'Explicale a Kuma con tus propias palabras...' : 'Explicale a Kuma con tus propias palabras... (Enter para enviar)'}
              rows={2}
              disabled={loading}
              className="socratic-textarea"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="btn btn-primary"
              style={{ padding: '10px 14px', fontSize: 18, minWidth: 46, alignSelf: 'flex-end' }}
            >
              ↑
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
