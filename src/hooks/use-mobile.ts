import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768

export interface DeviceInfo {
  isMobile: boolean
  isTouch: boolean
  isPortrait: boolean
  isLandscape: boolean
}

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTouch: false,
    isPortrait: true,
    isLandscape: false,
  })

  useEffect(() => {
    const checkDevice = () => {
      // Check for touch capability (critical for foldable phones)
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Check screen width
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT
      
      // Check orientation
      const isPortrait = window.innerHeight > window.innerWidth
      
      setDeviceInfo({
        isMobile: hasTouch || isSmallScreen,
        isTouch: hasTouch,
        isPortrait,
        isLandscape: !isPortrait,
      })
    }
    
    checkDevice()
    
    // Listen for resize and orientation changes
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  return deviceInfo
}

// Maintain backward compatibility
export function useIsMobile() {
  const { isMobile } = useDeviceInfo()
  return isMobile
}
