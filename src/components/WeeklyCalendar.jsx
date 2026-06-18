import { useMemo } from 'react'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function WeeklyCalendar({ decks }) {
  const weekData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build array of 7 days starting from today
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return { date: d, count: 0 }
    })

    // Count cards due per day
    const allCards = decks.flatMap(deck => deck.cards || [])
    for (const card of allCards) {
      if (!card.due) continue
      const due = new Date(card.due)
      due.setHours(0, 0, 0, 0)
      const diffMs = due - today
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 7) {
        days[diffDays].count++
      }
    }

    return days
  }, [decks])

  const maxCount = Math.max(...weekData.map(d => d.count), 1)

  const getLabel = (day, index) => {
    if (index === 0) return 'Hoy'
    if (index === 1) return 'Mañana'
    return DAY_LABELS[day.date.getDay()]
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Esta semana</h3>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '16px 12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 4,
            height: 80,
          }}
        >
          {weekData.map((day, i) => {
            const heightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0
            const isToday = i === 0
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                {/* Count label above bar */}
                {day.count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isToday ? 'var(--accent)' : 'var(--text-soft)',
                      marginBottom: 3,
                    }}
                  >
                    {day.count}
                  </span>
                )}
                {/* Bar */}
                <div
                  style={{
                    width: '100%',
                    height: day.count === 0 ? 4 : `${Math.max(heightPct, 8)}%`,
                    borderRadius: '4px 4px 2px 2px',
                    background: isToday
                      ? 'var(--accent)'
                      : day.count === 0
                      ? 'var(--border)'
                      : 'linear-gradient(180deg, var(--primary) 0%, var(--pink) 100%)',
                    opacity: day.count === 0 ? 0.4 : 1,
                    transition: 'height 0.4s ease',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Day labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 4,
            marginTop: 6,
          }}
        >
          {weekData.map((day, i) => {
            const isToday = i === 0
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getLabel(day, i)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
