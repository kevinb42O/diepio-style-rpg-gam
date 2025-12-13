/**
 * Screen effects like shake, flash, vignette, etc.
 * Provides meaningful visual feedback tied to game events.
 */

import { isMobileDevice } from './deviceDetection'

export interface ScreenShake {
  intensity: number
  duration: number
  elapsed: number
}

export type EffectType = 
  | 'damage'        // Red flash when player takes damage
  | 'heal'          // Green pulse when healing
  | 'levelUp'       // Purple/gold celebration
  | 'kill'          // Brief white/team color flash for kills
  | 'critical'      // Yellow flash for critical hits
  | 'ability'       // Blue flash for ability usage
  | 'shield'        // Cyan flash when shield blocks
  | 'generic'       // Default fallback

export interface Vignette {
  intensity: number      // 0-1 how dark the edges are
  color: string          // Color of vignette (usually red for low health)
  pulseSpeed: number     // How fast it pulses (0 = no pulse)
  pulsePhase: number     // Current pulse phase
}

export class ScreenEffects {
  private shake: ScreenShake | null = null
  private flash: { alpha: number; color: string; fadeSpeed: number } | null = null
  private vignette: Vignette = {
    intensity: 0,
    color: '#000000',
    pulseSpeed: 0,
    pulsePhase: 0
  }
  
  // Low health danger vignette
  private lowHealthVignette = {
    enabled: false,
    intensity: 0,
    pulsePhase: 0
  }
  
  // Chromatic aberration for heavy impacts
  private chromaticAberration = 0
  
  // Screen tint for status effects
  private screenTint: { color: string; alpha: number } | null = null

  // Mobile detection and performance mode
  static isMobileDevice = isMobileDevice
  
  // Enable performance mode on mobile to reduce visual effects and improve FPS
  performanceMode = isMobileDevice

  /**
   * Trigger screen shake with context
   * Intensity guide:
   * - 1-2: Minor (small hits, firing)
   * - 3-5: Medium (taking damage, explosions nearby)
   * - 6-10: Heavy (big explosions, level up)
   * - 10+: Epic (boss kills, major events)
   */
  startShake(intensity: number, duration: number): void {
    // Disable screen shake completely on mobile for performance
    if (this.performanceMode) {
      return
    }
    
    if (!this.shake || this.shake.intensity < intensity) {
      this.shake = {
        intensity,
        duration,
        elapsed: 0
      }
    }
  }

  /**
   * Trigger screen flash (legacy method for compatibility)
   */
  startFlash(color: string, alpha: number = 0.5): void {
    this.flash = { alpha, color, fadeSpeed: 0.92 }
  }
  
  /**
   * Trigger contextual flash based on event type
   */
  triggerFlash(type: EffectType, intensity: number = 1): void {
    const configs: Record<EffectType, { color: string; alpha: number; fadeSpeed: number }> = {
      damage: { color: '#ff2222', alpha: 0.35 * intensity, fadeSpeed: 0.88 },
      heal: { color: '#44ff66', alpha: 0.25 * intensity, fadeSpeed: 0.94 },
      levelUp: { color: '#bb88ff', alpha: 0.15 * intensity, fadeSpeed: 0.90 },
      kill: { color: '#ffffff', alpha: 0.05 * intensity, fadeSpeed: 0.95 },
      critical: { color: '#ffdd00', alpha: 0.3 * intensity, fadeSpeed: 0.90 },
      ability: { color: '#4488ff', alpha: 0.2 * intensity, fadeSpeed: 0.93 },
      shield: { color: '#44ffff', alpha: 0.25 * intensity, fadeSpeed: 0.92 },
      generic: { color: '#ffffff', alpha: 0.2 * intensity, fadeSpeed: 0.92 }
    }
    
    const config = configs[type]
    // Reduce flash opacity by 50% on mobile for performance
    const mobileMultiplier = this.performanceMode ? 0.5 : 1
    const adjustedAlpha = config.alpha * mobileMultiplier
    
    // Only override if this flash is more intense
    if (!this.flash || this.flash.alpha < adjustedAlpha) {
      this.flash = { ...config, alpha: adjustedAlpha }
    }
  }

