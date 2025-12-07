import type { GameEngine } from './gameEngine'
import type { Vector2, BotPlayer, Team, Player, Projectile } from './types'
import { TANK_CONFIGS, type BarrelConfig, type TankConfig } from './tankConfigs'
import { createPylonLinks } from './pylonSystem'

// Performance mode reduces visual effects for better FPS
let performanceMode = true // Default to performance mode for better FPS

export function setPerformanceMode(enabled: boolean) {
  performanceMode = enabled
}

export function getPerformanceMode(): boolean {
  return performanceMode
}

export class RenderEngine {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private lastViewBounds = { left: 0, right: 0, top: 0, bottom: 0 }
  private offscreenCanvas: HTMLCanvasElement | null = null
  private offscreenCtx: CanvasRenderingContext2D | null = null
  private gradientCache: Map<string, CanvasGradient> = new Map()
  private frameTime: number = 0 // Cached time for current frame

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

  // Get or create a cached gradient
  private getCachedGradient(key: string, createFn: () => CanvasGradient): CanvasGradient {
    let gradient = this.gradientCache.get(key)
    if (!gradient) {
      gradient = createFn()
      // Limit cache size to prevent memory issues
      if (this.gradientCache.size > 100) {
        // Clear oldest entries (simple approach - clear all and rebuild)
        this.gradientCache.clear()
      }
      this.gradientCache.set(key, gradient)
    }
    return gradient
  }

  // Clear gradient cache (call on resize or when colors change significantly)
  clearGradientCache() {
    this.gradientCache.clear()
  }

  render(engine: GameEngine) {
    // Cache frame time to avoid multiple Date.now() calls
    this.frameTime = Date.now() / 1000
    
    this.clear()

    this.ctx.save()
    
    // Apply zoom transformation
    // Scale from top-left, then translate camera position
    this.ctx.scale(engine.zoom, engine.zoom)
    this.ctx.translate(-engine.camera.x, -engine.camera.y)

    // NEW: Draw the epic battlefield
    this.drawBattlefieldBackground(engine)
    this.drawLanes(engine)
    this.drawTeamBases(engine)
    this.drawControlPoints(engine)
    this.drawNexus(engine)
    this.drawDynamicEvents(engine)
    this.drawSupplyDrops(engine)
    this.drawGrid(engine)
    this.drawWorldBorder(engine)
    this.drawLoot(engine)
    this.drawTraps(engine)
    this.drawPylons(engine)
    this.drawCataclysmFields(engine)
    this.drawProjectiles(engine)
    this.drawPylonBeams(engine)
    this.drawBots(engine)
    this.drawDrones(engine)
    this.drawOrbitalArray(engine)
    this.drawPhaseReticle(engine)
    this.drawAstralAnchors(engine)
    this.drawParticles(engine)
    this.drawEnhancedParticles(engine)
    this.drawPooledParticles(engine)
    this.drawIonTrails(engine)
    this.drawPlayer(engine)
    this.drawCatalystStacks(engine)

    this.ctx.restore()
    
    // Draw blood moon overlay if active
    this.drawBloodMoonOverlay(engine)
    
    // Draw screen effects (flash) after restoring context
    this.drawScreenEffects(engine)
    this.drawPredatorScopeOverlay(engine)
    // Event notifications now use toast system, not screen overlays
    // CONTROL bar removed for cleaner UI
    // this.drawControlPointHUD(engine)
  }
  
  private drawBloodMoonOverlay(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const bloodMoonEvent = engine.zoneSystem.activeEvents.find(e => e.type === 'blood_moon' && e.isActive)
    if (!bloodMoonEvent) return
    
    // Full screen red tint
    this.ctx.fillStyle = `rgba(100, 0, 0, ${0.15 * bloodMoonEvent.intensity})`
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Blood moon indicator in corner
    this.ctx.font = 'bold 16px Arial'
    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = `rgba(255, 100, 100, ${bloodMoonEvent.intensity})`
    this.ctx.fillText('🌑 BLOOD MOON ACTIVE', this.canvas.width - 20, 50)
    this.ctx.font = '12px Arial'
    this.ctx.fillStyle = `rgba(255, 150, 150, ${bloodMoonEvent.intensity * 0.8})`
    this.ctx.fillText('+30% DMG | 2x XP', this.canvas.width - 20, 68)
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
    const bounds = engine.zoneSystem.getWorldBounds()
    
    // Draw rectangular world border
    this.ctx.strokeStyle = '#2a2a4a'
    this.ctx.lineWidth = 15
    this.ctx.strokeRect(0, 0, bounds.width, bounds.height)
    
    // Outer glow
    this.ctx.shadowBlur = 20
    this.ctx.shadowColor = '#4a4a8a'
    this.ctx.strokeStyle = '#3a3a6a'
    this.ctx.lineWidth = 5
    this.ctx.strokeRect(0, 0, bounds.width, bounds.height)
    this.ctx.shadowBlur = 0
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

    // Calculate barrel scale factor based on player's actual radius vs base radius
    const baseRadius = 15
    const scaleFactor = player.radius / baseRadius

    // Get tier-based color and glow based on PLAYER'S TEAM
    const tier = tankConfig.tier || 0
    const isBlueTeam = player.team === 'blue'
    const isAdmin = player.name?.toUpperCase() === 'ADMIN'
    
    // Team-specific tier colors
    const blueTierColors = {
      0: { fill: '#00B2E1', glow: null, shadowBlur: 0 },
      1: { fill: '#00C4F5', glow: 'rgba(0, 196, 245, 0.15)', shadowBlur: 10 },
      2: { fill: '#00D8FF', glow: 'rgba(0, 216, 255, 0.3)', shadowBlur: 15 },
      3: { fill: '#00EEFF', glow: 'rgba(0, 238, 255, 0.5)', shadowBlur: 25 },
      4: { fill: '#66F7FF', glow: 'rgba(102, 247, 255, 0.6)', shadowBlur: 30 },
      5: { fill: '#A3FBFF', glow: 'rgba(163, 251, 255, 0.7)', shadowBlur: 35 },
      6: { fill: '#E0FFFF', glow: 'rgba(224, 255, 255, 0.85)', shadowBlur: 40 }
    }
    const redTierColors = {
      0: { fill: '#FF4444', glow: null, shadowBlur: 0 },
      1: { fill: '#FF5555', glow: 'rgba(255, 85, 85, 0.15)', shadowBlur: 10 },
      2: { fill: '#FF6666', glow: 'rgba(255, 102, 102, 0.3)', shadowBlur: 15 },
      3: { fill: '#FF7777', glow: 'rgba(255, 119, 119, 0.5)', shadowBlur: 25 },
      4: { fill: '#FF8888', glow: 'rgba(255, 136, 136, 0.6)', shadowBlur: 30 },
      5: { fill: '#FFB0B0', glow: 'rgba(255, 176, 176, 0.7)', shadowBlur: 35 },
      6: { fill: '#FFD6D6', glow: 'rgba(255, 214, 214, 0.85)', shadowBlur: 40 }
    }
    
    const tierColors = isBlueTeam ? blueTierColors : redTierColors
    let colors = tierColors[tier as keyof typeof tierColors] || tierColors[0]
    
    // ADMIN special skin: Gold body with team-colored glow for visibility
    if (isAdmin) {
      const teamGlow = isBlueTeam ? 'rgba(0, 178, 225, 0.6)' : 'rgba(255, 68, 68, 0.6)'
      colors = {
        fill: '#FFD700', // Gold
        glow: teamGlow,
        shadowBlur: 30
      }
    }

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
      this.drawDroneOrbitRing(player, player.radius)
    }

    this.drawTank(
      player.position.x,
      player.position.y,
      colors.fill,
      tankConfig.barrels,
      aimAngle,
      player.radius,
      engine.barrelRecoil,
      tankConfig.bodyShape || 'circle',
      tankConfig.bodySpikes,
      colors.glow,
      player.barrelRecoils,
      scaleFactor
    )

    if (player.tankClass === 'landmine') {
      this.drawLandmineBurrow(player)
    }

    if (player.tankClass === 'tempest') {
      const tempestState = engine.abilityState.tempest
      const rotation = tempestState?.spinAngle ?? (Date.now() / 600)
      const strength = tempestState?.spinVelocity ?? 0.3
      this.drawTempestAura(player.position, player.radius + 25, rotation, strength, player.team)
    }
    
    if (player.tankClass === 'doomsdayharbinger') {
      this.drawDoomsdayAura(player)
    }

    if (player.tankClass === 'gravemindregent') {
      this.drawGravemindAura(engine)
    }
    
    // Draw auto turrets if player has them
    if (tankConfig.autoTurrets) {
      this.drawAutoTurrets(engine, player.id, player.position.x, player.position.y, colors.fill, player.radius)
    }

    if (tankConfig.hasDecoy) {
      this.drawDecoy(engine, tankConfig)
    }

