import { Package, Trophy, Clock, Star, Skull, GameController, Television, Cassette } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { useIsMobile } from '@/hooks/use-mobile'
import type { GameStats, HighScore } from '@/lib/types'
import { useState, useEffect } from 'react'

interface DeathScreenProps {
  stats: GameStats
  highScore?: HighScore
  onRestart: () => void
}

// Gen X Death Messages - because we grew up with Game Over screens
const DEATH_MESSAGES = [
  "GAME OVER, MAN! GAME OVER!",
  "You died. Insert coin to continue...",
  "WASTED (but make it 90s)",
  "Connection terminated. Please try again.",
  "Error 404: Player not found",
  "FATALITY! (Wrong game, but whatever)",
  "You have died of dysentery. Wait, wrong Oregon Trail...",
  "Press F to pay respects... oh wait, that's not our generation",
  "REKT (before rekt was even a thing)",
  "System crash. Please restart your existence.",
  "Blue screen of death, but make it personal",
  "Your Tamagotchi has died. Oh wait, that's you.",
  "NO CARRIER (dial-up kids will get it)",
  "Achievement Unlocked: Dead",
  "ERROR: Life.exe has stopped working"
]

const RESPAWN_MESSAGES = [
  "Continue? 9...8...7...",
  "Insert Another Quarter",
  "Respawn (Y2K Bug Fixed)",
  "Try Again (It's Not You, It's Lag)",
  "Reset Console",
  "Rewind VHS Tape",
  "Blow on Cartridge & Try Again",
  "Connection Restored",
  "Ctrl+Alt+Del Your Life",
  "Phoenix Down",
  "Extra Life",
  "1-UP!"
]

const SUBTITLE_MESSAGES = [
  "At least you tried harder than Clippy",
  "Still better than Internet Explorer",
  "Your dial-up connection to life was interrupted", 
  "404: Git Gud skills not found",
  "You've been defragmented",
  "Your save file is corrupted, but your spirit isn't",
  "This message will self-destruct in 5... 4... 3...",
  "Error: Player.exe has encountered a problem and needs to close",
  "Your Furby is disappointed in you",
  "Press any key to continue... Where's the 'any' key?",
  "You fought valiantly, young padawan",
  "Game over, but the high score lives on like a Nokia 3310"
]