  /**
   * Update low health vignette based on player health percentage
   */
  updateLowHealthVignette(healthPercent: number): void {
    // Start showing danger vignette below 40% health
    if (healthPercent < 0.4) {
      this.lowHealthVignette.enabled = true
      // Intensity increases as health drops (max at 10% health)
      this.lowHealthVignette.intensity = Math.min(1, (0.4 - healthPercent) / 0.3)
    } else {
      this.lowHealthVignette.enabled = false
      this.lowHealthVignette.intensity = 0
    }
  }
  
  /**
   * Trigger chromatic aberration for heavy impacts
   */
  triggerChromaticAberration(intensity: number = 1): void {
    // Disable chromatic aberration on mobile for performance
    if (this.performanceMode) {
      return
    }
    
    this.chromaticAberration = Math.max(this.chromaticAberration, Math.min(1, intensity))
  }
  
  /**
   * Set screen tint for status effects (poison, fire, etc.)
   */
  setScreenTint(color: string | null, alpha: number = 0.1): void {
    if (color) {
      this.screenTint = { color, alpha }
    } else {
      this.screenTint = null
    }
  }

  /**
   * Update effects
   */
  update(deltaTime: number): void {
    // Update shake
    if (this.shake) {
      this.shake.elapsed += deltaTime
      if (this.shake.elapsed >= this.shake.duration) {
        this.shake = null
      }
    }

    // Update flash with custom fade speed
    if (this.flash) {
      this.flash.alpha *= this.flash.fadeSpeed
      if (this.flash.alpha < 0.01) {
        this.flash = null
      }
    }
    
    // Update low health pulse
    if (this.lowHealthVignette.enabled) {
      // Faster pulse as health gets lower
      const pulseSpeed = 2 + this.lowHealthVignette.intensity * 4
      this.lowHealthVignette.pulsePhase += deltaTime * pulseSpeed
    }
    
    // Decay chromatic aberration
    if (this.chromaticAberration > 0) {
      this.chromaticAberration *= 0.92
      if (this.chromaticAberration < 0.01) {
        this.chromaticAberration = 0
      }
    }
  }

  /**
   * Get current shake offset
   */
  getShakeOffset(): { x: number; y: number } {
    if (!this.shake) {
      return { x: 0, y: 0 }
    }

    const progress = this.shake.elapsed / this.shake.duration
    const intensity = this.shake.intensity * (1 - progress)
    
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2
    }
  }

  /**
   * Get current flash
   */
  getFlash(): { alpha: number; color: string } | null {
    return this.flash ? { alpha: this.flash.alpha, color: this.flash.color } : null
  }
  
  /**
   * Get low health vignette state
   */
  getLowHealthVignette(): { intensity: number; pulse: number } | null {
    if (!this.lowHealthVignette.enabled) return null
    
    // Pulsing effect - oscillates between base intensity and higher
    const pulseAmount = Math.sin(this.lowHealthVignette.pulsePhase) * 0.3 + 0.7
    const finalIntensity = this.lowHealthVignette.intensity * pulseAmount
    
    return {
      intensity: finalIntensity,
      pulse: pulseAmount
    }
  }
  
  /**
   * Get chromatic aberration amount
   */
  getChromaticAberration(): number {
    return this.chromaticAberration
  }
  
  /**
   * Get screen tint
   */
  getScreenTint(): { color: string; alpha: number } | null {
    return this.screenTint
  }

  /**
   * Check if shake is active
   */
  isShaking(): boolean {
    return this.shake !== null
  }

  /**
   * Clear all effects
   */
  clear(): void {
    this.shake = null
    this.flash = null
    this.lowHealthVignette.enabled = false
    this.lowHealthVignette.intensity = 0
    this.chromaticAberration = 0
    this.screenTint = null
  }
}
