import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  RotateCcw,
  ChevronRight,
  Zap,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Info,
  Play,
  Shield,
  Target,
  Wind,
  Flame,
  ShieldPlus,
  HeartPulse,
  Layers,
  MoveRight,
  Radar,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TANK_CONFIGS } from '@/lib/tankConfigs'
import type { TankConfig } from '@/lib/tankConfigs'
import { getSynergyStatsForClass, getSynergyDescription } from '@/lib/synergyMeta'
import type { StatType } from '@/lib/upgradeSystem'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BuildPlannerProps {
  onClose: () => void
  onStartSandbox?: (tankKey: string, statPoints: Record<StatType, number>) => void
}

// Constants
const MAX_STAT_POINTS = 40
const TOTAL_SKILL_POINTS = 88 // Level 89 gives you 88 points (level - 1)
const LOOT_RANGE_GROWTH = 1.35
const LOOT_RANGE_CAP_POINTS = 8

const TIER_COLORS: Record<number, string> = {
  0: 'from-gray-400 to-gray-500',
  1: 'from-green-400 to-green-500',
  2: 'from-blue-400 to-blue-500',
  3: 'from-purple-400 to-purple-500',
  4: 'from-pink-400 to-pink-500',
  5: 'from-orange-400 to-orange-500',
  6: 'from-red-500 to-rose-600',
}

const TIER_NAMES: Record<number, string> = {
  0: 'Starter',
  1: 'Basic',
  2: 'Advanced',
  3: 'Elite',
  4: 'Evolution',
  5: 'Mythic',
  6: 'Ascended',
}

const STAT_META: Record<
  StatType,
  {
    label: string
    shortLabel: string
    icon: LucideIcon
    color: string
    description: string
    formula: string
  }
> = {
  reload: {
    label: 'Reload',
    shortLabel: 'RLD',
    icon: RotateCcw,
    color: 'cyan',
    description: 'Decreases time between shots',
    formula: '300ms × 0.93^points',
  },
  bulletSpeed: {
    label: 'Bullet Speed',
    shortLabel: 'SPD',
    icon: Wind,
    color: 'blue',
    description: 'Increases projectile velocity',
    formula: '400 × 1.04^points',
  },
  bulletDamage: {
    label: 'Bullet Damage',
    shortLabel: 'DMG',
    icon: Flame,
    color: 'orange',
    description: 'Increases damage per hit',
    formula: '10 × 1.15^points',
  },
  bulletPenetration: {
    label: 'Penetration',
    shortLabel: 'PEN',
    icon: Layers,
    color: 'purple',
    description: 'Bullets pierce through more',
    formula: '5 × 1.2^points',
  },
  movementSpeed: {
    label: 'Movement Speed',
    shortLabel: 'MOV',
    icon: MoveRight,
    color: 'emerald',
    description: 'Increases tank movement',
    formula: '200 × 1.03^points',
  },
  maxHealth: {
    label: 'Max Health',
    shortLabel: 'HP',
    icon: ShieldPlus,
    color: 'amber',
    description: 'Increases total health pool',
    formula: '100 + (points × 25)',
  },
  healthRegen: {
    label: 'Health Regen',
    shortLabel: 'REG',
    icon: HeartPulse,
    color: 'rose',
    description: 'Increases HP recovery rate',
    formula: '1 × 1.35^points',
  },
  bodyDamage: {
    label: 'Body Damage',
    shortLabel: 'RAM',
    icon: Zap,
    color: 'fuchsia',
    description: 'Increases collision damage',
    formula: '10 × 1.15^points',
  },
  lootRange: {
    label: 'Loot Range',
    shortLabel: 'LRT',
    icon: Radar,
    color: 'lime',
    description: 'Increases pickup radius',
    formula: '50 × 1.35^points (cap 8)',
  },
}

const STAT_ORDER: StatType[] = [
  'reload',
  'bulletSpeed',
  'bulletDamage',
  'bulletPenetration',
  'movementSpeed',
  'maxHealth',
  'healthRegen',
  'bodyDamage',
  'lootRange',
]

