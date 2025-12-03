import { useEffect, useRef } from 'react'
import type { GameEngine } from '@/lib/gameEngine'

interface GameCanvasProps {
  engine: GameEngine
}

export function GameCanvas({ engine }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, 800, 600)

      drawGrid(ctx)
      drawParticles(ctx, engine)
      drawLoot(ctx, engine)
      drawPlayer(ctx, engine)
      drawProjectiles(ctx, engine)
    }

    const animationFrame = requestAnimationFrame(function loop() {
      render()
      requestAnimationFrame(loop)
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [engine])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border-2 border-border rounded-lg max-w-full"
      style={{ touchAction: 'none' }}
    />
  )
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#2a2a3e'
  ctx.lineWidth = 1

  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 600)
    ctx.stroke()
  }

  for (let y = 0; y < 600; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(800, y)
    ctx.stroke()
  }
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
  if (engine.mobileInput.x !== 0 || engine.mobileInput.y !== 0) {
    angle = Math.atan2(engine.mobileInput.y, engine.mobileInput.x)
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
