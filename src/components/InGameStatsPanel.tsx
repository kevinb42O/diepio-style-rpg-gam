import { Heart, Sword, Lightning, Wind, ShieldCheck, Target, FireExtinguisher, ArrowsOut, Magnet, Plus, Check, CaretUp, CaretDown } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceInfo } from '@/hooks/use-mobile'
import type { StatType } from '@/lib/upgradeSystem'
import { getSynergyDescription, getSynergyStatsForClass } from '@/lib/synergyMeta'
import { memo, useCallback, useMemo, useState, useEffect } from 'react'

interface InGameStatsPanelProps {
  availablePoints: number
  statPoints: { [key in StatType]: number }
  onAllocate: (stat: StatType) => void
  currentClass: string
}

const MAX_STAT_POINTS = 40

const STAT_INFO: { [key in StatType]: { icon: typeof Heart; label: string; shortLabel: string; gradient: string; color: string; hotkey: string } } = {
  healthRegen: {
    icon: Heart,
    label: 'Health Regen',
    shortLabel: 'REGEN',
    gradient: 'from-rose-500 to-pink-600',
    color: 'text-rose-400',
    hotkey: '1'
  },
  maxHealth: {
    icon: ShieldCheck,
    label: 'Max Health',
    shortLabel: 'HP',
    gradient: 'from-emerald-500 to-green-600',
    color: 'text-emerald-400',
    hotkey: '2'
  },
  bodyDamage: {
    icon: FireExtinguisher,
    label: 'Body Damage',
    shortLabel: 'BODY',
    gradient: 'from-orange-500 to-amber-600',
    color: 'text-orange-400',
    hotkey: '3'
  },
  bulletSpeed: {
    icon: Lightning,
    label: 'Bullet Speed',
    shortLabel: 'VEL',
    gradient: 'from-yellow-400 to-amber-500',
    color: 'text-yellow-400',
    hotkey: '4'
  },
  bulletPenetration: {
    icon: ArrowsOut,
    label: 'Penetration',
    shortLabel: 'PEN',
    gradient: 'from-cyan-400 to-teal-500',
    color: 'text-cyan-400',
    hotkey: '5'
  },
  bulletDamage: {
    icon: Sword,
    label: 'Bullet Damage',
    shortLabel: 'DMG',
    gradient: 'from-violet-500 to-purple-600',
    color: 'text-violet-400',
    hotkey: '6'
  },
  reload: {
    icon: Target,
    label: 'Reload',
    shortLabel: 'RATE',
    gradient: 'from-fuchsia-500 to-pink-600',
    color: 'text-fuchsia-400',
    hotkey: '7'
  },
  movementSpeed: {
    icon: Wind,
    label: 'Movement Speed',
    shortLabel: 'SPD',
    gradient: 'from-blue-500 to-indigo-600',
    color: 'text-blue-400',
    hotkey: '8'
  },
  lootRange: {
    icon: Magnet,
    label: 'Loot Range',
    shortLabel: 'LOOT',
    gradient: 'from-purple-500 to-violet-600',
    color: 'text-purple-400',
    hotkey: '9'
  }
}

