import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Monitor, Cpu, Zap, Target } from 'lucide-react'

interface FPSCounterProps {
  visible?: boolean
}

export function FPSCounter({ visible = true }: FPSCounterProps) {
  const [fps, setFps] = useState(60)
  const [particleCount, setParticleCount] = useState(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!visible) return

    let lastTime = performance.now()
    let frames = 0
    let fpsUpdateTime = 0

    const updateFPS = () => {
      const now = performance.now()
      frames++
      fpsUpdateTime += now - lastTime
      lastTime = now

      if (fpsUpdateTime >= 1000) {
        setFps(Math.round((frames * 1000) / fpsUpdateTime))
        frames = 0
        fpsUpdateTime = 0
      }

      requestAnimationFrame(updateFPS)
    }

    const rafId = requestAnimationFrame(updateFPS)
    return () => cancelAnimationFrame(rafId)
  }, [visible])

  if (!visible) return null

  return (
    <div className={`
      absolute z-10
      ${isMobile ? 'top-2 left-2' : 'top-4 left-4'}
      bg-black/60 backdrop-blur-xl
      border border-white/10
      rounded-lg
      p-2
      min-w-[120px]
    `}>
      <div className="space-y-1.5">
        {/* FPS */}
        <div className="flex items-center gap-2">
          <Monitor size={12} className="text-green-400" />
          <span className="text-xs font-mono text-white">
            <span className="text-white/60">FPS:</span>
            <span className={`ml-1 font-bold ${
              fps >= 55 ? 'text-green-400' :
              fps >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>{fps}</span>
          </span>
        </div>
        
        {/* Performance indicator */}
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-blue-400" />
          <span className="text-xs font-mono text-white">
            <span className="text-white/60">Load:</span>
            <span className={`ml-1 font-bold ${
              fps >= 55 ? 'text-green-400' :
              fps >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>{Math.round((60 - fps) / 60 * 100)}%</span>
          </span>
        </div>
        
        {!isMobile && (
          <div className="text-[10px] text-white/40 flex items-center gap-1 mt-1 pt-1 border-t border-white/10">
            <Target size={8} />
            <span>F3 to toggle</span>
          </div>
        )}
      </div>
    </div>
  )
}
