import { useEffect, useRef } from 'react'
import type { GameEngine } from '@/lib/gameEngine'
import { useIsMobile } from '@/hooks/use-mobile'

interface MinimapProps {
  engine: GameEngine
}

export function Minimap({ engine }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useIsMobile()
  
  const size = isMobile ? 120 : 150

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      // Clear
      ctx.fillStyle = 'rgba(26, 26, 40, 0.8)'
      ctx.fillRect(0, 0, size, size)

      // Border
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, size, size)

      // World boundary
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1
      ctx.strokeRect(2, 2, size - 4, size - 4)

      const scale = (size - 8) / engine.worldSize

      // Draw polygons
      for (const item of engine.loot) {
        if (item.type === 'box' && item.radius) {
          const x = 4 + item.position.x * scale
          const y = 4 + item.position.y * scale
          const r = Math.max(1, item.radius * scale * 0.8)

          let color = '#FFE869'
          if (item.radius < 20) {
            color = '#FFE869'
          } else if (item.radius < 30) {
            color = '#FC7677'
          } else if (item.radius < 45) {
            color = '#768DFC'
          } else {
            color = '#FFA500'
          }

          ctx.fillStyle = color
          ctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
      }

      // Draw player
      const playerX = 4 + engine.player.position.x * scale
      const playerY = 4 + engine.player.position.y * scale
      ctx.fillStyle = '#00B2E1'
      ctx.beginPath()
      ctx.arc(playerX, playerY, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw viewport rectangle
      const vpX = 4 + engine.camera.x * scale
      const vpY = 4 + engine.camera.y * scale
      const vpW = engine.viewportWidth * scale
      const vpH = engine.viewportHeight * scale
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 1
      ctx.strokeRect(vpX, vpY, vpW, vpH)
    }

    const interval = setInterval(render, 100)
    return () => clearInterval(interval)
  }, [engine, size, isMobile])

  return (
    <div className="absolute top-4 right-4 z-10">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border-2 border-border/50 rounded-md"
      />
    </div>
  )
}
