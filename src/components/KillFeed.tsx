import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

export interface KillFeedItem {
  id: string
  message: string
  timestamp: number
  type: 'kill' | 'levelup' | 'combo'
}

interface KillFeedProps {
  items: KillFeedItem[]
}

export function KillFeed({ items }: KillFeedProps) {
  const [visibleItems, setVisibleItems] = useState<KillFeedItem[]>([])
  const isMobile = useIsMobile()

  useEffect(() => {
    const now = Date.now()
    const filtered = items.filter(item => now - item.timestamp < 5000)
    setVisibleItems(filtered.slice(-5))
  }, [items])

  if (visibleItems.length === 0) return null

  return (
    <div className={`absolute ${isMobile ? 'bottom-20 left-2 right-2' : 'bottom-4 left-4'} z-10 space-y-1 pointer-events-none`}>
      {visibleItems.map((item) => {
        const age = Date.now() - item.timestamp
        const opacity = Math.max(0, 1 - (age / 5000))
        
        let colorClass = 'text-white'
        if (item.type === 'levelup') colorClass = 'text-purple-400'
        if (item.type === 'combo') colorClass = 'text-yellow-400'

        return (
          <div
            key={item.id}
            className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium ${colorClass} bg-black/50 px-3 py-1 rounded-md transition-opacity duration-300`}
            style={{ opacity }}
          >
            {item.message}
          </div>
        )
      })}
    </div>
  )
}
