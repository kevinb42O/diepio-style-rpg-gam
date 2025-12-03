import { useEffect, useRef, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileControlsProps {
  onMove: (x: number, y: number) => void
  onShoot: (active: boolean) => void
}

export function MobileControls({ onMove, onShoot }: MobileControlsProps) {
  const isMobile = useIsMobile()
  const [moveActive, setMoveActive] = useState(false)
  const [shootActive, setShootActive] = useState(false)
  const moveJoystickRef = useRef<HTMLDivElement>(null)
  const shootJoystickRef = useRef<HTMLDivElement>(null)
  const moveTouchIdRef = useRef<number | null>(null)
  const shootTouchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const target = touch.target as HTMLElement
        
        if (moveJoystickRef.current?.contains(target) && moveTouchIdRef.current === null) {
          moveTouchIdRef.current = touch.identifier
          setMoveActive(true)
          handleMoveTouch(touch)
        } else if (shootJoystickRef.current?.contains(target) && shootTouchIdRef.current === null) {
          shootTouchIdRef.current = touch.identifier
          setShootActive(true)
          onShoot(true)
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        
        if (touch.identifier === moveTouchIdRef.current) {
          handleMoveTouch(touch)
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        
        if (touch.identifier === moveTouchIdRef.current) {
          moveTouchIdRef.current = null
          setMoveActive(false)
          onMove(0, 0)
        } else if (touch.identifier === shootTouchIdRef.current) {
          shootTouchIdRef.current = null
          setShootActive(false)
          onShoot(false)
        }
      }
    }

    const handleMoveTouch = (touch: Touch) => {
      if (!moveJoystickRef.current) return
      
      const rect = moveJoystickRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const deltaX = touch.clientX - centerX
      const deltaY = touch.clientY - centerY
      
      const maxDistance = rect.width / 2
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 0) {
        const normalizedX = deltaX / maxDistance
        const normalizedY = deltaY / maxDistance
        
        const clampedDistance = Math.min(distance, maxDistance)
        const clampedX = (deltaX / distance) * clampedDistance / maxDistance
        const clampedY = (deltaY / distance) * clampedDistance / maxDistance
        
        onMove(clampedX, clampedY)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isMobile, onMove, onShoot])

  if (!isMobile) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div
        ref={moveJoystickRef}
        className="absolute bottom-8 left-8 w-32 h-32 pointer-events-auto"
      >
        <div className="absolute inset-0 bg-primary/20 rounded-full border-2 border-primary/40" />
        {moveActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-primary/60 rounded-full border-2 border-primary" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center text-xs text-primary-foreground/60 font-semibold">
          MOVE
        </div>
      </div>

      <div
        ref={shootJoystickRef}
        className="absolute bottom-8 right-8 w-32 h-32 pointer-events-auto"
      >
        <div className={`absolute inset-0 rounded-full border-2 transition-all ${
          shootActive 
            ? 'bg-secondary/60 border-secondary' 
            : 'bg-secondary/20 border-secondary/40'
        }`} />
        <div className="absolute inset-0 flex items-center justify-center text-xs text-secondary-foreground/60 font-semibold">
          SHOOT
        </div>
      </div>
    </div>
  )
}
