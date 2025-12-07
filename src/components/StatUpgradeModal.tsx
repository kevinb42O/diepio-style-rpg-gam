// Premium StatUpgradeModal - Last updated: Dec 6, 2025 16:45
import { Heart, Sword, Lightning, Wind, ShieldCheck, Target, FireExtinguisher, ArrowsOut, Magnet, X, Plus, Check } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIsMobile } from '@/hooks/use-mobile'
import type { StatType } from '@/lib/upgradeSystem'
import { getSynergyDescription, getSynergyStatsForClass } from '@/lib/synergyMeta'
import { TANK_CONFIGS } from '@/lib/tankConfigs'
import { memo, useCallback, useMemo } from 'react'

interface StatUpgradeModalProps {
  level: number
  availablePoints: number
  statPoints: { [key in StatType]: number }
  onAllocate: (stat: StatType) => void
  onClose: () => void
  currentClass: string
}

const MAX_STAT_POINTS = 40

const STAT_INFO: { [key in StatType]: { icon: typeof Heart; label: string; shortLabel: string; gradient: string; color: string; bgGlow: string } } = {
  healthRegen: {
    icon: Heart,
    label: 'Health Regen',
    shortLabel: 'REGEN',
    gradient: 'from-rose-500 to-pink-600',
    color: 'text-rose-400',
    bgGlow: 'rgba(244, 63, 94, 0.3)'
  },
  maxHealth: {
    icon: ShieldCheck,
    label: 'Max Health',
    shortLabel: 'HP',
    gradient: 'from-emerald-500 to-green-600',
    color: 'text-emerald-400',
    bgGlow: 'rgba(16, 185, 129, 0.3)'
  },
  bodyDamage: {
    icon: FireExtinguisher,
    label: 'Body Damage',
    shortLabel: 'BODY',
    gradient: 'from-orange-500 to-amber-600',
    color: 'text-orange-400',
    bgGlow: 'rgba(249, 115, 22, 0.3)'
  },
  bulletSpeed: {
    icon: Lightning,
    label: 'Bullet Speed',
    shortLabel: 'VEL',
    gradient: 'from-yellow-400 to-amber-500',
    color: 'text-yellow-400',
    bgGlow: 'rgba(250, 204, 21, 0.3)'
  },
  bulletPenetration: {
    icon: ArrowsOut,
    label: 'Penetration',
    shortLabel: 'PEN',
    gradient: 'from-cyan-400 to-teal-500',
    color: 'text-cyan-400',
    bgGlow: 'rgba(34, 211, 238, 0.3)'
  },
  bulletDamage: {
    icon: Sword,
    label: 'Bullet Damage',
    shortLabel: 'DMG',
    gradient: 'from-violet-500 to-purple-600',
    color: 'text-violet-400',
    bgGlow: 'rgba(139, 92, 246, 0.3)'
  },
  reload: {
    icon: Target,
    label: 'Reload',
    shortLabel: 'RATE',
    gradient: 'from-fuchsia-500 to-pink-600',
    color: 'text-fuchsia-400',
    bgGlow: 'rgba(217, 70, 239, 0.3)'
  },
  movementSpeed: {
    icon: Wind,
    label: 'Movement Speed',
    shortLabel: 'SPD',
    gradient: 'from-blue-500 to-indigo-600',
    color: 'text-blue-400',
    bgGlow: 'rgba(59, 130, 246, 0.3)'
  },
  lootRange: {
    icon: Magnet,
    label: 'Loot Range',
    shortLabel: 'LOOT',
    gradient: 'from-purple-500 to-violet-600',
    color: 'text-purple-400',
    bgGlow: 'rgba(168, 85, 247, 0.3)'
  }
}

