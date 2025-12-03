import { useEffect, useRef, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileControlsProps {
  onMove: (x: number, y: number) => void
  onShootDirection: (x: number, y: number) => void
}

export function MobileControls({ onMove, onShootDirection }: MobileControlsProps) {
  const isMobile = useIsMobile()
  const [moveStickPosition, setMoveStickPosition] = useState({ x: 0, y: 0 })
  const [shootStickPosition, setShootStickPosition] = useState({ x: 0, y: 0 })
  const moveJoystickRef = useRef<HTMLDivElement>(null)
  const shootJoystickRef = useRef<HTMLDivElement>(null)
  const moveTouchIdRef = useRef<number | null>(null)
  const shootTouchIdRef = useRef<number | null>(null)

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
        
        const stickX = (deltaX / distance) * Math.min(clampedDistance, maxDistance * 0.8)
        const stickY = (deltaY / distance) * Math.min(clampedDistance, maxDistance * 0.8)
        
        setMoveStickPosition({ x: stickX, y: stickY })
        onMove(normalizedX, normalizedY)
      }
    }

    const handleShootTouch = (touch: Touch) => {
      if (!shootJoystickRef.current) return
      
      const rect = shootJoystickRef.current.getBoundingClientRect()
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
        
        const stickX = (deltaX / distance) * Math.min(clampedDistance, maxDistance * 0.8)
        const stickY = (deltaY / distance) * Math.min(clampedDistance, maxDistance * 0.8)
        
        setShootStickPosition({ x: stickX, y: stickY })
        onShootDirection(normalizedX, normalizedY)
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const touchTarget = touch.target as HTMLElement
        
        if (moveJoystickRef.current?.contains(touchTarget) && moveTouchIdRef.current === null) {
          e.preventDefault()
          moveTouchIdRef.current = touch.identifier
          handleMoveTouch(touch)
        } else if (shootJoystickRef.current?.contains(touchTarget) && shootTouchIdRef.current === null) {
          e.preventDefault()
          shootTouchIdRef.current = touch.identifier
          handleShootTouch(touch)
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i]
        
        if (touch.identifier === moveTouchIdRef.current) {
          e.preventDefault()
          handleMoveTouch(touch)
        } else if (touch.identifier === shootTouchIdRef.current) {
          e.preventDefault()
          handleShootTouch(touch)
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        
        if (touch.identifier === moveTouchIdRef.current) {
          moveTouchIdRef.current = null
          setMoveStickPosition({ x: 0, y: 0 })
          onMove(0, 0)
        } else if (touch.identifier === shootTouchIdRef.current) {
          shootTouchIdRef.current = null
          setShootStickPosition({ x: 0, y: 0 })
          onShootDirection(0, 0)
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
  }, [isMobile, onMove, onShootDirection])

  if (!isMobile) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div
        ref={moveJoystickRef}
        className="absolute bottom-8 left-8 w-32 h-32 pointer-events-auto touch-none"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-0 bg-primary/20 rounded-full border-2 border-primary/40" />
        <div 
          className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 bg-primary/80 rounded-full border-2 border-primary"
          style={{
            transform: `translate(${moveStickPosition.x}px, ${moveStickPosition.y}px)`,
            transition: moveStickPosition.x === 0 && moveStickPosition.y === 0 ? 'transform 0.1s ease-out' : 'none'
          }}
        />
        {moveStickPosition.x === 0 && moveStickPosition.y === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-primary-foreground/60 font-semibold pointer-events-none">
            MOVE
          </div>
        )}
      </div>

      <div
        ref={shootJoystickRef}
        className="absolute bottom-8 right-8 w-32 h-32 pointer-events-auto touch-none"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-0 bg-secondary/20 rounded-full border-2 border-secondary/40" />
        <div 
          className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 bg-secondary/80 rounded-full border-2 border-secondary"
          style={{
            transform: `translate(${shootStickPosition.x}px, ${shootStickPosition.y}px)`,
            transition: shootStickPosition.x === 0 && shootStickPosition.y === 0 ? 'transform 0.1s ease-out' : 'none'
          }}
        />
        {shootStickPosition.x === 0 && shootStickPosition.y === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-secondary-foreground/80 font-semibold pointer-events-none">
            AIM
          </div>
        )}
      </div>
    </div>
  )
}
