import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { GameEngine } from '@/lib/gameEngine'
import { GameCanvas } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { LevelUpModal } from '@/components/LevelUpModal'
import { DeathScreen } from '@/components/DeathScreen'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Play } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { HighScore, GameStats } from '@/lib/types'

type GameState = 'menu' | 'playing' | 'paused' | 'levelup' | 'dead'

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

  useEffect(() => {
    const engine = engineRef.current

    const handleMouseMove = (e: MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect?.()
      if (rect) {
        engine.mousePosition.x = e.clientX - rect.left
        engine.mousePosition.y = e.clientY - rect.top
      }
    }

    const handleMouseDown = () => {
      if (gameState === 'playing') {
        engine.isShooting = true
      }
    }

    const handleMouseUp = () => {
      engine.isShooting = false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        engine.keys.add(e.key.toLowerCase())
        if (e.key === ' ') {
          e.preventDefault()
          engine.isShooting = true
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
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
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing') return

    const engine = engineRef.current

    const gameLoop = () => {
      const now = Date.now()
      const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      const nearbyLoot = engine.loot.find(item => {
        const dx = item.position.x - engine.player.position.x
        const dy = item.position.y - engine.player.position.y
        return Math.sqrt(dx * dx + dy * dy) < 20
      })

      if (nearbyLoot) {
        const result = engine.collectLoot(nearbyLoot)

        if (result === 'levelup' && engine.player.xp >= engine.player.xpToNextLevel) {
          engine.levelUp()
          setGameState('levelup')
          toast.success(`Level ${engine.player.level} reached!`)
          return
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
  }, [gameState, highScore, setHighScore])

  const startGame = () => {
    engineRef.current.reset()
    lastTimeRef.current = Date.now()
    setGameState('playing')
  }

  const handleAllocateStat = (stat: 'health' | 'damage' | 'speed' | 'fireRate') => {
    engineRef.current.allocateStat(stat)
    setGameState('playing')
    toast.success('Stat upgraded!')
  }

  const handleRestart = () => {
    startGame()
  }

  if (gameState === 'menu') {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-title text-primary">
            Azeroth Survivors
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Battle endless waves of enemies in this action-packed RPG. Collect loot, level up, and see how long you can survive. Death is permanent - when you fall, you start from the beginning.
          </p>
        </div>

        {highScore && (highScore.levelReached || 0) > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 w-96 text-center">
            <div className="text-sm text-muted-foreground mb-3">Your Best Run</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {Math.floor(highScore.timeSurvived / 60000)}:
                  {Math.floor((highScore.timeSurvived % 60000) / 1000).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{highScore.levelReached}</div>
                <div className="text-xs text-muted-foreground">Level</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{highScore.enemiesKilled}</div>
                <div className="text-xs text-muted-foreground">Kills</div>
              </div>
            </div>
          </div>
        )}

        <Button onClick={startGame} size="lg" className="h-16 px-12 text-xl">
          <Play weight="fill" className="mr-2" size={24} />
          Begin Your Journey
        </Button>

        <div className="bg-muted/50 rounded-lg p-6 max-w-xl space-y-2 text-sm">
          <div className="font-semibold mb-3">Controls:</div>
          <div><span className="font-mono bg-card px-2 py-1 rounded">WASD</span> - Move</div>
          <div><span className="font-mono bg-card px-2 py-1 rounded">Mouse</span> - Aim</div>
          <div><span className="font-mono bg-card px-2 py-1 rounded">Click / Space</span> - Shoot</div>
        </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      <div className="relative">
        <GameCanvas engine={engineRef.current} />
        
        {gameState === 'playing' && (
          <HUD 
            player={engineRef.current.player} 
            gameTime={engineRef.current.gameTime}
          />
        )}
      </div>

      {gameState === 'levelup' && (
        <LevelUpModal
          level={engineRef.current.player.level}
          onAllocate={handleAllocateStat}
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