// Calculate stat value based on points
function calculateStatValue(stat: StatType, points: number): number {
  const baseValues: Record<StatType, number> = {
    healthRegen: 1,
    maxHealth: 100,
    bodyDamage: 10,
    bulletSpeed: 400,
    bulletPenetration: 5,
    bulletDamage: 10,
    reload: 300,
    movementSpeed: 200,
    lootRange: 50,
  }

  const base = baseValues[stat]
  const effectivePoints = Math.min(points, MAX_STAT_POINTS)

  switch (stat) {
    case 'reload':
      return base * Math.pow(0.93, effectivePoints)
    case 'healthRegen':
      return base * Math.pow(1.35, effectivePoints)
    case 'maxHealth':
      return base + effectivePoints * 25
    case 'bodyDamage':
      return base * Math.pow(1.15, effectivePoints)
    case 'bulletSpeed':
      return base * Math.pow(1.04, effectivePoints)
    case 'bulletPenetration':
      return base * Math.pow(1.2, effectivePoints)
    case 'bulletDamage':
      return base * Math.pow(1.15, effectivePoints)
    case 'movementSpeed':
      return base * Math.pow(1.03, effectivePoints)
    case 'lootRange': {
      const capPoints = Math.min(effectivePoints, LOOT_RANGE_CAP_POINTS)
      return base * Math.pow(LOOT_RANGE_GROWTH, capPoints)
    }
    default:
      return base
  }
}

// Format stat values for display
function formatStatValue(stat: StatType, value: number): string {
  switch (stat) {
    case 'reload':
      return `${Math.round(value)}ms`
    case 'bulletSpeed':
    case 'movementSpeed':
      return `${Math.round(value)}`
    case 'maxHealth':
      return `${Math.round(value)} HP`
    case 'healthRegen':
      return `${value.toFixed(1)}/s`
    case 'bulletDamage':
    case 'bodyDamage':
    case 'bulletPenetration':
      return `${value.toFixed(1)}`
    case 'lootRange':
      return `${Math.round(value)}px`
    default:
      return value.toFixed(1)
  }
}

// Calculate improvement percentage
function getImprovement(stat: StatType, points: number): string {
  if (points === 0) return '+0%'
  const base = calculateStatValue(stat, 0)
  const current = calculateStatValue(stat, points)
  
  if (stat === 'reload') {
    // For reload, lower is better
    const improvement = ((base - current) / base) * 100
    return `-${improvement.toFixed(0)}%`
  } else {
    const improvement = ((current - base) / base) * 100
    return `+${improvement.toFixed(0)}%`
  }
}

// Find upgrade path to a tank
function findUpgradePath(targetKey: string): string[] {
  const path: string[] = [targetKey]
  let current = targetKey
  
  while (current !== 'basic') {
    const config = TANK_CONFIGS[current]
    if (!config?.upgradesFrom?.length) break
    // Take the first parent (main upgrade path)
    const parent = config.upgradesFrom[0]
    path.unshift(parent)
    current = parent
  }
  
  return path
}

