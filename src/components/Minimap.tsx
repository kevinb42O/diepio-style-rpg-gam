import { useEffect, useRef } from 'react'
import type { GameEngine } from '@/lib/gameEngine'
import { useIsMobile } from '@/hooks/use-mobile'

interface MinimapProps {
  engine: GameEngine
}

export function Minimap({ engine }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useIsMobile()
  
  // Wider minimap for the new rectangular battlefield
  const width = isMobile ? 160 : 200
  const height = isMobile ? 120 : 150

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const bounds = engine.zoneSystem.getWorldBounds()
      const scaleX = (width - 8) / bounds.width
      const scaleY = (height - 8) / bounds.height

      // Clear with dark background
      ctx.fillStyle = 'rgba(20, 20, 35, 0.9)'
      ctx.fillRect(0, 0, width, height)

      // Draw lanes (subtle background)
      const lanes = engine.zoneSystem.lanes
      for (const lane of lanes) {
        const x1 = 4 + lane.startBlue.x * scaleX
        const x2 = 4 + lane.endRed.x * scaleX
        const y = 4 + lane.startBlue.y * scaleY
        const halfH = (lane.width / 2) * scaleY
        
        ctx.fillStyle = lane.laneType === 'combat' ? 'rgba(74, 61, 45, 0.3)' : 
                        lane.laneType === 'jungle' ? 'rgba(45, 74, 45, 0.3)' : 
                        'rgba(61, 61, 26, 0.3)'
        ctx.fillRect(x1, y - halfH, x2 - x1, halfH * 2)
      }
      
      // Draw lane labels on the left side
      ctx.font = `bold ${isMobile ? 7 : 9}px Arial`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      for (const lane of lanes) {
        const y = 4 + lane.startBlue.y * scaleY
        const label = lane.id === 'top' ? 'TOP' : lane.id === 'mid' ? 'MID' : 'BOT'
        ctx.fillText(label, 6, y)
      }

      // Draw team bases
      const bases = engine.zoneSystem.getTeamBasesArray()
      for (const base of bases) {
        const x = 4 + base.position.x * scaleX
        const y = 4 + base.position.y * scaleY
        const r = base.safeRadius * Math.min(scaleX, scaleY)
        
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = base.team === 'blue' ? 'rgba(0, 100, 200, 0.5)' : 'rgba(200, 50, 50, 0.5)'
        ctx.fill()
        ctx.strokeStyle = base.team === 'blue' ? '#00aaff' : '#ff4444'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Draw Nexus Territory (expanding area)
      const nexus = engine.zoneSystem.nexus
      const nexusX = 4 + nexus.position.x * scaleX
      const nexusY = 4 + nexus.position.y * scaleY
      
      // Draw territory radius if expanded
      if (nexus.territoryRadius > nexus.captureRadius) {
        const territoryR = nexus.territoryRadius * Math.min(scaleX, scaleY)
        ctx.beginPath()
        ctx.arc(nexusX, nexusY, territoryR, 0, Math.PI * 2)
        
        // Color based on controlling team
        if (nexus.controllingTeam === 'blue') {
          ctx.fillStyle = 'rgba(0, 170, 255, 0.15)'
          ctx.strokeStyle = '#00aaff'
        } else if (nexus.controllingTeam === 'red') {
          ctx.fillStyle = 'rgba(255, 68, 68, 0.15)'
          ctx.strokeStyle = '#ff4444'
        } else {
          ctx.fillStyle = 'rgba(150, 50, 200, 0.1)'
          ctx.strokeStyle = '#cc66ff'
        }
        ctx.fill()
        ctx.lineWidth = 1
        ctx.stroke()
      }
      
      // Draw capture zone (smaller inner circle)
      const captureR = nexus.captureRadius * Math.min(scaleX, scaleY)
      ctx.beginPath()
      ctx.arc(nexusX, nexusY, captureR, 0, Math.PI * 2)
      
      // Color based on control state
      if (nexus.controllingTeam === 'blue') {
        ctx.fillStyle = 'rgba(0, 170, 255, 0.4)'
        ctx.strokeStyle = '#00aaff'
      } else if (nexus.controllingTeam === 'red') {
        ctx.fillStyle = 'rgba(255, 68, 68, 0.4)'
        ctx.strokeStyle = '#ff4444'
      } else {
        ctx.fillStyle = 'rgba(150, 50, 200, 0.3)'
        ctx.strokeStyle = '#cc66ff'
      }
      ctx.fill()
      ctx.lineWidth = nexus.isContested ? 2 : 1
      ctx.stroke()

      // Draw control points
      const controlPoints = engine.zoneSystem.controlPoints
      for (const cp of controlPoints) {
        const x = 4 + cp.position.x * scaleX
        const y = 4 + cp.position.y * scaleY
        
        let color = '#888888' // Neutral
        if (cp.controllingTeam === 'blue') color = '#00aaff'
        else if (cp.controllingTeam === 'red') color = '#ff4444'
        
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Draw supply drops
      for (const drop of engine.zoneSystem.supplyDrops) {
        const x = 4 + drop.targetPosition.x * scaleX
        const y = 4 + drop.targetPosition.y * scaleY
        
        ctx.fillStyle = drop.isLanded ? '#ffcc00' : 'rgba(255, 200, 0, 0.5)'
        ctx.fillRect(x - 3, y - 3, 6, 6)
      }

      // Draw bots (team-colored)
      const bots = engine.botAISystem?.getBots() || []
      const teamSystem = engine.teamSystem
      
      for (const bot of bots) {
        const x = 4 + bot.position.x * scaleX
        const y = 4 + bot.position.y * scaleY
        
        const isAlly = teamSystem?.areAllies(bot.team, engine.player.team)
        
        ctx.fillStyle = isAlly ? '#00B2E1' : '#FF4444'
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw player (brighter to stand out)
      const playerX = 4 + engine.player.position.x * scaleX
      const playerY = 4 + engine.player.position.y * scaleY
      const playerColor = engine.player.team === 'blue' ? '#00B2E1' : '#FF4444'
      ctx.fillStyle = playerColor
      ctx.beginPath()
      ctx.arc(playerX, playerY, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw viewport rectangle
      const vpX = 4 + engine.camera.x * scaleX
      const vpY = 4 + engine.camera.y * scaleY
      const vpW = engine.viewportWidth * scaleX
      const vpH = engine.viewportHeight * scaleY
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(vpX, vpY, vpW, vpH)

      // Border
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, width, height)
    }

    const interval = setInterval(render, 100)
    return () => clearInterval(interval)
  }, [engine, width, height, isMobile])

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-border/50 rounded-md"
      />
    </div>
  )
}