// Compact progress bar with segments for in-game use
function CompactProgress({ value, max, gradient }: { value: number; max: number; gradient: string }) {
  const segments = 10
  const filledSegments = Math.floor((value / max) * segments)
  const partialFill = ((value / max) * segments) % 1
  
  return (
    <div className="flex gap-0.5 h-1">
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filledSegments
        const isPartial = i === filledSegments && partialFill > 0
        
        return (
          <div
            key={i}
            className={`
              flex-1 rounded-sm overflow-hidden
              ${isFilled || isPartial ? '' : 'bg-white/10'}
            `}
          >
            {(isFilled || isPartial) && (
              <div
                className={`h-full bg-gradient-to-r ${gradient} transition-all duration-200`}
                style={{ width: isPartial ? `${partialFill * 100}%` : '100%' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const StatRowCompact = memo(({ 
  stat, 
  points, 
  availablePoints, 
  onAllocate, 
  isMobile,
  hasSynergy,
}: { 
  stat: StatType
  points: number
  availablePoints: number
  onAllocate: (stat: StatType) => void
  isMobile: boolean
  hasSynergy: boolean
}) => {
  const info = STAT_INFO[stat]
  const Icon = info.icon
  const isMaxed = points >= MAX_STAT_POINTS
  const canUpgrade = availablePoints > 0 && !isMaxed
  
  const handleClick = useCallback(() => {
    if (canUpgrade) onAllocate(stat)
  }, [stat, onAllocate, canUpgrade])
  
  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-center gap-1.5 
        ${isMobile ? 'p-1.5' : 'p-2'}
        rounded-md
        ${
          hasSynergy 
            ? 'bg-emerald-400/20 border border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
            : 'bg-black/20 border border-white/[0.04]'
        }
        ${canUpgrade ? 'cursor-pointer hover:bg-black/30 hover:border-white/10' : ''}
        ${isMaxed ? 'opacity-60' : ''}
        transition-all duration-150
      `}
    >
      {/* Hotkey */}
      <div className={`
        flex items-center justify-center
        ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[9px]'}
        rounded
        bg-white/5
        text-white/30
        font-mono font-bold
      `}>
        {info.hotkey}
      </div>
      
      {/* Icon */}
      <Icon weight="fill" size={isMobile ? 12 : 14} className={info.color} />
      
      {/* Label & Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1">
            <span className={`font-medium ${isMobile ? 'text-[9px]' : 'text-[10px]'} text-white/70 truncate`}>
              {isMobile ? info.shortLabel : info.label}
            </span>
            {hasSynergy && (
              <span className="text-[7px] font-bold text-emerald-300 uppercase tracking-wider">
                ★
              </span>
            )}
          </div>
          <span className={`text-[8px] font-mono tabular-nums ${isMaxed ? 'text-amber-300' : 'text-white/40'}`}>
            {points}/{MAX_STAT_POINTS}
          </span>
        </div>
        <CompactProgress value={points} max={MAX_STAT_POINTS} gradient={info.gradient} />
      </div>
      
      {/* Upgrade button */}
      <button
        disabled={!canUpgrade}
        className={`
          flex items-center justify-center
          ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}
          rounded
          transition-all duration-150
          ${isMaxed 
            ? 'bg-amber-500/20 text-amber-400' 
            : canUpgrade 
              ? `bg-gradient-to-br ${info.gradient} text-white hover:scale-105 active:scale-95` 
              : 'bg-white/5 text-white/20'
          }
        `}
      >
        {isMaxed ? (
          <Check weight="bold" size={isMobile ? 10 : 12} />
        ) : (
          <Plus weight="bold" size={isMobile ? 10 : 12} />
        )}
      </button>
    </div>
  )
})

StatRowCompact.displayName = 'StatRowCompact'

export const InGameStatsPanel = memo(function InGameStatsPanel({ availablePoints, statPoints, onAllocate, currentClass }: InGameStatsPanelProps) {
  const { isMobile, isPortrait } = useDeviceInfo()
  const statEntries = Object.keys(STAT_INFO) as StatType[]
  
  // In portrait mode on mobile, start collapsed. In landscape or desktop, start expanded
  const [isExpanded, setIsExpanded] = useState(!isPortrait || !isMobile)
  
  const synergyStats = useMemo(() => {
    return new Set(getSynergyStatsForClass(currentClass))
  }, [currentClass])

  // Update expanded state when orientation changes
  useEffect(() => {
    if (!isMobile || !isPortrait) {
      setIsExpanded(true)
    }
  }, [isMobile, isPortrait])

  if (availablePoints <= 0) return null

  // Calculate positioning based on orientation
  const position = isMobile && isPortrait
    ? 'left-2 bottom-32'
    : isMobile && !isPortrait
    ? 'left-3 bottom-6'
    : 'left-3 bottom-6'
  
  const width = isMobile ? 'w-44' : 'w-56'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`
        absolute z-30 pointer-events-auto
        ${position} ${width}
        bg-gradient-to-b from-black/80 via-black/70 to-black/80
        backdrop-blur-xl
        rounded-xl
        border border-white/10
        shadow-2xl
      `}
      style={{
        bottom: isMobile && isPortrait 
          ? `calc(8rem + var(--safe-area-inset-bottom))` 
          : `calc(1.5rem + var(--safe-area-inset-bottom))`,
        left: `calc(${isMobile ? '0.5rem' : '0.75rem'} + var(--safe-area-inset-left))`
      }}
    >
      {/* Header - always visible, clickable in portrait mode */}
      <div 
        className={`${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} border-b border-white/[0.06] ${isMobile && isPortrait ? 'cursor-pointer' : ''}`}
        onClick={() => {
          if (isMobile && isPortrait) {
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className={`
              flex items-center justify-center
              ${isMobile ? 'w-6 h-6' : 'w-7 h-7'}
              rounded-full
              bg-gradient-to-br from-amber-400 to-orange-500
              shadow-md
            `}>
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-black`}>
                {availablePoints}
              </span>
            </div>
            <div>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-white`}>
                Skill Points
              </span>
              <div className="text-[9px] text-white/40">
                {isMobile && isPortrait ? 'Tap to expand' : 'Click to upgrade'}
              </div>
            </div>
          </div>
          {isMobile && isPortrait && (
            <div className="text-white/60">
              {isExpanded ? <CaretDown size={16} weight="bold" /> : <CaretUp size={16} weight="bold" />}
            </div>
          )}
        </div>
      </div>
      
      {/* Stats List - collapsible in portrait mode */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`${isMobile ? 'p-2' : 'p-3'}`}>
              <div className={`space-y-${isMobile ? '1' : '1.5'}`}>
                {statEntries.map((stat) => (
                  <StatRowCompact
                    key={stat}
                    stat={stat}
                    points={statPoints[stat]}
                    availablePoints={availablePoints}
                    onAllocate={onAllocate}
                    isMobile={isMobile}
                    hasSynergy={synergyStats.has(stat)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
