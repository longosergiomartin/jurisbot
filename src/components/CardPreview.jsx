import { useState } from 'react'

const TYPE_LABELS = {
  flashcard: '🃏',
  mcq: '🔘',
  short_answer: '✍️',
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function CardItem({ card, onDelete, onSave, onRegenerate, regenerating }) {
  const [editing, setEditing] = useState(card._isNew || false)
  const [front, setFront] = useState(card.front || card.question || '')
  const [back, setBack] = useState(card.back || card.explanation || '')

  function handleSave() {
    onSave(card.id, front, back)
    setEditing(false)
  }

  const displayFront = card.front || card.question || ''
  const displayBack = card.back || card.explanation || ''

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      opacity: regenerating ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Type stripe */}
      <div style={{
        height: 3,
        background: card.type === 'flashcard'
          ? 'linear-gradient(90deg, var(--primary), var(--pink))'
          : card.type === 'mcq'
          ? 'linear-gradient(90deg, var(--teal), var(--primary))'
          : 'linear-gradient(90deg, var(--accent), #f97316)',
      }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {TYPE_LABELS[card.type] || '🃏'} {card.type === 'flashcard' ? 'Flashcard' : card.type === 'mcq' ? 'Opción múltiple' : 'Respuesta corta'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && (
              <>
                <button
                  onClick={() => onRegenerate(card.id)}
                  disabled={regenerating}
                  style={{
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 8, padding: '3px 10px', fontSize: 12,
                    color: 'var(--primary-light)', cursor: regenerating ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                  title="Regenerar esta tarjeta"
                >
                  {regenerating ? '⏳' : '🔄'}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: 'var(--fill)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '3px 10px', fontSize: 12,
                    color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ✏️ Editar
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(card.id)}
              style={{
                background: 'none', border: 'none',
                fontSize: 16, color: 'var(--text-muted)',
                cursor: 'pointer', padding: '2px 4px', lineHeight: 1,
              }}
              title="Eliminar tarjeta"
            >
              ×
            </button>
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                {card.type === 'flashcard' ? 'Frente (pregunta)' : 'Pregunta'}
              </p>
              <textarea
                value={front}
                onChange={e => setFront(e.target.value)}
                rows={3}
                autoFocus
                style={{
                  width: '100%', background: 'var(--fill)',
                  border: '1px solid var(--primary)', borderRadius: 8,
                  padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                  resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                {card.type === 'mcq' ? 'Explicación' : 'Reverso (respuesta)'}
              </p>
              <textarea
                value={back}
                onChange={e => setBack(e.target.value)}
                rows={3}
                style={{
                  width: '100%', background: 'var(--fill)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                  resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setEditing(false)}
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 13, padding: '8px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 13, padding: '8px' }}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>
              {displayFront}
            </p>
            {card.type === 'mcq' && card.options && (
              <div style={{ margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {card.options.map((opt, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '4px 8px', borderRadius: 6,
                    background: i === card.correctIndex ? 'var(--success-dim)' : 'var(--fill-soft)',
                    border: `1px solid ${i === card.correctIndex ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                    color: i === card.correctIndex ? 'var(--success)' : 'var(--text-muted)',
                  }}>
                    {String.fromCharCode(65 + i)}. {opt} {i === card.correctIndex && '✓'}
                  </div>
                ))}
              </div>
            )}
            {displayBack && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                {displayBack}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function CardPreview({ deck, source, onStart, onBack }) {
  const [cards, setCards] = useState(deck?.cards || [])
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [redistributing, setRedistributing] = useState(false)
  const [error, setError] = useState(null)

  function handleDelete(cardId) {
    setCards(prev => prev.filter(c => c.id !== cardId))
  }

  function handleSave(cardId, newFront, newBack) {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c
      return {
        ...c,
        front: newFront,
        back: newBack,
      }
    }))
  }

  function handleAddManual() {
    const newCard = {
      id: generateId(),
      type: 'flashcard',
      front: '',
      back: '',
      _isNew: true,
    }
    setCards(prev => [...prev, newCard])
  }

  async function handleRegenerate(cardId) {
    setRegeneratingId(cardId)
    setError(null)
    try {
      const existingCards = cards.filter(c => c.id !== cardId)
      const body = { existingCards }
      if (source?.fileData) {
        body.fileData = source.fileData
      } else {
        body.text = source?.text || ''
      }

      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.card) throw new Error(data.error || 'Error al regenerar')

      const newCard = { ...data.card, id: generateId() }
      setCards(prev => prev.map(c => c.id === cardId ? newCard : c))
    } catch (err) {
      setError('No se pudo regenerar la tarjeta. Intentá de nuevo.')
    }
    setRegeneratingId(null)
  }

  async function handleRedistribute() {
    if (!source) return
    setRedistributing(true)
    setError(null)
    try {
      const body = {
        text: source.text || null,
        fileData: source.fileData || null,
        url: source.url || null,
        cardCount: source.cardCount || 15,
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.cards) throw new Error(data.error || 'Error al redistribuir')

      setCards(data.cards)
    } catch (err) {
      setError('No se pudo generar otra distribución. Intentá de nuevo.')
    }
    setRedistributing(false)
  }

  return (
    <div className="screen" style={{ paddingTop: 16 }}>
      <div className="container animate-fade">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 20,
              cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
              Revisá tus tarjetas
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {cards.length} tarjeta{cards.length !== 1 ? 's' : ''} generadas · podés editar o eliminar antes de estudiar
            </p>
          </div>
          {source && (
            <button
              onClick={handleRedistribute}
              disabled={redistributing}
              style={{
                background: 'var(--fill)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '7px 12px', fontSize: 12,
                color: 'var(--text-muted)', cursor: redistributing ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
              }}
              title="Generar otra distribución de tarjetas"
            >
              {redistributing ? '⏳ Generando...' : '🎲 Otra distribución'}
            </button>
          )}
        </div>

        {/* Kuma tip */}
        <div className="kai-bubble" style={{ marginBottom: 20 }}>
          <span className="kai-avatar">🐶</span>
          <div className="kai-text">
            ¡Revisá que las tarjetas sean claras antes de empezar! Podés editar, regenerar o borrar las que no te gusten. 🐾
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: '#fb7185',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Cards list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {cards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={handleDelete}
              onSave={handleSave}
              onRegenerate={handleRegenerate}
              regenerating={regeneratingId === card.id}
            />
          ))}
        </div>

        {/* Add manual card */}
        <button
          onClick={handleAddManual}
          style={{
            width: '100%', background: 'var(--fill-soft)',
            border: '1px dashed var(--border)', borderRadius: 12,
            padding: '12px', fontSize: 13, color: 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-light)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          + Añadir tarjeta manual
        </button>

        {cards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: 16, border: '1px dashed var(--border)', marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Eliminaste todas las tarjetas</div>
            <div style={{ fontSize: 13 }}>Volvé a generar el mazo</div>
          </div>
        )}

        {/* CTA */}
        <button
          className="btn btn-primary"
          onClick={() => onStart(cards)}
          disabled={cards.length === 0}
          style={{ width: '100%', padding: '15px', fontSize: 16 }}
        >
          ⚡ Empezar a estudiar ({cards.length} tarjeta{cards.length !== 1 ? 's' : ''})
        </button>

      </div>
    </div>
  )
}
