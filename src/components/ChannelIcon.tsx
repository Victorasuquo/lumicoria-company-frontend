import { useState } from 'react'
import { CalendarBlank, EnvelopeSimple, GlobeHemisphereWest, PhoneCall, PlugsConnected, Table, UsersThree, type Icon } from '@phosphor-icons/react'
import { channelIdentity } from './channelIdentity'
import './channel-icon.css'

const categoryIcons: Record<string, Icon> = { phone: PhoneCall, email: EnvelopeSimple, web: GlobeHemisphereWest, calendar: CalendarBlank, spreadsheet: Table, crm: UsersThree }

export function ChannelIcon({ provider, channel, size = 32, fallback }: { provider?: string; channel?: string; size?: number; fallback?: Icon }) {
  const identity = channelIdentity(provider, channel)
  const [failedImage, setFailedImage] = useState<string>()
  const Fallback = fallback ?? categoryIcons[identity.category] ?? PlugsConnected
  return <span className="workspace-channel-icon" aria-hidden="true" style={{ width: size, height: size, color: identity.color ?? '#626778' }}>
    {identity.image && failedImage !== identity.image ? <img src={identity.image} width={size} height={size} alt="" decoding="async" onError={() => setFailedImage(identity.image)} /> : <Fallback size={size} weight="duotone" />}
  </span>
}
