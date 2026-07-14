import { useState, useEffect, useRef, useCallback } from 'react'

const WORK = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const freqs = [528, 660, 784]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const start = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.22, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.2)
      osc.start(start)
      osc.stop(start + 1.2)
    })
  } catch {}
}

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function PomodoroTimer({ autoStart = false }) {
  const [mode, setMode] = useState('work')
  const [secondsLeft, setSecondsLeft] = useState(WORK)
  const [running, setRunning] = useState(autoStart)
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [showBreak, setShowBreak] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const modeRef = useRef(mode)
  const pomodoroCountRef = useRef(pomodoroCount)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { pomodoroCountRef.current = pomodoroCount }, [pomodoroCount])

  // Countdown
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  // Detect end
  const prevRef = useRef(secondsLeft)
  useEffect(() => {
    if (secondsLeft === 0 && prevRef.current > 0) {
      playChime()
      if (modeRef.current === 'work') {
        const next = pomodoroCountRef.current + 1
        setPomodoroCount(next)
        setRunning(false)
        setShowBreak(true)
      } else {
        // break ended → back to work
        setMode('work')
        setSecondsLeft(WORK)
        setRunning(true)
        setShowBreak(false)
      }
    }
    prevRef.current = secondsLeft
  }, [secondsLeft])

  const startBreak = useCallback(() => {
    const isLong = pomodoroCount % 4 === 0
    setMode(isLong ? 'long-break' : 'short-break')
    setSecondsLeft(isLong ? LONG_BREAK : SHORT_BREAK)
    setRunning(true)
    setShowBreak(false)
    setExpanded(false)
  }, [pomodoroCount])

  const skipBreak = useCallback(() => {
    setMode('work')
    setSecondsLeft(WORK)
    setRunning(true)
    setShowBreak(false)
    setExpanded(false)
  }, [])

  const total = mode === 'work' ? WORK : mode === 'short-break' ? SHORT_BREAK : LONG_BREAK
  const progress = secondsLeft / total
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const isWork = mode === 'work'
  const almostDone = isWork && secondsLeft <= 5 * 60 && secondsLeft > 0
  const color = showBreak ? 'var(--success)' : almostDone ? '#f97316' : isWork ? 'var(--primary-light)' : 'var(--teal)'

  return (
    <>
      {/* Break modal */}
      {showBreak && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 24px',
          }}
        >
          <div
            className="card animate-pop"
            style={{ maxWidth: 380, width: '100%', padding: '28px 24px', textAlign: 'center' }}
          >
            <div style={{ fontSize: 52, marginBottom: 12 }}>
              {pomodoroCount % 4 === 0 ? '☕' : '🐾'}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              {pomodoroCount % 4 === 0
                ? '¡25 minutos cumplidos! Descansá 15 min'
                : '¡Pomodoro completado! Tomá 5 minutos'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Pomodoros completados: {'🍅'.repeat(Math.min(pomodoroCount, 4))}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Tu cerebro necesita este descanso para consolidar lo que aprendiste.
              Alejate de la pantalla, respirá, tomá agua.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-ghost"
                onClick={skipBreak}
                style={{ flex: 1, fontSize: 14 }}
              >
                Seguir estudiando
              </button>
              <button
                className="btn btn-primary"
                onClick={startBreak}
                style={{ flex: 1, fontSize: 14 }}
              >
                {pomodoroCount % 4 === 0 ? 'Descanso largo (15m)' : 'Descanso (5m)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating timer pill */}
      <div
        style={{
          position: 'fixed',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          right: 'calc(16px + env(safe-area-inset-right, 0px))',
          zIndex: 100,
          userSelect: 'none',
        }}
      >
        {expanded ? (
          /* Expanded card */
          <div
            className="card animate-pop"
            style={{
              padding: '16px 18px',
              minWidth: 180,
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              border: `1px solid ${color}44`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>
                {isWork ? '🍅 Foco' : mode === 'short-break' ? '☕ Pausa corta' : '☕ Pausa larga'}
              </span>
              <button
                onClick={() => setExpanded(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Circular ring + time */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={28} cy={28} r={RADIUS} fill="none" stroke="var(--fill-strong)" strokeWidth={4} />
                <circle
                  cx={28} cy={28} r={RADIUS}
                  fill="none"
                  stroke={color}
                  strokeWidth={4}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56,
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color,
              }}>
                {fmt(secondsLeft)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setRunning(r => !r)}
                style={{
                  flex: 1, background: `${color}22`, border: `1px solid ${color}44`,
                  borderRadius: 8, padding: '7px 0', color, fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {running ? '⏸ Pausar' : '▶ Reanudar'}
              </button>
              <button
                onClick={skipBreak}
                title="Reiniciar"
                style={{
                  background: 'var(--fill)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '7px 10px', color: 'var(--text-muted)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ↺
              </button>
            </div>

            {pomodoroCount > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                {'🍅'.repeat(Math.min(pomodoroCount % 4 || 4, 4))} completados
              </p>
            )}
          </div>
        ) : (
          /* Collapsed pill */
          <button
            onClick={() => setExpanded(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--card)', border: `1.5px solid ${color}55`,
              borderRadius: 20, padding: '6px 12px 6px 8px',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <svg width={24} height={24} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
              <circle cx={12} cy={12} r={9} fill="none" stroke="var(--fill-strong)" strokeWidth={2.5} />
              <circle
                cx={12} cy={12} r={9}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray={2 * Math.PI * 9}
                strokeDashoffset={2 * Math.PI * 9 * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <span style={{
              fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color,
              letterSpacing: '0.5px',
            }}>
              {fmt(secondsLeft)}
            </span>
          </button>
        )}
      </div>
    </>
  )
}
