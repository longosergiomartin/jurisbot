import { useState } from 'react'

const TYPE_LABELS = {
  flashcard: '🃏',
  mcq: '🔘',
  short_answer: '✍️',
}

function CardItem({ card, onDelete, onSave }) {
  const [editing, setEditing] = useState(false)
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
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '3px 10px', fontSize: 12,
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ✏️ Editar
              </button>
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
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
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
                  width: '100%', background: 'rgba(255,255,255,0.05)',
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
                    background: i === card.correctIndex ? 'var(--success-dim)' : 'rgba(255,255,255,0.03)',
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

export default function CardPreview({ deck, onStart, onBack }) {
  const [cards, setCards] = useState(deck?.cards || [])

  function handleDelete(cardId) {
    setCards(prev => prev.filter(c => c.id !== cardId))
  }

  function handleSave(cardId, newFront, newBack) {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c
      return {
        ...c,
        front: c.type === 'flashcard' ? newFront : c.front,
        question: c.type !== 'flashcard' ? newFront : c.question,
        back: newBack,
        explanation: c.type === 'mcq' ? newBack : c.explanation,
      }
    }))
  }

  return (
    <div className="screen" style={{ paddingTop: 16 }}>
      <div className="container animate-fade">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 20,
              cursor: 'pointer', padding: '2px 4px', lineHeight: 1,
            }}
          >
            ←
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
              Revisá tus tarjetas
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {cards.length} tarjeta{cards.length !== 1 ? 's' : ''} generadas · podés editar o eliminar antes de estudiar
            </p>
          </div>
        </div>

        {/* Kuma tip */}
        <div className="kai-bubble" style={{ marginBottom: 20 }}>
          <span className="kai-avatar">🐶</span>
          <div className="kai-text">
            ¡Revisá que las tarjetas sean claras antes de empezar! Podés editar o borrar las que no te gusten. 🐾
          </div>
        </div>

        {/* Cards list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {cards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={handleDelete}
              onSave={handleSave}
            />
          ))}
        </div>

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
