import { useEffect, useRef, useState } from 'react'
import { useDeviceInfo } from '@/hooks/use-mobile'

interface MobileControlsProps {
  onMove: (x: number, y: number) => void
  onShootDirection: (x: number, y: number) => void
}

export function MobileControls({ onMove, onShootDirection }: MobileControlsProps) {
  const { isMobile, isPortrait } = useDeviceInfo()
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

  // Calculate responsive joystick sizes and positions
  const joystickSize = isPortrait ? 'w-28 h-28' : 'w-24 h-24'
  const joystickInnerSize = isPortrait ? 'w-11 h-11' : 'w-9 h-9'
  // Calculate proper centering offset based on size (w-11 = 44px, w-9 = 36px)
  const innerOffset = isPortrait ? '-ml-5.5 -mt-5.5' : '-ml-4.5 -mt-4.5'
  
  // Position joysticks based on orientation
  // Portrait: bottom corners with safe area insets
  // Landscape: more vertically centered with safe area insets
  const moveJoystickPosition = isPortrait
    ? 'bottom-20 left-4'
    : 'bottom-[15vh] left-4'
  const shootJoystickPosition = isPortrait
    ? 'bottom-20 right-4'
    : 'bottom-[15vh] right-4'

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div
        ref={moveJoystickRef}
        className={`absolute ${moveJoystickPosition} ${joystickSize} pointer-events-auto touch-none`}
        style={{ 
          touchAction: 'none',
          bottom: `calc(${isPortrait ? '5rem' : '15vh'} + var(--safe-area-inset-bottom))`,
          left: `calc(1rem + var(--safe-area-inset-left))`
        }}
      >
        <div className="absolute inset-0 bg-primary/20 rounded-full border-2 border-primary/40" />
        <div 
          className={`absolute top-1/2 left-1/2 ${joystickInnerSize} ${innerOffset} bg-primary/80 rounded-full border-2 border-primary`}
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
        className={`absolute ${shootJoystickPosition} ${joystickSize} pointer-events-auto touch-none`}
        style={{ 
          touchAction: 'none',
          bottom: `calc(${isPortrait ? '5rem' : '15vh'} + var(--safe-area-inset-bottom))`,
          right: `calc(1rem + var(--safe-area-inset-right))`
        }}
      >
        <div className="absolute inset-0 bg-secondary/20 rounded-full border-2 border-secondary/40" />
        <div 
          className={`absolute top-1/2 left-1/2 ${joystickInnerSize} ${innerOffset} bg-secondary/80 rounded-full border-2 border-secondary`}
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