// Premium progress bar with segments
function SegmentedProgress({ value, max, gradient }: { value: number; max: number; gradient: string }) {
  const segments = 10
  const filledSegments = Math.floor((value / max) * segments)
  const partialFill = ((value / max) * segments) % 1
  
  return (
    <div className="flex gap-0.5 h-1.5">
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
                className={`h-full bg-gradient-to-r ${gradient} transition-all duration-300`}
                style={{ width: isPartial ? `${partialFill * 100}%` : '100%' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const StatRow = memo(({ 
  stat, 
  points, 
  index,
  availablePoints, 
  onAllocate, 
  isMobile,
  synergyNote,
}: { 
  stat: StatType
  points: number
  index: number
  availablePoints: number
  onAllocate: (stat: StatType) => void
  isMobile: boolean
  synergyNote?: string
}) => {
  const info = STAT_INFO[stat]
  const Icon = info.icon
  const isMaxed = points >= MAX_STAT_POINTS
  const canUpgrade = availablePoints > 0 && !isMaxed
  const hasSynergy = typeof synergyNote !== 'undefined'
  
  const handleClick = useCallback(() => {
    if (canUpgrade) onAllocate(stat)
  }, [stat, onAllocate, canUpgrade])
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={handleClick}
      className={`
        group relative flex items-center gap-2 
        ${isMobile ? 'p-2' : 'p-2.5'}
        rounded-lg
        ${hasSynergy ? 'bg-emerald-400/5 border border-emerald-300/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-white/[0.03] border border-white/[0.06]'}
        ${canUpgrade ? 'cursor-pointer hover:bg-white/[0.06] hover:border-white/10' : ''}
        ${isMaxed ? 'opacity-60' : ''}
        transition-all duration-200
      `}
    >
      {/* Hotkey indicator */}
      <div className={`
        flex items-center justify-center
        ${isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'}
        rounded
        bg-white/10
        text-white/40
        font-mono font-bold
      `}>
        {index + 1}
      </div>
      
      {/* Icon with glow */}
      <div 
        className="relative flex items-center justify-center"
        style={{ filter: canUpgrade ? `drop-shadow(0 0 6px ${info.bgGlow})` : 'none' }}
      >
        <Icon weight="fill" size={isMobile ? 16 : 20} className={info.color} />
      </div>
      
      {/* Label & Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className={`font-medium ${isMobile ? 'text-[10px]' : 'text-xs'} text-white/80 truncate`}>
              {isMobile ? info.shortLabel : info.label}
            </span>
            {hasSynergy && (
              <span
                className="text-[9px] font-semibold text-emerald-300 uppercase tracking-wide"
                title={synergyNote || undefined}
              >
                Synergy
              </span>
            )}
          </div>
          <span className={`text-[10px] font-mono tabular-nums ${isMaxed ? 'text-amber-400' : 'text-white/50'}`}>
            {points}/{MAX_STAT_POINTS}
          </span>
        </div>
        <SegmentedProgress value={points} max={MAX_STAT_POINTS} gradient={info.gradient} />
      </div>
      
      {/* Upgrade button */}
      <button
        disabled={!canUpgrade}
        className={`
          flex items-center justify-center
          ${isMobile ? 'w-6 h-6' : 'w-7 h-7'}
          rounded-md
          transition-all duration-200
          ${isMaxed 
            ? 'bg-amber-500/20 text-amber-400' 
            : canUpgrade 
              ? `bg-gradient-to-br ${info.gradient} text-white shadow-lg hover:scale-105 active:scale-95` 
              : 'bg-white/5 text-white/20'
          }
        `}
      >
        {isMaxed ? (
          <Check weight="bold" size={isMobile ? 12 : 14} />
        ) : (
          <Plus weight="bold" size={isMobile ? 12 : 14} />
        )}
      </button>
      
      {/* Hover glow effect */}
      {canUpgrade && (
        <div 
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ 
            background: `radial-gradient(ellipse at center, ${info.bgGlow} 0%, transparent 70%)`,
          }}
        />
      )}
    </motion.div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.points === nextProps.points &&
    prevProps.availablePoints === nextProps.availablePoints &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.index === nextProps.index
  )
})

StatRow.displayName = 'StatRow'

export const StatUpgradeModal = memo(function StatUpgradeModal({ level, availablePoints, statPoints, onAllocate, onClose, currentClass }: StatUpgradeModalProps) {
  const isMobile = useIsMobile()
  const synergyMap = useMemo(() => {
    const stats = getSynergyStatsForClass(currentClass)
    const map: Partial<Record<StatType, string>> = {}
    stats.forEach((stat) => {
      map[stat] = getSynergyDescription(currentClass, stat) || ''
    })
    return map
  }, [currentClass])
  
  const statEntries = useMemo(() => Object.keys(STAT_INFO) as StatType[], [])

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)' }}
      >
        {/* Backdrop blur layer */}
        <div className="absolute inset-0 backdrop-blur-md" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`
            relative
            ${isMobile ? 'w-full max-w-sm' : 'w-full max-w-lg'}
            max-h-[85vh]
            overflow-hidden
            rounded-2xl
            bg-gradient-to-b from-black/80 via-black/70 to-black/80
            border border-white/10
            shadow-2xl
          `}
        >
          {/* Decorative top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
          
          {/* Header */}
          <div className={`relative ${isMobile ? 'px-4 py-3' : 'px-5 py-4'} border-b border-white/[0.06]`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Level badge */}
                <div className="relative">
                  <div className="absolute inset-0 bg-violet-500/30 blur-lg rounded-full" />
                  <div className={`
                    relative flex items-center justify-center
                    ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}
                    rounded-full
                    bg-gradient-to-br from-violet-500 to-purple-600
                    shadow-lg
                  `}>
                    <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-white`}>{level}</span>
                  </div>
                </div>
                
                <div>
                  <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>
                    Skill Points
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`
                      ${isMobile ? 'text-xl' : 'text-2xl'}
                      font-bold
                      bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent
                    `}>
                      {availablePoints}
                    </span>
                    <span className="text-xs text-white/40">available</span>
                  </div>
                </div>
              </div>
              
              {/* Close button */}
              <button
                onClick={onClose}
                className={`
                  flex items-center justify-center
                  ${isMobile ? 'w-8 h-8' : 'w-9 h-9'}
                  rounded-lg
                  bg-white/5
                  border border-white/10
                  text-white/60
                  hover:bg-white/10 hover:text-white
                  transition-all
                `}
              >
                <X weight="bold" size={isMobile ? 14 : 16} />
              </button>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className={`
            ${isMobile ? 'p-3' : 'p-4'}
            ${isMobile ? 'max-h-[calc(85vh-140px)]' : 'max-h-[calc(85vh-160px)]'}
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
          `}>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-1.5' : 'grid-cols-1 gap-2'}`}>
              {statEntries.map((stat, index) => (
                <StatRow
                  key={stat}
                  stat={stat}
                  index={index}
                  points={statPoints[stat]}
                  availablePoints={availablePoints}
                  onAllocate={onAllocate}
                  isMobile={isMobile}
                  synergyNote={synergyMap[stat]}
                />
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className={`
            ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}
            border-t border-white/[0.06]
            bg-black/30
          `}>
            <button
              onClick={onClose}
              className={`
                w-full
                ${isMobile ? 'py-2.5' : 'py-3'}
                rounded-xl
                bg-white/5
                border border-white/10
                text-white/70
                font-medium
                ${isMobile ? 'text-sm' : 'text-base'}
                hover:bg-white/10 hover:text-white
                active:scale-[0.98]
                transition-all
              `}
            >
              Close
              <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">K</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})
