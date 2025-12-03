import { useEffect, useRef } from 'react'
import type { GameEngine } from '@/lib/gameEngine'
import { useIsMobile } from '@/hooks/use-mobile'

interface GameCanvasProps {
  engine: GameEngine
}

export function GameCanvas({ engine }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const updateCanvasSize = () => {
      if (isMobile) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        engine.viewportWidth = window.innerWidth
        engine.viewportHeight = window.innerHeight
      } else {
        canvas.width = 800
        canvas.height = 600
        engine.viewportWidth = 800
        engine.viewportHeight = 600
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.translate(-engine.camera.x, -engine.camera.y)

      drawGrid(ctx, engine)
      drawParticles(ctx, engine)
      drawLoot(ctx, engine)
      drawPlayer(ctx, engine)
      drawProjectiles(ctx, engine)
      drawWorldBorder(ctx, engine)

      ctx.restore()
    }

    const animationFrame = requestAnimationFrame(function loop() {
      render()
      requestAnimationFrame(loop)
    })

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [engine, isMobile])

  return (
    <div ref={containerRef} className={isMobile ? 'w-full h-full' : 'w-full'}>
      <canvas
        ref={canvasRef}
        className={isMobile ? '' : 'border-2 border-border rounded-lg max-w-full'}
        style={{ touchAction: 'none', display: 'block' }}
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
