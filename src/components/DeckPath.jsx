import { useMemo } from 'react'
import { buildPath } from '../services/path'
import { getDeckMastery } from '../services/fsrs'
import KumaAvatar from './KumaAvatar'

const NODE_ICONS = {
  lesson: { done: '✓', active: '★', locked: '🔒' },
  review: { done: '✓', active: '💪', locked: '🔒' },
  mastery: { done: '👑', active: '🏆', locked: '🏆' },
}

// Winding horizontal offsets, Duolingo-style: center → right → center → left → …
const WAVE = [0, 56, 84, 56, 0, -56, -84, -56]

export default function DeckPath({ deck, user, onStartLesson, onBack, onCompanion }) {
  const nodes = useMemo(() => buildPath(deck), [deck])
  const mastery = getDeckMastery(deck.cards) ?? 0
  const activeIndex = nodes.findIndex(n => n.status === 'active')
  const doneLessons = nodes.filter(n => n.type === 'lesson' && n.status === 'done').length
  const totalLessons = nodes.filter(n => n.type === 'lesson').length

  return (
    <div className="screen with-tabbar" style={{ paddingTop: 0 }}>
      <div className="container animate-fade">

        {/* Unit header — sticky, Duolingo-style colored banner */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          margin: '0 -16px', padding: '16px',
          background: 'var(--bg)',
        }}>
          <div style={{
            background: 'var(--primary)',
            borderRadius: 18,
            boxShadow: '0 4px 0 var(--primary-dark)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            color: '#fff',
          }}>
            <button
              onClick={onBack}
              title="Volver a mis unidades"
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: 10, width: 34, height: 34, flexShrink: 0,
                color: '#fff', fontSize: 18, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ←
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, letterSpacing: 0.6 }}>
                UNIDAD · {doneLessons}/{totalLessons} LECCIONES
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deck.title}
              </div>
            </div>
            <div
              title={`Dominio del mazo: ${mastery}%`}
              style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: 12,
                padding: '6px 10px', fontSize: 13, fontWeight: 900, flexShrink: 0,
              }}
            >
              {mastery}%
            </div>
          </div>
        </div>

        {/* The winding path */}
        <div style={{ padding: '28px 0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {nodes.map((node, i) => {
            const offset = WAVE[i % WAVE.length]
            const icon = NODE_ICONS[node.type][node.status === 'done' ? 'done' : node.status === 'active' ? 'active' : 'locked']
            const isActive = node.status === 'active'
            const isLocked = node.status === 'locked'
            const nodeClass = isLocked
              ? 'locked'
              : node.status === 'done'
                ? 'done'
                : node.type === 'review'
                  ? 'review-ready'
                  : 'active'
            return (
              <div key={node.key} style={{ position: 'relative', marginBottom: 34, transform: `translateX(${offset}px)` }}>
                {/* Kuma keeps you company at the active node */}
                {/* Kuma sits opposite the text label so they never overlap */}
                {isActive && i === activeIndex && (
                  <div style={{
                    position: 'absolute',
                    left: offset >= 0 ? 92 : -78,
                    top: 8,
                    fontSize: 40,
                    pointerEvents: 'none',
                  }}>
                    <KumaAvatar user={user} className="kai-avatar" />
                  </div>
                )}
                {isActive && <div className="path-start-bubble">{node.type === 'lesson' ? 'EMPEZAR' : node.type === 'review' ? 'REPASAR' : 'DESAFÍO'}</div>}
                <button
                  className={`path-node ${nodeClass}`}
                  disabled={isLocked}
                  onClick={() => onStartLesson(node)}
                  title={isLocked ? 'Completá las lecciones anteriores para desbloquear' : node.subtitle}
                >
                  {node.type === 'mastery' && node.status !== 'done' ? '🏆' : icon}
                </button>
                <div
                  className="path-node-label"
                  style={offset >= 0 ? { right: 92, textAlign: 'right' } : { left: 92 }}
                >
                  <div style={{ whiteSpace: 'nowrap' }}>{node.title}</div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>{node.subtitle}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chat with Kuma about this deck */}
        <button className="btn btn-ghost" onClick={() => onCompanion(deck.id)} style={{ width: '100%', fontSize: 14 }}>
          🐶 Charlar con Kuma sobre esta unidad
        </button>

      </div>
    </div>
  )
}
