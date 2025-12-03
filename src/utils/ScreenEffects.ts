/**
 * Screen effects like shake, flash, etc.
 */

export interface ScreenShake {
  intensity: number
  duration: number
  elapsed: number
}

export class ScreenEffects {
  private shake: ScreenShake | null = null
  private flash: { alpha: number; color: string } | null = null

  /**
   * Trigger screen shake
   */
  startShake(intensity: number, duration: number): void {
    if (!this.shake || this.shake.intensity < intensity) {
      this.shake = {
        intensity,
        duration,
        elapsed: 0
      }
    }
  }

  /**
   * Trigger screen flash
   */
  startFlash(color: string, alpha: number = 0.5): void {
    this.flash = { alpha, color }
  }

  /**
   * Update effects
   */
  update(deltaTime: number): void {
    if (this.shake) {
      this.shake.elapsed += deltaTime
      if (this.shake.elapsed >= this.shake.duration) {
        this.shake = null
      }
    }

    if (this.flash) {
      this.flash.alpha *= 0.92
      if (this.flash.alpha < 0.01) {
        this.flash = null
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
    return this.flash
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
  }
}
