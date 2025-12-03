import { Heart, Sword, Lightning, Wind } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useIsMobile } from '@/hooks/use-mobile'

interface LevelUpModalProps {
  level: number
  onAllocate: (stat: 'health' | 'damage' | 'speed' | 'fireRate') => void
}

export function LevelUpModal({ level, onAllocate }: LevelUpModalProps) {
  const isMobile = useIsMobile()

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        <Card className={`${isMobile ? 'w-full max-w-sm' : 'w-[500px]'} border-2 border-accent shadow-2xl`}>
          <CardHeader className="text-center">
            <CardTitle className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-title text-accent`}>
              LEVEL UP!
            </CardTitle>
            <CardDescription className={isMobile ? 'text-base' : 'text-lg'}>
              You reached level {level} - Choose a stat to upgrade
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:gap-4">
            <Button
              onClick={() => onAllocate('health')}
              className={`${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center gap-2`}
              variant="outline"
            >
              <Heart weight="fill" size={isMobile ? 24 : 32} className="text-red-400" />
              <div className="flex flex-col items-center">
                <span className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Max Health</span>
                <span className="text-xs text-muted-foreground">+20 HP</span>
              </div>
            </Button>

            <Button
              onClick={() => onAllocate('damage')}
              className={`${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center gap-2`}
              variant="outline"
            >
              <Sword weight="fill" size={isMobile ? 24 : 32} className="text-primary" />
              <div className="flex flex-col items-center">
                <span className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Damage</span>
                <span className="text-xs text-muted-foreground">+5 DMG</span>
              </div>
            </Button>

            <Button
              onClick={() => onAllocate('speed')}
              className={`${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center gap-2`}
              variant="outline"
            >
              <Wind weight="fill" size={isMobile ? 24 : 32} className="text-blue-400" />
              <div className="flex flex-col items-center">
                <span className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Speed</span>
                <span className="text-xs text-muted-foreground">+10 SPD</span>
              </div>
            </Button>

            <Button
              onClick={() => onAllocate('fireRate')}
              className={`${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center gap-2`}
              variant="outline"
            >
              <Lightning weight="fill" size={isMobile ? 24 : 32} className="text-accent" />
              <div className="flex flex-col items-center">
                <span className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Fire Rate</span>
                <span className="text-xs text-muted-foreground">-20ms</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
