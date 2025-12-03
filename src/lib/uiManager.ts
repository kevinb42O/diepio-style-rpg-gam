import type { StatType } from './upgradeSystem'

export interface StatBarConfig {
  key: StatType
  label: string
  color: string
  hotkey: string
}

export const STAT_BARS: StatBarConfig[] = [
  { key: 'healthRegen', label: 'Health Regen', color: '#FF69B4', hotkey: '1' },
  { key: 'maxHealth', label: 'Max Health', color: '#DC143C', hotkey: '2' },
  { key: 'bodyDamage', label: 'Body Damage', color: '#FF8C00', hotkey: '3' },
  { key: 'bulletSpeed', label: 'Bullet Speed', color: '#FFD700', hotkey: '4' },
  { key: 'bulletPenetration', label: 'Bullet Penetration', color: '#00CED1', hotkey: '5' },
  { key: 'bulletDamage', label: 'Bullet Damage', color: '#4169E1', hotkey: '6' },
  { key: 'reload', label: 'Reload', color: '#9370DB', hotkey: '7' },
  { key: 'movementSpeed', label: 'Movement Speed', color: '#32CD32', hotkey: '8' }
]

export class UIManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private hoveredStat: StatType | null = null
  private statBarBounds: Map<StatType, { x: number, y: number, width: number, height: number }> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Failed to get UI 2D context')
    this.ctx = context
  }

  drawStatUpgradeUI(
    statPoints: Record<StatType, number>,
    availablePoints: number,
    onStatClick?: (stat: StatType) => void
  ) {
    const padding = 15
    const barHeight = 25
    const barSpacing = 8
    const barWidth = 220
    const maxStatPoints = 7

    this.statBarBounds.clear()

    this.ctx.save()

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.fillRect(
      padding - 5,
      this.canvas.height - (STAT_BARS.length * (barHeight + barSpacing) + padding + 35),
      barWidth + 10,
      STAT_BARS.length * (barHeight + barSpacing) + 40
    )

    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = 'bold 14px Inter, sans-serif'
    this.ctx.fillText(
      `Skill Points: ${availablePoints}`,
      padding,
      this.canvas.height - (STAT_BARS.length * (barHeight + barSpacing) + padding + 15)
    )

    STAT_BARS.forEach((stat, index) => {
      const x = padding
      const y = this.canvas.height - (STAT_BARS.length - index) * (barHeight + barSpacing) - padding - 10
      const points = statPoints[stat.key] || 0
      const fillWidth = (barWidth * points) / maxStatPoints
      const isHovered = this.hoveredStat === stat.key
      const canUpgrade = availablePoints > 0 && points < maxStatPoints

      this.statBarBounds.set(stat.key, { x, y, width: barWidth, height: barHeight })

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      this.ctx.fillRect(x, y, barWidth, barHeight)

      this.ctx.fillStyle = stat.color
      this.ctx.fillRect(x, y, fillWidth, barHeight)

      if (isHovered && canUpgrade) {
        this.ctx.strokeStyle = '#FFFFFF'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(x, y, barWidth, barHeight)
      } else {
        this.ctx.strokeStyle = '#000000'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(x, y, barWidth, barHeight)
      }

      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.font = '12px Inter, sans-serif'
      this.ctx.shadowColor = '#000000'
      this.ctx.shadowBlur = 3
      this.ctx.fillText(`[${stat.hotkey}] ${stat.label}`, x + 5, y + 17)
      this.ctx.shadowBlur = 0

      for (let i = 0; i < maxStatPoints; i++) {
        const segmentX = x + (barWidth * i) / maxStatPoints
        this.ctx.strokeStyle = '#000000'
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.moveTo(segmentX, y)
        this.ctx.lineTo(segmentX, y + barHeight)
        this.ctx.stroke()
      }
    })

    this.ctx.restore()
  }

  handleMouseMove(x: number, y: number) {
    this.hoveredStat = null

    for (const [stat, bounds] of this.statBarBounds) {
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        this.hoveredStat = stat
        break
      }
    }
  }

  handleClick(x: number, y: number, onStatClick: (stat: StatType) => void) {
    for (const [stat, bounds] of this.statBarBounds) {
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        onStatClick(stat)
        break
      }
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
  }
}
