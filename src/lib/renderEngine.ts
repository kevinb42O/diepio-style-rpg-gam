import type { GameEngine } from './gameEngine'
import type { Vector2, BotPlayer } from './types'
import { TANK_CONFIGS, type BarrelConfig } from './tankConfigs'

export class RenderEngine {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private lastViewBounds = { left: 0, right: 0, top: 0, bottom: 0 }
  private offscreenCanvas: HTMLCanvasElement | null = null
  private offscreenCtx: CanvasRenderingContext2D | null = null
  private gradientCache: Map<string, CanvasGradient> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: false,
      willReadFrequently: false
    })
    if (!context) throw new Error('Failed to get 2D context')
    this.ctx = context
    
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'low'
  }

  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'low'
  }

  render(engine: GameEngine) {
    this.clear()

    this.ctx.save()
    this.ctx.translate(-engine.camera.x, -engine.camera.y)

    this.drawZonedBackground(engine)
    this.drawZoneBorders(engine)
    this.drawPOIs(engine)
    this.drawGrid(engine)
    this.drawWorldBorder(engine)
    this.drawLoot(engine)
    this.drawProjectiles(engine)
    this.drawBots(engine)
    this.drawDrones(engine)
    this.drawParticles(engine)
    this.drawEnhancedParticles(engine)
    this.drawPooledParticles(engine)
    this.drawPlayer(engine)

    this.ctx.restore()
    
    // Draw screen effects (flash) after restoring context
    this.drawScreenEffects(engine)
    this.drawZoneTransitionUI(engine)
  }

  private clear() {
    this.ctx.fillStyle = '#1a1a28'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private drawGrid(engine: GameEngine) {
    const gridSize = 100
    const startX = Math.floor(engine.camera.x / gridSize) * gridSize
    const startY = Math.floor(engine.camera.y / gridSize) * gridSize
    const endX = engine.camera.x + this.canvas.width
    const endY = engine.camera.y + this.canvas.height

    this.ctx.strokeStyle = '#252535'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()

    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.moveTo(x, engine.camera.y)
      this.ctx.lineTo(x, engine.camera.y + this.canvas.height)
    }

    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.moveTo(engine.camera.x, y)
      this.ctx.lineTo(engine.camera.x + this.canvas.width, y)
    }

    this.ctx.stroke()
  }

  private drawWorldBorder(engine: GameEngine) {
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 10
    this.ctx.strokeRect(0, 0, engine.worldSize, engine.worldSize)
  }

  private drawPlayer(engine: GameEngine) {
    const player = engine.player
    const tankConfig = TANK_CONFIGS[player.tankClass] || TANK_CONFIGS.basic

    let aimAngle: number
    if (engine.mobileShootDirection.x !== 0 || engine.mobileShootDirection.y !== 0) {
      aimAngle = Math.atan2(engine.mobileShootDirection.y, engine.mobileShootDirection.x)
    } else {
      aimAngle = Math.atan2(
        engine.mousePosition.y - player.position.y,
        engine.mousePosition.x - player.position.x
      )
    }

    // Calculate dynamic size
    const levelScale = 1 + (player.level - 1) * 0.012
    const statScale = 1 + (engine.upgradeManager.getStatPoints().maxHealth * 0.02)
    const finalRadius = player.radius * levelScale * statScale

    // Get tier-based color and glow (updated for 2026 visuals)
    const tierColors = {
      0: { fill: '#00B2E1', glow: null, shadowBlur: 0 },
      1: { fill: '#00C4F5', glow: 'rgba(0, 196, 245, 0.15)', shadowBlur: 10 },
      2: { fill: '#00D8FF', glow: 'rgba(0, 216, 255, 0.3)', shadowBlur: 15 },
      3: { fill: '#00EEFF', glow: 'rgba(0, 238, 255, 0.5)', shadowBlur: 25 }
    }
    const tier = tankConfig.tier || 0
    const colors = tierColors[tier as keyof typeof tierColors] || tierColors[0]

    // Apply invisibility
    if (player.invisibility > 0) {
      const maxAlpha = tankConfig.invisibility?.maxAlpha || 0.5
      this.ctx.globalAlpha = 1 - (player.invisibility * maxAlpha)
    }

    // Draw speed lines for fast tanks
    if (tankConfig.hasSpeedLines) {
      const speedMag = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y)
      if (speedMag > 100) {
        this.drawSpeedLines(player, aimAngle)
      }
    }

    // Draw drone orbit ring for drone classes
    if (tankConfig.isDroneClass) {
      this.drawDroneOrbitRing(player, finalRadius)
    }

    this.drawTank(
      player.position.x,
      player.position.y,
      colors.fill,
      tankConfig.barrels,
      aimAngle,
      finalRadius,
      engine.barrelRecoil,
      tankConfig.bodyShape || 'circle',
      tankConfig.bodySpikes,
      colors.glow,
      player.barrelRecoils
    )

    // Draw drones
    this.drawDrones(engine)

    this.drawMuzzleFlashes(engine)

    // Reset alpha
    this.ctx.globalAlpha = 1
  }

  drawTank(
    x: number,
    y: number,
    color: string,
    barrelConfig: BarrelConfig[],
    rotation: number = 0,
    bodyRadius: number = 15,
    recoilOffset: number = 0,
    bodyShape: 'circle' | 'square' | 'hexagon' | 'spikyHexagon' = 'circle',
    bodySpikes?: number,
    glowColor?: string | null,
    barrelRecoils?: number[]
  ) {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(rotation)

    // Draw glow effect if specified
    if (glowColor) {
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = glowColor
    }

    // Draw barrels with per-barrel recoil
    for (let i = 0; i < barrelConfig.length; i++) {
      const barrel = barrelConfig[i]
      const individualRecoil = barrelRecoils && barrelRecoils[i] !== undefined ? barrelRecoils[i] : recoilOffset
      this.drawBarrel(barrel, color, individualRecoil)
    }

    // Draw body based on shape with radial gradient
    this.ctx.beginPath()
    
    switch (bodyShape) {
      case 'square':
        this.ctx.rect(-bodyRadius, -bodyRadius, bodyRadius * 2, bodyRadius * 2)
        break
      
      case 'hexagon':
        this.drawPolygonPath(bodyRadius, 6)
        break
      
      case 'spikyHexagon':
        this.drawSpikyHexagonPath(bodyRadius, bodySpikes || 6)
        break
      
      case 'circle':
      default:
        this.ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2)
        break
    }
    
    // Create radial gradient for body
    const gradient = this.ctx.createRadialGradient(
      -bodyRadius * 0.3, -bodyRadius * 0.3, 0,
      0, 0, bodyRadius
    )
    
    // Parse base color and create gradient
    const baseColor = color
    const highlightColor = this.lightenColor(baseColor, 0.3)
    gradient.addColorStop(0, highlightColor)
    gradient.addColorStop(0.6, baseColor)
    gradient.addColorStop(1, this.darkenColor(baseColor, 0.2))
    
    this.ctx.fillStyle = gradient
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 3
    this.ctx.stroke()

    // Reset shadow
    this.ctx.shadowBlur = 0

    this.ctx.restore()
  }

  private drawPolygonPath(radius: number, sides: number) {
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.closePath()
  }

  private drawSpikyHexagonPath(radius: number, spikes: number) {
    const baseRadius = radius * 0.7
    const spikeLength = radius * 0.5
    
    for (let i = 0; i < spikes; i++) {
      const angle1 = (Math.PI * 2 * i) / spikes - Math.PI / 2
      const angle2 = (Math.PI * 2 * (i + 0.5)) / spikes - Math.PI / 2
      const angle3 = (Math.PI * 2 * (i + 1)) / spikes - Math.PI / 2
      
      const x1 = Math.cos(angle1) * baseRadius
      const y1 = Math.sin(angle1) * baseRadius
      const x2 = Math.cos(angle2) * (baseRadius + spikeLength)
      const y2 = Math.sin(angle2) * (baseRadius + spikeLength)
      const x3 = Math.cos(angle3) * baseRadius
      const y3 = Math.sin(angle3) * baseRadius
      
      if (i === 0) {
        this.ctx.moveTo(x1, y1)
      } else {
        this.ctx.lineTo(x1, y1)
      }
      this.ctx.lineTo(x2, y2)
      this.ctx.lineTo(x3, y3)
    }
    this.ctx.closePath()
  }

  private drawBarrel(barrel: BarrelConfig, color: string, recoilOffset: number = 0) {
    this.ctx.save()
    this.ctx.rotate((barrel.angle * Math.PI) / 180)

    const offsetX = (barrel.offsetX || 0) - recoilOffset
    const offsetY = barrel.offsetY || 0

    if (barrel.isTrapezoid) {
      this.ctx.beginPath()
      this.ctx.moveTo(offsetX, offsetY - barrel.width / 2)
      this.ctx.lineTo(offsetX + barrel.length, offsetY - barrel.width / 1.3)
      this.ctx.lineTo(offsetX + barrel.length, offsetY + barrel.width / 1.3)
      this.ctx.lineTo(offsetX, offsetY + barrel.width / 2)
      this.ctx.closePath()
    } else {
      this.ctx.beginPath()
      this.ctx.rect(
        offsetX,
        offsetY - barrel.width / 2,
        barrel.length,
        barrel.width
      )
    }

    this.ctx.fillStyle = color
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 3
    this.ctx.stroke()

    this.ctx.restore()
  }

  private drawLoot(engine: GameEngine) {
    this.lastViewBounds.left = engine.camera.x - 50
    this.lastViewBounds.right = engine.camera.x + this.canvas.width + 50
    this.lastViewBounds.top = engine.camera.y - 50
    this.lastViewBounds.bottom = engine.camera.y + this.canvas.height + 50

    const bounds = this.lastViewBounds

    for (const item of engine.loot) {
      if (item.position.x < bounds.left || item.position.x > bounds.right ||
          item.position.y < bounds.top || item.position.y > bounds.bottom) {
        continue
      }

      if ((item.type === 'box' || item.type === 'treasure' || item.type === 'boss') && item.health && item.radius) {
        // Handle spawn animation
        if (item.spawnAlpha !== undefined && item.spawnAlpha < 1) {
          item.spawnAlpha = Math.min(1, item.spawnAlpha + 0.02)
          this.ctx.globalAlpha = item.spawnAlpha
        }

        // Update rotation
        if (item.rotationAngle !== undefined) {
          item.rotationAngle += 0.01
        }

        const size = item.radius
        let sides = 4
        let color = '#FFE869'

        if (item.type === 'boss') {
          sides = 8
          color = '#FF0066'
        } else if (item.type === 'treasure') {
          sides = 6
          color = '#FFD700'
        } else if (size < 20) {
          sides = 4
          color = '#FFE869'
        } else if (size < 30) {
          sides = 3
          color = '#FC7677'
        } else if (size < 45) {
          sides = 5
          color = '#768DFC'
        } else {
          sides = 6
          color = '#FFA500'
        }

        this.drawPolygon(
          item.position.x,
          item.position.y,
          sides,
          color,
          size,
          item.rotationAngle || 0
        )

        this.ctx.globalAlpha = 1

        if (item.maxHealth && item.health < item.maxHealth * 0.99) {
          this.drawHealthBar(
            item.position.x,
            item.position.y - size - 10,
            size * 2,
            6,
            item.health / item.maxHealth
          )
        }
      } else if (item.type === 'xp') {
        this.ctx.beginPath()
        this.ctx.arc(item.position.x, item.position.y, 4, 0, Math.PI * 2)
        this.ctx.fillStyle = '#FFD700'
        this.ctx.fill()
      } else if (item.type === 'weapon' || item.type === 'armor') {
        const rarityColors = {
          common: '#9d9d9d',
          rare: '#0070dd',
          epic: '#a335ee',
          legendary: '#ff8000',
        }
        const color = rarityColors[item.rarity || 'common']

        this.ctx.beginPath()
        this.ctx.arc(item.position.x, item.position.y, 8, 0, Math.PI * 2)
        this.ctx.fillStyle = color
        this.ctx.fill()
      }
    }
  }

  drawPolygon(
    x: number,
    y: number,
    sides: number,
    color: string,
    size: number,
    rotation: number = 0
  ) {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(rotation)

    this.ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
      const px = Math.cos(angle) * size
      const py = Math.sin(angle) * size

      if (i === 0) {
        this.ctx.moveTo(px, py)
      } else {
        this.ctx.lineTo(px, py)
      }
    }
    this.ctx.closePath()

    this.ctx.fillStyle = color
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    this.ctx.restore()
  }

  private drawHealthBar(
    x: number,
    y: number,
    width: number,
    height: number,
    percentage: number
  ) {
    this.ctx.fillStyle = '#333333'
    this.ctx.fillRect(x - width / 2, y, width, height)

    this.ctx.fillStyle = '#00FF00'
    this.ctx.fillRect(x - width / 2, y, width * percentage, height)

    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(x - width / 2, y, width, height)
  }

  private drawProjectiles(engine: GameEngine) {
    const bounds = this.lastViewBounds

    for (const proj of engine.projectiles) {
      if (proj.position.x < bounds.left || proj.position.x > bounds.right ||
          proj.position.y < bounds.top || proj.position.y > bounds.bottom) {
        continue
      }

      this.ctx.beginPath()
      this.ctx.arc(proj.position.x, proj.position.y, proj.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = proj.isPlayerProjectile ? '#00B2E1' : '#FF0000'
      this.ctx.fill()
    }
  }

  private drawDrones(engine: GameEngine) {
    const bounds = this.lastViewBounds
    const drones = engine.droneSystem.getDrones()

    for (const drone of drones) {
      if (drone.position.x < bounds.left || drone.position.x > bounds.right ||
          drone.position.y < bounds.top || drone.position.y > bounds.bottom) {
        continue
      }

      this.ctx.save()
      this.ctx.translate(drone.position.x, drone.position.y)

      // Draw health bar if damaged
      if (drone.health < drone.maxHealth) {
        const barWidth = drone.radius * 2.5
        const barHeight = 3
        this.drawHealthBar(0, -drone.radius - 8, barWidth, barHeight, drone.health / drone.maxHealth)
      }

      // Determine drone color and shape based on type
      let droneColor = '#00B2E1'
      
      this.ctx.shadowBlur = 8
      this.ctx.shadowColor = droneColor

      this.ctx.beginPath()
      
      if (drone.droneType === 'triangle') {
        // Draw triangle
        const angle = Math.atan2(drone.velocity.y, drone.velocity.x)
        this.ctx.rotate(angle)
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 * i) / 3 - Math.PI / 2
          const x = Math.cos(a) * drone.radius
          const y = Math.sin(a) * drone.radius
          if (i === 0) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }
        this.ctx.closePath()
      } else if (drone.droneType === 'square') {
        // Draw square
        const size = drone.radius * 1.4
        this.ctx.rect(-size / 2, -size / 2, size, size)
      } else {
        // minion - draw as pentagon
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const x = Math.cos(a) * drone.radius
          const y = Math.sin(a) * drone.radius
          if (i === 0) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }
        this.ctx.closePath()
      }

      this.ctx.fillStyle = droneColor
      this.ctx.fill()
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      this.ctx.shadowBlur = 0
      this.ctx.restore()
    }
  }

  private drawParticles(engine: GameEngine) {
    const bounds = this.lastViewBounds

    for (const particle of engine.particles) {
      if (particle.position.x < bounds.left || particle.position.x > bounds.right ||
          particle.position.y < bounds.top || particle.position.y > bounds.bottom) {
        continue
      }

      this.ctx.globalAlpha = particle.alpha
      this.ctx.beginPath()
      this.ctx.arc(
        particle.position.x,
        particle.position.y,
        particle.size,
        0,
        Math.PI * 2
      )
      this.ctx.fillStyle = particle.color
      this.ctx.fill()
    }
    this.ctx.globalAlpha = 1
  }

  private drawMuzzleFlashes(engine: GameEngine) {
    for (const flash of engine.muzzleFlashes) {
      this.ctx.save()
      this.ctx.globalAlpha = flash.alpha
      this.ctx.translate(flash.position.x, flash.position.y)

      this.ctx.fillStyle = '#FFDD44'
      this.ctx.beginPath()
      this.ctx.arc(0, 0, flash.size, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.restore()
    }
  }

  private drawEnhancedParticles(engine: GameEngine) {
    const bounds = this.lastViewBounds
    const particles = engine.particleSystem.getParticles()

    for (const particle of particles) {
      if (particle.position.x < bounds.left || particle.position.x > bounds.right ||
          particle.position.y < bounds.top || particle.position.y > bounds.bottom) {
        continue
      }

      this.ctx.save()
      this.ctx.globalAlpha = particle.alpha

      if (particle.type === 'damage-number') {
        // Render damage numbers as text - use scale to store damage value
        const damageValue = Math.floor(particle.scale || 0)
        this.ctx.font = `bold ${particle.size}px sans-serif`
        this.ctx.fillStyle = particle.color
        this.ctx.strokeStyle = '#000000'
        this.ctx.lineWidth = 2
        this.ctx.textAlign = 'center'
        this.ctx.strokeText(damageValue.toString(), particle.position.x, particle.position.y)
        this.ctx.fillText(damageValue.toString(), particle.position.x, particle.position.y)
      } else {
        // Render regular particles
        if (particle.rotation) {
          this.ctx.translate(particle.position.x, particle.position.y)
          this.ctx.rotate(particle.rotation)
          this.ctx.translate(-particle.position.x, -particle.position.y)
        }

        this.ctx.beginPath()
        this.ctx.arc(
          particle.position.x,
          particle.position.y,
          particle.size * (particle.scale || 1),
          0,
          Math.PI * 2
        )
        this.ctx.fillStyle = particle.color
        this.ctx.fill()
      }

      this.ctx.restore()
    }
  }

  private drawScreenEffects(engine: GameEngine) {
    const flash = engine.screenEffects.getFlash()
    if (flash) {
      this.ctx.globalAlpha = flash.alpha
      this.ctx.fillStyle = flash.color
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.globalAlpha = 1
    }
  }

  private drawSpeedLines(player: any, aimAngle: number) {
    const lineCount = 5
    const lineLength = 30
    const lineSpacing = 15
    
    this.ctx.save()
    this.ctx.globalAlpha = 0.3
    this.ctx.strokeStyle = '#FFFFFF'
    this.ctx.lineWidth = 2
    
    for (let i = 0; i < lineCount; i++) {
      const dist = 40 + i * lineSpacing
      const x = player.position.x - Math.cos(aimAngle) * dist
      const y = player.position.y - Math.sin(aimAngle) * dist
      
      this.ctx.beginPath()
      this.ctx.moveTo(x, y)
      this.ctx.lineTo(x - Math.cos(aimAngle) * lineLength, y - Math.sin(aimAngle) * lineLength)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }

  private drawDroneOrbitRing(player: any, radius: number) {
    const orbitRadius = 80
    
    this.ctx.save()
    this.ctx.globalAlpha = 0.15
    this.ctx.strokeStyle = '#00D8FF'
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([5, 5])
    
    this.ctx.beginPath()
    this.ctx.arc(player.position.x, player.position.y, orbitRadius, 0, Math.PI * 2)
    this.ctx.stroke()
    
    this.ctx.setLineDash([])
    this.ctx.restore()
  }

  // Color manipulation helpers
  private lightenColor(color: string, amount: number): string {
    // Simple color lightening
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + Math.floor(255 * amount))
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + Math.floor(255 * amount))
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + Math.floor(255 * amount))
    return `rgb(${r}, ${g}, ${b})`
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - Math.floor(255 * amount))
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - Math.floor(255 * amount))
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - Math.floor(255 * amount))
    return `rgb(${r}, ${g}, ${b})`
  }

  // Zone rendering
  private drawZonedBackground(engine: GameEngine) {
    if (!engine.zoneSystem) return

    const worldCenter = engine.zoneSystem.getWorldCenter()
    const zones = engine.zoneSystem.getZones()

    // Draw zones from outside to inside
    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i]
      const gradient = this.ctx.createRadialGradient(
        worldCenter.x, worldCenter.y, zone.radiusMin,
        worldCenter.x, worldCenter.y, zone.radiusMax
      )
      gradient.addColorStop(0, zone.floorColorInner)
      gradient.addColorStop(1, zone.floorColorOuter)

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(worldCenter.x, worldCenter.y, zone.radiusMax, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  private drawZoneBorders(engine: GameEngine) {
    if (!engine.zoneSystem) return

    const worldCenter = engine.zoneSystem.getWorldCenter()
    const borders = engine.zoneSystem.getZoneBorders()

    for (const border of borders) {
      this.ctx.save()
      this.ctx.strokeStyle = border.color
      this.ctx.lineWidth = 3
      this.ctx.shadowBlur = 15
      this.ctx.shadowColor = border.color
      this.ctx.globalAlpha = 0.6

      this.ctx.beginPath()
      this.ctx.arc(worldCenter.x, worldCenter.y, border.radius, 0, Math.PI * 2)
      this.ctx.stroke()

      // Draw zone name
      this.ctx.shadowBlur = 0
      this.ctx.globalAlpha = 0.8
      this.ctx.fillStyle = border.color
      this.ctx.font = 'bold 20px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(border.name, worldCenter.x, worldCenter.y - border.radius - 20)

      this.ctx.restore()
    }
  }

  private drawPOIs(engine: GameEngine) {
    if (!engine.zoneSystem) return

    const zones = engine.zoneSystem.getZones()
    
    for (const zone of zones) {
      if (!zone.poi) continue
      const poi = zone.poi

      this.ctx.save()
      
      // Pulsing glow effect
      const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7
      this.ctx.shadowBlur = 30 * pulse
      
      if (poi.type === 'sanctuary') {
        this.ctx.shadowColor = '#00ff00'
        this.ctx.strokeStyle = '#00ff00'
      } else if (poi.type === 'arena') {
        this.ctx.shadowColor = '#ffaa00'
        this.ctx.strokeStyle = '#ffaa00'
      } else if (poi.type === 'nexus') {
        this.ctx.shadowColor = '#ff00ff'
        this.ctx.strokeStyle = '#ff00ff'
      }

      this.ctx.lineWidth = 4
      this.ctx.globalAlpha = 0.5
      this.ctx.beginPath()
      this.ctx.arc(poi.position.x, poi.position.y, poi.radius, 0, Math.PI * 2)
      this.ctx.stroke()

      // Draw POI name
      this.ctx.shadowBlur = 0
      this.ctx.globalAlpha = 1
      this.ctx.fillStyle = this.ctx.strokeStyle
      this.ctx.font = 'bold 18px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(poi.name, poi.position.x, poi.position.y - poi.radius - 15)

      this.ctx.restore()
    }
  }

  private drawBots(engine: GameEngine) {
    if (!engine.botAISystem) return

    const bots = engine.botAISystem.getBots()
    const bounds = this.lastViewBounds
    const teamSystem = engine.teamSystem

    for (const bot of bots) {
      if (bot.position.x < bounds.left || bot.position.x > bounds.right ||
          bot.position.y < bounds.top || bot.position.y > bounds.bottom) {
        continue
      }

      // Draw bot using same rendering as player
      const tankConfig = TANK_CONFIGS[bot.tankClass] || TANK_CONFIGS.basic

      // Calculate aim angle towards player
      const dx = engine.player.position.x - bot.position.x
      const dy = engine.player.position.y - bot.position.y
      const aimAngle = Math.atan2(dy, dx)

      // Calculate size
      const levelScale = 1 + (bot.level - 1) * 0.012
      const finalRadius = bot.radius * levelScale

      // Team-based colors with tier intensity
      const isAlly = teamSystem.areAllies(bot.team, engine.player.team)
      const tier = tankConfig.tier || 0
      
      // Base team colors
      const baseBlue = '#00B2E1'
      const baseRed = '#FF4444'
      
      // Tier-based brightness adjustment
      const tierBrightness = [1.0, 1.15, 1.3, 1.5][tier] || 1.0
      
      let fillColor: string
      let glowColor: string | null = null
      let shadowBlur = 0
      
      if (isAlly) {
        // Blue team colors (RGB: 0x00, 0xB2, 0xE1)
        const red = Math.min(255, Math.floor(0x00 * tierBrightness))
        const green = Math.min(255, Math.floor(0xB2 * tierBrightness))
        const blue = Math.min(255, Math.floor(0xE1 * tierBrightness))
        fillColor = `rgb(${red}, ${green}, ${blue})`
        
        if (tier > 0) {
          glowColor = `rgba(0, 178, 225, ${0.15 * tier})`
          shadowBlur = 10 + tier * 5
        }
      } else {
        // Red team colors
        const red = Math.min(255, Math.floor(0xFF * tierBrightness))
        const green = Math.min(255, Math.floor(0x44 * tierBrightness))
        const blue = Math.min(255, Math.floor(0x44 * tierBrightness))
        fillColor = `rgb(${red}, ${green}, ${blue})`
        
        if (tier > 0) {
          glowColor = `rgba(255, 68, 68, ${0.15 * tier})`
          shadowBlur = 10 + tier * 5
        }
      }

      this.drawTank(
        bot.position.x,
        bot.position.y,
        fillColor,
        tankConfig.barrels,
        aimAngle,
        finalRadius,
        0,
        tankConfig.bodyShape || 'circle',
        tankConfig.bodySpikes,
        glowColor,
        bot.barrelRecoils
      )

      // Draw bot name above tank
      if (bot.name) {
        this.ctx.save()
        this.ctx.font = '11px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'bottom'
        
        const NAME_OFFSET_WITH_HEALTHBAR = 25
        const NAME_OFFSET_WITHOUT_HEALTHBAR = 20
        const nameY = bot.position.y - finalRadius - (bot.health < bot.maxHealth ? NAME_OFFSET_WITH_HEALTHBAR : NAME_OFFSET_WITHOUT_HEALTHBAR)
        
        // Shadow for readability
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.ctx.fillText(bot.name, bot.position.x + 1, nameY + 1)
        
        // Name text in team color
        this.ctx.fillStyle = isAlly ? '#00B2E1' : '#FF4444'
        this.ctx.fillText(bot.name, bot.position.x, nameY)
        
        this.ctx.restore()
      }

      // Draw health bar
      if (bot.health < bot.maxHealth) {
        this.drawHealthBar(
          bot.position.x,
          bot.position.y - finalRadius - 15,
          finalRadius * 2.5,
          6,
          bot.health / bot.maxHealth
        )
      }
    }
  }

  private drawPooledParticles(engine: GameEngine) {
    if (!engine.particlePool) return

    const particles = engine.particlePool.getActiveParticles()
    const bounds = this.lastViewBounds

    for (const particle of particles) {
      if (particle.position.x < bounds.left || particle.position.x > bounds.right ||
          particle.position.y < bounds.top || particle.position.y > bounds.bottom) {
        continue
      }

      this.ctx.save()
      this.ctx.globalAlpha = particle.alpha
      this.ctx.translate(particle.position.x, particle.position.y)
      
      if (particle.rotation) {
        this.ctx.rotate(particle.rotation)
      }

      this.ctx.beginPath()
      this.ctx.arc(0, 0, particle.size * particle.scale, 0, Math.PI * 2)
      this.ctx.fillStyle = particle.color
      this.ctx.fill()

      this.ctx.restore()
    }
  }

  private drawZoneTransitionUI(engine: GameEngine) {
    if (!engine.zoneSystem) return

    const currentTime = Date.now()
    if (!engine.zoneSystem.shouldShowZoneWarning(currentTime)) return

    const zone = engine.zoneSystem.getZone(engine.player.position)
    
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(this.canvas.width / 2 - 200, 100, 400, 60)

    this.ctx.fillStyle = zone.id === 1 ? '#00ff00' : zone.id === 2 ? '#ffaa00' : '#ff0000'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(`Entering ${zone.name}`, this.canvas.width / 2, 135)
    this.ctx.restore()
  }
}
