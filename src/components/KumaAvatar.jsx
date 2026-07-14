import { getEquippedSkin } from '../services/unlocks'

// Kuma's avatar everywhere — base shiba + accessory badge from the highest
// unlocked skin, so unlocks are actually visible instead of just awarded.
export default function KumaAvatar({ user, className = 'kai-avatar' }) {
  const skin = getEquippedSkin(user)
  return (
    <span className={className}>
      🐶
      {skin && <span className="kai-accessory">{skin.emoji}</span>}
    </span>
  )
}
