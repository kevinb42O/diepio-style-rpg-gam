import { useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from '@phosphor-icons/react'
import { TANK_CONFIGS, type TankConfig } from '@/lib/tankConfigs'
import type { BarrelConfig } from '@/lib/tankConfigs'

interface ClassUpgradeModalProps {
  availableClasses: TankConfig[]
  onSelect: (className: string) => void
  onClose: () => void
}

export function ClassUpgradeModal({ availableClasses, onSelect, onClose }: ClassUpgradeModalProps) {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())

  useEffect(() => {
    canvasRefs.current.forEach((canvas, className) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const config = TANK_CONFIGS[className]
      if (!config) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      drawTankPreview(ctx, canvas.width / 2, canvas.height / 2, '#00B2E1', config.barrels, 30)
    })
  }, [availableClasses])

  const drawTankPreview = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    barrelConfig: BarrelConfig[],
    bodyRadius: number
  ) => {
    ctx.save()
    ctx.translate(x, y)

    for (const barrel of barrelConfig) {
      drawBarrel(ctx, barrel, color)
    }

    ctx.beginPath()
    ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.restore()
  }

  const drawBarrel = (
    ctx: CanvasRenderingContext2D,
    barrel: BarrelConfig,
    color: string
  ) => {
    ctx.save()
    ctx.rotate((barrel.angle * Math.PI) / 180)

    const offsetX = barrel.offsetX || 0
    const offsetY = barrel.offsetY || 0
    const scale = 0.8

    if (barrel.isTrapezoid) {
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY - (barrel.width / 2) * scale)
      ctx.lineTo(offsetX + barrel.length * scale, offsetY - (barrel.width / 1.3) * scale)
      ctx.lineTo(offsetX + barrel.length * scale, offsetY + (barrel.width / 1.3) * scale)
      ctx.lineTo(offsetX, offsetY + (barrel.width / 2) * scale)
      ctx.closePath()
    } else {
      ctx.beginPath()
      ctx.rect(
        offsetX,
        offsetY - (barrel.width / 2) * scale,
        barrel.length * scale,
        barrel.width * scale
      )
    }

    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-sm border-2 border-primary">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-title text-primary">Choose Your Class</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableClasses.map((config) => {
            const className = Object.keys(TANK_CONFIGS).find(
              (key) => TANK_CONFIGS[key] === config
            ) || 'basic'

            return (
              <Card
                key={className}
                className="p-4 border-2 border-border hover:border-primary transition-all cursor-pointer bg-muted/50"
                onClick={() => onSelect(className)}
              >
                <div className="flex flex-col items-center gap-3">
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(className, el)
                    }}
                    width={120}
                    height={120}
                    className="bg-background/50 rounded"
                  />
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">{config.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Tier {config.tier} • Level {config.unlocksAt}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(className)
                    }}
                  >
                    Select
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
