import type { GameEngine } from './gameEngine'
import type { Vector2 } from './types'
import { TANK_CONFIGS, type BarrelConfig } from './tankConfigs'

export class RenderEngine {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private polygonRotation = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Failed to get 2D context')
    this.ctx = context
  }

  render(engine: GameEngine) {
    this.clear()
    this.polygonRotation += 0.01

    this.ctx.save()
    this.ctx.translate(-engine.camera.x, -engine.camera.y)

    this.drawGrid(engine)
    this.drawWorldBorder(engine)
    this.drawLoot(engine)
    this.drawProjectiles(engine)
    this.drawParticles(engine)
    this.drawPlayer(engine)

    this.ctx.restore()
  }

  private clear() {
    this.ctx.fillStyle = '#CDCDCD'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private drawGrid(engine: GameEngine) {
    const gridSize = 25
    const startX = Math.floor(engine.camera.x / gridSize) * gridSize
    const startY = Math.floor(engine.camera.y / gridSize) * gridSize
    const endX = engine.camera.x + this.canvas.width
    const endY = engine.camera.y + this.canvas.height

    this.ctx.strokeStyle = '#C0C0C0'
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

    this.drawTank(
      player.position.x,
      player.position.y,
      '#00B2E1',
      tankConfig.barrels,
      aimAngle,
      player.radius,
      engine.barrelRecoil
    )

    this.drawMuzzleFlashes(engine)
  }

  drawTank(
    x: number,
    y: number,
    color: string,
    barrelConfig: BarrelConfig[],
    rotation: number = 0,
    bodyRadius: number = 15,
    recoilOffset: number = 0
  ) {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(rotation)

    for (const barrel of barrelConfig) {
      this.drawBarrel(barrel, color, recoilOffset)
    }

    this.ctx.beginPath()
    this.ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = color
    this.ctx.fill()
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 3
    this.ctx.stroke()

    this.ctx.restore()
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
    for (const item of engine.loot) {
      if (item.type === 'box' && item.health && item.radius) {
        const size = item.radius
        let sides = 4
        let color = '#FFE869'

        if (size < 20) {
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
          this.polygonRotation
        )

        if (item.maxHealth && item.health < item.maxHealth) {
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
        this.ctx.strokeStyle = '#000000'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
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
        this.ctx.strokeStyle = '#000000'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
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
    this.ctx.lineWidth = 3
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
    for (const proj of engine.projectiles) {
      this.ctx.beginPath()
      this.ctx.arc(proj.position.x, proj.position.y, proj.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = proj.isPlayerProjectile ? '#00B2E1' : '#FF0000'
      this.ctx.fill()
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  private drawParticles(engine: GameEngine) {
    for (const particle of engine.particles) {
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
      this.ctx.rotate(flash.angle)

      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, flash.size)
      gradient.addColorStop(0, '#FFFFFF')
      gradient.addColorStop(0.3, '#FFDD44')
      gradient.addColorStop(0.6, '#FF8800')
      gradient.addColorStop(1, 'rgba(255, 136, 0, 0)')

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, flash.size * 1.5, flash.size * 0.8, 0, 0, Math.PI * 2)
      this.ctx.fill()

      for (let i = 0; i < 6; i++) {
        const rayAngle = (Math.PI / 3) * i
        const rayLength = flash.size * (1.5 + Math.random() * 0.5)
        
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.lineTo(
          Math.cos(rayAngle) * rayLength,
          Math.sin(rayAngle) * rayLength
        )
        this.ctx.strokeStyle = `rgba(255, 221, 68, ${flash.alpha * 0.6})`
        this.ctx.lineWidth = 2
        this.ctx.stroke()
      }

      this.ctx.restore()
    }
  }

  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
  }
}
