import { Skull, Trophy, Clock, Star } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import type { GameStats, HighScore } from '@/lib/types'

interface DeathScreenProps {
  stats: GameStats
  highScore?: HighScore
  onRestart: () => void
}

export function DeathScreen({ stats, highScore, onRestart }: DeathScreenProps) {
  const minutes = Math.floor(stats.timeSurvived / 60000)
  const seconds = Math.floor((stats.timeSurvived % 60000) / 1000)
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const isNewRecord = !highScore || stats.levelReached > highScore.levelReached

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
      >
        <Card className="w-[600px] border-2 border-destructive shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Skull size={80} weight="fill" className="text-destructive" />
              </motion.div>
            </div>
            <CardTitle className="text-5xl font-title text-destructive">
              YOU DIED
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Your journey has ended... but legends are born from perseverance
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                <Clock size={32} className="text-primary" />
                <div className="text-2xl font-bold">{timeString}</div>
                <div className="text-sm text-muted-foreground">Survived</div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                <Star size={32} weight="fill" className="text-accent" />
                <div className="text-2xl font-bold">{stats.levelReached}</div>
                <div className="text-sm text-muted-foreground">Level</div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                <Skull size={32} className="text-destructive" />
                <div className="text-2xl font-bold">{stats.enemiesKilled}</div>
                <div className="text-sm text-muted-foreground">Kills</div>
              </div>
            </div>

            {isNewRecord && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.4 }}
              >
                <Badge className="w-full justify-center py-3 text-lg bg-accent hover:bg-accent">
                  <Trophy weight="fill" className="mr-2" size={24} />
                  New Personal Record!
                </Badge>
              </motion.div>
            )}

            {highScore && !isNewRecord && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Trophy size={16} />
                  Your Best Run
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-semibold">
                      {Math.floor(highScore.timeSurvived / 60000)}:
                      {Math.floor((highScore.timeSurvived % 60000) / 1000).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground">Time</div>
                  </div>
                  <div>
                    <div className="font-semibold">{highScore.levelReached}</div>
                    <div className="text-xs text-muted-foreground">Level</div>
                  </div>
                  <div>
                    <div className="font-semibold">{highScore.enemiesKilled}</div>
                    <div className="text-xs text-muted-foreground">Kills</div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={onRestart}
              className="w-full h-14 text-lg"
              size="lg"
            >
              Rise Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
