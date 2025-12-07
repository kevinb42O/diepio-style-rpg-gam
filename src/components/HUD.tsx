import { Heart, Sword, Zap, Wind, Star, BarChart3, Timer, Target, Shield, Settings, Volume2, VolumeOff, Gamepad2, Trophy, Medal, Battery, HardDrive, Cpu } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Weapon, Armor } from '@/lib/types'
import { useMemo } from 'react'

interface HUDProps {
  player: {
    health: number
    maxHealth: number
    level: number
    kills: number
    damage: number
    fireRate: number
    speed: number
    weapon: Weapon | null
    armor: Armor | null
    team?: 'blue' | 'red' | 'neutral'
    decoyVisible?: boolean
    decoyTeleportReady?: boolean
    decoySwapReady?: boolean
    siegeCharge?: number
    riftReady?: boolean
    velocityDashReady?: boolean
  }
  gameTime: number
  currentXPInLevel?: number
  xpRequiredForLevel?: number
  onToggleStats?: () => void
  availableStatPoints?: number
}

// Sleek animated progress bar component
function MicroProgress({ 
  value, 
  max, 
  colorClass,
  glowColor,
  showShimmer = false 
}: { 
  value: number
  max: number
  colorClass: string
  glowColor: string
  showShimmer?: boolean
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  return (
    <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
      <div
        className={`absolute inset-y-0 left-0 ${colorClass} transition-all duration-500 ease-out rounded-full`}
        style={{ 
          width: `${percentage}%`,
          boxShadow: `0 0 8px ${glowColor}, 0 0 2px ${glowColor}`
        }}
      >
        {showShimmer && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
        )}
      </div>
    </div>
  )
}

// Compact stat pill component
function StatPill({ icon: Icon, value, label, color }: { 
  icon: React.ElementType
  value: string | number
  label: string
  color: string 
}) {
  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all duration-200 hover:bg-black/30">
      <Icon size={12} className={color} />
      <span className="text-[11px] font-medium text-white/90 tabular-nums">{value}</span>
      <span className="text-[9px] text-white/40 uppercase tracking-wider hidden group-hover:inline transition-all">{label}</span>
    </div>
  )
}