// Mini tank preview (simplified version)
const TankPreviewMini: React.FC<{ tankKey: string; size?: number }> = ({ tankKey, size = 48 }) => {
  const config = TANK_CONFIGS[tankKey]
  if (!config) return null

  const bodyRadius = 14
  const viewBoxSize = 80

  const renderBarrel = (barrel: { angle: number; length: number; width: number; offsetX?: number; offsetY?: number; isTrapezoid?: boolean }, index: number) => {
    const barrelLength = (barrel.length || 30) * 0.5
    const barrelWidth = (barrel.width || 8) * 0.5
    const offsetX = (barrel.offsetX || 0) * 0.5
    const offsetY = (barrel.offsetY || 0) * 0.5

    if (barrel.isTrapezoid) {
      const points = [
        `${offsetX},${offsetY - barrelWidth / 2}`,
        `${offsetX + barrelLength},${offsetY - barrelWidth / 1.3}`,
        `${offsetX + barrelLength},${offsetY + barrelWidth / 1.3}`,
        `${offsetX},${offsetY + barrelWidth / 2}`,
      ].join(' ')

      return (
        <g key={index} transform={`rotate(${barrel.angle || 0})`}>
          <polygon points={points} fill="#8b9196" stroke="#5a5f66" strokeWidth="1" />
        </g>
      )
    }

    return (
      <g key={index} transform={`rotate(${barrel.angle || 0})`}>
        <rect
          x={offsetX}
          y={offsetY - barrelWidth / 2}
          width={barrelLength}
          height={barrelWidth}
          fill="#8b9196"
          stroke="#5a5f66"
          strokeWidth="1"
          rx="0.5"
        />
      </g>
    )
  }

  const renderBody = () => {
    switch (config.bodyShape) {
      case 'square':
        return <rect x={-bodyRadius} y={-bodyRadius} width={bodyRadius * 2} height={bodyRadius * 2} fill="#00b2e1" stroke="#0088b3" strokeWidth="1.5" />
      case 'hexagon':
      case 'spikyHexagon': {
        const points = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 6
          return `${Math.cos(angle) * bodyRadius},${Math.sin(angle) * bodyRadius}`
        }).join(' ')
        return <polygon points={points} fill="#00b2e1" stroke="#0088b3" strokeWidth="1.5" />
      }
      default:
        return <circle cx="0" cy="0" r={bodyRadius} fill="#00b2e1" stroke="#0088b3" strokeWidth="1.5" />
    }
  }

  return (
    <svg width={size} height={size} viewBox={`-${viewBoxSize / 2} -${viewBoxSize / 2} ${viewBoxSize} ${viewBoxSize}`}>
      <g>
        {config.barrels?.map((barrel, i) => renderBarrel(barrel, i))}
        {renderBody()}
        {/* Drone indicator */}
        {config.isDroneClass && (
          <g>
            {[0, 1, 2].map((i) => {
              const angle = (Math.PI * 2 * i) / 3
              const x = Math.cos(angle) * 25
              const y = Math.sin(angle) * 25
              return (
                <polygon
                  key={i}
                  points="0,-4 3.5,3.5 -3.5,3.5"
                  fill="#f14e54"
                  stroke="#d63940"
                  strokeWidth="0.5"
                  transform={`translate(${x},${y})`}
                />
              )
            })}
          </g>
        )}
        {/* Auto turret indicator */}
        {config.autoTurrets && (
          <circle cx={0} cy={-20} r={4} fill="#1f2933" stroke="#64748b" strokeWidth="1" />
        )}
      </g>
    </svg>
  )
}

