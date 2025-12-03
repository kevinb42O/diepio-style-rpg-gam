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
  const [moveStickPosition, setMoveStickPosition] = useState({ x: 0, y: 0 })
  const moveJoystickRef = useRef<HTMLDivElement>(null)
  const shootButtonRef = useRef<HTMLDivElement>(null)
  const moveTouchIdRef = useRef<number | null>(null)
  const shootTouchIdRef = useRef<number | null>(null)
  const moveInputRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isMobile) return

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
        const clampedDistance = Math.min(distance, maxDistance)
        const normalizedX = (deltaX / distance) * (clampedDistance / maxDistance)
        const normalizedY = (deltaY / distance) * (clampedDistance / maxDistance)
        
        const stickX = (deltaX / maxDistance) * (rect.width / 2 - 24)
        const stickY = (deltaY / maxDistance) * (rect.width / 2 - 24)
        const stickDistance = Math.sqrt(stickX * stickX + stickY * stickY)
        const maxStickDistance = rect.width / 2 - 24
        
        if (stickDistance > maxStickDistance) {
          const scale = maxStickDistance / stickDistance
          setMoveStickPosition({ x: stickX * scale, y: stickY * scale })
        } else {
          setMoveStickPosition({ x: stickX, y: stickY })
        }
        
        moveInputRef.current = { x: normalizedX, y: normalizedY }
        onMove(normalizedX, normalizedY)
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const touchTarget = touch.target as HTMLElement
        
        if (moveJoystickRef.current?.contains(touchTarget) && moveTouchIdRef.current === null) {
          e.preventDefault()
          moveTouchIdRef.current = touch.identifier
          setMoveActive(true)
          handleMoveTouch(touch)
        } else if (shootButtonRef.current?.contains(touchTarget) && shootTouchIdRef.current === null) {
          e.preventDefault()
          shootTouchIdRef.current = touch.identifier
          setShootActive(true)
          onShoot(true)
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i]
        
        if (touch.identifier === moveTouchIdRef.current) {
          e.preventDefault()
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
          setMoveStickPosition({ x: 0, y: 0 })
          moveInputRef.current = { x: 0, y: 0 }
          onMove(0, 0)
        } else if (touch.identifier === shootTouchIdRef.current) {
          shootTouchIdRef.current = null
          setShootActive(false)
          onShoot(false)
        }
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
        className="absolute bottom-8 left-8 w-32 h-32 pointer-events-auto touch-none"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-0 bg-primary/20 rounded-full border-2 border-primary/40" />
        {moveActive && (
          <div 
            className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 bg-primary/80 rounded-full border-2 border-primary transition-transform"
            style={{
              transform: `translate(${moveStickPosition.x}px, ${moveStickPosition.y}px)`
            }}
          />
        )}
        {!moveActive && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-primary-foreground/60 font-semibold">
            MOVE
          </div>
        )}
      </div>

      <div
        ref={shootButtonRef}
        className="absolute bottom-8 right-8 w-32 h-32 pointer-events-auto touch-none"
        style={{ touchAction: 'none' }}
      >
        <div className={`absolute inset-0 rounded-full border-2 transition-all ${
          shootActive 
            ? 'bg-secondary/80 border-secondary scale-95' 
            : 'bg-secondary/20 border-secondary/40'
        }`} />
        <div className="absolute inset-0 flex items-center justify-center text-xs text-secondary-foreground/80 font-semibold pointer-events-none">
          SHOOT
        </div>
      </div>
    </div>
  )
}
