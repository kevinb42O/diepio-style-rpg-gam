import { Heart, Sword, Lightning, Wind, Star, ChartBar } from '@phosphor-icons/react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Weapon, Armor } from '@/lib/types'

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
  }
  gameTime: number
  currentXPInLevel?: number
  xpRequiredForLevel?: number
  onToggleStats?: () => void
  availableStatPoints?: number
}

export function HUD({ player, gameTime, currentXPInLevel = 0, xpRequiredForLevel = 100, onToggleStats, availableStatPoints = 0 }: HUDProps) {
  const isMobile = useIsMobile()
  const healthPercentage = (player.health / player.maxHealth) * 100
  
  const xpInLevel = currentXPInLevel
  const xpRequired = xpRequiredForLevel
  const xpPercentage = xpRequired > 0 ? (xpInLevel / xpRequired) * 100 : 0
  
  const minutes = Math.floor(gameTime / 60000)
  const seconds = Math.floor((gameTime % 60000) / 1000)
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const getHealthColor = () => {
    if (healthPercentage > 60) return 'bg-[#66dd88]'
    if (healthPercentage > 30) return 'bg-[#ddbb44]'
    return 'bg-[#dd6644]'
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className={`${isMobile ? 'p-2 pt-12' : 'p-2 md:p-4'} flex flex-col ${isMobile ? 'gap-1' : 'gap-3'}`}>
        <div className="flex items-center gap-2">
          {player.team && player.team !== 'neutral' && (
            <Badge 
              variant="secondary" 
              className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold ${player.team === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {player.team === 'blue' ? '🔵 Blue Team' : '🔴 Red Team'}
            </Badge>
          )}
          
          <Badge variant="secondary" className={isMobile ? 'text-sm font-bold' : 'text-lg font-bold'}>
            <Star className="mr-1" weight="fill" size={isMobile ? 14 : 16} />
            Level {player.level}
          </Badge>
          
          <Badge variant="outline" className={isMobile ? 'text-xs' : 'text-base'}>
            {timeString}
          </Badge>
          
          <Badge variant="outline" className={isMobile ? 'text-xs' : 'text-base'}>
            Kills: {player.kills}
          </Badge>

          {onToggleStats && (
            <Button
              onClick={onToggleStats}
              size={isMobile ? 'sm' : 'default'}
              variant="outline"
              className="pointer-events-auto relative"
            >
              <ChartBar size={isMobile ? 14 : 18} weight="fill" />
              {availableStatPoints > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {availableStatPoints}
                </span>
              )}
            </Button>
          )}
        </div>

        <div className={`flex flex-col ${isMobile ? 'gap-1' : 'gap-2'} bg-card/80 backdrop-blur-sm rounded-lg ${isMobile ? 'p-2 w-44' : 'p-3 w-64'} border border-border`}>
          <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center gap-1">
              <Heart weight="fill" className="text-red-400" size={isMobile ? 12 : 16} />
              <span className="font-semibold">Health</span>
            </div>
            <span className="text-muted-foreground">
              {Math.floor(player.health)}/{player.maxHealth}
            </span>
          </div>
          <div className={`relative ${isMobile ? 'h-2' : 'h-3'} bg-muted rounded-full overflow-hidden`}>
            <div
              className={`absolute inset-y-0 left-0 ${getHealthColor()} transition-all duration-300`}
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        <div className={`flex flex-col ${isMobile ? 'gap-1' : 'gap-2'} bg-card/80 backdrop-blur-sm rounded-lg ${isMobile ? 'p-2 w-44' : 'p-3 w-64'} border border-border`}>
          <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center gap-1">
              <Star weight="fill" className="text-accent" size={isMobile ? 12 : 16} />
              <span className="font-semibold">XP</span>
            </div>
            <span className="text-muted-foreground">
              {Math.floor(xpInLevel)}/{xpRequired}
            </span>
          </div>
          <div className={`relative ${isMobile ? 'h-2' : 'h-3'} bg-muted rounded-full overflow-hidden`}>
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>

        {!isMobile && (
          <>
            <div className="grid grid-cols-2 gap-2 bg-card/80 backdrop-blur-sm rounded-lg p-3 w-64 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <Sword className="text-primary" />
                <span>{player.damage}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lightning className="text-accent" />
                <span>{Math.floor(1000 / player.fireRate)}/s</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wind className="text-blue-400" />
                <span>{player.speed}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart className="text-red-400" />
                <span>{player.maxHealth}</span>
              </div>
            </div>

            {player.weapon && (
              <div className="bg-card/80 backdrop-blur-sm rounded-lg p-2 w-64 border border-border">
                <div className="text-xs text-muted-foreground">Weapon</div>
                <div className={`font-semibold ${getRarityClass(player.weapon.rarity)}`}>
                  {player.weapon.name}
                </div>
              </div>
            )}

            {player.armor && (
              <div className="bg-card/80 backdrop-blur-sm rounded-lg p-2 w-64 border border-border">
                <div className="text-xs text-muted-foreground">Armor</div>
                <div className={`font-semibold ${getRarityClass(player.armor.rarity)}`}>
                  {player.armor.name}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function getRarityClass(rarity: string) {
  const classes = {
    common: 'text-gray-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-orange-400',
  }
  return classes[rarity as keyof typeof classes] || 'text-gray-400'
}