export const BuildPlanner: React.FC<BuildPlannerProps> = ({ onClose, onStartSandbox }) => {
  const [selectedTank, setSelectedTank] = useState<string>('basic')
  const [statPoints, setStatPoints] = useState<Record<StatType, number>>(() => {
    const initial: Record<StatType, number> = {} as Record<StatType, number>
    STAT_ORDER.forEach((stat) => (initial[stat] = 0))
    return initial
  })
  const [copiedBuild, setCopiedBuild] = useState(false)
  const [showTankSelector, setShowTankSelector] = useState(false)
  const [hoveredTank, setHoveredTank] = useState<{ key: string; config: TankConfig } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const totalAllocated = useMemo(() => Object.values(statPoints).reduce((a, b) => a + b, 0), [statPoints])
  const remainingPoints = TOTAL_SKILL_POINTS - totalAllocated

  const selectedConfig = TANK_CONFIGS[selectedTank]
  const synergyStats = useMemo(() => getSynergyStatsForClass(selectedTank), [selectedTank])
  const upgradePath = useMemo(() => findUpgradePath(selectedTank), [selectedTank])

  // Get all tanks grouped by tier
  const tanksByTier = useMemo(() => {
    const grouped: Record<number, { key: string; config: TankConfig }[]> = {}
    Object.entries(TANK_CONFIGS).forEach(([key, config]) => {
      if (!grouped[config.tier]) grouped[config.tier] = []
      grouped[config.tier].push({ key, config })
    })
    // Sort each tier by unlock level
    Object.keys(grouped).forEach((tier) => {
      grouped[Number(tier)].sort((a, b) => a.config.unlocksAt - b.config.unlocksAt)
    })
    return grouped
  }, [])

  const handleStatChange = useCallback((stat: StatType, value: number) => {
    setStatPoints((prev) => {
      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0)
      const diff = value - prev[stat]
      
      // Check if we have enough points
      if (diff > 0 && currentTotal + diff > TOTAL_SKILL_POINTS) {
        // Cap the value to available points
        value = prev[stat] + (TOTAL_SKILL_POINTS - currentTotal)
      }
      
      return { ...prev, [stat]: Math.max(0, Math.min(MAX_STAT_POINTS, value)) }
    })
  }, [])

  const resetStats = useCallback(() => {
    const reset: Record<StatType, number> = {} as Record<StatType, number>
    STAT_ORDER.forEach((stat) => (reset[stat] = 0))
    setStatPoints(reset)
  }, [])

  const copyBuild = useCallback(() => {
    const buildString = `${selectedConfig?.name || selectedTank}: ${STAT_ORDER.map((s) => `${STAT_META[s].shortLabel}:${statPoints[s]}`).join(' ')}`
    navigator.clipboard.writeText(buildString)
    setCopiedBuild(true)
    setTimeout(() => setCopiedBuild(false), 2000)
  }, [selectedTank, selectedConfig, statPoints])

  // Calculate required level for this tank
  const requiredLevel = selectedConfig?.unlocksAt || 1

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-pink-900/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Build Planner</h2>
                  <p className="text-[10px] sm:text-xs text-slate-400">Plan your build before the battle</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row h-[calc(90vh-70px)] sm:h-[calc(90vh-80px)] overflow-hidden">
            {/* Left Panel - Tank Selection & Info */}
            <div className="w-full lg:w-[340px] border-r border-slate-700/50 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
              {/* Tank Selector Button */}
              <Card
                className="p-2 sm:p-3 md:p-4 bg-slate-800/50 border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => setShowTankSelector(!showTankSelector)}
              >
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <div className="relative flex-shrink-0">
                    <TankPreviewMini tankKey={selectedTank} size={48} />
                    <Badge
                      className={`absolute -bottom-1 -right-1 text-[8px] sm:text-[10px] px-1 py-0 bg-gradient-to-r ${TIER_COLORS[selectedConfig?.tier || 0]} border-0`}
                    >
                      T{selectedConfig?.tier || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">{selectedConfig?.name || 'Select Tank'}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400">
                      {TIER_NAMES[selectedConfig?.tier || 0]} • Lvl {requiredLevel}+
                    </p>
                    <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                      {selectedConfig?.isDroneClass && (
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 border-purple-500/50 text-purple-400">
                          Drone
                        </Badge>
                      )}
                      {selectedConfig?.isTrapper && (
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 border-amber-500/50 text-amber-400">
                          Trapper
                        </Badge>
                      )}
                      {selectedConfig?.autoTurrets && (
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 border-cyan-500/50 text-cyan-400">
                          Auto ×{selectedConfig.autoTurrets}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform flex-shrink-0 ${showTankSelector ? 'rotate-90' : ''}`} />
                </div>
              </Card>

              {/* Tank Selector Dropdown */}
              <AnimatePresence>
                {showTankSelector && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <Card className="p-3 bg-slate-800/80 border-slate-700/50 max-h-[300px] overflow-y-auto">
                      {Object.entries(tanksByTier)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([tier, tanks]) => (
                          <div key={tier} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`text-[10px] bg-gradient-to-r ${TIER_COLORS[Number(tier)]} border-0`}>
                                {TIER_NAMES[Number(tier)]}
                              </Badge>
                              <div className="h-px flex-1 bg-slate-700/50" />
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {tanks.map(({ key, config }) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    setSelectedTank(key)
                                    setShowTankSelector(false)
                                  }}
                                  onMouseEnter={() => setHoveredTank({ key, config })}
                                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                  onMouseLeave={() => setHoveredTank(null)}
                                  className={`p-1.5 rounded-lg transition-all w-full ${
                                    selectedTank === key
                                      ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                                      : 'bg-slate-700/30 hover:bg-slate-600/50'
                                  }`}
                                >
                                  <TankPreviewMini tankKey={key} size={32} />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upgrade Path */}
              <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" />
                  Upgrade Path
                </h4>
                <div className="flex items-center flex-wrap gap-1">
                  {upgradePath.map((tankKey, index) => {
                    const config = TANK_CONFIGS[tankKey]
                    return (
                      <React.Fragment key={tankKey}>
                        {index > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedTank(tankKey)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                                tankKey === selectedTank
                                  ? 'bg-blue-500/30 text-blue-300'
                                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                              }`}
                            >
                              <span>{config?.name || tankKey}</span>
                              <span className="text-[10px] text-slate-500">L{config?.unlocksAt}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-slate-900 border-slate-700">
                            <p>Click to plan this tank</p>
                          </TooltipContent>
                        </Tooltip>
                      </React.Fragment>
                    )
                  })}
                </div>
              </Card>

              {/* Synergy Stats */}
              {synergyStats.length > 0 && (
                <Card className="p-3 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-500/30">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Synergy Stats
                  </h4>
                  <div className="space-y-1.5">
                    {synergyStats.map((stat) => {
                      const meta = STAT_META[stat]
                      const Icon = meta.icon
                      const description = getSynergyDescription(selectedTank, stat)
                      return (
                        <div key={stat} className="flex items-start gap-2">
                          <Icon className={`w-3.5 h-3.5 mt-0.5 text-${meta.color}-400`} />
                          <div>
                            <p className="text-xs font-medium text-amber-200">{meta.label}</p>
                            {description && <p className="text-[10px] text-amber-300/70">{description}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* Tank Stats Summary */}
              <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Tank Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-500">Barrels:</span>
                    <span className="font-medium">{selectedConfig?.barrels?.length || 0}</span>
                  </div>
                  {selectedConfig?.droneCount && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">Drones:</span>
                      <span className="font-medium">{selectedConfig.droneCount}</span>
                    </div>
                  )}
                  {selectedConfig?.trapConfig && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">Trap Size:</span>
                      <span className="font-medium">{selectedConfig.trapConfig.size}</span>
                    </div>
                  )}
                  {selectedConfig?.invisibility && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">Stealth:</span>
                      <span className="font-medium">{selectedConfig.invisibility.delay}s</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Panel - Stat Allocation */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
              {/* Points Counter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-xs sm:text-sm text-slate-400">
                    <span className="text-xl sm:text-2xl font-bold text-white">{remainingPoints}</span>
                    <span className="text-slate-500">/{TOTAL_SKILL_POINTS}</span>
                    <span className="ml-1">points remaining</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBuild}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs px-2 py-1 h-auto"
                  >
                    {copiedBuild ? <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-green-400" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                    <span className="hidden xs:inline">{copiedBuild ? 'Copied!' : 'Copy Build'}</span>
                    <span className="inline xs:hidden">{copiedBuild ? '✓' : 'Copy'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetStats}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs px-2 py-1 h-auto"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden xs:inline">Reset</span>
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalAllocated / TOTAL_SKILL_POINTS) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>

              {/* Stat Sliders */}
              <div className="grid gap-2 sm:gap-3">
                {STAT_ORDER.map((stat) => {
                  const meta = STAT_META[stat]
                  const Icon = meta.icon
                  const points = statPoints[stat]
                  const isSynergy = synergyStats.includes(stat)
                  const value = calculateStatValue(stat, points)
                  const improvement = getImprovement(stat, points)

                  return (
                    <Card
                      key={stat}
                      className={`p-2 sm:p-3 transition-all ${
                        isSynergy
                          ? 'bg-gradient-to-r from-amber-900/20 to-transparent border-amber-500/30'
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Icon */}
                        <div
                          className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                            isSynergy ? 'bg-amber-500/20' : 'bg-slate-700/50'
                          }`}
                        >
                          <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${isSynergy ? 'text-amber-400' : `text-${meta.color}-400`}`} />
                        </div>

                        {/* Label & Value */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm font-medium text-white">{meta.label}</span>
                              {isSynergy && (
                                <Badge className="text-[8px] sm:text-[9px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  SYN
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-[10px] sm:text-xs text-slate-400 font-mono">{formatStatValue(stat, value)}</span>
                              <span
                                className={`text-[9px] sm:text-[10px] font-medium ${
                                  stat === 'reload'
                                    ? points > 0
                                      ? 'text-green-400'
                                      : 'text-slate-500'
                                    : points > 0
                                    ? 'text-green-400'
                                    : 'text-slate-500'
                                }`}
                              >
                                {improvement}
                              </span>
                            </div>
                          </div>

                          {/* Slider */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Slider
                              value={[points]}
                              min={0}
                              max={MAX_STAT_POINTS}
                              step={1}
                              onValueChange={([v]) => handleStatChange(stat, v)}
                              className="flex-1"
                            />
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400 hover:text-white p-0 text-sm sm:text-base"
                                onClick={() => handleStatChange(stat, points - 1)}
                                disabled={points === 0}
                              >
                                -
                              </Button>
                              <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-mono text-white">{points}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400 hover:text-white p-0 text-sm sm:text-base"
                                onClick={() => handleStatChange(stat, points + 1)}
                                disabled={points >= MAX_STAT_POINTS || remainingPoints <= 0}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tooltip description */}
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 pl-8 sm:pl-11">{meta.description}</p>
                    </Card>
                  )
                })}
              </div>

              {/* Calculated Stats Summary */}
              <Card className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Build Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{Math.round(calculateStatValue('maxHealth', statPoints.maxHealth))}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Max HP</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{Math.round(calculateStatValue('reload', statPoints.reload))}ms</p>
                    <p className="text-[10px] text-slate-400 uppercase">Fire Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{calculateStatValue('bulletDamage', statPoints.bulletDamage).toFixed(1)}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Damage</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center mt-3 pt-3 border-t border-blue-500/20">
                  <div>
                    <p className="text-lg font-bold text-slate-300">{Math.round(calculateStatValue('movementSpeed', statPoints.movementSpeed))}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Speed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-300">{calculateStatValue('bulletPenetration', statPoints.bulletPenetration).toFixed(1)}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Penetration</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-300">{calculateStatValue('bodyDamage', statPoints.bodyDamage).toFixed(1)}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Body DMG</p>
                  </div>
                </div>
              </Card>

              {/* Start Sandbox Button (if callback provided) */}
              {onStartSandbox && (
                <Button
                  onClick={() => onStartSandbox(selectedTank, statPoints)}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/30"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Test This Build
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Floating Tooltip - follows mouse cursor */}
        {hoveredTank && (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: mousePos.x + 16,
              top: mousePos.y - 8,
            }}
          >
            <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 whitespace-nowrap">
                <TankPreviewMini tankKey={hoveredTank.key} size={48} />
                <div>
                  <p className="font-bold text-white text-sm">{hoveredTank.config.name}</p>
                  <p className="text-xs text-slate-400">
                    {TIER_NAMES[hoveredTank.config.tier as keyof typeof TIER_NAMES]} Class
                  </p>
                  <p className="text-[10px] text-blue-400 mt-0.5">
                    Unlocks at Level {hoveredTank.config.unlocksAt}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {hoveredTank.config.isDroneClass && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/50 text-purple-400">
                        Drone
                      </Badge>
                    )}
                    {hoveredTank.config.isTrapper && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-400">
                        Trapper
                      </Badge>
                    )}
                    {hoveredTank.config.autoTurrets && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-cyan-500/50 text-cyan-400">
                        Auto ×{hoveredTank.config.autoTurrets}
                      </Badge>
                    )}
                    {hoveredTank.config.invisibility && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-400/50 text-slate-300">
                        Stealth
                      </Badge>
                    )}
                    {(hoveredTank.config.bodyShape === 'hexagon' || hoveredTank.config.bodyShape === 'spikyHexagon') && !hoveredTank.config.barrels?.length && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/50 text-rose-400">
                        Ram
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}
