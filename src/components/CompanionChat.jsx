import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'

const HISTORY_KEY = (deckId) => `chat_history_${deckId}`

export default function CompanionChat({ deck, onClose, onPaywall }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY(deck.id))
      if (saved) return JSON.parse(saved)
    } catch {}
    return [{ role: 'assistant', content: `¡Hola! Soy Kuma 🐾 Estoy lista para explorar "${deck.title}" con vos. ¿Por dónde arrancamos?` }]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  const hasHistory = messages.length > 1

  useEffect(() => {
    if (hasHistory) return
    // No saved history — fetch a personalized opening from the API
    sendToKuma([], true)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY(deck.id), JSON.stringify(messages))
    } catch {}
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendToKuma(currentMessages, isGreeting = false) {
    setLoading(true)

    const apiMessages = isGreeting
      ? [{ role: 'user', content: `Hola Kuma! Quiero charlar sobre "${deck.title}". ¿Por dónde empezamos?` }]
      : currentMessages

    try {
      const { data: { session } } = await (supabase?.auth?.getSession() ?? Promise.resolve({ data: { session: null } }))
      const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}

      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          deckTitle: deck.title,
          cards: deck.cards,
          messages: apiMessages,
        }),
      })

      if (res.status === 403) {
        onPaywall?.()
        setLoading(false)
        return
      }

      const data = await res.json()
      const reply = data.reply || '¡Hola! Estoy lista para charlar sobre el material. ¿Qué querés explorar? 🐾'

      if (isGreeting) {
        setMessages([{ role: 'assistant', content: reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch {
      if (!isGreeting) {
        setMessages(prev => [...prev, { role: 'assistant', content: '¡Ups! Algo falló. Probá de nuevo 🐾' }])
      }
    }
    setLoading(false)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    textareaRef.current?.focus()

    // Build the full conversation for the API (excluding the greeting trick)
    const apiHistory = newMessages.map(m => ({ role: m.role, content: m.content }))
    await sendToKuma(apiHistory)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      handleSend()
    }
  }

  const cardCount = deck.cards?.length || 0
  const masteredCount = deck.cards?.filter(c => c.state === 'review').length || 0

  return (
    <div className="socratic-overlay">
      <div className="socratic-container">

        {/* Header */}
        <div className="socratic-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🐶</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Kuma · Compañera de estudio</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {deck.title} · {masteredCount}/{cardCount} dominadas
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', color: 'var(--text-soft)', fontSize: 13, fontWeight: 600 }}
          >
            ← Volver
          </button>
        </div>

        {/* Messages */}
        <div className="socratic-messages">
          {messages.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`socratic-msg ${msg.role === 'user' ? 'user' : ''}`}>
              {msg.role === 'assistant' && (
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>🐶</span>
              )}
              <div className={`socratic-bubble ${msg.role === 'assistant' ? 'assistant' : 'user'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && messages.filter(m => m.role === 'user').length > 0 && (
            <div className="socratic-msg">
              <span style={{ fontSize: 20, flexShrink: 0 }}>🐶</span>
              <div className="socratic-bubble assistant" style={{ opacity: 0.7 }}>
                <span style={{ animation: 'pulse 1.2s infinite', display: 'inline-block' }}>Kuma está pensando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion chips — visible immediately, before user sends first message */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              '¿Me podés explicar el concepto más difícil?',
              '¿Cuál es lo más importante del tema?',
              'Haceme una pregunta para ver si entendí',
            ].map(chip => (
              <button
                key={chip}
                onClick={() => { setInput(chip); textareaRef.current?.focus() }}
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

        {/* Input area */}
        <div className="socratic-input-area">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? 'Preguntá, comentá, debatí...' : 'Preguntá, comentá, debatí... (Enter para enviar)'}
            rows={1}
            className="socratic-textarea"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn btn-primary"
            style={{ padding: '10px 16px', fontSize: 14, flexShrink: 0, borderRadius: 12 }}
          >
            →
          </button>
        </div>

      </div>
    </div>
  )
}
