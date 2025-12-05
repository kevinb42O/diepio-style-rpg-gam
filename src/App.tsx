import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { GameEngine } from '@/lib/gameEngine'
import { GameCanvas } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { StatUpgradeModal } from '@/components/StatUpgradeModal'
import { ClassUpgradeModal } from '@/components/ClassUpgradeModal'
import { DeathScreen } from '@/components/DeathScreen'
import { MobileControls } from '@/components/MobileControls'
import { Minimap } from '@/components/Minimap'
import { FPSCounter } from '@/components/FPSCounter'
import { KillFeed, type KillFeedItem } from '@/components/KillFeed'
import { AdminPanel } from '@/components/AdminPanel'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Play } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import type { HighScore, GameStats } from '@/lib/types'
import type { StatType } from '@/lib/upgradeSystem'
import { getAvailableUpgrades, getUpgradesForClassAtLevel } from '@/lib/tankConfigs'
import { audioManager } from '@/audio/AudioManager'

type GameState = 'menu' | 'playing' | 'paused' | 'statupgrade' | 'classupgrade' | 'dead'

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [hudData, setHudData] = useState({
    health: 100,
    maxHealth: 100,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    kills: 0,
    damage: 10,
    fireRate: 500,
    speed: 150,
    weapon: null as any,
    armor: null as any,
  })
  const [gameTime, setGameTime] = useState(0)
  const [xpProgress, setXpProgress] = useState({ current: 0, required: 100 })
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
  const hudUpdateInterval = useRef<number>(0)
  const [showFPS, setShowFPS] = useState(false)
  const [killFeedItems, setKillFeedItems] = useState<KillFeedItem[]>([])
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const checkOwner = async () => {
      try {
        const user = await window.spark.user()
        setIsOwner(user?.isOwner || false)
      } catch (error) {
        setIsOwner(false)
      }
    }
    checkOwner()
  }, [])

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

    const handleMouseDown = (e: MouseEvent) => {
      if (isMobile || gameState !== 'playing') return
      
      // Call drone control handler for drone classes
      engine.handleMouseDown(e.button)
      
      // Regular shooting for non-drone auto-attack classes
      const tankConfig = engine.player.tankClass
      const isAutoAttackDroneClass = ['overseer', 'overlord', 'manager', 'factory', 'battleship'].includes(tankConfig)
      
      if (!isAutoAttackDroneClass) {
        engine.isShooting = true
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isMobile) return
      
      // Call drone control handler
      engine.handleMouseUp(e.button)
      
      engine.isShooting = false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMobile) return
      
      // F3 to toggle FPS counter
      if (e.key === 'F3') {
        e.preventDefault()
        setShowFPS(prev => !prev)
        return
      }

      // K to toggle stats panel
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleToggleStatsPanel()
        return
      }

      // Initialize audio on first user interaction
      if (!audioManager.isEnabled()) {
        audioManager.initialize()
      }
      
      if (gameState === 'playing') {
        engine.keys.add(e.key.toLowerCase())
        
        if (e.key >= '1' && e.key <= '9') {
          const statIndex = parseInt(e.key) - 1
          const statKeys: StatType[] = ['healthRegen', 'maxHealth', 'bodyDamage', 'bulletSpeed', 'bulletPenetration', 'bulletDamage', 'reload', 'movementSpeed', 'lootRange']
          if (engine.upgradeManager.getAvailableSkillPoints() > 0) {
            handleAllocateStat(statKeys[statIndex])
          }
        }
        
        if (e.key === ' ') {
          e.preventDefault()
          engine.isShooting = true
        }

        // E for auto-fire toggle
        if (e.key.toLowerCase() === 'e') {
          engine.autoFire = !engine.autoFire
          toast.info(`Auto-fire ${engine.autoFire ? 'enabled' : 'disabled'}`)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isMobile) return
      engine.keys.delete(e.key.toLowerCase())
      if (e.key === ' ') {
        engine.isShooting = false
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent default right-click menu for drone control
      e.preventDefault()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState, isMobile])

  useEffect(() => {
    if (gameState !== 'playing') return

    const engine = engineRef.current

    engine.onLevelUp = () => {
      // Note: engine.player.level is already updated in collectLoot() before this callback
      // Do NOT call engine.levelUp() here as it would double-increment the level
      
      // Add to kill feed
      setKillFeedItems(prev => [...prev, {
        id: `levelup-${Date.now()}`,
        message: `🎉 Level ${engine.player.level} reached!`,
        timestamp: Date.now(),
        type: 'levelup'
      }])
      
      const availableClasses = getAvailableUpgrades(engine.player.tankClass, engine.player.level)
      if (availableClasses.length > 0) {
        setGameState('classupgrade')
        toast.success(`Level ${engine.player.level} reached! Choose your class!`)
        return
      }
      
      if (engine.upgradeManager.getAvailableSkillPoints() > 0) {
        toast.success(`Level ${engine.player.level} reached! Press K to upgrade stats!`)
      }
    }

    const gameLoop = () => {
      const now = Date.now()
      const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.033)
      lastTimeRef.current = now

      if (isMobile) {
        const input = mobileInputRef.current
        engine.mobileInput = { x: input.x, y: input.y }
        engine.mobileShootDirection = { x: input.shootX, y: input.shootY }
        
        // Disable shooting for auto-attack drone classes on mobile
        const tankConfig = engine.player.tankClass
        const isAutoAttackDroneClass = ['overseer', 'overlord', 'manager', 'factory', 'battleship'].includes(tankConfig)
        
        if (!isAutoAttackDroneClass) {
          engine.isShooting = input.shootX !== 0 || input.shootY !== 0
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

      hudUpdateInterval.current++
      if (hudUpdateInterval.current >= 10) {
        hudUpdateInterval.current = 0
        setHudData({
          health: engine.player.health,
          maxHealth: engine.player.maxHealth,
          level: engine.player.level,
          xp: engine.player.xp,
          xpToNextLevel: engine.player.xpToNextLevel,
          kills: engine.player.kills,
          damage: engine.player.damage,
          fireRate: engine.player.fireRate,
          speed: engine.player.speed,
          weapon: engine.player.weapon,
          armor: engine.player.armor,
        })
        setGameTime(engine.gameTime)
        setXpProgress({
          current: engine.upgradeManager.getCurrentXPInLevel(),
          required: engine.upgradeManager.getXPRequiredForCurrentLevel(),
        })
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    lastTimeRef.current = Date.now()
    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      engine.onLevelUp = null
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameState, highScore, setHighScore, isMobile])

  const startGame = () => {
    engineRef.current.reset()
    lastTimeRef.current = Date.now()
    hudUpdateInterval.current = 0
    const engine = engineRef.current
    setHudData({
      health: engine.player.health,
      maxHealth: engine.player.maxHealth,
      level: engine.player.level,
      xp: engine.player.xp,
      xpToNextLevel: engine.player.xpToNextLevel,
      kills: engine.player.kills,
      damage: engine.player.damage,
      fireRate: engine.player.fireRate,
      speed: engine.player.speed,
      weapon: engine.player.weapon,
      armor: engine.player.armor,
    })
    setGameTime(0)
    setXpProgress({ current: 0, required: 100 })
    setGameState('playing')
  }

  const handleAllocateStat = (stat: StatType) => {
    const statPoints = engineRef.current.upgradeManager.getStatPoints()
    const MAX_STAT_POINTS = 30
    
    if (statPoints[stat] >= MAX_STAT_POINTS) {
      toast.warning(`${stat} is already maxed at ${MAX_STAT_POINTS} points!`)
      return
    }
    
    if (engineRef.current.upgradeManager.getAvailableSkillPoints() === 0) {
      toast.warning('No skill points available!')
      return
    }
    
    engineRef.current.allocateStat(stat)
  }

  const handleCloseStatUpgrade = () => {
    engineRef.current.invincibilityFrames = 1.5
    setGameState('playing')
  }

  const handleSelectClass = (className: string) => {
    if (engineRef.current.upgradeTank(className)) {
      toast.success(`Class upgraded to ${className}!`)
      setGameState('playing')
    } else {
      toast.error('Failed to upgrade class')
    }
  }

  const handleCloseClassUpgrade = () => {
    engineRef.current.invincibilityFrames = 1.5
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

  const handleAdminSetLevel = (level: number) => {
    if (engineRef.current.setLevel(level)) {
      toast.success(`Level set to ${level}!`)
      
      const availableClasses = getUpgradesForClassAtLevel(engineRef.current.player.tankClass, level)
      if (availableClasses.length > 0 && gameState === 'playing') {
        setGameState('classupgrade')
        toast.success(`Choose your class upgrade!`)
      }
    }
  }

  const handleAdminAddStatPoints = (amount: number) => {
    engineRef.current.addStatPoints(amount)
    toast.success(`Added ${amount} levels for stat points!`)
  }

  const handleToggleStatsPanel = () => {
    if (gameState === 'playing') {
      setGameState('statupgrade')
    } else if (gameState === 'statupgrade') {
      setGameState('playing')
    }
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
              <div><span className="font-mono bg-card px-2 py-1 rounded">ZQSD</span> - Move</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded">Mouse</span> - Aim</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded">Click / Space</span> - Shoot</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded">K</span> - Toggle Stats Panel</div>
              <div><span className="font-mono bg-card px-2 py-1 rounded">1-9</span> - Quick Upgrade Stats</div>
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
      <div className="flex flex-col items-center justify-center relative overflow-hidden fixed inset-0">
      <div className="relative w-full h-full">
        <GameCanvas 
          engine={engineRef.current} 
          showStatUI={gameState === 'playing'}
          onStatClick={handleAllocateStat}
        />
        
        {gameState === 'playing' && (
          <>
            <HUD 
              player={hudData} 
              gameTime={gameTime}
              currentXPInLevel={xpProgress.current}
              xpRequiredForLevel={xpProgress.required}
              onToggleStats={handleToggleStatsPanel}
              availableStatPoints={engineRef.current.upgradeManager.getAvailableSkillPoints()}
            />
            <MobileControls 
              onMove={handleMobileMove}
              onShootDirection={handleMobileShootDirection}
            />
            <Minimap engine={engineRef.current} />
            <FPSCounter visible={showFPS} />
            <KillFeed items={killFeedItems} />
            <AdminPanel
              onSetLevel={handleAdminSetLevel}
              onAddStatPoints={handleAdminAddStatPoints}
              currentLevel={engineRef.current.player.level}
              isOwner={isOwner}
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

      {gameState === 'classupgrade' && (
        <ClassUpgradeModal
          availableClasses={getUpgradesForClassAtLevel(engineRef.current.player.tankClass, engineRef.current.player.level)}
          onSelect={handleSelectClass}
          onClose={handleCloseClassUpgrade}
        />
      )}

      {gameState === 'dead' && deathStats && (
        <DeathScreen
          stats={deathStats}
          highScore={(highScore?.levelReached || 0) > 0 ? highScore : undefined}
          onRestart={handleRestart}
        />
      )}
      
      {/* Version display */}
      <div className="fixed bottom-1 right-2 text-[10px] text-white/30 pointer-events-none select-none z-50">
        v4.2.0
      </div>
      </div>
    </>
  )
}

export default App