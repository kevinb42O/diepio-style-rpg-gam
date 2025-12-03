import { useEffect, useRef } from 'react'
import type { GameEngine } from '@/lib/gameEngine'
import { RenderEngine } from '@/lib/renderEngine'
import { UIManager } from '@/lib/uiManager'
import { useIsMobile } from '@/hooks/use-mobile'
import type { StatType } from '@/lib/upgradeSystem'

interface GameCanvasProps {
  engine: GameEngine
  showStatUI?: boolean
  onStatClick?: (stat: StatType) => void
}

export function GameCanvas({ engine, showStatUI = false, onStatClick }: GameCanvasProps) {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null)
  const uiCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderEngineRef = useRef<RenderEngine | null>(null)
  const uiManagerRef = useRef<UIManager | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const gameCanvas = gameCanvasRef.current
    const uiCanvas = uiCanvasRef.current
    const container = containerRef.current
    if (!gameCanvas || !uiCanvas || !container) return

    if (!renderEngineRef.current) {
      renderEngineRef.current = new RenderEngine(gameCanvas)
    }
    if (!uiManagerRef.current) {
      uiManagerRef.current = new UIManager(uiCanvas)
    }

    const renderEngine = renderEngineRef.current
    const uiManager = uiManagerRef.current

    const updateCanvasSize = () => {
      if (isMobile) {
        const width = window.innerWidth
        const height = window.innerHeight
        renderEngine.resize(width, height)
        uiManager.resize(width, height)
        engine.viewportWidth = width
        engine.viewportHeight = height
      } else {
        renderEngine.resize(800, 600)
        uiManager.resize(800, 600)
        engine.viewportWidth = 800
        engine.viewportHeight = 600
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = uiCanvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      uiManager.handleMouseMove(x, y)
    }

    const handleClick = (e: MouseEvent) => {
      if (!onStatClick) return
      const rect = uiCanvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      uiManager.handleClick(x, y, onStatClick)
    }

    uiCanvas.addEventListener('mousemove', handleMouseMove)
    uiCanvas.addEventListener('click', handleClick)

    let animationFrameId: number

    const render = () => {
      renderEngine.render(engine)
      
      uiManager.clear()
      if (showStatUI) {
        const availablePoints = engine.upgradeManager.getAvailableSkillPoints()
        if (availablePoints > 0) {
          const statPoints = engine.upgradeManager.getStatPoints()
          uiManager.drawStatUpgradeUI(statPoints, availablePoints, onStatClick)
        }
      }
      
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', updateCanvasSize)
      uiCanvas.removeEventListener('mousemove', handleMouseMove)
      uiCanvas.removeEventListener('click', handleClick)
    }
  }, [engine, isMobile, showStatUI, onStatClick])

  return (
    <div ref={containerRef} className={isMobile ? 'w-full h-full relative' : 'w-full relative'}>
      <canvas
        ref={gameCanvasRef}
        className={isMobile ? '' : 'border-2 border-border rounded-lg max-w-full'}
        style={{ touchAction: 'none', display: 'block' }}
      />
      <canvas
        ref={uiCanvasRef}
        className="absolute top-0 left-0 pointer-events-auto"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  ctx.strokeStyle = '#2a2a3e'
  ctx.lineWidth = 1

  const startX = Math.floor(engine.camera.x / 40) * 40
  const startY = Math.floor(engine.camera.y / 40) * 40
  const endX = engine.camera.x + engine.viewportWidth
  const endY = engine.camera.y + engine.viewportHeight

  for (let x = startX; x < endX; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, engine.camera.y)
    ctx.lineTo(x, endY)
    ctx.stroke()
  }

  for (let y = startY; y < endY; y += 40) {
    ctx.beginPath()
    ctx.moveTo(engine.camera.x, y)
    ctx.lineTo(endX, y)
    ctx.stroke()
  }
}

function drawWorldBorder(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 4
  ctx.strokeRect(0, 0, engine.worldSize, engine.worldSize)
  
  ctx.strokeStyle = '#ff444444'
  ctx.lineWidth = 20
  ctx.strokeRect(-10, -10, engine.worldSize + 20, engine.worldSize + 20)
}

function drawPlayer(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { player } = engine
  
  ctx.save()
  ctx.translate(player.position.x, player.position.y)

  ctx.fillStyle = '#4488ff'
  ctx.strokeStyle = '#6699ff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  let angle: number
  if (engine.mobileShootDirection.x !== 0 || engine.mobileShootDirection.y !== 0) {
    angle = Math.atan2(engine.mobileShootDirection.y, engine.mobileShootDirection.x)
  } else {
    angle = Math.atan2(
      engine.mousePosition.y - player.position.y,
      engine.mousePosition.x - player.position.x
    )
  }
  
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(angle) * (player.radius + 8), Math.sin(angle) * (player.radius + 8))
  ctx.stroke()

  ctx.restore()
}

function drawProjectiles(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const projectile of engine.projectiles) {
    ctx.fillStyle = projectile.isPlayerProjectile ? '#ffdd44' : '#ff4444'
    ctx.strokeStyle = projectile.isPlayerProjectile ? '#ffff88' : '#ff8888'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

function drawLoot(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const item of engine.loot) {
    if (item.type === 'xp') {
      ctx.fillStyle = '#44ff88'
      ctx.strokeStyle = '#88ffaa'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(item.position.x, item.position.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (item.type === 'box') {
      const radius = item.radius || 20
      
      ctx.save()
      ctx.translate(item.position.x, item.position.y)
      
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      gradient.addColorStop(0, '#ffcc66')
      gradient.addColorStop(0.6, '#cc8844')
      gradient.addColorStop(1, '#995522')
      
      ctx.fillStyle = gradient
      ctx.strokeStyle = '#ffdd88'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.rect(-radius, -radius, radius * 2, radius * 2)
      ctx.fill()
      ctx.stroke()
      
      ctx.strokeStyle = '#664422'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-radius * 0.7, -radius)
      ctx.lineTo(-radius * 0.7, radius)
      ctx.moveTo(radius * 0.7, -radius)
      ctx.lineTo(radius * 0.7, radius)
      ctx.moveTo(-radius, -radius * 0.5)
      ctx.lineTo(radius, -radius * 0.5)
      ctx.moveTo(-radius, radius * 0.5)
      ctx.lineTo(radius, radius * 0.5)
      ctx.stroke()
      
      if (item.health && item.maxHealth) {
        const healthBarWidth = radius * 2
        const healthPercentage = item.health / item.maxHealth
        
        ctx.fillStyle = '#222222'
        ctx.fillRect(-healthBarWidth / 2, -radius - 8, healthBarWidth, 4)
        
        ctx.fillStyle = '#ffaa44'
        ctx.fillRect(-healthBarWidth / 2, -radius - 8, healthBarWidth * healthPercentage, 4)
      }
      
      ctx.restore()
    } else {
      const colors = {
        common: '#9d9d9d',
        rare: '#0070dd',
        epic: '#a335ee',
        legendary: '#ff8000',
      }
      
      const color = colors[item.rarity!]
      
      ctx.save()
      ctx.translate(item.position.x, item.position.y)
      ctx.rotate(engine.gameTime / 500)
      
      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.rect(-8, -8, 16, 16)
      ctx.fill()
      ctx.stroke()
      
      ctx.restore()
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const particle of engine.particles) {
    ctx.globalAlpha = particle.alpha
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
