import { useMemo, useState } from 'react'
import { getDueCards } from '../services/fsrs'
import { getLevel } from '../services/levels'
import { UNLOCK_REGISTRY, getEquippedSkin } from '../services/unlocks'
import { requestNotificationPermission } from '../services/notifications'
import SyncStatus from './SyncStatus'
import SubscriptionCard from './SubscriptionCard'
import KumaAvatar from './KumaAvatar'

export default function Profile({ user, decks, authUser, syncState, lastSynced, onShowAuth, onRetry, onUpgrade, upgrading, subscription, onCancelSubscription }) {
  const totalDue = useMemo(
    () => decks.reduce((sum, d) => sum + getDueCards(d.cards).length, 0),
    [decks]
  )
  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0)
  const lvl = getLevel(user.xp)
  const equipped = getEquippedSkin(user)
  const owned = new Set(user.unlockedIds ?? [])

  const [notifPermission, setNotifPermission] = useState(
    () => ('Notification' in window ? Notification.permission : 'denied')
  )

  function handleRequestNotif() {
    requestNotificationPermission().then(granted => {
      setNotifPermission(granted ? 'granted' : 'denied')
    })
  }

  return (
    <div className="screen with-tabbar" style={{ paddingTop: 20 }}>
      <div className="container animate-fade">

        {/* Identity header */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 16, padding: '28px 24px' }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8, position: 'relative', display: 'inline-block' }}>
            <KumaAvatar user={user} className="" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 2 }}>{user.name}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 14 }}>
            {lvl.emoji} Nivel {lvl.level} · {lvl.name}
            {equipped && <span style={{ marginLeft: 8 }}>· con {equipped.name}</span>}
          </div>
          {lvl.next && (
            <>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${lvl.progress}%`, background: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 700 }}>
                {lvl.xpToNext} XP para Nivel {lvl.next.level} ({lvl.next.name})
              </div>
            </>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Racha', value: `${user.streak} día${user.streak !== 1 ? 's' : ''}`, icon: '🔥' },
            { label: 'Escudos', value: `×${user.streakShields ?? 0}`, icon: '🛡️' },
            { label: 'XP total', value: user.xp, icon: '⭐' },
            { label: 'Sesiones', value: user.totalSessions, icon: '✅' },
            { label: 'Tarjetas', value: totalCards, icon: '🃏' },
            { label: 'Para hoy', value: totalDue, icon: '📚' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Unlocks gallery */}
        <div className="card" style={{ marginBottom: 16, padding: '18px 20px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12 }}>🎁 Colección</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {UNLOCK_REGISTRY.map(u => {
              const has = owned.has(u.id)
              return (
                <div
                  key={u.id}
                  title={has ? u.description : `Se desbloquea en el nivel ${u.level}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 12,
                    background: has ? 'var(--accent-dim)' : 'var(--fill-soft)',
                    border: `2px solid ${has ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`,
                    opacity: has ? 1 : 0.6,
                  }}
                >
                  <span style={{ fontSize: 20, filter: has ? 'none' : 'grayscale(1)' }}>{has ? u.emoji : '🔒'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>
                      {has ? 'Desbloqueado' : `Nivel ${u.level}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings row: notifications + sync */}
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Recordatorio diario</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              {notifPermission === 'granted' ? 'Activado — Kuma te va a avisar 🐾' : 'Para que no se corte la racha'}
            </div>
          </div>
          {notifPermission !== 'granted' && (
            <button className="btn btn-primary" onClick={handleRequestNotif} style={{ fontSize: 13, padding: '9px 16px' }}>
              🔔 Activar
            </button>
          )}
        </div>

        {/* Cloud sync / account */}
        {authUser ? (
          <div className="card" style={{ marginBottom: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>☁️ Cuenta sincronizada</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {authUser.email}
              </div>
            </div>
            <SyncStatus state={syncState} lastSynced={lastSynced} onRetry={onRetry} />
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 16, padding: '16px 20px', border: '2px solid rgba(245,158,11,0.4)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-dark)', marginBottom: 4 }}>⚠️ Modo invitado</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
              Si cambiás de dispositivo o limpiás el navegador, perdés tus mazos, XP y rachas.
            </div>
            <button className="btn btn-primary" onClick={onShowAuth} style={{ width: '100%', fontSize: 14 }}>
              ☁️ Guardar mi progreso gratis
            </button>
          </div>
        )}

        {/* Plan */}
        {authUser && user.plan === 'free' && (
          <div className="card" style={{ marginBottom: 16, padding: '16px 20px', border: '2px solid rgba(124,58,237,0.35)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>✨ Cognify Pro</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
              Mazos y chats con Kuma ilimitados, sincronización en todos tus dispositivos.
            </div>
            <button className="btn btn-primary" onClick={onUpgrade} disabled={upgrading} style={{ width: '100%', fontSize: 14 }}>
              {upgrading ? 'Redirigiendo...' : 'Pasarme a Pro ✨'}
            </button>
          </div>
        )}
        {authUser && user.plan === 'pro' && subscription && (
          <SubscriptionCard subscription={subscription} onCancel={onCancelSubscription} />
        )}

      </div>
    </div>
  )
}
