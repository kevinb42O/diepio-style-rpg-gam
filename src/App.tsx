import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { GameEngine } from '@/lib/gameEngine'
import { GameCanvas } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { StatUpgradeModal } from '@/components/StatUpgradeModal'
import { DeathScreen } from '@/components/DeathScreen'
import { MobileControls } from '@/components/MobileControls'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Play } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import type { HighScore, GameStats } from '@/lib/types'
import type { StatType } from '@/lib/upgradeSystem'

type GameState = 'menu' | 'playing' | 'paused' | 'statupgrade' | 'dead'

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [, setTick] = useState(0)
  const engineRef = useRef<GameEngine>(new GameEngine())
  const lastTimeRef = useRef<number>(Date.now())
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [highScore, setHighScore] = useKV<HighScore>('highscore', {
    timeSurvived: 0,
    levelReached: 0,
    enemiesKilled: 0,
    date: 0,
  })
  const [deathStats, setDeathStats] = useState<GameStats | null>(null)
  const isMobile = useIsMobile()
  const mobileInputRef = useRef({ x: 0, y: 0, shootX: 0, shootY: 0 })

  useEffect(() => {
    const engine = engineRef.current

    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return
      const rect = (e.target as HTMLElement).getBoundingClientRect?.()
      if (rect) {
        engine.mousePosition.x = (e.clientX - rect.left) + engine.camera.x
        engine.mousePosition.y = (e.clientY - rect.top) + engine.camera.y
      }
    }

    const handleMouseDown = () => {
      if (isMobile || gameState !== 'playing') return
      engine.isShooting = true
    }

    const handleMouseUp = () => {
      if (isMobile) return
      engine.isShooting = false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMobile || gameState !== 'playing') return
      engine.keys.add(e.key.toLowerCase())
      if (e.key === ' ') {
        e.preventDefault()
        engine.isShooting = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isMobile) return
      engine.keys.delete(e.key.toLowerCase())
      if (e.key === ' ') {
        engine.isShooting = false
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState, isMobile])

  useEffect(() => {
    if (gameState !== 'playing') return

    const engine = engineRef.current

    const gameLoop = () => {
      const now = Date.now()
      const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      if (isMobile) {
        const input = mobileInputRef.current
        engine.mobileInput = { x: input.x, y: input.y }
        engine.mobileShootDirection = { x: input.shootX, y: input.shootY }
        engine.isShooting = input.shootX !== 0 || input.shootY !== 0
      }

      const nearbyLoot = engine.loot.find(item => {
        const dx = item.position.x - engine.player.position.x
        const dy = item.position.y - engine.player.position.y
        return Math.sqrt(dx * dx + dy * dy) < 20
      })

      if (nearbyLoot) {
        const result = engine.collectLoot(nearbyLoot)

        if (result === 'levelup' && engine.player.xp >= engine.player.xpToNextLevel) {
          engine.levelUp()
          if (engine.upgradeManager.getAvailableSkillPoints() > 0) {
            setGameState('statupgrade')
            toast.success(`Level ${engine.player.level} reached!`)
            return
          }
        }
      }

      engine.update(deltaTime)

      if (engine.player.health <= 0) {
        const stats: GameStats = {
          timeSurvived: engine.gameTime,
          levelReached: engine.player.level,
          enemiesKilled: engine.player.kills,
        }
        
        setDeathStats(stats)

        if (stats.levelReached > (highScore?.levelReached || 0) || 
           (stats.levelReached === highScore?.levelReached && stats.timeSurvived > (highScore?.timeSurvived || 0))) {
          setHighScore((current) => ({
            ...(current || { timeSurvived: 0, levelReached: 0, enemiesKilled: 0, date: 0 }),
            ...stats,
            date: Date.now(),
          }))
        }

        setGameState('dead')
        return
      }

      setTick(t => t + 1)
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    lastTimeRef.current = Date.now()
    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameState, highScore, setHighScore, isMobile])

  const startGame = () => {
    engineRef.current.reset()
    lastTimeRef.current = Date.now()
    setGameState('playing')
  }

  const handleAllocateStat = (stat: StatType) => {
    engineRef.current.allocateStat(stat)
    toast.success('Stat upgraded!')
  }

  const handleCloseStatUpgrade = () => {
    setGameState('playing')
  }

  const handleRestart = () => {
    startGame()
  }

  const handleMobileMove = (x: number, y: number) => {
    mobileInputRef.current.x = x
    mobileInputRef.current.y = y
  }

  const handleMobileShootDirection = (x: number, y: number) => {
    mobileInputRef.current.shootX = x
    mobileInputRef.current.shootY = y
  }

  if (gameState === 'menu') {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 md:gap-8 p-4 md:p-8">
        <div className="text-center space-y-2 md:space-y-4">
          <h1 className="text-4xl md:text-7xl font-title text-primary">
            Azeroth Survivors
          </h1>
          <p className="text-sm md:text-xl text-muted-foreground max-w-2xl px-4">
            Explore a vast world filled with loot boxes. Destroy them to collect experience and level up your character. Bigger boxes are tougher but more rewarding. Venture to the edges to find the most valuable treasure!
          </p>
        </div>

        {highScore && (highScore.levelReached || 0) > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 md:p-6 w-full max-w-sm md:max-w-md text-center">
            <div className="text-xs md:text-sm text-muted-foreground mb-3">Your Best Run</div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                <div className="text-xl md:text-2xl font-bold">
                  {Math.floor(highScore.timeSurvived / 60000)}:
                  {Math.floor((highScore.timeSurvived % 60000) / 1000).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{highScore.levelReached}</div>
                <div className="text-xs text-muted-foreground">Level</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{highScore.enemiesKilled}</div>
                <div className="text-xs text-muted-foreground">Boxes</div>
              </div>
            </div>
          </div>
        )}

        <Button onClick={startGame} size="lg" className="h-14 md:h-16 px-8 md:px-12 text-lg md:text-xl">
          <Play weight="fill" className="mr-2" size={isMobile ? 20 : 24} />
          Begin Your Journey
        </Button>

        <div className="bg-muted/50 rounded-lg p-4 md:p-6 max-w-xl w-full space-y-2 text-xs md:text-sm">
          <div className="font-semibold mb-3">Controls:</div>
          {isMobile ? (
            <>
              <div><span className="font-mono bg-card px-2 py-1 rounded text-xs">Left Joystick</span> - Move</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded text-xs">Right Button</span> - Shoot</div>
            </>
          ) : (
            <>
              <div><span className="font-mono bg-card px-2 py-1 rounded">WASD</span> - Move</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded">Mouse</span> - Aim</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded">Click / Space</span> - Shoot</div>
            </>
          )}
        </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toaster />
      <div className={`flex flex-col items-center justify-center relative overflow-hidden ${
        isMobile ? 'fixed inset-0' : 'min-h-screen p-2 md:p-8'
      }`}>
      <div className={`relative ${isMobile ? 'w-full h-full' : 'w-full max-w-[800px]'}`}>
        <GameCanvas engine={engineRef.current} />
        
        {gameState === 'playing' && (
          <>
            <HUD 
              player={engineRef.current.player} 
              gameTime={engineRef.current.gameTime}
              currentXPInLevel={engineRef.current.upgradeManager.getCurrentXPInLevel()}
              xpRequiredForLevel={engineRef.current.upgradeManager.getXPRequiredForCurrentLevel()}
            />
            <MobileControls 
              onMove={handleMobileMove}
              onShootDirection={handleMobileShootDirection}
            />
          </>
        )}
      </div>

      {gameState === 'statupgrade' && (
        <StatUpgradeModal
          level={engineRef.current.player.level}
          availablePoints={engineRef.current.upgradeManager.getAvailableSkillPoints()}
          statPoints={engineRef.current.upgradeManager.getStatPoints()}
          onAllocate={handleAllocateStat}
          onClose={handleCloseStatUpgrade}
        />
      )}

      {gameState === 'dead' && deathStats && (
        <DeathScreen
          stats={deathStats}
          highScore={(highScore?.levelReached || 0) > 0 ? highScore : undefined}
          onRestart={handleRestart}
        />
      )}
      </div>
    </>
  )
}

export default App