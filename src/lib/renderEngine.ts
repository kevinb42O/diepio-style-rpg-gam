import type { GameEngine } from './gameEngine'
import type { Vector2 } from './types'
import { TANK_CONFIGS, type BarrelConfig } from './tankConfigs'

export class RenderEngine {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private lastViewBounds = { left: 0, right: 0, top: 0, bottom: 0 }
  private offscreenCanvas: HTMLCanvasElement | null = null
  private offscreenCtx: CanvasRenderingContext2D | null = null

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

  render(engine: GameEngine) {
    this.clear()

    this.ctx.save()
    this.ctx.translate(-engine.camera.x, -engine.camera.y)

    this.drawGrid(engine)
    this.drawWorldBorder(engine)
    this.drawLoot(engine)
    this.drawProjectiles(engine)
    this.drawDrones(engine)
    this.drawParticles(engine)
    this.drawEnhancedParticles(engine)
    this.drawPlayer(engine)

    this.ctx.restore()
    
    // Draw screen effects (flash) after restoring context
    this.drawScreenEffects(engine)
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

    // Get tier-based color and glow
    const tierColors = {
      0: { fill: '#00B2E1', glow: null },
      1: { fill: '#00C4F5', glow: null },
      2: { fill: '#00D8FF', glow: 'rgba(0, 216, 255, 0.2)' },
      3: { fill: '#00EEFF', glow: 'rgba(0, 238, 255, 0.4)' }
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
      colors.glow
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
    glowColor?: string | null
  ) {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(rotation)

    // Draw glow effect if specified
    if (glowColor) {
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = glowColor
    }

    for (const barrel of barrelConfig) {
      this.drawBarrel(barrel, color, recoilOffset)
    }

    // Draw body based on shape
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
    
    this.ctx.fillStyle = color
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

  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
  }
}