function AbilityChip({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border ${
      ready ? 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' : 'text-white/30 border-white/10 bg-white/5'
    }`}>
      {label} {ready ? 'READY' : '...'}
    </span>
  )
}

export function HUD({ player, gameTime, currentXPInLevel = 0, xpRequiredForLevel = 100, onToggleStats, availableStatPoints = 0 }: HUDProps) {
  const isMobile = useIsMobile()
  const healthPercentage = (player.health / player.maxHealth) * 100
  
  const xpPercentage = xpRequiredForLevel > 0 ? (currentXPInLevel / xpRequiredForLevel) * 100 : 0
  
  const timeString = useMemo(() => {
    const minutes = Math.floor(gameTime / 60000)
    const seconds = Math.floor((gameTime % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [gameTime])

  const healthState = useMemo(() => {
    if (healthPercentage > 60) return { color: 'bg-emerald-500', glow: '#10b981', state: 'healthy' }
    if (healthPercentage > 30) return { color: 'bg-amber-500', glow: '#f59e0b', state: 'warning' }
    return { color: 'bg-rose-500', glow: '#f43f5e', state: 'critical' }
  }, [healthPercentage])

  const teamColor = player.team === 'blue' ? 'from-blue-500/20 to-blue-600/5' : 
                    player.team === 'red' ? 'from-rose-500/20 to-rose-600/5' : ''

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Main HUD Container - Top Left */}
      <div className={`${isMobile ? 'p-2 pt-10' : 'p-3'}`}>
        {/* Unified Glass Panel */}
        <div className={`
          relative overflow-hidden
          ${isMobile ? 'w-40' : 'w-52'}
          bg-gradient-to-br from-black/60 via-black/50 to-black/40
          backdrop-blur-xl
          rounded-xl
          border border-white/[0.08]
          shadow-2xl shadow-black/50
          ${player.team && player.team !== 'neutral' ? `bg-gradient-to-br ${teamColor}` : ''}
        `}>
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          
          {/* Header Row */}
          <div className={`flex items-center justify-between ${isMobile ? 'px-2.5 py-2' : 'px-3 py-2.5'} border-b border-white/[0.06]`}>
            {/* Level Badge */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500/40 blur-md rounded-full" />
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <span className="text-[10px] font-bold text-white">{player.level}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/90 leading-none">Level</span>
                <span className="text-[8px] text-white/40 leading-none mt-0.5">
                  {Math.floor(xpPercentage)}% to next
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-white/60">
                <Timer size={10} className="text-cyan-400" />
                <span className="text-[10px] font-mono tabular-nums">{timeString}</span>
              </div>
              <div className="flex items-center gap-1 text-white/60">
                <Target size={10} className="text-rose-400" />
                <span className="text-[10px] font-mono tabular-nums">{player.kills}</span>
              </div>
            </div>
          </div>

          {/* Bars Section */}
          <div className={`${isMobile ? 'px-2.5 py-2' : 'px-3 py-2.5'} space-y-2.5`}>
            {/* Health Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Heart size={10} className={`fill-current ${healthState.state === 'critical' ? 'text-rose-400 animate-pulse' : 'text-rose-400'}`} />
                  <span className="text-[9px] font-medium text-white/70 uppercase tracking-wide">HP</span>
                </div>
                <span className="text-[10px] font-mono text-white/60 tabular-nums">
                  {Math.floor(player.health)}<span className="text-white/30">/{player.maxHealth}</span>
                </span>
              </div>
              <MicroProgress 
                value={player.health} 
                max={player.maxHealth} 
                colorClass={healthState.color}
                glowColor={healthState.glow}
                showShimmer={healthState.state === 'healthy'}
              />
            </div>

            {/* XP Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star size={10} className="fill-current text-violet-400" />
                  <span className="text-[9px] font-medium text-white/70 uppercase tracking-wide">XP</span>
                </div>
                <span className="text-[10px] font-mono text-white/60 tabular-nums">
                  {Math.floor(currentXPInLevel)}<span className="text-white/30">/{xpRequiredForLevel}</span>
                </span>
              </div>
              <MicroProgress 
                value={currentXPInLevel} 
                max={xpRequiredForLevel} 
                colorClass="bg-violet-500"
                glowColor="#8b5cf6"
                showShimmer={true}
              />
            </div>
          </div>

          {/* Stats Grid - Desktop Only */}
          {!isMobile && (
            <div className="px-3 pb-2.5 pt-0.5">
              <div className="flex flex-wrap gap-1">
                <StatPill icon={Sword} value={player.damage} label="dmg" color="text-orange-400" />
                <StatPill icon={Zap} value={`${Math.floor(1000 / player.fireRate)}/s`} label="rate" color="text-yellow-400" />
                <StatPill icon={Wind} value={player.speed} label="spd" color="text-cyan-400" />
                <StatPill icon={Shield} value={player.maxHealth} label="max" color="text-rose-400" />
              </div>
            </div>
          )}

          {/* Equipment Section */}
          {!isMobile && (player.weapon || player.armor) && (
            <div className="px-3 pb-2.5 pt-0.5 border-t border-white/[0.04]">
              <div className="flex gap-2 mt-1.5">
                {player.weapon && (
                  <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 border border-white/5">
                    <Sword size={10} className={getRarityColor(player.weapon.rarity)} />
                    <span className={`text-[10px] font-medium truncate ${getRarityColor(player.weapon.rarity)}`}>
                      {player.weapon.name}
                    </span>
                  </div>
                )}
                {player.armor && (
                  <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 border border-white/5">
                    <Shield size={10} className={getRarityColor(player.armor.rarity)} />
                    <span className={`text-[10px] font-medium truncate ${getRarityColor(player.armor.rarity)}`}>
                      {player.armor.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Indicator */}
          {player.team && player.team !== 'neutral' && (
            <div className={`
              absolute top-0 left-0 right-0 h-0.5
              ${player.team === 'blue' ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent' : ''}
              ${player.team === 'red' ? 'bg-gradient-to-r from-transparent via-rose-500 to-transparent' : ''}
            `} />
          )}
          
          {(player.decoyVisible !== undefined || (player.siegeCharge && player.siegeCharge > 0) || player.riftReady !== undefined || player.velocityDashReady !== undefined) && (
            <div className="px-3 pb-2.5 border-t border-white/[0.04] space-y-2">
              {player.decoyVisible !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>Mirage Decoy</span>
                    <span className={player.decoyVisible ? 'text-cyan-300' : 'text-white/30'}>
                      {player.decoyVisible ? 'Active' : 'Dormant'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <AbilityChip label="Q Blink" ready={!!player.decoyTeleportReady} />
                    <AbilityChip label="R Swap" ready={!!player.decoySwapReady} />
                  </div>
                </div>
              )}

              {player.siegeCharge && player.siegeCharge > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>Siege Charge</span>
                    <span className="text-white/70">{Math.min(100, Math.round(player.siegeCharge * 100))}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-200"
                      style={{ width: `${Math.min(100, player.siegeCharge * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {player.riftReady !== undefined && (
                <div className="flex items-center justify-between text-[10px] text-white/60">
                  <span>F Rift Step</span>
                  <span className={player.riftReady ? 'text-emerald-300' : 'text-white/30'}>
                    {player.riftReady ? 'Ready' : 'Cooling'}
                  </span>
                </div>
              )}

              {player.velocityDashReady !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>V Velocity Dash</span>
                    <span className={player.velocityDashReady ? 'text-emerald-300' : 'text-white/30'}>
                      {player.velocityDashReady ? 'Ready' : 'Charging'}
                    </span>
                  </div>
                  <AbilityChip label="V Dash" ready={!!player.velocityDashReady} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Button - Floating */}
        {onToggleStats && (
          <button
            onClick={onToggleStats}
            className={`
              pointer-events-auto
              mt-2 relative
              flex items-center justify-center
              ${isMobile ? 'w-8 h-8' : 'w-9 h-9'}
              rounded-lg
              bg-black/50 backdrop-blur-xl
              border border-white/10
              shadow-lg shadow-black/30
              hover:bg-black/60 hover:border-white/20
              active:scale-95
              transition-all duration-200
              group
            `}
          >
            <BarChart3 
              size={isMobile ? 14 : 16} 
              className="text-white/70 group-hover:text-white transition-colors" 
            />
            {availableStatPoints > 0 && (
              <span className="
                absolute -top-1.5 -right-1.5 
                min-w-[18px] h-[18px] 
                flex items-center justify-center 
                bg-gradient-to-br from-amber-400 to-orange-500
                text-[10px] font-bold text-black
                rounded-full
                shadow-lg shadow-orange-500/40
                animate-pulse
                border-2 border-black/20
              ">
                {availableStatPoints}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function getRarityColor(rarity: string) {
  const colors: Record<string, string> = {
    common: 'text-slate-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-amber-400',
  }
  return colors[rarity] || 'text-slate-400'
}
