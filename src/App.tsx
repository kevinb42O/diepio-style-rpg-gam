import { useCallback, useEffect, useRef, useState } from 'react'
// import { useKV } from '@github/spark/hooks' // Disabled for local development
import { GameEngine } from '@/lib/gameEngine'
import { GameCanvas } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { InGameStatsPanel } from '@/components/InGameStatsPanel'
import { StatUpgradeModal } from '@/components/StatUpgradeModal'
import { ClassUpgradeModal } from '@/components/ClassUpgradeModal'
import { DeathScreen } from '@/components/DeathScreen'
import { MobileControls } from '@/components/MobileControls'
import { Minimap } from '@/components/Minimap'
import { FPSCounter } from '@/components/FPSCounter'
import { KillFeed, type KillFeedItem } from '@/components/KillFeed'
import { AdminPanel } from '@/components/AdminPanel'
import { Leaderboard } from '@/components/Leaderboard'
import { TankWiki } from '@/components/TankWiki'
import { BuildPlanner } from '@/components/BuildPlanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { Play, BookOpen, Wrench } from '@phosphor-icons/react'
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
    team: 'neutral' as 'blue' | 'red' | 'neutral',
    decoyVisible: false,
    decoyTeleportReady: false,
    decoySwapReady: false,
    siegeCharge: 0,
    riftReady: false,
    velocityDashReady: false,
  })
  const [gameTime, setGameTime] = useState(0)
  const [xpProgress, setXpProgress] = useState({ current: 0, required: 100 })
  const engineRef = useRef<GameEngine>(new GameEngine())
  const lastTimeRef = useRef<number>(Date.now())
  const animationFrameRef = useRef<number | undefined>(undefined)
  // For local development, use local state instead of Spark KV
  const [highScore, setHighScore] = useState<HighScore>({
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
  const [leaderboardEntries, setLeaderboardEntries] = useState<{ name: string; level: number; isPlayer: boolean; team?: 'blue' | 'red' | 'neutral' }[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('playerNickname') || ''
  })
  const [showTankWiki, setShowTankWiki] = useState(false)
  const [showBuildPlanner, setShowBuildPlanner] = useState(false)
  const toastCooldownRef = useRef<Map<string, number>>(new Map())
  const [adminZoom, setAdminZoom] = useState(1)

  const pushToast = useCallback(
    (
      variant: 'info' | 'success' | 'warning' | 'error',
      key: string,
      title: string,
      options?: { description?: string; cooldownMs?: number }
    ) => {
      const now = performance.now()
      const defaultCooldown = variant === 'warning' ? 2000 : 900
      const cooldown = options?.cooldownMs ?? defaultCooldown
      const last = toastCooldownRef.current.get(key) ?? 0
      if (now - last < cooldown) return
      toastCooldownRef.current.set(key, now)

      const payload = options?.description ? { description: options.description } : undefined
      switch (variant) {
        case 'success':
          toast.success(title, payload)
          break
        case 'warning':
          toast.warning(title, payload)
          break
        case 'error':
          toast.error(title, payload)
          break
        default:
          toast.info(title, payload)
          break
      }
    },
    []
  )

  const handleNicknameChange = (value: string) => {
    const trimmed = value.slice(0, 20) // Max 20 characters
    setNickname(trimmed)
    localStorage.setItem('playerNickname', trimmed)
  }

  useEffect(() => {
    // For local development, skip Spark user check
    const checkOwner = async () => {
      if (typeof window !== 'undefined' && window.spark) {
        try {
          const user = await window.spark.user()
          setIsOwner(user?.isOwner || false)
        } catch (error) {
          setIsOwner(false)
        }
      } else {
        // Local development mode - enable admin for testing
        setIsOwner(true)
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
        // Store screen-space position - world position is calculated in updateCameraSmooth
        engine.mouseScreenPosition.x = e.clientX - rect.left
        engine.mouseScreenPosition.y = e.clientY - rect.top
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (isMobile || gameState !== 'playing') return
      if (e.button === 2) {
        e.preventDefault()
      }
      
      // Call drone control handler for drone classes
      engine.handleMouseDown(e.button)
      
      // Regular shooting for non-drone auto-attack classes
      const tankConfig = engine.player.tankClass
      const isAutoAttackDroneClass = ['overseer', 'overlord', 'manager', 'factory', 'battleship'].includes(tankConfig)
      
      if (!isAutoAttackDroneClass && e.button === 0) {
        engine.isShooting = true
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isMobile) return
      if (e.button === 2) {
        e.preventDefault()
      }
      
      // Call drone control handler
      engine.handleMouseUp(e.button)
      
      if (e.button === 0) {
        engine.isShooting = false
      }
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

      // Home key to reset admin zoom
      if (e.key === 'Home' && engine.isAdmin()) {
        e.preventDefault()
        engine.resetZoom()
        pushToast('info', 'zoom-reset', 'Zoom reset to 1x', { cooldownMs: 500 })
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
          pushToast('info', 'auto-fire-toggle', `Auto-fire ${engine.autoFire ? 'enabled' : 'disabled'}`, {
            cooldownMs: 400,
          })
        }

        if (e.key.toLowerCase() === 'q') {
          e.preventDefault()
          const result = engine.tryDecoyTeleport()
          if (!result.success && result.message) {
            pushToast('info', 'decoy-teleport', result.message, { cooldownMs: 800 })
          } else if (result.success) {
            pushToast('success', 'decoy-teleport-success', 'Blinked to decoy!', { cooldownMs: 600 })
          }
        }

        if (e.key.toLowerCase() === 'r') {
          e.preventDefault()
          const result = engine.tryDecoySwap()
          if (!result.success && result.message) {
            pushToast('info', 'decoy-swap', result.message, { cooldownMs: 800 })
          } else if (result.success) {
            pushToast('success', 'decoy-swap-success', 'Swapped positions with decoy', { cooldownMs: 600 })
          }
        }

        if (e.key.toLowerCase() === 'f') {
          e.preventDefault()
          const result = engine.tryRiftTeleport(true)
          if (!result.success && result.message) {
            pushToast('info', 'rift-teleport', result.message, { cooldownMs: 800 })
          } else if (result.success) {
            pushToast('success', 'rift-teleport-success', 'Riftwalker teleport executed', { cooldownMs: 800 })
          }
        }

        if (e.key.toLowerCase() === 'v') {
          e.preventDefault()
          const result = engine.tryVelocityDash()
          if (!result.success && result.message) {
            pushToast('info', 'velocity-dash', result.message, { cooldownMs: 800 })
          } else if (result.success) {
            pushToast('success', 'velocity-dash-success', 'Velocity dash executed', { cooldownMs: 800 })
          }
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

    const handleWheel = (e: WheelEvent) => {
      if (gameState !== 'playing') return
      
      // Admin zoom feature - scroll to zoom in/out
      if (engine.handleZoom(e.deltaY)) {
        e.preventDefault()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [gameState, isMobile])

  useEffect(() => {
    if (gameState !== 'playing') return

    const engine = engineRef.current

    engine.onLevelUp = () => {
      // Note: engine.player.level is already updated in collectLoot() before this callback
      // Do NOT call engine.levelUp() here as it would double-increment the level
      
      // Add to kill feed - this handles all level up notifications
      setKillFeedItems(prev => [...prev, {
        id: `levelup-${Date.now()}`,
        message: `Level ${engine.player.level} reached!`,
        timestamp: Date.now(),
        type: 'levelup'
      }])
      
      const availableClasses = getAvailableUpgrades(engine.player.tankClass, engine.player.level)
      if (availableClasses.length > 0) {
        setGameState('classupgrade')
        return
      }
    }
    
    // Set up event notification callback for toast messages
    engine.zoneSystem.onEventNotification = (title, description, type) => {
      pushToast(type, `zone:${title}`, title, { description, cooldownMs: 5000 })
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
          team: engine.player.team,
          decoyVisible: engine.player.decoy?.visible ?? false,
          decoyTeleportReady: (engine.player.decoy?.visible ?? false) && engine.abilityState.decoyTeleportCooldown <= 0,
          decoySwapReady: (engine.player.decoy?.visible ?? false) && engine.abilityState.decoySwapCooldown <= 0,
          siegeCharge: engine.player.tankClass === 'siegebreaker'
            ? engine.abilityState.siegeCharge / engine.abilityState.siegeMaxCharge
            : 0,
          riftReady: engine.player.tankClass === 'riftwalker' && engine.abilityState.riftTeleportCooldown <= 0,
          velocityDashReady: engine.player.tankClass === 'velocityreaver'
            ? engine.abilityState.velocityReaver.cooldown <= 0
            : undefined,
        })
        setGameTime(engine.gameTime)
        setXpProgress({
          current: engine.upgradeManager.getCurrentXPInLevel(),
          required: engine.upgradeManager.getXPRequiredForCurrentLevel(),
        })
        
        // Update admin zoom indicator
        if (engine.isAdmin()) {
          setAdminZoom(engine.zoom)
        }
        
        // Update leaderboard with player and bots
        const bots = engine.botAISystem.getBots()
        const playerName = engine.player.name || nickname || 'You'
        const entries = [
          { name: playerName, level: engine.player.level, isPlayer: true, team: engine.player.team },
          ...bots.map(bot => ({
            name: bot.name || `Bot ${bot.id.slice(-4)}`,
            level: bot.level,
            isPlayer: false,
            team: bot.team,
          }))
        ]
        setLeaderboardEntries(entries)
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
  }, [gameState, highScore, setHighScore, isMobile, pushToast])

  const startGame = () => {
    engineRef.current.reset()
    // Set player nickname
    engineRef.current.player.name = nickname || 'You'
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
      velocityDashReady: false,
    })
    setGameTime(0)
    setXpProgress({ current: 0, required: 100 })
    setGameState('playing')
  }

  const handleAllocateStat = (stat: StatType) => {
    const engine = engineRef.current
    const statPoints = engine.upgradeManager.getStatPoints()
    const MAX_STAT_POINTS = 40

    if (statPoints[stat] >= MAX_STAT_POINTS) {
      pushToast('warning', `stat-max:${stat}`, `${stat} is already maxed at ${MAX_STAT_POINTS} points!`, {
        cooldownMs: 1200,
      })
      return
    }

    if (engine.upgradeManager.getAvailableSkillPoints() === 0) {
      pushToast('warning', 'stat-no-points', 'No skill points available!', { cooldownMs: 1200 })
      return
    }

    engine.allocateStat(stat)
  }

  const handleCloseStatUpgrade = () => {
    engineRef.current.invincibilityFrames = 1.5
    setGameState('playing')
  }

  const handleSelectClass = (className: string) => {
    if (engineRef.current.upgradeTank(className)) {
      pushToast('success', 'class-upgrade-success', `Class upgraded to ${className}!`, { cooldownMs: 800 })
      setGameState('playing')
    } else {
      pushToast('error', 'class-upgrade-fail', 'Failed to upgrade class', { cooldownMs: 1200 })
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

  const handleAdminSetLevel = useCallback((level: number) => {
    if (engineRef.current.setLevel(level)) {
      pushToast('success', 'admin-set-level', `Level set to ${level}!`, { cooldownMs: 800 })

      const availableClasses = getUpgradesForClassAtLevel(engineRef.current.player.tankClass, level)
      if (availableClasses.length > 0 && gameState === 'playing') {
        setGameState('classupgrade')
        pushToast('success', 'prompt-class-upgrade', 'Choose your class upgrade!', { cooldownMs: 2000 })
      }
    }
  }, [gameState, pushToast])

  const handleAdminAddStatPoints = useCallback((amount: number) => {
    engineRef.current.addStatPoints(amount)
    pushToast('success', 'admin-add-levels', `Added ${amount} levels for stat points!`, { cooldownMs: 1200 })
  }, [pushToast])

  const handleToggleStatsPanel = () => {
    if (gameState === 'playing') {
      setGameState('statupgrade')
    } else if (gameState === 'statupgrade') {
      setGameState('playing')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as typeof window & {
      codexSetLevel?: (level: number) => void
      codexAddLevels?: (amount: number) => void
    }
    w.codexSetLevel = (level: number) => handleAdminSetLevel(level)
    w.codexAddLevels = (amount: number) => handleAdminAddStatPoints(amount)
    return () => {
      delete w.codexSetLevel
      delete w.codexAddLevels
    }
  }, [handleAdminSetLevel, handleAdminAddStatPoints])

  if (gameState === 'menu') {
    return (
      <>
        <Toaster />
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center gap-4 md:gap-8 p-4 md:p-8">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950 animate-gradient-shift" />
          
          {/* Floating geometric shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-16 h-16 border-4 border-blue-500/30 rotate-45 animate-float" />
            <div className="absolute top-40 right-20 w-12 h-12 bg-purple-500/20 rounded-full animate-float-delayed" />
            <div className="absolute bottom-32 left-1/4 w-20 h-20 border-4 border-cyan-500/30 animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-blue-400/20 animate-float-delayed" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-20 right-10 w-14 h-14 border-4 border-purple-400/30 rotate-45 animate-float" style={{ animationDelay: '1.5s' }} />
          </div>

          {/* Main content with glassmorphism */}
          <div className="relative z-10 text-center space-y-6 md:space-y-8 backdrop-blur-sm bg-black/20 p-8 md:p-12 rounded-2xl border border-white/10">
            <div className="space-y-3 md:space-y-4">
              <div className="inline-block">
                <div className="text-6xl md:text-9xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient-x tracking-tighter">
                  POLYGON.IO
                </div>
              </div>
              <div className="text-base md:text-xl text-slate-400 tracking-wide font-mono">
                shoot • upgrade • become the KING
              </div>
            </div>
          </div>

          {highScore && (highScore.levelReached || 0) > 0 && (
            <div className="relative z-10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 md:p-6 w-full max-w-sm md:max-w-md shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl" />
              <div className="relative">
                <div className="text-xs md:text-sm text-blue-300 font-semibold mb-3 uppercase tracking-wider">🏆 Personal Best</div>
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-cyan-400">
                      {Math.floor(highScore.timeSurvived / 60000)}:
                      {Math.floor((highScore.timeSurvived % 60000) / 1000).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Survived</div>
                  </div>
                  <div className="text-center border-x border-slate-700/50">
                    <div className="text-2xl md:text-3xl font-bold text-purple-400">Lv.{highScore.levelReached}</div>
                    <div className="text-xs text-slate-400 mt-1">Reached</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-blue-400">{highScore.enemiesKilled}</div>
                    <div className="text-xs text-slate-400 mt-1">Destroyed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative z-10 w-full max-w-sm md:max-w-md">
            <Input
              type="text"
              placeholder="Enter your Nickname..."
              value={nickname}
              onChange={(e) => handleNicknameChange(e.target.value)}
              className="text-center text-lg h-14 bg-slate-900/80 backdrop-blur-md border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500 rounded-xl shadow-lg"
              maxLength={20}
            />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={startGame} 
              size="lg" 
              className="h-16 md:h-20 px-10 md:px-16 text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 shadow-2xl shadow-blue-500/50 border-2 border-blue-400/50 rounded-xl transform transition-all hover:scale-105 active:scale-95"
            >
              <Play weight="fill" className="mr-3" size={isMobile ? 24 : 28} />
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">START BATTLE</span>
            </Button>
            
            <Button 
              onClick={() => setShowBuildPlanner(true)} 
              size="lg" 
              variant="outline"
              className="h-16 md:h-20 px-8 md:px-12 text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-900/50 to-teal-900/50 hover:from-emerald-800/60 hover:to-teal-800/60 border-2 border-emerald-500/50 hover:border-emerald-400/70 text-white shadow-2xl shadow-emerald-500/30 rounded-xl transform transition-all hover:scale-105 active:scale-95"
            >
              <Wrench weight="fill" className="mr-3" size={isMobile ? 24 : 28} />
              <span className="bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">BUILD PLANNER</span>
            </Button>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => {
                console.log('Tank Wiki button clicked!')
                setShowTankWiki(true)
              }} 
              size="lg" 
              variant="outline"
              className="h-16 md:h-20 px-8 md:px-12 text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-800/60 hover:to-pink-800/60 border-2 border-purple-500/50 hover:border-purple-400/70 text-white shadow-2xl shadow-purple-500/30 rounded-xl transform transition-all hover:scale-105 active:scale-95"
            >
              <BookOpen weight="fill" className="mr-3" size={isMobile ? 24 : 28} />
              <span className="bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">TANK WIKI</span>
            </Button>
          </div>

          <div className="relative z-10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 md:p-6 max-w-2xl w-full border border-slate-700/50 shadow-xl overflow-hidden">
            <div className="font-bold mb-6 text-blue-300 text-sm md:text-base uppercase tracking-wider">⌨️ Controls</div>
            
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
                backgroundSize: '20px 20px',
                animation: 'grid-move 20s linear infinite'
              }}></div>
            </div>
            
            {isMobile ? (
              <div className="flex items-center justify-center gap-8 relative z-10">
                {/* Holographic Phone */}
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-3xl transform rotate-3"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-slate-600 shadow-2xl transform hover:scale-105 transition-transform">
                    <div className="w-48 h-80 bg-gradient-to-b from-slate-900 to-black rounded-xl border border-slate-700 relative overflow-hidden">
                      {/* Screen glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent"></div>
                      
                      <div className="absolute inset-4">
                        {/* Game simulation in background */}
                        <div className="absolute inset-0 opacity-30">
                          <div className="w-4 h-4 bg-blue-400 rounded-full absolute top-8 left-8 animate-bounce"></div>
                          <div className="w-3 h-3 bg-yellow-400 absolute top-16 right-12 transform rotate-45"></div>
                          <div className="w-3 h-3 bg-purple-400 absolute bottom-20 left-12"></div>
                        </div>
                        
                        {/* Left joystick area */}
                        <div className="absolute left-4 bottom-8 w-16 h-16">
                          <div className="w-full h-full bg-blue-500/20 rounded-full border-2 border-blue-400/60 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-full shadow-lg animate-pulse border border-blue-200/50"></div>
                          </div>
                          <div className="text-xs text-center mt-2 text-blue-300 font-bold">MOVE</div>
                        </div>
                        
                        {/* Right fire button */}
                        <div className="absolute right-4 bottom-8 w-16 h-16">
                          <div className="w-full h-full bg-red-500/20 rounded-full border-2 border-red-400/60 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-300 to-red-500 rounded-full shadow-lg animate-pulse border border-red-200/50 flex items-center justify-center">
                              <div className="text-white text-xs font-bold">🔥</div>
                            </div>
                          </div>
                          <div className="text-xs text-center mt-2 text-red-300 font-bold">FIRE</div>
                        </div>
                        
                        {/* Floating particles */}
                        <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                        <div className="absolute top-8 left-8 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-8 relative z-10">
                {/* Cyberpunk Keyboard */}
                <div className="relative transform perspective-1000 preserve-3d">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-lg transform rotate-3 scale-110"></div>
                  
                  <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-lg p-6 border-2 border-slate-600 shadow-2xl transform -rotate-6 scale-95 hover:scale-100 hover:rotate-3 transition-all duration-500">
                    {/* Neon underglow */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-lg blur-lg"></div>
                    
                    {/* Keyboard rows */}
                    <div className="relative space-y-2">
                      {/* Top row - Numbers */}
                      <div className="flex gap-1 justify-center">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((key, i) => (
                          <div key={key} className={`w-9 h-9 rounded border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 transform hover:scale-110
                            ${i < 8 ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/40 border-orange-400/80 text-orange-200 shadow-lg shadow-orange-500/20 animate-pulse' : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            style={{animationDelay: `${i * 0.1}s`}}>
                            {key}
                          </div>
                        ))}
                      </div>
                      
                      {/* AZERTY row */}
                      <div className="flex gap-1 justify-center pl-3">
                        {[
                          {key: 'A', active: false}, 
                          {key: 'Z', active: true}, 
                          {key: 'E', active: true, special: 'auto'}, 
                          {key: 'R', active: false}, 
                          {key: 'T', active: false},
                          {key: 'Y', active: false},
                          {key: 'U', active: false},
                          {key: 'I', active: false},
                          {key: 'O', active: false},
                          {key: 'P', active: false}
                        ].map(({key, active, special}, i) => (
                          <div key={key} className={`w-9 h-9 rounded border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 transform hover:scale-110
                            ${active ? (special ? 'bg-gradient-to-br from-green-500/30 to-green-600/40 border-green-400/80 text-green-200 shadow-lg shadow-green-500/20 animate-pulse' : 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/40 border-cyan-400/80 text-cyan-200 shadow-lg shadow-cyan-500/20 animate-pulse') : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            style={{animationDelay: `${i * 0.15}s`}}>
                            {key}
                          </div>
                        ))}
                      </div>
                      
                      {/* QSDF row */}
                      <div className="flex gap-1 justify-center pl-6">
                        {[
                          {key: 'Q', active: true}, 
                          {key: 'S', active: true}, 
                          {key: 'D', active: true}, 
                          {key: 'F', active: false},
                          {key: 'G', active: false},
                          {key: 'H', active: false},
                          {key: 'J', active: false},
                          {key: 'K', active: true, special: 'stats'},
                          {key: 'L', active: false},
                          {key: 'M', active: false}
                        ].map(({key, active, special}, i) => (
                          <div key={key} className={`w-9 h-9 rounded border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 transform hover:scale-110
                            ${active ? (special ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/40 border-purple-400/80 text-purple-200 shadow-lg shadow-purple-500/20 animate-pulse' : 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/40 border-cyan-400/80 text-cyan-200 shadow-lg shadow-cyan-500/20 animate-pulse') : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            style={{animationDelay: `${i * 0.1}s`}}>
                            {key}
                          </div>
                        ))}
                      </div>
                      
                      {/* WXCV row */}
                      <div className="flex gap-1 justify-center pl-9">
                        {[
                          {key: 'W', active: false}, 
                          {key: 'X', active: false}, 
                          {key: 'C', active: false}, 
                          {key: 'V', active: false},
                          {key: 'B', active: false},
                          {key: 'N', active: false},
                          {key: ',', active: false}
                        ].map(({key, active}, i) => (
                          <div key={key} className={`w-9 h-9 rounded border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 transform hover:scale-110
                            ${active ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/40 border-cyan-400/80 text-cyan-200 shadow-lg shadow-cyan-500/20 animate-pulse' : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            style={{animationDelay: `${i * 0.1}s`}}>
                            {key}
                          </div>
                        ))}
                      </div>
                      
                      {/* Space bar */}
                      <div className="flex justify-center pt-2">
                        <div className="w-56 h-10 bg-gradient-to-br from-red-500/30 to-red-600/40 border-2 border-red-400/80 rounded flex items-center justify-center text-xs font-bold text-red-200 shadow-lg shadow-red-500/20 animate-pulse transform hover:scale-105 transition-all duration-300">
                          SPACEBAR
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Futuristic Mouse */}
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-20 h-28 border-2 border-slate-600 shadow-2xl flex flex-col items-center justify-center transform hover:scale-110 transition-all duration-300">
                    {/* Mouse glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent rounded-2xl"></div>
                    
                    {/* Scroll wheel */}
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400/30 to-blue-500/40 rounded-full border border-blue-400/60 mb-2 animate-pulse flex items-center justify-center relative z-10">
                      <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                    </div>
                    
                    {/* Mouse buttons */}
                    <div className="flex gap-1">
                      <div className="w-6 h-4 bg-gradient-to-br from-red-500/40 to-red-600/50 rounded border-2 border-red-400/60 animate-pulse"></div>
                      <div className="w-6 h-4 bg-slate-700 rounded border border-slate-600"></div>
                    </div>
                    
                    <div className="text-xs text-blue-300 absolute -bottom-10 font-bold">🎯 AIM</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legend - OUTSIDE the controls window */}
          <div className="relative z-10 flex flex-wrap gap-4 justify-center mt-6">
            {[
              {color: 'cyan', label: 'Movement', icon: '🏃'},
              {color: 'red', label: 'Fire', icon: '💥'},
              {color: 'orange', label: 'Upgrades', icon: '⚡'},
              {color: 'green', label: 'Auto-fire', icon: '🔄'},
              {color: 'purple', label: 'Stats', icon: '📊'}
            ].map(({color, label, icon}, i) => (
              <div key={label} className="flex items-center gap-2 backdrop-blur-sm bg-black/20 px-3 py-2 rounded-lg border border-slate-700/50 transform hover:scale-105 transition-all"
                   style={{animationDelay: `${i * 0.2}s`}}>
                <div className={`w-3 h-3 bg-${color}-400 rounded-full shadow-lg animate-pulse`}></div>
                <span className="text-slate-300 font-medium text-sm">{icon} {label}</span>
              </div>
            ))}
          </div>

          {/* Professional footer */}
          <div className="absolute bottom-6 right-6 z-10">
            <div className="text-sm text-slate-400/80 font-mono backdrop-blur-md bg-black/20 px-4 py-2 rounded-lg border border-slate-700/40">
              <span className="font-bold text-blue-400">Jax Studios</span> © 2025
            </div>
          </div>
        </div>

        <style>{`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes gradient-x {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-30px) scale(1.1); }
          }
          @keyframes grid-move {
            0% { transform: translate(0, 0); }
            100% { transform: translate(20px, 20px); }
          }
          .animate-gradient-shift {
            background-size: 400% 400%;
            animation: gradient-shift 15s ease infinite;
          }
          .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 3s ease infinite;
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float-delayed 8s ease-in-out infinite;
          }
          .perspective-1000 {
            perspective: 1000px;
          }
          .preserve-3d {
            transform-style: preserve-3d;
          }
        `}</style>

        {showTankWiki && (
          <TankWiki onClose={() => {
            console.log('Closing Tank Wiki')
            setShowTankWiki(false)
          }} />
        )}

        {showBuildPlanner && (
          <BuildPlanner 
            onClose={() => setShowBuildPlanner(false)}
          />
        )}
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
            
            {/* In-game stats panel - shows when you have skill points */}
            <InGameStatsPanel
              availablePoints={engineRef.current.upgradeManager.getAvailableSkillPoints()}
              statPoints={engineRef.current.upgradeManager.getStatPoints()}
              onAllocate={handleAllocateStat}
              currentClass={engineRef.current.player.tankClass}
            />
            
            <MobileControls 
              onMove={handleMobileMove}
              onShootDirection={handleMobileShootDirection}
            />
            <Minimap engine={engineRef.current} />
            <FPSCounter visible={showFPS} />
            <KillFeed items={killFeedItems} />
            <Leaderboard entries={leaderboardEntries} />
            <AdminPanel
              onSetLevel={handleAdminSetLevel}
              onAddStatPoints={handleAdminAddStatPoints}
              currentLevel={engineRef.current.player.level}
              isOwner={isOwner}
            />
            
            {/* Admin Zoom Indicator */}
            {engineRef.current.isAdmin() && adminZoom !== 1 && (
              <div className="fixed top-4 right-4 bg-black/70 backdrop-blur-sm border border-yellow-500/50 rounded-lg px-3 py-2 text-yellow-400 font-mono text-sm z-50 shadow-lg shadow-yellow-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">🔍</span>
                  <span>Zoom: {(adminZoom * 100).toFixed(0)}%</span>
                </div>
                <div className="text-[10px] text-yellow-500/70 mt-1">
                  Scroll to zoom • Home to reset
                </div>
              </div>
            )}
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
          currentClass={engineRef.current.player.tankClass}
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
