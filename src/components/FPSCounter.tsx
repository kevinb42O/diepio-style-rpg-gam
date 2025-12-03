import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

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
    <div className={`absolute ${isMobile ? 'top-2 left-2 text-xs' : 'top-4 left-4'} z-10 bg-black/50 px-2 py-1 rounded text-white font-mono`}>
      <div>FPS: {fps}</div>
      {!isMobile && <div className="text-xs opacity-75">Press F3 to toggle</div>}
    </div>
  )
}
