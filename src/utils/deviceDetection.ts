/**
 * Device detection utilities
 */

/**
 * Detect if the current device is a mobile device
 * Uses user agent string to identify mobile devices
 */
export const isMobileDevice = (() => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})()
