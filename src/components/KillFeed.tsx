import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Crosshair, Fire } from '@phosphor-icons/react'

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
    const filtered = items.filter(item => now - item.timestamp < 4000)
    setVisibleItems(filtered.slice(-2)) // Max 2 notifications
  }, [items])

  if (visibleItems.length === 0) return null

  const getItemStyle = (type: KillFeedItem['type']) => {
    switch (type) {
      case 'levelup':
        return {
          icon: Star,
          gradient: 'from-violet-500/90 to-purple-600/90',
          glow: 'shadow-violet-500/30',
          iconColor: 'text-amber-300'
        }
      case 'combo':
        return {
          icon: Fire,
          gradient: 'from-amber-500/90 to-orange-600/90',
          glow: 'shadow-amber-500/30',
          iconColor: 'text-white'
        }
      default:
        return {
          icon: Crosshair,
          gradient: 'from-slate-700/90 to-slate-800/90',
          glow: 'shadow-black/30',
          iconColor: 'text-red-400'
        }
    }
  }

  return (
    <div className={`
      fixed z-40 pointer-events-none
      ${isMobile ? 'bottom-24 left-1/2 -translate-x-1/2' : 'bottom-6 left-1/2 -translate-x-1/2'}
      flex flex-col items-center gap-2
    `}>
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item) => {
          const age = Date.now() - item.timestamp
          const opacity = Math.max(0, 1 - (age / 4000))
          const style = getItemStyle(item.type)
          const Icon = style.icon

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: opacity, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`
                flex items-center gap-2
                ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}
                rounded-full
                bg-gradient-to-r ${style.gradient}
                backdrop-blur-xl
                border border-white/20
                shadow-lg ${style.glow}
              `}
            >
              <Icon 
                weight="fill" 
                size={isMobile ? 14 : 16} 
                className={style.iconColor}
              />
              <span className={`
                ${isMobile ? 'text-xs' : 'text-sm'}
                font-semibold text-white
                drop-shadow-sm
              `}>
                {item.message.replace('🎉 ', '')}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