export function DeathScreen({ stats, highScore, onRestart }: DeathScreenProps) {
  const isMobile = useIsMobile()
  const minutes = Math.floor(stats.timeSurvived / 60000)
  const seconds = Math.floor((stats.timeSurvived % 60000) / 1000)
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const isNewRecord = !highScore || stats.levelReached > highScore.levelReached

  // Randomize messages for that authentic 90s chaos
  const [deathMessage, setDeathMessage] = useState(DEATH_MESSAGES[0])
  const [subtitleMessage, setSubtitleMessage] = useState(SUBTITLE_MESSAGES[0])
  const [respawnMessage, setRespawnMessage] = useState(RESPAWN_MESSAGES[0])
  const [glitchEffect, setGlitchEffect] = useState(false)

  useEffect(() => {
    // Random messages because variety is the spice of death
    setDeathMessage(DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)])
    setSubtitleMessage(SUBTITLE_MESSAGES[Math.floor(Math.random() * SUBTITLE_MESSAGES.length)])
    setRespawnMessage(RESPAWN_MESSAGES[Math.floor(Math.random() * RESPAWN_MESSAGES.length)])
    
    // Occasional glitch effect for that authentic CRT monitor feel
    const glitchTimer = setTimeout(() => {
      if (Math.random() < 0.3) {
        setGlitchEffect(true)
        setTimeout(() => setGlitchEffect(false), 200)
      }
    }, 500)

    return () => clearTimeout(glitchTimer)
  }, [stats])

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-mono">
      {/* Retro scanlines effect */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 0, 0.1) 2px,
            rgba(0, 255, 0, 0.1) 4px
          )`
        }} />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className={`w-full max-w-[650px] ${glitchEffect ? 'animate-pulse' : ''}`}
      >
        <Card className="border-2 border-red-500/70 shadow-2xl bg-black/90 backdrop-blur-md">
          <CardHeader className="text-center border-b border-red-500/30">
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
                transition={{ duration: 2, delay: 0.2, repeat: Infinity, repeatDelay: 3 }}
                className="relative"
              >
                <Skull 
                  size={isMobile ? 70 : 100} 
                  weight="fill" 
                  className="text-red-400 drop-shadow-lg" 
                />
                {/* Glitch overlay */}
                {glitchEffect && (
                  <Skull 
                    size={isMobile ? 70 : 100} 
                    weight="fill" 
                    className="text-cyan-400 absolute top-0 left-1 opacity-70" 
                  />
                )}
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CardTitle className={`${isMobile ? 'text-3xl' : 'text-6xl'} font-bold text-red-400 tracking-wider mb-2 ${glitchEffect ? 'blur-sm' : ''}`}>
                {deathMessage}
              </CardTitle>
              <CardDescription className={`${isMobile ? 'text-sm' : 'text-lg'} text-green-300 tracking-wide`}>
                {subtitleMessage}
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="space-y-4 md:space-y-6 bg-black/50">
            {/* Retro stats display */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <motion.div 
                className={`flex flex-col items-center gap-2 ${isMobile ? 'p-3' : 'p-4'} bg-gray-900/70 border border-green-500/30 rounded-lg`}
                whileHover={{ borderColor: 'rgba(34, 197, 94, 0.7)' }}
              >
                <Television size={isMobile ? 24 : 32} className="text-green-400" />
                <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-300 font-mono tracking-wider`}>
                  {timeString}
                </div>
                <div className="text-xs text-green-500/70 uppercase tracking-wider">Uptime</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center gap-2 ${isMobile ? 'p-3' : 'p-4'} bg-gray-900/70 border border-yellow-500/30 rounded-lg`}
                whileHover={{ borderColor: 'rgba(234, 179, 8, 0.7)' }}
              >
                <GameController size={isMobile ? 24 : 32} weight="fill" className="text-yellow-400" />
                <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-yellow-300 font-mono tracking-wider`}>
                  LVL {stats.levelReached}
                </div>
                <div className="text-xs text-yellow-500/70 uppercase tracking-wider">Reached</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center gap-2 ${isMobile ? 'p-3' : 'p-4'} bg-gray-900/70 border border-red-500/30 rounded-lg`}
                whileHover={{ borderColor: 'rgba(239, 68, 68, 0.7)' }}
              >
                <Cassette size={isMobile ? 24 : 32} className="text-red-400" />
                <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-red-300 font-mono tracking-wider`}>
                  {stats.enemiesKilled}
                </div>
                <div className="text-xs text-red-500/70 uppercase tracking-wider">Fragged</div>
              </motion.div>
            </div>

            {/* New Record Badge with 90s flair */}
            {isNewRecord && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.6, duration: 0.8 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg blur-sm"></div>
                <Badge className={`w-full justify-center ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 border border-yellow-400/50 text-black font-bold tracking-wider`}>
                  <Trophy weight="fill" className="mr-2 drop-shadow-lg" size={isMobile ? 20 : 24} />
                  *** HIGH SCORE ACHIEVED ***
                </Badge>
              </motion.div>
            )}

            {/* Previous best with retro styling */}
            {highScore && !isNewRecord && (
              <motion.div 
                className="bg-gray-900/60 border border-cyan-500/30 rounded-lg p-3 md:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="text-sm text-cyan-300 mb-2 flex items-center gap-2 font-mono uppercase tracking-wider">
                  <Trophy size={16} className="text-cyan-400" />
                  Personal Best Record
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-4 text-center font-mono">
                  <div>
                    <div className="font-semibold text-sm md:text-base text-cyan-200">
                      {Math.floor(highScore.timeSurvived / 60000)}:
                      {Math.floor((highScore.timeSurvived % 60000) / 1000).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-cyan-400/70 uppercase tracking-wider">Time</div>
                  </div>
                  <div>
                    <div className="font-semibold text-sm md:text-base text-cyan-200">
                      LVL {highScore.levelReached}
                    </div>
                    <div className="text-xs text-cyan-400/70 uppercase tracking-wider">Level</div>
                  </div>
                  <div>
                    <div className="font-semibold text-sm md:text-base text-cyan-200">{highScore.enemiesKilled}</div>
                    <div className="text-xs text-cyan-400/70 uppercase tracking-wider">Frags</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Epic respawn button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={onRestart}
                className={`w-full ${isMobile ? 'h-14 text-base' : 'h-16 text-xl'} font-bold tracking-wider uppercase
                  bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 
                  border-2 border-green-400/50 text-white shadow-lg hover:shadow-xl
                  transition-all duration-300 font-mono relative overflow-hidden`}
                size="lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                  transform -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                <span className="relative z-10">{respawnMessage}</span>
              </Button>
            </motion.div>

            {/* Easter egg footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-center text-xs text-gray-500 font-mono pt-2"
            >
              © 1999 - Remember when games came on CDs? 💽
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
