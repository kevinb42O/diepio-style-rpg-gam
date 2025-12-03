import { Heart, Sword, Lightning, Wind, ShieldCheck, Target, FireExtinguisher, ArrowsOut } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import { useIsMobile } from '@/hooks/use-mobile'
import type { StatType } from '@/lib/upgradeSystem'

interface StatUpgradeModalProps {
  level: number
  availablePoints: number
  statPoints: { [key in StatType]: number }
  onAllocate: (stat: StatType) => void
  onClose: () => void
}

const STAT_INFO: { [key in StatType]: { icon: typeof Heart; label: string; color: string; description: string } } = {
  healthRegen: {
    icon: Heart,
    label: 'Health Regen',
    color: 'text-red-400',
    description: 'Faster health recovery'
  },
  maxHealth: {
    icon: ShieldCheck,
    label: 'Max Health',
    color: 'text-green-400',
    description: 'Increased health pool'
  },
  bodyDamage: {
    icon: FireExtinguisher,
    label: 'Body Damage',
    color: 'text-orange-400',
    description: 'Ramming power'
  },
  bulletSpeed: {
    icon: Lightning,
    label: 'Bullet Speed',
    color: 'text-yellow-400',
    description: 'Projectile velocity'
  },
  bulletPenetration: {
    icon: ArrowsOut,
    label: 'Penetration',
    color: 'text-cyan-400',
    description: 'Bullet strength'
  },
  bulletDamage: {
    icon: Sword,
    label: 'Bullet Damage',
    color: 'text-primary',
    description: 'Projectile damage'
  },
  reload: {
    icon: Target,
    label: 'Reload',
    color: 'text-accent',
    description: 'Fire rate'
  },
  movementSpeed: {
    icon: Wind,
    label: 'Movement Speed',
    color: 'text-blue-400',
    description: 'Tank velocity'
  }
}

export function StatUpgradeModal({ level, availablePoints, statPoints, onAllocate, onClose }: StatUpgradeModalProps) {
  const isMobile = useIsMobile()

  const handleAllocate = (stat: StatType) => {
    onAllocate(stat)
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2 border-accent shadow-2xl">
          <CardHeader className="text-center pb-3">
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-title text-accent`}>
              Level {level}
            </CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : 'text-base'}>
              Available Skill Points: <span className="text-accent font-bold text-lg">{availablePoints}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {(Object.keys(STAT_INFO) as StatType[]).map((stat) => {
              const info = STAT_INFO[stat]
              const Icon = info.icon
              const points = statPoints[stat]
              const canUpgrade = points < 7 && availablePoints > 0
              
              return (
                <div
                  key={stat}
                  className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 border border-border"
                >
                  <Icon weight="fill" size={isMobile ? 24 : 32} className={info.color} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {info.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {points}/7
                      </span>
                    </div>
                    <Progress value={(points / 7) * 100} className="h-1.5 mb-1" />
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                  
                  <Button
                    onClick={() => handleAllocate(stat)}
                    disabled={!canUpgrade}
                    size="sm"
                    variant={canUpgrade ? 'default' : 'outline'}
                    className="shrink-0"
                  >
                    +
                  </Button>
                </div>
              )
            })}
          </CardContent>
          <div className="p-4 border-t border-border">
            <Button onClick={onClose} className="w-full" variant="secondary">
              Close
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