    if (engine.player.tankClass === 'aegisvanguard') {
      this.drawAegisShields(engine)
    }

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
    barrelRecoils?: number[],
    scaleFactor: number = 1
  ) {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(rotation)

    // Draw glow effect if specified (disabled in performance mode)
    if (glowColor && !performanceMode) {
      this.ctx.shadowBlur = 12 // Reduced from 20
      this.ctx.shadowColor = glowColor
    }

    // Draw barrels with per-barrel recoil and scaling
    for (let i = 0; i < barrelConfig.length; i++) {
      const barrel = barrelConfig[i]
      const individualRecoil = barrelRecoils && barrelRecoils[i] !== undefined ? barrelRecoils[i] : recoilOffset
      this.drawBarrel(barrel, color, individualRecoil, scaleFactor)
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
    
    // Use solid color in performance mode, gradient otherwise
    if (performanceMode) {
      this.ctx.fillStyle = color
    } else {
      // Create radial gradient for body (cached)
      const gradientKey = `tank_${color}_${Math.round(bodyRadius)}`
      const gradient = this.getCachedGradient(gradientKey, () => {
        const g = this.ctx.createRadialGradient(
          -bodyRadius * 0.3, -bodyRadius * 0.3, 0,
          0, 0, bodyRadius
        )
        const highlightColor = this.lightenColor(color, 0.3)
        g.addColorStop(0, highlightColor)
        g.addColorStop(0.6, color)
        g.addColorStop(1, this.darkenColor(color, 0.2))
        return g
      })
      this.ctx.fillStyle = gradient
    }
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

  private drawAutoTurrets(
    engine: GameEngine,
    ownerId: string,
    ownerX: number,
    ownerY: number,
    color: string,
    bodyRadius: number
  ) {
    const turrets = engine.autoTurretSystem.getTurretsForOwner(ownerId)
    if (!turrets || turrets.length === 0) return

    const strutColor = this.darkenColor(color, 0.25)

    for (const turret of turrets) {
      // Draw strut from hull to turret platform
      this.ctx.beginPath()
      this.ctx.moveTo(ownerX, ownerY)
      this.ctx.lineTo(turret.position.x, turret.position.y)
      this.ctx.strokeStyle = strutColor
      this.ctx.lineWidth = Math.max(2, bodyRadius * 0.12)
      this.ctx.stroke()

      this.ctx.save()
      this.ctx.translate(turret.position.x, turret.position.y)

      const baseRadius = Math.max(8, bodyRadius * 0.28)
      const darkerColor = this.darkenColor(color, 0.18)

      // Base disk
      const radial = this.ctx.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius)
      radial.addColorStop(0, this.lightenColor(color, 0.2))
      radial.addColorStop(1, darkerColor)
      this.ctx.beginPath()
      this.ctx.arc(0, 0, baseRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = radial
      this.ctx.fill()
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Barrel
      this.ctx.rotate(turret.rotation)
      const barrelLength = 26
      const barrelWidth = 9
      const recoilOffset = turret.barrelRecoil || 0

      this.ctx.beginPath()
      this.ctx.rect(
        -recoilOffset,
        -barrelWidth / 2,
        barrelLength,
        barrelWidth
      )
      this.ctx.fillStyle = this.lightenColor(color, 0.1)
      this.ctx.fill()
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Sensor eye
      this.ctx.beginPath()
      this.ctx.arc(barrelLength * 0.6 - recoilOffset, 0, barrelWidth * 0.2, 0, Math.PI * 2)
      this.ctx.fillStyle = '#fff'
      this.ctx.fill()

      this.ctx.restore()
    }
  }

  private drawBarrel(barrel: BarrelConfig, color: string, recoilOffset: number = 0, scaleFactor: number = 1) {
    this.ctx.save()
    this.ctx.rotate((barrel.angle * Math.PI) / 180)

    const offsetX = (barrel.offsetX || 0) * scaleFactor - recoilOffset
    const offsetY = (barrel.offsetY || 0) * scaleFactor
    const scaledWidth = barrel.width * scaleFactor
    const scaledLength = barrel.length * scaleFactor

    if (barrel.isTrapezoid) {
      this.ctx.beginPath()
      this.ctx.moveTo(offsetX, offsetY - scaledWidth / 2)
      this.ctx.lineTo(offsetX + scaledLength, offsetY - scaledWidth / 1.3)
      this.ctx.lineTo(offsetX + scaledLength, offsetY + scaledWidth / 1.3)
      this.ctx.lineTo(offsetX, offsetY + scaledWidth / 2)
      this.ctx.closePath()
    } else {
      this.ctx.beginPath()
      this.ctx.rect(
        offsetX,
        offsetY - scaledWidth / 2,
        scaledLength,
        scaledWidth
      )
    }

    this.ctx.fillStyle = color
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = Math.max(1, 3 * scaleFactor)
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
    const time = this.frameTime // Use cached frame time

    for (const proj of engine.projectiles) {
      if (proj.position.x < bounds.left || proj.position.x > bounds.right ||
          proj.position.y < bounds.top || proj.position.y > bounds.bottom) {
        continue
      }

      // Get base color from team
      let baseColor: string
      if (proj.team) {
        baseColor = engine.teamSystem.getTeamColor(proj.team)
      } else {
        baseColor = proj.isPlayerProjectile ? '#00B2E1' : '#FF0000'
      }

      // SKIMMER projectiles - large with trailing effect
      if (proj.specialTag === 'skimmer') {
        this.drawSkimmerProjectile(proj, baseColor, time)
        continue
      }
      
      // ROCKETEER missiles - with flame trail
      if (proj.specialTag === 'rocketeer') {
        this.drawRocketeerMissile(proj, baseColor, time)
        continue
      }
      
      if (proj.specialTag === 'autoturret') {
        this.drawAutoTurretTracer(proj, baseColor)
        continue
      }
      
      if (proj.specialTag === 'streamliner') {
        this.drawStreamlinerProjectile(proj, baseColor)
        continue
      }
      
      if (proj.specialTag === 'starfall') {
        this.drawStarfallCrescent(proj, baseColor)
        continue
      }
      
      // DESTROYER-LINE heavy projectiles
      if (proj.isHeavyProjectile) {
        this.drawHeavyProjectile(proj, baseColor)
        continue
      }

      // Standard projectile
      this.ctx.beginPath()
      this.ctx.arc(proj.position.x, proj.position.y, proj.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = baseColor
      this.ctx.fill()
    }
  }
  
  // Draw Skimmer's main projectile with glowing effect
  private drawSkimmerProjectile(proj: any, color: string, time: number) {
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x)
    
    this.ctx.save()
    this.ctx.translate(proj.position.x, proj.position.y)
    this.ctx.rotate(angle)
    
    // Outer glow (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 8 // Reduced from 15
      this.ctx.shadowColor = color
    }
    
    // Elongated body shape (missile-like)
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, proj.radius * 1.3, proj.radius * 0.8, 0, 0, Math.PI * 2)
    
    // Use solid color in performance mode
    if (performanceMode) {
      this.ctx.fillStyle = color
    } else {
      const gradient = this.ctx.createRadialGradient(
        -proj.radius * 0.3, 0, 0,
        0, 0, proj.radius * 1.3
      )
      gradient.addColorStop(0, '#FFFFFF')
      gradient.addColorStop(0.3, color)
      gradient.addColorStop(1, this.darkenColor(color, 0.3))
      this.ctx.fillStyle = gradient
    }
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Front point
    this.ctx.beginPath()
    this.ctx.moveTo(proj.radius * 1.3, 0)
    this.ctx.lineTo(proj.radius * 1.8, 0)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 3
    this.ctx.stroke()
    
    this.ctx.shadowBlur = 0
    this.ctx.restore()
  }
  
  // Draw Rocketeer's homing missile with flame effect
  private drawRocketeerMissile(proj: any, color: string, time: number) {
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x)
    
    this.ctx.save()
    this.ctx.translate(proj.position.x, proj.position.y)
    this.ctx.rotate(angle)
    
    // Draw flame trail behind missile
    const flameColors = ['#FF6600', '#FF9900', '#FFCC00', '#FFFF66']
    const flameLength = 3 + Math.sin(time * 20) * 1 // Flickering
    
    for (let i = 0; i < flameLength; i++) {
      const flameSize = proj.radius * (0.8 - i * 0.15)
      const offset = -proj.radius - i * 5
      const flicker = Math.sin(time * 30 + i * 2) * 2
      
      this.ctx.beginPath()
      this.ctx.arc(offset, flicker, flameSize, 0, Math.PI * 2)
      this.ctx.fillStyle = flameColors[i % flameColors.length]
      this.ctx.globalAlpha = 0.8 - i * 0.15
      this.ctx.fill()
    }
    
    this.ctx.globalAlpha = 1
    
    // Missile body glow (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 8 // Reduced from 12
      this.ctx.shadowColor = '#FF6600'
    }
    
    // Missile body - pointed shape
    this.ctx.beginPath()
    this.ctx.moveTo(proj.radius * 1.5, 0) // Nose
    this.ctx.lineTo(proj.radius * 0.3, -proj.radius * 0.6)
    this.ctx.lineTo(-proj.radius * 0.8, -proj.radius * 0.5)
    this.ctx.lineTo(-proj.radius, 0)
    this.ctx.lineTo(-proj.radius * 0.8, proj.radius * 0.5)
    this.ctx.lineTo(proj.radius * 0.3, proj.radius * 0.6)
    this.ctx.closePath()
    
    // Gradient fill
    const gradient = this.ctx.createLinearGradient(-proj.radius, 0, proj.radius, 0)
    gradient.addColorStop(0, '#444444')
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, '#FFFFFF')
    
    this.ctx.fillStyle = gradient
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Fins
    this.ctx.beginPath()
    this.ctx.moveTo(-proj.radius * 0.6, -proj.radius * 0.5)
    this.ctx.lineTo(-proj.radius * 1.1, -proj.radius * 0.9)
    this.ctx.lineTo(-proj.radius * 0.8, -proj.radius * 0.5)
    this.ctx.closePath()
    this.ctx.fillStyle = '#333333'
    this.ctx.fill()
    
    this.ctx.beginPath()
    this.ctx.moveTo(-proj.radius * 0.6, proj.radius * 0.5)
    this.ctx.lineTo(-proj.radius * 1.1, proj.radius * 0.9)
    this.ctx.lineTo(-proj.radius * 0.8, proj.radius * 0.5)
    this.ctx.closePath()
    this.ctx.fill()
    
    this.ctx.shadowBlur = 0
    this.ctx.restore()
  }
  
  // Draw heavy projectiles (Destroyer, Annihilator, Hybrid)
  private drawHeavyProjectile(proj: any, color: string) {
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x)
    
    this.ctx.save()
    this.ctx.translate(proj.position.x, proj.position.y)
    
    // Outer glow for impact feel (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 6 // Reduced from 10
      this.ctx.shadowColor = proj.trailColor || '#666666'
    }
    
    // Main body - slightly elongated circle
    this.ctx.beginPath()
    this.ctx.save()
    this.ctx.rotate(angle)
    this.ctx.scale(1.2, 1) // Slightly elongated
    this.ctx.arc(0, 0, proj.radius, 0, Math.PI * 2)
    this.ctx.restore()
    
    // Use solid color in performance mode
    if (performanceMode) {
      this.ctx.fillStyle = color
    } else {
      // Metallic gradient
      const gradient = this.ctx.createRadialGradient(
        -proj.radius * 0.3, -proj.radius * 0.3, 0,
        0, 0, proj.radius * 1.2
      )
      gradient.addColorStop(0, '#FFFFFF')
      gradient.addColorStop(0.2, this.lightenColor(color, 0.3))
      gradient.addColorStop(0.6, color)
      gradient.addColorStop(1, this.darkenColor(color, 0.4))
      this.ctx.fillStyle = gradient
    }
    this.ctx.fill()
    
    // Dark outline for weight
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 3
    this.ctx.stroke()
    
    this.ctx.shadowBlur = 0
    this.ctx.restore()
  }

  private drawLandmineBurrow(player: Player) {
    if (player.invisibility < 0.5) return
    
    const depthFactor = Math.min(1, player.invisibility)
    const baseRadius = player.radius * 1.5
    
    this.ctx.save()
    this.ctx.globalAlpha = 0.35 + depthFactor * 0.4
    this.ctx.fillStyle = 'rgba(45, 32, 24, 0.9)'
    this.ctx.beginPath()
    this.ctx.ellipse(
      player.position.x,
      player.position.y + player.radius * 0.35,
      baseRadius,
      baseRadius * 0.5,
      0,
      0,
      Math.PI * 2
    )
    this.ctx.fill()
    
    const gradient = this.ctx.createRadialGradient(
      player.position.x,
      player.position.y,
      player.radius * 0.2,
      player.position.x,
      player.position.y,
      player.radius * 1.2
    )
    gradient.addColorStop(0, 'rgba(90, 70, 50, 0.75)')
    gradient.addColorStop(1, 'rgba(60, 45, 30, 0)')
    this.ctx.globalAlpha = depthFactor * 0.6
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(player.position.x, player.position.y, player.radius * 1.1, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }

  private drawAutoTurretTracer(proj: any, color: string) {
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x)
    
    this.ctx.save()
    this.ctx.translate(proj.position.x, proj.position.y)
    this.ctx.rotate(angle)
    
    this.ctx.globalAlpha = 0.85
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(-proj.radius * 2.5, 0)
    this.ctx.lineTo(proj.radius * 1.8, 0)
    this.ctx.stroke()
    
    this.ctx.globalAlpha = 1
    this.ctx.fillStyle = '#ffffff'
    this.ctx.beginPath()
    this.ctx.arc(0, 0, proj.radius * 0.7, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }
  
  private drawStreamlinerProjectile(proj: any, color: string) {
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x)
    const pulse = (Math.sin(this.frameTime * 10 + (proj.meta?.streamlinerIndex || 0)) + 1) * 0.5
    
    this.ctx.save()
    this.ctx.translate(proj.position.x, proj.position.y)
    this.ctx.rotate(angle)
    
    const length = proj.radius * 4.5
    
    // Use solid color in performance mode
    if (performanceMode) {
      this.ctx.fillStyle = color
      this.ctx.globalAlpha = 0.8 + pulse * 0.2
      this.ctx.beginPath()
      this.ctx.rect(-length, -proj.radius * 0.45, length * 2, proj.radius * 0.9)
      this.ctx.fill()
    } else {
      const gradient = this.ctx.createLinearGradient(-length, 0, length, 0)
      gradient.addColorStop(0, 'rgba(255,255,255,0)')
      gradient.addColorStop(0.4, this.lightenColor(color, 0.3))
      gradient.addColorStop(0.6, color)
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      
      this.ctx.fillStyle = gradient
      this.ctx.globalAlpha = 0.8 + pulse * 0.2
      this.ctx.beginPath()
      this.ctx.rect(-length, -proj.radius * 0.45, length * 2, proj.radius * 0.9)
      this.ctx.fill()
    }
    
    this.ctx.globalAlpha = 1
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, proj.radius * 0.8, proj.radius * 0.6, 0, 0, Math.PI * 2)
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fill()
    
    this.ctx.restore()
  }

  private drawStarfallCrescent(proj: Projectile, color: string) {
    const meta = proj.meta as { starfallPhase?: number } | undefined
    const phase = typeof meta?.starfallPhase === 'number' ? meta.starfallPhase : 0
    const angle = Math.atan2(proj.velocity.y, proj.velocity.x)
    const radius = proj.radius * (1.3 + phase * 0.15)
    const innerRadius = Math.max(2, radius - (3 + phase * 1.5))
    const arcSpan = Math.PI * (0.65 + phase * 0.12)
    const glow = 0.4 + phase * 0.2

    this.ctx.save()
    this.ctx.translate(proj.position.x, proj.position.y)
    this.ctx.rotate(angle)

    const gradient = this.ctx.createLinearGradient(-radius, 0, radius, 0)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.2, this.lightenColor(color, 0.3))
    gradient.addColorStop(1, this.darkenColor(color, 0.35))

    this.ctx.shadowBlur = 15
    this.ctx.shadowColor = this.lightenColor(color, glow)
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(0, 0, radius, -arcSpan / 2, arcSpan / 2, false)
    this.ctx.arc(0, 0, innerRadius, arcSpan / 2, -arcSpan / 2, true)
    this.ctx.closePath()
    this.ctx.fill()

    this.ctx.shadowBlur = 0
    this.ctx.restore()
  }

  private drawDrones(engine: GameEngine) {
    const bounds = this.lastViewBounds
    const drones = engine.droneSystem.getDrones()
    const time = this.frameTime // Use cached frame time

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

      // Draw drone based on style
      const style = drone.droneStyle || 'overseer'
      const velocityAngle = Math.atan2(drone.velocity.y, drone.velocity.x)
      const hasVelocity = Math.abs(drone.velocity.x) > 0.1 || Math.abs(drone.velocity.y) > 0.1
      const angle = hasVelocity ? velocityAngle : (drone.aimAngle ?? velocityAngle)
      const pulsePhase = drone.pulsePhase || 0
      
      switch (style) {
        case 'overseer':
          this.drawOverseerDrone(drone, angle, time)
          break
        case 'necromancer':
          this.drawNecromancerDrone(drone, angle, time, pulsePhase)
          break
        case 'gravemind':
          this.drawGravemindDrone(drone, angle, time, pulsePhase)
          break
        case 'manager':
          this.drawManagerDrone(drone, angle, time, pulsePhase)
          break
        case 'factory':
          this.drawFactoryDrone(drone, angle, time)
          break
        case 'battleship':
          this.drawBattleshipDrone(drone, angle, time, pulsePhase)
          break
        case 'hybrid':
          this.drawHybridDrone(drone, angle, time, pulsePhase)
          break
        default:
          this.drawOverseerDrone(drone, angle, time)
      }

      this.ctx.restore()
    }
  }

  // OVERSEER: Classic sleek triangle drones - team colored, professional hunter look
  private drawOverseerDrone(drone: any, angle: number, time: number) {
    // Blue team: cyan/teal, Red team: coral/salmon
    const teamColor = drone.team === 'blue' ? '#00D4FF' : drone.team === 'red' ? '#FF6B6B' : '#888888'
    const glowColor = drone.team === 'blue' ? 'rgba(0, 212, 255, 0.5)' : 
                      drone.team === 'red' ? 'rgba(255, 107, 107, 0.5)' : 'rgba(136, 136, 136, 0.5)'
    
    this.ctx.rotate(angle)
    
    // Subtle glow (disabled in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 6 // Reduced from 10
      this.ctx.shadowColor = glowColor
    }
    
    // Sleek elongated triangle
    this.ctx.beginPath()
    this.ctx.moveTo(drone.radius * 1.4, 0)
    this.ctx.lineTo(-drone.radius * 0.7, -drone.radius * 0.65)
    this.ctx.lineTo(-drone.radius * 0.5, 0)
    this.ctx.lineTo(-drone.radius * 0.7, drone.radius * 0.65)
    this.ctx.closePath()
    
    this.ctx.fillStyle = teamColor
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Inner highlight line
    this.ctx.beginPath()
    this.ctx.moveTo(drone.radius * 0.8, 0)
    this.ctx.lineTo(-drone.radius * 0.2, 0)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = 1.5
    this.ctx.stroke()
    
    this.ctx.shadowBlur = 0
  }

  // NECROMANCER: Dark corrupted squares - dark ominous colors, pulsing
  private drawNecromancerDrone(drone: any, angle: number, time: number, pulsePhase: number) {
    // Necromancer drones have a dark, corrupted aesthetic
    // Blue team: deep violet/purple, Red team: dark crimson/maroon (no pink!)
    const basePurple = drone.team === 'blue' ? '#7B68EE' : drone.team === 'red' ? '#DC143C' : '#666666'
    const darkColor = drone.team === 'blue' ? '#483D8B' : drone.team === 'red' ? '#8B0000' : '#444444'
    const glowColor = drone.team === 'blue' ? 'rgba(123, 104, 238, 0.6)' : 
                      drone.team === 'red' ? 'rgba(220, 20, 60, 0.6)' : 'rgba(102, 102, 102, 0.6)'
    
    // Pulsing effect
    const pulse = Math.sin(time * 3 + pulsePhase) * 0.15 + 1
    const size = drone.radius * 1.4 * pulse
    
    // Rotate slowly for eerie effect
    this.ctx.rotate(time * 0.5 + pulsePhase)
    
    // Dark aura (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 8 // Reduced from 15
      this.ctx.shadowColor = glowColor
    }
    
    // Diamond shape with corrupted edges
    this.ctx.beginPath()
    this.ctx.moveTo(0, -size)
    this.ctx.lineTo(size * 0.9, 0)
    this.ctx.lineTo(0, size)
    this.ctx.lineTo(-size * 0.9, 0)
    this.ctx.closePath()
    
    // Use solid color in performance mode
    if (performanceMode) {
      this.ctx.fillStyle = basePurple
    } else {
      // Gradient fill for depth
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size)
      gradient.addColorStop(0, basePurple)
      gradient.addColorStop(1, darkColor)
      this.ctx.fillStyle = gradient
    }
    this.ctx.fill()
    
    this.ctx.strokeStyle = '#1a0a25'
    this.ctx.lineWidth = 2.5
    this.ctx.stroke()
    
    // Inner dark core
    this.ctx.beginPath()
    this.ctx.arc(0, 0, drone.radius * 0.3, 0, Math.PI * 2)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fill()
    
    this.ctx.shadowBlur = 0
  }

  private drawGravemindDrone(drone: any, angle: number, time: number, pulsePhase: number) {
    const baseColor = drone.team === 'blue' ? '#72f8c6' : drone.team === 'red' ? '#ffa1d6' : '#b7f7d9'
    const outline = drone.team === 'blue' ? '#1f5b43' : '#5b1f43'
    const glowColor = drone.team === 'blue' ? 'rgba(114, 248, 198, 0.55)' : 'rgba(255, 161, 214, 0.55)'
    const pulse = Math.sin(time * 4 + pulsePhase) * 0.12 + 1
    const size = drone.radius * 1.25 * pulse

    this.ctx.rotate(angle + time * 0.4)
    if (!performanceMode) {
      this.ctx.shadowBlur = 8
      this.ctx.shadowColor = glowColor
    }

    const gradient = performanceMode
      ? null
      : this.ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2)
    gradient?.addColorStop(0, baseColor)
    gradient?.addColorStop(1, this.lightenColor(baseColor, 0.2))

    this.ctx.fillStyle = gradient ?? baseColor
    this.ctx.beginPath()
    this.ctx.rect(-size / 2, -size / 2, size, size)
    this.ctx.fill()
    this.ctx.strokeStyle = outline
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.arc(0, 0, drone.radius * 0.35, 0, Math.PI * 2)
    this.ctx.fillStyle = 'rgba(20, 40, 35, 0.6)'
    this.ctx.fill()

    this.ctx.shadowBlur = 0
  }

  // MANAGER: Ghostly/stealthy triangles - semi-transparent, ethereal glow
  private drawManagerDrone(drone: any, angle: number, time: number, pulsePhase: number) {
    // Blue team: ethereal cyan, Red team: ethereal coral
    const baseColor = drone.team === 'blue' ? '#7FDBFF' : drone.team === 'red' ? '#FF8A8A' : '#AAAAAA'
    const glowColor = drone.team === 'blue' ? 'rgba(127, 219, 255, 0.4)' : 
                      drone.team === 'red' ? 'rgba(255, 138, 138, 0.4)' : 'rgba(170, 170, 170, 0.4)'
    
    // Ethereal fading effect
    const fade = Math.sin(time * 2 + pulsePhase) * 0.2 + 0.7
    
    this.ctx.rotate(angle)
    this.ctx.globalAlpha = fade
    
    // Soft ghostly glow (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 10 // Reduced from 20
      this.ctx.shadowColor = glowColor
    }
    
    // Slim, sharp triangle
    this.ctx.beginPath()
    this.ctx.moveTo(drone.radius * 1.5, 0)
    this.ctx.lineTo(-drone.radius * 0.6, -drone.radius * 0.5)
    this.ctx.lineTo(-drone.radius * 0.3, 0)
    this.ctx.lineTo(-drone.radius * 0.6, drone.radius * 0.5)
    this.ctx.closePath()
    
    this.ctx.fillStyle = baseColor
    this.ctx.fill()
    
    // Thin elegant border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.lineWidth = 1.5
    this.ctx.stroke()
    
    // Ghost trail effect (skip in performance mode)
    if (!performanceMode) {
      this.ctx.globalAlpha = fade * 0.3
      for (let i = 1; i <= 2; i++) {
        this.ctx.save()
        this.ctx.translate(-drone.velocity.x * 0.02 * i, -drone.velocity.y * 0.02 * i)
        this.ctx.scale(1 - i * 0.1, 1 - i * 0.1)
        this.ctx.beginPath()
        this.ctx.moveTo(drone.radius * 1.5, 0)
        this.ctx.lineTo(-drone.radius * 0.6, -drone.radius * 0.5)
        this.ctx.lineTo(-drone.radius * 0.3, 0)
        this.ctx.lineTo(-drone.radius * 0.6, drone.radius * 0.5)
        this.ctx.closePath()
        this.ctx.fillStyle = baseColor
        this.ctx.fill()
        this.ctx.restore()
      }
    }
    
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
  }

  // FACTORY: Mini-tanks with barrels - industrial look, heavy/armored
  private drawFactoryDrone(drone: any, angle: number, time: number) {
    const bodyColor = drone.team === 'blue' ? '#4A90D9' : drone.team === 'red' ? '#D94A4A' : '#777777'
    const darkColor = drone.team === 'blue' ? '#2E5A8A' : drone.team === 'red' ? '#8A2E2E' : '#555555'
    const glowColor = drone.team === 'blue' ? 'rgba(74, 144, 217, 0.4)' : 
                      drone.team === 'red' ? 'rgba(217, 74, 74, 0.4)' : 'rgba(119, 119, 119, 0.4)'
    
    this.ctx.rotate(angle)
    
    // Industrial glow (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 5 // Reduced from 8
      this.ctx.shadowColor = glowColor
    }
    
    // Heavy barrel (drawn first, behind body)
    const barrelWidth = drone.radius * 0.8
    const barrelLength = drone.radius * 1.4
    
    this.ctx.fillStyle = '#555555'
    this.ctx.strokeStyle = '#333333'
    this.ctx.lineWidth = 2
    this.ctx.fillRect(drone.radius * 0.2, -barrelWidth / 2, barrelLength, barrelWidth)
    this.ctx.strokeRect(drone.radius * 0.2, -barrelWidth / 2, barrelLength, barrelWidth)
    
    // Barrel muzzle detail
    this.ctx.fillStyle = '#444444'
    this.ctx.fillRect(drone.radius * 0.2 + barrelLength - 4, -barrelWidth / 2 - 1, 4, barrelWidth + 2)
    
    // Armored circular body
    this.ctx.beginPath()
    this.ctx.arc(0, 0, drone.radius, 0, Math.PI * 2)
    
    // Use solid color in performance mode
    if (performanceMode) {
      this.ctx.fillStyle = bodyColor
    } else {
      // Gradient for 3D effect
      const bodyGradient = this.ctx.createRadialGradient(-drone.radius * 0.3, -drone.radius * 0.3, 0, 0, 0, drone.radius)
      bodyGradient.addColorStop(0, bodyColor)
      bodyGradient.addColorStop(1, darkColor)
      this.ctx.fillStyle = bodyGradient
    }
    this.ctx.fill()
    
    this.ctx.strokeStyle = '#222222'
    this.ctx.lineWidth = 3
    this.ctx.stroke()
    
    // Armor plating detail (inner circle)
    this.ctx.beginPath()
    this.ctx.arc(0, 0, drone.radius * 0.6, 0, Math.PI * 2)
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.lineWidth = 1.5
    this.ctx.stroke()
    
    this.ctx.shadowBlur = 0
  }

  // BATTLESHIP: Tiny swarm drones - small, fast, numerous with trail effect
  private drawBattleshipDrone(drone: any, angle: number, time: number, pulsePhase: number) {
    const baseColor = drone.team === 'blue' ? '#00E5FF' : drone.team === 'red' ? '#FF5252' : '#999999'
    const trailColor = drone.team === 'blue' ? 'rgba(0, 229, 255, 0.3)' : 
                       drone.team === 'red' ? 'rgba(255, 82, 82, 0.3)' : 'rgba(153, 153, 153, 0.3)'
    
    // Swarm flutter effect
    const flutter = Math.sin(time * 8 + pulsePhase) * 0.1
    
    this.ctx.rotate(angle + flutter)
    
    // Speed trail (skip in performance mode)
    if (!performanceMode) {
      const speed = Math.sqrt(drone.velocity.x * drone.velocity.x + drone.velocity.y * drone.velocity.y)
      if (speed > 50) {
        this.ctx.fillStyle = trailColor
        this.ctx.beginPath()
        this.ctx.moveTo(-drone.radius * 0.5, 0)
        this.ctx.lineTo(-drone.radius * 2, -drone.radius * 0.3)
        this.ctx.lineTo(-drone.radius * 2, drone.radius * 0.3)
        this.ctx.closePath()
        this.ctx.fill()
      }
    }
    
    // Sharp small triangle (reduced glow in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 4 // Reduced from 6
      this.ctx.shadowColor = baseColor
    }
    
    this.ctx.beginPath()
    this.ctx.moveTo(drone.radius * 1.2, 0)
    this.ctx.lineTo(-drone.radius * 0.5, -drone.radius * 0.6)
    this.ctx.lineTo(-drone.radius * 0.5, drone.radius * 0.6)
    this.ctx.closePath()
    
    this.ctx.fillStyle = baseColor
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 1.5
    this.ctx.stroke()
    
    this.ctx.shadowBlur = 0
  }

  // HYBRID: Aggressive powerful triangles - energetic with accent trails
  private drawHybridDrone(drone: any, angle: number, time: number, pulsePhase: number) {
    // Hybrid drones have an aggressive, powerful look
    // Blue team: electric blue with cyan energy, Red team: fiery orange-red with yellow flames
    const baseColor = drone.team === 'blue' ? '#00BFFF' : drone.team === 'red' ? '#FF4500' : '#888888'
    const accentColor = drone.team === 'blue' ? '#00FFFF' : drone.team === 'red' ? '#FFD700' : '#FFAA00'
    const glowColor = drone.team === 'blue' ? 'rgba(0, 191, 255, 0.5)' : 
                      drone.team === 'red' ? 'rgba(255, 69, 0, 0.6)' : 'rgba(136, 136, 136, 0.5)'
    
    // Aggressive pulsing
    const pulse = Math.sin(time * 5 + pulsePhase) * 0.1 + 1
    
    this.ctx.rotate(angle)
    
    // Energy glow (reduced in performance mode)
    if (!performanceMode) {
      this.ctx.shadowBlur = 8 // Reduced from 15
      this.ctx.shadowColor = glowColor
    }
    
    // Energy trail effect (skip in performance mode)
    if (!performanceMode) {
      const speed = Math.sqrt(drone.velocity.x * drone.velocity.x + drone.velocity.y * drone.velocity.y)
      if (speed > 30) {
        // Energy particles - team colored
        for (let i = 0; i < 3; i++) {
          const flicker = Math.sin(time * 10 + i * 2 + pulsePhase) * 3
          this.ctx.beginPath()
          this.ctx.arc(-drone.radius * (1 + i * 0.4), flicker, drone.radius * 0.3 * (1 - i * 0.2), 0, Math.PI * 2)
          // Blue team: cyan energy trail, Red team: orange/yellow fire trail
          if (drone.team === 'blue') {
            this.ctx.fillStyle = i === 0 ? accentColor : `rgba(0, ${255 - i * 40}, 255, ${0.6 - i * 0.2})`
          } else {
            this.ctx.fillStyle = i === 0 ? accentColor : `rgba(255, ${140 - i * 30}, 0, ${0.6 - i * 0.2})`
          }
          this.ctx.fill()
        }
      }
    }
    
    // Aggressive pointed triangle
    this.ctx.beginPath()
    this.ctx.moveTo(drone.radius * 1.5 * pulse, 0)
    this.ctx.lineTo(-drone.radius * 0.6, -drone.radius * 0.7)
    this.ctx.lineTo(-drone.radius * 0.4, 0)
    this.ctx.lineTo(-drone.radius * 0.6, drone.radius * 0.7)
    this.ctx.closePath()
    
    // Use solid color in performance mode
    if (performanceMode) {
      this.ctx.fillStyle = baseColor
    } else {
      // Gradient from base to accent
      const gradient = this.ctx.createLinearGradient(-drone.radius, 0, drone.radius * 1.5, 0)
      gradient.addColorStop(0, accentColor)
      gradient.addColorStop(0.5, baseColor)
      gradient.addColorStop(1, baseColor)
      this.ctx.fillStyle = gradient
    }
    this.ctx.fill()
    
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Energy core - team colored
    this.ctx.beginPath()
    this.ctx.arc(drone.radius * 0.2, 0, drone.radius * 0.25, 0, Math.PI * 2)
    this.ctx.fillStyle = drone.team === 'blue' ? 'rgba(200, 255, 255, 0.7)' : 'rgba(255, 255, 200, 0.7)'
    this.ctx.fill()
    
    this.ctx.shadowBlur = 0
  }

  private drawTraps(engine: GameEngine) {
    const bounds = this.lastViewBounds
    const traps = engine.trapSystem.getTraps()

    for (const trap of traps) {
      if (trap.position.x < bounds.left || trap.position.x > bounds.right ||
          trap.position.y < bounds.top || trap.position.y > bounds.bottom) {
        continue
      }

      this.ctx.save()
      this.ctx.translate(trap.position.x, trap.position.y)
      this.ctx.rotate(trap.rotation)

      // Draw health bar if damaged
      if (trap.health < trap.maxHealth) {
        const barWidth = trap.size * 2.5
        const barHeight = 3
        this.drawHealthBar(0, -trap.size - 8, barWidth, barHeight, trap.health / trap.maxHealth)
      }

      // Draw deployed trap shape
      const trapColor = engine.teamSystem.getTeamColor(trap.team)
      const sides = trap.isStationary ? 6 : 5
      const radius = trap.size
      
      this.ctx.shadowBlur = trap.isStationary ? 10 : 5
      this.ctx.shadowColor = trapColor

      this.ctx.beginPath()
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

      this.ctx.fillStyle = trapColor
      this.ctx.fill()
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 3
      this.ctx.stroke()

      if (trap.isStationary) {
        this.ctx.beginPath()
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
          const x = Math.cos(angle) * radius * 0.6
          const y = Math.sin(angle) * radius * 0.6
          if (i === 0) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }
        this.ctx.closePath()
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
      }

      this.ctx.shadowBlur = 0
      this.ctx.restore()
    }
  }

  private drawOrbitalArray(engine: GameEngine) {
    const orbitalState = engine.abilityState.orbitalArray
    if (!orbitalState?.nodes?.length) return
    this.ctx.save()
    this.ctx.shadowBlur = 12
    this.ctx.shadowColor = engine.player.team === 'blue' ? 'rgba(110, 220, 255, 0.8)' : 'rgba(255, 140, 180, 0.8)'
    this.ctx.fillStyle = engine.player.team === 'blue' ? 'rgba(110, 220, 255, 0.9)' : 'rgba(255, 140, 180, 0.9)'
    for (const node of orbitalState.nodes) {
      this.ctx.beginPath()
      this.ctx.arc(node.x, node.y, 6, 0, Math.PI * 2)
      this.ctx.fill()
    }
    this.ctx.shadowBlur = 0
    this.ctx.restore()
  }

  private drawPhaseReticle(engine: GameEngine) {
    if (engine.player.tankClass !== 'phasesentinel') return
    const state = engine.abilityState.phaseSentinel
    if (!state) return
    const charge = state.charge ?? 0
    const dirX = engine.mousePosition.x - engine.player.position.x
    const dirY = engine.mousePosition.y - engine.player.position.y
    const angle = Math.atan2(dirY, dirX)
    const railMultiplier = engine.player.synergy.modifiers['phaseRailMultiplier'] ?? 1.2
    const length = 300 * railMultiplier

    this.ctx.save()
    this.ctx.strokeStyle = `rgba(214, 225, 255, ${0.25 + charge * 0.6})`
    this.ctx.lineWidth = 3
    this.ctx.setLineDash([8, 6])
    this.ctx.beginPath()
    this.ctx.moveTo(engine.player.position.x, engine.player.position.y)
    this.ctx.lineTo(
      engine.player.position.x + Math.cos(angle) * length,
      engine.player.position.y + Math.sin(angle) * length
    )
    this.ctx.stroke()
    this.ctx.setLineDash([])
    this.ctx.restore()
  }

  private drawAstralAnchors(engine: GameEngine) {
    const state = engine.abilityState.astralRegent
    if (!state?.anchors?.length) return
    this.ctx.save()
    const player = engine.player
    for (const anchor of state.anchors) {
      const alpha = Math.max(0, anchor.life / 8)
      const radius = 18 + (1 - alpha) * 12
      const gradient = this.ctx.createRadialGradient(
        anchor.position.x,
        anchor.position.y,
        0,
        anchor.position.x,
        anchor.position.y,
        radius
      )
      gradient.addColorStop(0, `rgba(240,244,255,${alpha})`)
      gradient.addColorStop(1, 'rgba(118,184,255,0)')
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(anchor.position.x, anchor.position.y, radius, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.strokeStyle = `rgba(177,208,255,${alpha})`
      this.ctx.lineWidth = 2
      this.ctx.arc(anchor.position.x, anchor.position.y, radius, 0, Math.PI * 2)
      this.ctx.stroke()

      this.ctx.setLineDash([8, 10])
      this.ctx.strokeStyle = `rgba(177,208,255,${alpha * 0.8})`
      this.ctx.beginPath()
      this.ctx.moveTo(anchor.position.x, anchor.position.y)
      this.ctx.lineTo(player.position.x, player.position.y)
      this.ctx.stroke()
      this.ctx.setLineDash([])
    }
    this.ctx.restore()
  }

  private drawIonTrails(engine: GameEngine) {
    const nodes = engine.abilityState.ionTrail
    if (!nodes?.length) return
    const bounds = this.lastViewBounds
    this.ctx.save()
    this.ctx.globalCompositeOperation = 'lighter'
    for (const node of nodes) {
      const { x, y } = node.position
      const radius = node.radius
      if (
        x + radius < bounds.left ||
        x - radius > bounds.right ||
        y + radius < bounds.top ||
        y - radius > bounds.bottom
      ) {
        continue
      }
      const alpha = Math.max(0, Math.min(1, node.life))
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(178, 245, 255, ${alpha})`)
      gradient.addColorStop(0.6, `rgba(110, 200, 255, ${alpha * 0.6})`)
      gradient.addColorStop(1, 'rgba(64, 108, 255, 0)')
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(x, y, radius, 0, Math.PI * 2)
      this.ctx.fill()
    }
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.restore()
  }

  private drawPylons(engine: GameEngine) {
    if (!engine.pylonSystem) return
    const pylons = engine.pylonSystem.getPylons()
    if (!pylons.length) return

    const bounds = this.lastViewBounds
    const time = Date.now()

    for (const pylon of pylons) {
      if (
        pylon.position.x < bounds.left || pylon.position.x > bounds.right ||
        pylon.position.y < bounds.top || pylon.position.y > bounds.bottom
      ) {
        continue
      }

      const color = engine.teamSystem.getTeamColor(pylon.team)
      const pulse = 0.85 + Math.sin(time / 250 + pylon.position.x * 0.01) * 0.15

      this.ctx.save()
      this.ctx.translate(pylon.position.x, pylon.position.y)
      this.ctx.rotate((time / 800 + pylon.position.y * 0.0005) % (Math.PI * 2))
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = color

      const outerRadius = pylon.radius * 0.9
      this.ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6
        const x = Math.cos(angle) * outerRadius * pulse
        const y = Math.sin(angle) * outerRadius * 0.8
        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.closePath()

      const gradient = this.ctx.createRadialGradient(0, 0, 4, 0, 0, outerRadius)
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.5, color)
      gradient.addColorStop(1, this.darkenColor(color, 0.2))

      this.ctx.fillStyle = gradient
      this.ctx.fill()
      this.ctx.strokeStyle = '#111111'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      if (pylon.health < pylon.maxHealth) {
        const ratio = pylon.health / pylon.maxHealth
        this.drawHealthBar(0, -outerRadius - 10, outerRadius * 1.8, 4, ratio)
      }

      this.ctx.shadowBlur = 0
      this.ctx.restore()
    }
  }

  private drawCataclysmFields(engine: GameEngine) {
    const fields = engine.abilityState.cataclysmFields
    if (!fields?.length) return
    const bounds = this.lastViewBounds

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'lighter'

    for (const field of fields) {
      if (field.life <= 0) continue
      const { x, y } = field.position
      const radius = field.radius
      if (
        x + radius < bounds.left ||
        x - radius > bounds.right ||
        y + radius < bounds.top ||
        y - radius > bounds.bottom
      ) {
        continue
      }
      const alpha = Math.min(0.65, Math.max(0.15, field.life / 4))
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(255, 210, 150, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(255, 150, 90, ${alpha * 0.7})`)
      gradient.addColorStop(1, 'rgba(60, 20, 0, 0)')

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(x, y, radius, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.setLineDash([8, 10])
      this.ctx.lineWidth = 2
      this.ctx.strokeStyle = `rgba(255, 104, 68, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(x, y, radius * (0.65 + 0.05 * Math.sin(this.frameTime * 5 + x * 0.01)), 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.setLineDash([])
    }

    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.restore()
  }

  private drawPylonBeams(engine: GameEngine) {
    if (!engine.pylonSystem) return
    const owners = engine.pylonSystem.getOwners()
    if (!owners.length) return

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'lighter'

    for (const ownerId of owners) {
      const owner = ownerId === engine.player.id
        ? engine.player
        : engine.botAISystem.getBotById(ownerId)

      if (!owner) continue

      const pylons = engine.pylonSystem.getPylonsForOwner(ownerId)
      if (pylons.length < 2) continue

      const links = createPylonLinks(pylons)
      if (!links.length) continue

      const bulletPen = owner.bulletPenetration
      const extension = 30 + bulletPen * 8
      const beamWidth = Math.min(20, 6 + bulletPen * 0.4) // Cap beam width at 20 pixels
      const beamColor = owner.team === 'blue' ? 'rgba(123, 224, 255, 0.9)' : 'rgba(255, 157, 123, 0.9)'
      const beamColorFade = owner.team === 'blue' ? 'rgba(123, 224, 255, 0)' : 'rgba(255, 157, 123, 0)'

      for (const link of links) {
        const beam = this.extendBeamForRender(link.start, link.end, extension)
        
        // Skip if coordinates are invalid
        if (!isFinite(beam.start.x) || !isFinite(beam.start.y) || 
            !isFinite(beam.end.x) || !isFinite(beam.end.y)) {
          continue
        }
        
        this.ctx.shadowColor = beamColor
        this.ctx.shadowBlur = 25
        this.ctx.lineWidth = beamWidth

        const gradient = this.ctx.createLinearGradient(beam.start.x, beam.start.y, beam.end.x, beam.end.y)
        gradient.addColorStop(0, beamColorFade)
        gradient.addColorStop(0.15, beamColor)
        gradient.addColorStop(0.85, beamColor)
        gradient.addColorStop(1, beamColorFade)

        this.ctx.strokeStyle = gradient
        this.ctx.beginPath()
        this.ctx.moveTo(beam.start.x, beam.start.y)
        this.ctx.lineTo(beam.end.x, beam.end.y)
        this.ctx.stroke()

        if (ownerId === engine.player.id && owner.tankClass === 'prismarchon') {
          const refraction = engine.player.synergy.modifiers['prismRefraction'] ?? 0
          this.drawPrismRefraction(beam, refraction, beamColor)
        }
      }
    }

    this.ctx.restore()
  }

  private extendBeamForRender(start: Vector2, end: Vector2, extension: number) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distanceSq = dx * dx + dy * dy
    
    // If pylons are too close or at same position, return original points
    if (distanceSq < 0.01) {
      return { start, end }
    }
    
    const distance = Math.sqrt(distanceSq)
    const normX = dx / distance
    const normY = dy / distance

    return {
      start: {
        x: start.x - normX * extension,
        y: start.y - normY * extension,
      },
      end: {
        x: end.x + normX * extension,
        y: end.y + normY * extension,
      },
    }
  }

  private drawPrismRefraction(
    beam: { start: Vector2; end: Vector2 },
    refraction: number,
    color: string
  ) {
    if (refraction <= 0) return
    const midX = (beam.start.x + beam.end.x) / 2
    const midY = (beam.start.y + beam.end.y) / 2
    const angle = Math.atan2(beam.end.y - beam.start.y, beam.end.x - beam.start.x)
    const offsets = [-1, 1]
    this.ctx.lineWidth = 3
    this.ctx.shadowBlur = 15
    this.ctx.shadowColor = color
    for (const offset of offsets) {
      const refractedAngle = angle + offset * refraction
      const length = 60
      this.ctx.beginPath()
      this.ctx.moveTo(midX, midY)
      this.ctx.lineTo(
        midX + Math.cos(refractedAngle) * length,
        midY + Math.sin(refractedAngle) * length
      )
      this.ctx.strokeStyle = color
      this.ctx.stroke()
    }
    this.ctx.shadowBlur = 0
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
    // Draw low health vignette (red edges when health is low)
    const lowHealthVignette = engine.screenEffects.getLowHealthVignette()
    if (lowHealthVignette) {
      const gradient = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, 
        Math.min(this.canvas.width, this.canvas.height) * 0.3,
        this.canvas.width / 2, this.canvas.height / 2, 
        Math.max(this.canvas.width, this.canvas.height) * 0.8
      )
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(0.5, `rgba(80, 0, 0, ${lowHealthVignette.intensity * 0.3})`)
      gradient.addColorStop(1, `rgba(120, 0, 0, ${lowHealthVignette.intensity * 0.5})`)
      
      this.ctx.fillStyle = gradient
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    
    // Draw screen tint for status effects
    const screenTint = engine.screenEffects.getScreenTint()
    if (screenTint) {
      this.ctx.globalAlpha = screenTint.alpha
      this.ctx.fillStyle = screenTint.color
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.globalAlpha = 1
    }
    
    // Draw flash overlay
    const flash = engine.screenEffects.getFlash()
    if (flash) {
      this.ctx.globalAlpha = flash.alpha
      this.ctx.fillStyle = flash.color
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.globalAlpha = 1
    }
  }

  private drawPredatorScopeOverlay(engine: GameEngine) {
    const scopeState = engine.abilityState.predatorScope
    if (!scopeState || scopeState.blend <= 0.05 || engine.player.tankClass !== 'predator') return
    
    this.ctx.save()
    
    const overlayAlpha = 0.45 * scopeState.blend
    this.ctx.fillStyle = `rgba(5, 12, 24, ${overlayAlpha})`
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    const centerX = engine.mouseScreenPosition.x || this.canvas.width / 2
    const centerY = engine.mouseScreenPosition.y || this.canvas.height / 2
    const radius = Math.min(this.canvas.width, this.canvas.height) * (0.35 + 0.15 * scopeState.blend)
    
    this.ctx.globalCompositeOperation = 'destination-out'
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = `rgba(180, 220, 255, ${0.8 * scopeState.blend})`
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    this.ctx.stroke()
    
    const reticleLength = radius * 0.25
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = `rgba(240, 255, 255, ${scopeState.blend})`
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - reticleLength, centerY)
    this.ctx.lineTo(centerX + reticleLength, centerY)
    this.ctx.moveTo(centerX, centerY - reticleLength)
    this.ctx.lineTo(centerX, centerY + reticleLength)
    this.ctx.stroke()
    
    this.ctx.restore()
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

  private drawDoomsdayAura(player: Player) {
    const pulse = (Math.sin(this.frameTime * 2.2) + 1) / 2
    const radius = player.radius + 32 + pulse * 8
    this.ctx.save()
    this.ctx.translate(player.position.x, player.position.y)
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    gradient.addColorStop(0, `rgba(255, 196, 120, ${0.15 + pulse * 0.15})`)
    gradient.addColorStop(0.5, `rgba(255, 90, 60, ${0.3 + pulse * 0.2})`)
    gradient.addColorStop(1, 'rgba(40, 0, 0, 0)')
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.strokeStyle = `rgba(255, 120, 60, ${0.4 + pulse * 0.3})`
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([6, 6])
    this.ctx.beginPath()
    this.ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2)
    this.ctx.stroke()
    this.ctx.setLineDash([])
    this.ctx.restore()
  }

  private drawGravemindAura(engine: GameEngine) {
    const player = engine.player
    const thrallStrength = player.synergy.modifiers['gravemindThrallBonus'] ?? 1
    const orbitRadius = player.radius + 26
    const shards = 10
    this.ctx.save()
    this.ctx.translate(player.position.x, player.position.y)
    this.ctx.strokeStyle = `rgba(120, 255, 200, ${0.25 + Math.sin(this.frameTime * 2) * 0.1})`
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2)
    this.ctx.stroke()

    for (let i = 0; i < shards; i++) {
      const angle = (Math.PI * 2 * i) / shards + this.frameTime * 0.8
      const x = Math.cos(angle) * orbitRadius
      const y = Math.sin(angle) * orbitRadius
      const size = 4 + thrallStrength * 0.8
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate(angle + Math.PI / 4)
      this.ctx.fillStyle = 'rgba(120, 255, 200, 0.7)'
      this.ctx.fillRect(-size / 2, -size / 2, size, size)
      this.ctx.restore()
    }
    this.ctx.restore()
  }

  private drawTempestAura(position: Vector2, radius: number, rotation: number, intensity: number, team: Team) {
    this.ctx.save()
    this.ctx.translate(position.x, position.y)
    this.ctx.rotate(rotation)

    const colorPrimary = team === 'blue' ? 'rgba(123, 224, 255, 0.5)' : 'rgba(255, 157, 123, 0.5)'
    const colorSecondary = team === 'blue' ? 'rgba(123, 224, 255, 0.2)' : 'rgba(255, 157, 123, 0.2)'
    const arcCount = 6
    const arcWidth = 0.4 + intensity * 0.2

    for (let i = 0; i < arcCount; i++) {
      const angle = (Math.PI * 2 * i) / arcCount
      this.ctx.save()
      this.ctx.rotate(angle)
      const orbitRadius = radius + 10 + Math.sin(rotation * 2 + i) * 5
      this.ctx.beginPath()
      this.ctx.strokeStyle = i % 2 === 0 ? colorPrimary : colorSecondary
      this.ctx.lineWidth = 2 + intensity * 1.5
      this.ctx.globalAlpha = 0.4 + intensity * 0.2
      this.ctx.arc(0, 0, orbitRadius, -arcWidth, arcWidth)
      this.ctx.stroke()
      this.ctx.restore()
    }

    this.ctx.restore()
  }

  private drawCatalystStacks(engine: GameEngine) {
    if (engine.player.tankClass !== 'catalyst') return
    const state = engine.abilityState.catalyst
    if (!state) return
    const rawStacks = Math.max(0, state.stacks ?? 0)
    if (rawStacks <= 0) return

    const segments = 5
    const clamped = Math.min(rawStacks, segments)
    const fullSegments = Math.floor(clamped)
    const partial = clamped - fullSegments
    const radius = engine.player.radius + 28
    const arcSize = (Math.PI * 2) / segments

    this.ctx.save()
    this.ctx.translate(engine.player.position.x, engine.player.position.y)
    this.ctx.rotate(-Math.PI / 2)
    for (let i = 0; i < segments; i++) {
      let progress = 0
      if (i < fullSegments) {
        progress = 1
      } else if (i === fullSegments) {
        progress = partial
      }
      if (progress <= 0) continue
      this.ctx.beginPath()
      const start = i * arcSize
      const end = start + arcSize * progress
      this.ctx.strokeStyle = `rgba(255, 128, 217, ${0.35 + progress * 0.45})`
      this.ctx.lineWidth = 3
      this.ctx.arc(0, 0, radius, start, end)
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  private drawDecoy(engine: GameEngine, tankConfig: TankConfig) {
    const decoy = engine.player.decoy
    if (!decoy?.visible) return
    
    const prevAlpha = this.ctx.globalAlpha
    this.ctx.globalAlpha = 0.65
    
    const color = engine.player.team === 'blue' ? '#8bd6ff' : '#ffb4d8'
    const glow = engine.player.team === 'blue' ? 'rgba(139, 214, 255, 0.4)' : 'rgba(255, 180, 216, 0.4)'
    const aimAngle = Math.atan2(
      engine.mousePosition.y - decoy.position.y,
      engine.mousePosition.x - decoy.position.x
    )

    if (decoy.hitFlash && decoy.hitFlash > 0) {
      const flashAlpha = Math.min(1, decoy.hitFlash / 0.2)
      this.ctx.save()
      this.ctx.globalAlpha = flashAlpha * 0.9
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(
        decoy.position.x,
        decoy.position.y,
        engine.player.radius + 10 + (1 - flashAlpha) * 6,
        0,
        Math.PI * 2
      )
      this.ctx.stroke()
      this.ctx.restore()
    }
    
    this.drawTank(
      decoy.position.x,
      decoy.position.y,
      color,
      tankConfig.barrels,
      aimAngle,
      engine.player.radius,
      0,
      tankConfig.bodyShape || 'circle',
      tankConfig.bodySpikes,
      glow,
      undefined,
      engine.player.radius / 15
    )
    
    this.ctx.globalAlpha = prevAlpha
  }

  private drawAegisShields(engine: GameEngine) {
    const shields = engine.abilityState.aegisShields
    if (!shields.length) return
    const player = engine.player
    this.ctx.save()
    for (const shield of shields) {
      const gradient = this.ctx.createRadialGradient(
        shield.position.x,
        shield.position.y,
        5,
        shield.position.x,
        shield.position.y,
        22
      )
      gradient.addColorStop(0, 'rgba(100, 255, 255, 0.8)')
      gradient.addColorStop(1, 'rgba(100, 255, 255, 0)')
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(shield.position.x, shield.position.y, 22, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.strokeStyle = '#66f7ff'
      this.ctx.lineWidth = 2
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
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g)
      if (!match || match.length < 3) return color
      const r = Math.min(255, parseInt(match[0]) + Math.floor(255 * amount))
      const g = Math.min(255, parseInt(match[1]) + Math.floor(255 * amount))
      const b = Math.min(255, parseInt(match[2]) + Math.floor(255 * amount))
      return `rgb(${r}, ${g}, ${b})`
    }
    
    const hex = color.replace('#', '')
    if (hex.length !== 6) return color
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + Math.floor(255 * amount))
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + Math.floor(255 * amount))
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + Math.floor(255 * amount))
    return `rgb(${r}, ${g}, ${b})`
  }

  private darkenColor(color: string, amount: number): string {
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g)
      if (!match || match.length < 3) return color
      const r = Math.max(0, parseInt(match[0]) - Math.floor(255 * amount))
      const g = Math.max(0, parseInt(match[1]) - Math.floor(255 * amount))
      const b = Math.max(0, parseInt(match[2]) - Math.floor(255 * amount))
      return `rgb(${r}, ${g}, ${b})`
    }
    
    const hex = color.replace('#', '')
    if (hex.length !== 6) return color
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - Math.floor(255 * amount))
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - Math.floor(255 * amount))
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - Math.floor(255 * amount))
    return `rgb(${r}, ${g}, ${b})`
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW NEXUS WARS ARENA RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  private drawBattlefieldBackground(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const bounds = engine.zoneSystem.getWorldBounds()
    
    // Base background - dark battlefield
    const gradient = this.ctx.createLinearGradient(0, 0, bounds.width, 0)
    gradient.addColorStop(0, '#0a1520')     // Blue side darker
    gradient.addColorStop(0.15, '#121a24')
    gradient.addColorStop(0.5, '#1a1a28')   // Neutral center
    gradient.addColorStop(0.85, '#241a18')
    gradient.addColorStop(1, '#200a0a')     // Red side darker
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, bounds.width, bounds.height)
  }

  private drawLanes(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const lanes = engine.zoneSystem.lanes
    
    for (const lane of lanes) {
      const startX = lane.startBlue.x
      const endX = lane.endRed.x
      const y = lane.startBlue.y
      const halfWidth = lane.width / 2
      
      // Lane background
      this.ctx.save()
      
      // Different colors for different lane types
      let laneGradient = this.ctx.createLinearGradient(startX, y, endX, y)
      
      if (lane.laneType === 'jungle') {
        laneGradient.addColorStop(0, 'rgba(45, 74, 45, 0.4)')
        laneGradient.addColorStop(0.5, 'rgba(35, 55, 35, 0.5)')
        laneGradient.addColorStop(1, 'rgba(45, 74, 45, 0.4)')
      } else if (lane.laneType === 'combat') {
        laneGradient.addColorStop(0, 'rgba(74, 61, 45, 0.4)')
        laneGradient.addColorStop(0.5, 'rgba(90, 70, 50, 0.6)')
        laneGradient.addColorStop(1, 'rgba(74, 61, 45, 0.4)')
      } else {
        laneGradient.addColorStop(0, 'rgba(61, 61, 26, 0.4)')
        laneGradient.addColorStop(0.5, 'rgba(70, 70, 35, 0.5)')
        laneGradient.addColorStop(1, 'rgba(61, 61, 26, 0.4)')
      }
      
      this.ctx.fillStyle = laneGradient
      this.ctx.fillRect(startX, y - halfWidth, endX - startX, lane.width)
      
      // Lane border lines
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([20, 20])
      
      this.ctx.beginPath()
      this.ctx.moveTo(startX, y - halfWidth)
      this.ctx.lineTo(endX, y - halfWidth)
      this.ctx.moveTo(startX, y + halfWidth)
      this.ctx.lineTo(endX, y + halfWidth)
      this.ctx.stroke()
      
      this.ctx.setLineDash([])
      
      // Lane name (only if in view)
      const camX = engine.camera.x + this.canvas.width / 2
      if (Math.abs(camX - 8000) < 2000) {
        this.ctx.font = 'bold 16px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        this.ctx.fillText(lane.name, 8000, y - halfWidth + 25)
      }
      
      this.ctx.restore()
    }
  }

  private drawTeamBases(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const bases = engine.zoneSystem.getTeamBasesArray()
    const time = Date.now() / 1000
    
    for (const base of bases) {
      this.ctx.save()
      
      const isBlue = base.team === 'blue'
      const baseColor = isBlue ? '#00aaff' : '#ff4444'
      const darkColor = isBlue ? '#0055aa' : '#aa2222'
      
      // Outer territory glow
      const pulse = Math.sin(time * 2) * 0.1 + 0.9
      
      // Territory ring
      this.ctx.beginPath()
      this.ctx.arc(base.position.x, base.position.y, base.outerRadius, 0, Math.PI * 2)
      const territoryGradient = this.ctx.createRadialGradient(
        base.position.x, base.position.y, base.safeRadius,
        base.position.x, base.position.y, base.outerRadius
      )
      territoryGradient.addColorStop(0, `${baseColor}22`)
      territoryGradient.addColorStop(1, 'transparent')
      this.ctx.fillStyle = territoryGradient
      this.ctx.fill()
      
      // Safe zone circle
      this.ctx.beginPath()
      this.ctx.arc(base.position.x, base.position.y, base.safeRadius, 0, Math.PI * 2)
      const safeGradient = this.ctx.createRadialGradient(
        base.position.x, base.position.y, 0,
        base.position.x, base.position.y, base.safeRadius
      )
      safeGradient.addColorStop(0, `${darkColor}66`)
      safeGradient.addColorStop(0.7, `${darkColor}44`)
      safeGradient.addColorStop(1, `${baseColor}22`)
      this.ctx.fillStyle = safeGradient
      this.ctx.fill()
      
      // Safe zone border
      this.ctx.strokeStyle = baseColor
      this.ctx.lineWidth = 3
      this.ctx.shadowBlur = 15 * pulse
      this.ctx.shadowColor = baseColor
      this.ctx.stroke()
      
      // Forge (healing station)
      this.ctx.beginPath()
      this.ctx.arc(base.forgePosition.x, base.forgePosition.y, base.forgeRadius, 0, Math.PI * 2)
      
      const forgeGlow = base.isOvercharged ? 1.5 : 1
      this.ctx.shadowBlur = 25 * pulse * forgeGlow
      this.ctx.shadowColor = isBlue ? '#00ffff' : '#ffaa00'
      
      const forgeGradient = this.ctx.createRadialGradient(
        base.forgePosition.x, base.forgePosition.y, 0,
        base.forgePosition.x, base.forgePosition.y, base.forgeRadius
      )
      forgeGradient.addColorStop(0, isBlue ? '#00ffff88' : '#ffaa0088')
      forgeGradient.addColorStop(0.5, isBlue ? '#00aaff66' : '#ff880066')
      forgeGradient.addColorStop(1, 'transparent')
      this.ctx.fillStyle = forgeGradient
      this.ctx.fill()
      
      // Forge icon (+ symbol)
      this.ctx.strokeStyle = isBlue ? '#00ffff' : '#ffaa00'
      this.ctx.lineWidth = 4
      this.ctx.beginPath()
      this.ctx.moveTo(base.forgePosition.x - 15, base.forgePosition.y)
      this.ctx.lineTo(base.forgePosition.x + 15, base.forgePosition.y)
      this.ctx.moveTo(base.forgePosition.x, base.forgePosition.y - 15)
      this.ctx.lineTo(base.forgePosition.x, base.forgePosition.y + 15)
      this.ctx.stroke()
      
      // Team label
      this.ctx.shadowBlur = 0
      this.ctx.font = 'bold 24px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = baseColor
      this.ctx.fillText(
        isBlue ? '🔵 BLUE BASE' : '🔴 RED BASE',
        base.position.x,
        base.position.y - base.safeRadius - 20
      )
      
      this.ctx.restore()
    }
  }

  private drawControlPoints(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const controlPoints = engine.zoneSystem.controlPoints
    const time = Date.now() / 1000
    
    for (const cp of controlPoints) {
      this.ctx.save()
      
      const pulse = Math.sin(time * 2 + cp.visualPulse) * 0.15 + 0.85
      
      // Determine colors based on controlling team
      let baseColor: string
      let glowColor: string
      
      if (cp.controllingTeam === 'blue') {
        baseColor = '#00aaff'
        glowColor = 'rgba(0, 170, 255, 0.6)'
      } else if (cp.controllingTeam === 'red') {
        baseColor = '#ff4444'
        glowColor = 'rgba(255, 68, 68, 0.6)'
      } else {
        baseColor = '#888888'
        glowColor = 'rgba(136, 136, 136, 0.4)'
      }
      
      // Contest visual effect (flashing)
      if (cp.isContested) {
        const flash = Math.sin(time * 10) > 0
        baseColor = flash ? '#ffffff' : '#ffaa00'
        glowColor = 'rgba(255, 170, 0, 0.8)'
      }
      
      // Outer capture zone
      this.ctx.beginPath()
      this.ctx.arc(cp.position.x, cp.position.y, cp.radius, 0, Math.PI * 2)
      
      const zoneGradient = this.ctx.createRadialGradient(
        cp.position.x, cp.position.y, 0,
        cp.position.x, cp.position.y, cp.radius
      )
      zoneGradient.addColorStop(0, `${baseColor}33`)
      zoneGradient.addColorStop(0.7, `${baseColor}22`)
      zoneGradient.addColorStop(1, 'transparent')
      this.ctx.fillStyle = zoneGradient
      this.ctx.fill()
      
      // Capture zone border
      this.ctx.strokeStyle = baseColor
      this.ctx.lineWidth = 3
      this.ctx.shadowBlur = 20 * pulse
      this.ctx.shadowColor = glowColor
      this.ctx.stroke()
      
      // Inner core (power-up indicator)
      const coreRadius = 40
      this.ctx.beginPath()
      this.ctx.arc(cp.position.x, cp.position.y, coreRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = baseColor
      this.ctx.globalAlpha = 0.7 * pulse
      this.ctx.fill()
      this.ctx.globalAlpha = 1
      
      // Power-up type icon
      this.ctx.font = 'bold 24px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillStyle = '#ffffff'
      
      const icon = {
        damage: '⚔️',
        speed: '⚡',
        health: '❤️',
        xp: '✨',
        regen: '💚'
      }[cp.powerUpType]
      
      this.ctx.fillText(icon, cp.position.x, cp.position.y)
      
      // Capture progress ring
      if (Math.abs(cp.captureProgress) > 0) {
        const progressAngle = (Math.abs(cp.captureProgress) / 100) * Math.PI * 2
        const progressColor = cp.captureProgress > 0 ? '#00aaff' : '#ff4444'
        
        this.ctx.beginPath()
        this.ctx.arc(cp.position.x, cp.position.y, cp.radius - 10, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = progressColor
        this.ctx.lineWidth = 8
        this.ctx.shadowBlur = 10
        this.ctx.shadowColor = progressColor
        this.ctx.stroke()
      }
      
      // Point name
      this.ctx.shadowBlur = 0
      this.ctx.font = 'bold 14px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'top'
      this.ctx.fillStyle = baseColor
      this.ctx.fillText(cp.name, cp.position.x, cp.position.y + coreRadius + 10)
      
      // Power-up type label
      this.ctx.font = '12px Arial'
      this.ctx.fillStyle = '#aaaaaa'
      const powerLabel = `+${Math.round((cp.powerUpStrength - 1) * 100)}% ${cp.powerUpType.toUpperCase()}`
      this.ctx.fillText(powerLabel, cp.position.x, cp.position.y + coreRadius + 28)
      
      this.ctx.restore()
    }
  }

  private drawNexus(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const nexus = engine.zoneSystem.nexus
    const time = Date.now() / 1000
    
    this.ctx.save()
    
    // Draw expanding territory influence based on controlling team
    if (nexus.territoryRadius > nexus.captureRadius) {
      const pulse = Math.sin(time * 1.5) * 0.15 + 0.85
      
      this.ctx.beginPath()
      this.ctx.arc(nexus.position.x, nexus.position.y, nexus.territoryRadius * pulse, 0, Math.PI * 2)
      
      // Team color for territory
      let territoryColor = 'rgba(150, 50, 200, 0.15)' // Neutral purple
      let glowColor = '#cc66ff'
      
      if (nexus.controllingTeam === 'blue') {
        territoryColor = 'rgba(0, 150, 255, 0.2)'
        glowColor = '#00aaff'
      } else if (nexus.controllingTeam === 'red') {
        territoryColor = 'rgba(255, 50, 50, 0.2)'
        glowColor = '#ff4444'
      }
      
      const territoryGradient = this.ctx.createRadialGradient(
        nexus.position.x, nexus.position.y, nexus.captureRadius,
        nexus.position.x, nexus.position.y, nexus.territoryRadius
      )
      territoryGradient.addColorStop(0, territoryColor)
      territoryGradient.addColorStop(0.7, territoryColor.replace(/[\d.]+\)/, '0.1)'))
      territoryGradient.addColorStop(1, 'transparent')
      this.ctx.fillStyle = territoryGradient
      this.ctx.fill()
      
      // Expanding border ring
      this.ctx.strokeStyle = glowColor
      this.ctx.lineWidth = 3
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = glowColor
      this.ctx.stroke()
    }
    
    // Capture zone circle
    this.ctx.beginPath()
    this.ctx.arc(nexus.position.x, nexus.position.y, nexus.captureRadius, 0, Math.PI * 2)
    
    // Color based on control progress
    let captureColor = 'rgba(150, 50, 200, 0.3)' // Neutral
    if (nexus.captureProgress > 25) {
      const blueIntensity = Math.min(1, nexus.captureProgress / 100)
      captureColor = `rgba(0, 150, 255, ${0.2 + blueIntensity * 0.3})`
    } else if (nexus.captureProgress < -25) {
      const redIntensity = Math.min(1, Math.abs(nexus.captureProgress) / 100)
      captureColor = `rgba(255, 50, 50, ${0.2 + redIntensity * 0.3})`
    }
    
    const captureGradient = this.ctx.createRadialGradient(
      nexus.position.x, nexus.position.y, 0,
      nexus.position.x, nexus.position.y, nexus.captureRadius
    )
    captureGradient.addColorStop(0, captureColor)
    captureGradient.addColorStop(0.5, captureColor.replace(/[\d.]+\)/, '0.15)'))
    captureGradient.addColorStop(1, 'transparent')
    this.ctx.fillStyle = captureGradient
    this.ctx.fill()
    
    // Capture zone border
    this.ctx.strokeStyle = nexus.isContested ? '#ffaa00' : '#cc66ff'
    this.ctx.lineWidth = 4
    this.ctx.shadowBlur = nexus.isContested ? 30 : 15
    this.ctx.shadowColor = nexus.isContested ? '#ffaa00' : '#cc66ff'
    this.ctx.stroke()
    
    // Rotating energy rings based on capture state
    if (nexus.controllingTeam !== 'neutral') {
      const ringColor = nexus.controllingTeam === 'blue' ? 'rgba(0, 170, 255, ' : 'rgba(255, 68, 68, '
      
      for (let i = 0; i < 3; i++) {
        const ringRadius = nexus.captureRadius + 100 + i * 150
        const rotation = time * (0.3 + i * 0.1) * (i % 2 === 0 ? 1 : -1)
        
        this.ctx.beginPath()
        this.ctx.arc(nexus.position.x, nexus.position.y, ringRadius, rotation, rotation + Math.PI * 0.5)
        this.ctx.strokeStyle = ringColor + `${0.4 - i * 0.1})`
        this.ctx.lineWidth = 3
        this.ctx.stroke()
      }
    }
    
    // Center icon and label
    this.ctx.shadowBlur = 0
    this.ctx.font = 'bold 36px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    if (nexus.controllingTeam === 'blue') {
      this.ctx.fillStyle = '#00aaff'
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = '#00aaff'
      this.ctx.fillText('⚜️', nexus.position.x, nexus.position.y)
    } else if (nexus.controllingTeam === 'red') {
      this.ctx.fillStyle = '#ff4444'
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = '#ff4444'
      this.ctx.fillText('⚜️', nexus.position.x, nexus.position.y)
    } else {
      this.ctx.fillStyle = '#cc66ff'
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = '#cc66ff'
      this.ctx.fillText('⚜️', nexus.position.x, nexus.position.y)
    }
    
    // Nexus label
    this.ctx.shadowBlur = 0
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'center'
    const labelY = nexus.position.y - nexus.captureRadius - 30
    
    if (nexus.controllingTeam === 'neutral') {
      this.ctx.fillStyle = '#cc66ff'
      this.ctx.fillText('⚡ NEXUS POINT', nexus.position.x, labelY)
      this.ctx.font = '14px Arial'
      this.ctx.fillStyle = '#aa88cc'
      this.ctx.fillText('Capture to expand territory', nexus.position.x, labelY + 20)
    } else {
      const teamName = nexus.controllingTeam.toUpperCase()
      this.ctx.fillStyle = nexus.controllingTeam === 'blue' ? '#00aaff' : '#ff4444'
      this.ctx.fillText(`${teamName} TERRITORY`, nexus.position.x, labelY)
      this.ctx.font = '14px Arial'
      const occupants = nexus.controllingTeam === 'blue' ? nexus.occupantCount.blue : nexus.occupantCount.red
      this.ctx.fillText(`${occupants} player${occupants !== 1 ? 's' : ''} expanding • ${Math.floor(nexus.territoryRadius)}m`, nexus.position.x, labelY + 20)
    }
    
    // Capture progress bar
    if (nexus.captureProgress !== 0 || nexus.isContested) {
      const barWidth = 200
      const barHeight = 8
      const barX = nexus.position.x - barWidth / 2
      const barY = nexus.position.y + nexus.captureRadius + 50
      
      // Background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      this.ctx.fillRect(barX, barY, barWidth, barHeight)
      
      // Progress fill
      const fillWidth = (Math.abs(nexus.captureProgress) / 100) * barWidth
      if (nexus.captureProgress > 0) {
        this.ctx.fillStyle = '#00aaff'
        this.ctx.fillRect(barX, barY, fillWidth, barHeight)
      } else if (nexus.captureProgress < 0) {
        this.ctx.fillStyle = '#ff4444'
        this.ctx.fillRect(barX + barWidth - fillWidth, barY, fillWidth, barHeight)
      }
      
      // Border
      this.ctx.strokeStyle = nexus.isContested ? '#ffaa00' : '#ffffff'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(barX, barY, barWidth, barHeight)
      
      // Status text
      this.ctx.font = '12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#ffffff'
      const statusText = nexus.isContested ? 'CONTESTED!' : `${Math.floor(Math.abs(nexus.captureProgress))}%`
      this.ctx.fillText(statusText, nexus.position.x, barY + barHeight + 15)
    }
    
    this.ctx.restore()
  }

  private drawDynamicEvents(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const events = engine.zoneSystem.activeEvents
    const time = Date.now() / 1000
    
    for (const event of events) {
      this.ctx.save()
      
      const alpha = event.intensity
      
      if (event.type === 'meteor_shower') {
        // Dangerous red zone
        this.ctx.beginPath()
        this.ctx.arc(event.position.x, event.position.y, event.radius, 0, Math.PI * 2)
        
        const dangerGradient = this.ctx.createRadialGradient(
          event.position.x, event.position.y, 0,
          event.position.x, event.position.y, event.radius
        )
        dangerGradient.addColorStop(0, `rgba(255, 50, 0, ${0.4 * alpha})`)
        dangerGradient.addColorStop(0.7, `rgba(255, 100, 0, ${0.2 * alpha})`)
        dangerGradient.addColorStop(1, 'transparent')
        this.ctx.fillStyle = dangerGradient
        this.ctx.fill()
        
        // Meteor particles
        if (event.isActive) {
          for (let i = 0; i < 5; i++) {
            const meteorX = event.position.x + Math.sin(time * 3 + i * 2) * event.radius * 0.6
            const meteorY = event.position.y + Math.cos(time * 4 + i * 1.5) * event.radius * 0.6
            
            this.ctx.beginPath()
            this.ctx.arc(meteorX, meteorY, 8, 0, Math.PI * 2)
            this.ctx.fillStyle = `rgba(255, ${150 + i * 20}, 0, ${0.8 * alpha})`
            this.ctx.shadowBlur = 15
            this.ctx.shadowColor = '#ff6600'
            this.ctx.fill()
          }
        }
        
        // Warning text
        this.ctx.font = 'bold 24px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`
        this.ctx.fillText('☄️ METEOR SHOWER', event.position.x, event.position.y - event.radius - 10)
        
      } else if (event.type === 'energy_surge') {
        // Buff zone - green/cyan
        this.ctx.beginPath()
        this.ctx.arc(event.position.x, event.position.y, event.radius, 0, Math.PI * 2)
        
        const buffGradient = this.ctx.createRadialGradient(
          event.position.x, event.position.y, 0,
          event.position.x, event.position.y, event.radius
        )
        buffGradient.addColorStop(0, `rgba(0, 255, 200, ${0.4 * alpha})`)
        buffGradient.addColorStop(0.7, `rgba(0, 200, 255, ${0.2 * alpha})`)
        buffGradient.addColorStop(1, 'transparent')
        this.ctx.fillStyle = buffGradient
        this.ctx.fill()
        
        // Energy sparkles
        for (let i = 0; i < 8; i++) {
          const angle = (time + i * 0.785) % (Math.PI * 2)
          const dist = event.radius * 0.5 + Math.sin(time * 3 + i) * 50
          const sparkX = event.position.x + Math.cos(angle) * dist
          const sparkY = event.position.y + Math.sin(angle) * dist
          
          this.ctx.beginPath()
          this.ctx.arc(sparkX, sparkY, 4, 0, Math.PI * 2)
          this.ctx.fillStyle = `rgba(0, 255, 255, ${0.7 * alpha})`
          this.ctx.fill()
        }
        
        // Energy surge label removed - shown as toast notification instead
        
      } else if (event.type === 'blood_moon') {
        // Screen-wide red tint (handled elsewhere, but draw indicator)
        const screenTint = `rgba(100, 0, 0, ${0.15 * alpha})`
        // This would be better as a screen overlay
      }
      
      this.ctx.restore()
    }
  }

  private drawSupplyDrops(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const drops = engine.zoneSystem.supplyDrops
    const time = Date.now() / 1000
    
    for (const drop of drops) {
      this.ctx.save()
      
      // Target indicator on ground
      if (!drop.isLanded) {
        // Landing zone indicator
        this.ctx.beginPath()
        this.ctx.arc(drop.targetPosition.x, drop.targetPosition.y, drop.radius, 0, Math.PI * 2)
        this.ctx.fillStyle = 'rgba(255, 200, 0, 0.2)'
        this.ctx.fill()
        this.ctx.strokeStyle = '#ffcc00'
        this.ctx.lineWidth = 2
        this.ctx.setLineDash([10, 10])
        this.ctx.stroke()
        this.ctx.setLineDash([])
        
        // Parachute/crate dropping
        const dropY = drop.targetPosition.y - drop.altitude
        
        // Parachute
        this.ctx.beginPath()
        this.ctx.arc(drop.targetPosition.x, dropY - 40, 30, Math.PI, 0)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        this.ctx.fill()
        this.ctx.strokeStyle = '#888888'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        
        // Crate
        this.ctx.fillStyle = drop.lootTier === 'legendary' ? '#ff8800' : drop.lootTier === 'epic' ? '#aa33ee' : '#0066dd'
        this.ctx.fillRect(drop.targetPosition.x - 20, dropY - 20, 40, 40)
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(drop.targetPosition.x - 20, dropY - 20, 40, 40)
        
        // Strings
        this.ctx.beginPath()
        this.ctx.moveTo(drop.targetPosition.x - 20, dropY - 20)
        this.ctx.lineTo(drop.targetPosition.x - 25, dropY - 40)
        this.ctx.moveTo(drop.targetPosition.x + 20, dropY - 20)
        this.ctx.lineTo(drop.targetPosition.x + 25, dropY - 40)
        this.ctx.strokeStyle = '#888888'
        this.ctx.stroke()
        
      } else {
        // Landed crate with glow
        const pulse = Math.sin(time * 3) * 0.2 + 0.8
        
        this.ctx.shadowBlur = 20 * pulse
        this.ctx.shadowColor = drop.lootTier === 'legendary' ? '#ff8800' : drop.lootTier === 'epic' ? '#aa33ee' : '#0066dd'
        
        // Crate
        this.ctx.fillStyle = drop.lootTier === 'legendary' ? '#ff8800' : drop.lootTier === 'epic' ? '#aa33ee' : '#0066dd'
        this.ctx.fillRect(drop.targetPosition.x - 25, drop.targetPosition.y - 25, 50, 50)
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 3
        this.ctx.strokeRect(drop.targetPosition.x - 25, drop.targetPosition.y - 25, 50, 50)
        
        // Tier icon
        this.ctx.font = 'bold 20px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText('📦', drop.targetPosition.x, drop.targetPosition.y)
        
        // Tier label
        this.ctx.shadowBlur = 0
        this.ctx.font = 'bold 12px Arial'
        this.ctx.fillText(drop.lootTier.toUpperCase(), drop.targetPosition.x, drop.targetPosition.y + 40)
      }
      
      this.ctx.restore()
    }
  }

  private drawEventNotifications(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const events = engine.zoneSystem.activeEvents
    
    // Screen-space event notifications
    let yOffset = 120
    
    for (const event of events) {
      if (!event.isActive) {
        // Warning phase
        this.ctx.save()
        this.ctx.fillStyle = 'rgba(255, 100, 0, 0.9)'
        this.ctx.fillRect(this.canvas.width / 2 - 150, yOffset, 300, 40)
        this.ctx.strokeStyle = '#ffcc00'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(this.canvas.width / 2 - 150, yOffset, 300, 40)
        
        this.ctx.font = 'bold 16px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText(`⚠️ ${event.name} INCOMING!`, this.canvas.width / 2, yOffset + 25)
        this.ctx.restore()
        yOffset += 50
      } else {
        // Active event
        this.ctx.save()
        
        const bgColor = event.type === 'blood_moon' ? 'rgba(150, 0, 0, 0.8)' :
                        event.type === 'energy_surge' ? 'rgba(0, 150, 100, 0.8)' :
                        'rgba(100, 50, 0, 0.8)'
        
        this.ctx.fillStyle = bgColor
        this.ctx.fillRect(this.canvas.width / 2 - 180, yOffset, 360, 50)
        
        this.ctx.font = 'bold 18px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText(event.name, this.canvas.width / 2, yOffset + 22)
        
        this.ctx.font = '12px Arial'
        this.ctx.fillStyle = '#cccccc'
        this.ctx.fillText(event.description, this.canvas.width / 2, yOffset + 40)
        
        this.ctx.restore()
        yOffset += 60
      }
    }
  }

  private drawControlPointHUD(engine: GameEngine) {
    if (!engine.zoneSystem) return
    const controlPoints = engine.zoneSystem.controlPoints
    const teamBuffs = engine.zoneSystem.getTeamBuffs(engine.player.team)
    
    // Control point status bar at top
    const barWidth = 400
    const barHeight = 8
    const startX = this.canvas.width / 2 - barWidth / 2
    const startY = 15
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.fillRect(startX - 10, startY - 5, barWidth + 20, 50)
    
    // Count control points
    let bluePoints = 0
    let redPoints = 0
    
    for (const cp of controlPoints) {
      if (cp.controllingTeam === 'blue') bluePoints++
      else if (cp.controllingTeam === 'red') redPoints++
    }
    
    // Score display
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'center'
    
    this.ctx.fillStyle = '#00aaff'
    this.ctx.fillText(`🔵 ${bluePoints}`, startX + 40, startY + 18)
    
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText('CONTROL', startX + barWidth / 2, startY + 18)
    
    this.ctx.fillStyle = '#ff4444'
    this.ctx.fillText(`${redPoints} 🔴`, startX + barWidth - 40, startY + 18)
    
    // Control bar
    const totalPoints = 5
    const blueWidth = (bluePoints / totalPoints) * barWidth
    const redWidth = (redPoints / totalPoints) * barWidth
    
    this.ctx.fillStyle = '#333333'
    this.ctx.fillRect(startX, startY + 28, barWidth, barHeight)
    
    this.ctx.fillStyle = '#00aaff'
    this.ctx.fillRect(startX, startY + 28, blueWidth, barHeight)
    
    this.ctx.fillStyle = '#ff4444'
    this.ctx.fillRect(startX + barWidth - redWidth, startY + 28, redWidth, barHeight)
    
    // Team buffs display (small icons)
    if (teamBuffs.controlPointsOwned > 0) {
      const buffY = startY + 45
      let buffX = startX
      this.ctx.font = '10px Arial'
      this.ctx.textAlign = 'left'
      this.ctx.fillStyle = '#aaffaa'
      
      if (teamBuffs.damageMultiplier > 1) {
        this.ctx.fillText(`⚔️+${Math.round((teamBuffs.damageMultiplier - 1) * 100)}%`, buffX, buffY)
        buffX += 60
      }
      if (teamBuffs.speedMultiplier > 1) {
        this.ctx.fillText(`⚡+${Math.round((teamBuffs.speedMultiplier - 1) * 100)}%`, buffX, buffY)
        buffX += 60
      }
      if (teamBuffs.xpMultiplier > 1) {
        this.ctx.fillText(`✨+${Math.round((teamBuffs.xpMultiplier - 1) * 100)}%`, buffX, buffY)
        buffX += 60
      }
      if (teamBuffs.regenMultiplier > 1) {
        this.ctx.fillText(`💚+${Math.round((teamBuffs.regenMultiplier - 1) * 100)}%`, buffX, buffY)
      }
    }
  }

  // Zone rendering (legacy - kept for compatibility)
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

      // Use bot's actual aim angle (towards their target, not player)
      const aimAngle = bot.aimAngle

      // Calculate size
      const levelScale = 1 + (bot.level - 1) * 0.012
      const finalRadius = bot.radius * levelScale

      // Team-based colors - use the BOT'S actual team color, not relative to player
      const tier = tankConfig.tier || 0
      const isBlueTeam = bot.team === 'blue'
      
      // Tier-based brightness adjustment
      const tierBrightness = [1.0, 1.15, 1.3, 1.5][tier] || 1.0
      
      let fillColor: string
      let glowColor: string | null = null
      let shadowBlur = 0
      
      if (isBlueTeam) {
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
        bot.barrelRecoils,
        1.0 // Default scale for bots
      )

      if (bot.tankClass === 'tempest') {
        const rotation = (Date.now() / 600 + bot.position.x * 0.001) % (Math.PI * 2)
        this.drawTempestAura(bot.position, finalRadius + 20, rotation, 0.6, bot.team)
      }
      
      // Draw auto turrets for bot if they have them
      if (tankConfig.autoTurrets) {
        this.drawAutoTurrets(engine, bot.id, bot.position.x, bot.position.y, fillColor, finalRadius)
      }

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
        this.ctx.fillStyle = isBlueTeam ? '#00B2E1' : '#FF4444'
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
