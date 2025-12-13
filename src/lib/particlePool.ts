/**
 * Particle Pool System with Object Pooling
 * Pre-allocates 500 particles to prevent garbage collection
 */

import type { Vector2, PooledParticle } from './types'
import { isMobileDevice } from '@/utils/deviceDetection'

export class ParticlePool {
  private pool: PooledParticle[] = []
  private readonly isMobile: boolean
  private readonly maxParticles: number

  constructor() {
    // Detect mobile device
    this.isMobile = isMobileDevice
    
    // Reduce maxParticles from 500 to 150 on mobile
    this.maxParticles = this.isMobile ? 150 : 500
    
    this.initializePool()
  }

  private initializePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        life: 0,
        maxLife: 1,
        alpha: 1,
        color: '#ffffff',
        size: 1,
        rotation: 0,
        rotationSpeed: 0,
        scale: 1,
        type: 'muzzle',
        active: false,
      })
    }
  }

  /**
   * Get an inactive particle from the pool
   */
  private getParticle(): PooledParticle | null {
    for (const particle of this.pool) {
      if (!particle.active) {
        return particle
      }
    }
    return null
  }

  /**
   * Emit muzzle flash particles
   */
  emitMuzzleFlash(position: Vector2, angle: number) {
    const count = 3
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle()
      if (!particle) return

      const spread = (Math.random() - 0.5) * 0.3
      const speed = 100 + Math.random() * 50
      particle.position.x = position.x
      particle.position.y = position.y
      particle.velocity.x = Math.cos(angle + spread) * speed
      particle.velocity.y = Math.sin(angle + spread) * speed
      particle.life = 0
      particle.maxLife = 0.15
      particle.alpha = 1
      particle.color = '#ffaa00'
      particle.size = 3 + Math.random() * 2
      particle.rotation = Math.random() * Math.PI * 2
      particle.rotationSpeed = (Math.random() - 0.5) * 10
      particle.scale = 1
      particle.type = 'muzzle'
      particle.active = true
    }
  }

  /**
   * Emit smoke particles
   */
  emitSmoke(position: Vector2, angle: number) {
    const count = 2
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle()
      if (!particle) return

      const spread = (Math.random() - 0.5) * 0.5
      const speed = 30 + Math.random() * 20
      particle.position.x = position.x
      particle.position.y = position.y
      particle.velocity.x = Math.cos(angle + spread) * speed
      particle.velocity.y = Math.sin(angle + spread) * speed
      particle.life = 0
      particle.maxLife = 0.5
      particle.alpha = 0.6
      particle.color = '#666666'
      particle.size = 4 + Math.random() * 3
      particle.rotation = Math.random() * Math.PI * 2
      particle.rotationSpeed = (Math.random() - 0.5) * 5
      particle.scale = 1
      particle.type = 'smoke'
      particle.active = true
    }
  }

  /**
   * Emit spark burst on impact
   */
  emitSparkBurst(position: Vector2, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle()
      if (!particle) return

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 80 + Math.random() * 40
      particle.position.x = position.x
      particle.position.y = position.y
      particle.velocity.x = Math.cos(angle) * speed
      particle.velocity.y = Math.sin(angle) * speed
      particle.life = 0
      particle.maxLife = 0.3
      particle.alpha = 1
      particle.color = Math.random() > 0.5 ? '#ffff00' : '#ff8800'
      particle.size = 2 + Math.random()
      particle.rotation = 0
      particle.rotationSpeed = 0
      particle.scale = 1
      particle.type = 'spark'
      particle.active = true
    }
  }

  /**
   * Emit energy swirl for drone spawn
   */
  emitEnergySwirl(position: Vector2, color: string = '#00ffff') {
    const count = 8
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle()
      if (!particle) return

      const angle = (Math.PI * 2 * i) / count
      const speed = 60 + Math.random() * 20
      particle.position.x = position.x + Math.cos(angle) * 15
      particle.position.y = position.y + Math.sin(angle) * 15
      particle.velocity.x = Math.cos(angle) * speed
      particle.velocity.y = Math.sin(angle) * speed
      particle.life = 0
      particle.maxLife = 0.6
      particle.alpha = 0.8
      particle.color = color
      particle.size = 3
      particle.rotation = angle
      particle.rotationSpeed = 5
      particle.scale = 1
      particle.type = 'energy'
      particle.active = true
    }
  }

  /**
   * Emit golden burst on level up
   */
  emitLevelUpBurst(position: Vector2) {
    // Reduce from 20 to 5 particles on mobile
    const count = this.isMobile ? 5 : 20
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle()
      if (!particle) return

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2
      const speed = 100 + Math.random() * 100
      particle.position.x = position.x
      particle.position.y = position.y
      particle.velocity.x = Math.cos(angle) * speed
      particle.velocity.y = Math.sin(angle) * speed
      particle.life = 0
      particle.maxLife = 0.8
      particle.alpha = 1
      particle.color = Math.random() > 0.5 ? '#ffdd00' : '#ffaa00'
      particle.size = 4 + Math.random() * 3
      particle.rotation = Math.random() * Math.PI * 2
      particle.rotationSpeed = (Math.random() - 0.5) * 8
      particle.scale = 1
      particle.type = 'levelup'
      particle.active = true
    }
  }

  /**
   * Emit debris on shape destruction
   */
  emitDebris(position: Vector2, velocity: Vector2, color: string = '#888888') {
    // Reduce from 6 to 2 particles on mobile
    const count = this.isMobile ? 2 : 6
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle()
      if (!particle) return

      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 50
      particle.position.x = position.x
      particle.position.y = position.y
      particle.velocity.x = velocity.x * 0.3 + Math.cos(angle) * speed
      particle.velocity.y = velocity.y * 0.3 + Math.sin(angle) * speed
      particle.life = 0
      particle.maxLife = 0.5
      particle.alpha = 1
      particle.color = color
      particle.size = 3 + Math.random() * 2
      particle.rotation = Math.random() * Math.PI * 2
      particle.rotationSpeed = (Math.random() - 0.5) * 15
      particle.scale = 1
      particle.type = 'debris'
      particle.active = true
    }
  }

  /**
   * Emit speed trails for fast tanks
   */
  emitSpeedTrail(position: Vector2, velocity: Vector2, color: string = '#00ccff') {
    const particle = this.getParticle()
    if (!particle) return

    particle.position.x = position.x + (Math.random() - 0.5) * 20
    particle.position.y = position.y + (Math.random() - 0.5) * 20
    particle.velocity.x = velocity.x * -0.2
    particle.velocity.y = velocity.y * -0.2
    particle.life = 0
    particle.maxLife = 0.3
    particle.alpha = 0.5
    particle.color = color
    particle.size = 4
    particle.rotation = 0
    particle.rotationSpeed = 0
    particle.scale = 1
    particle.type = 'trail'
    particle.active = true
  }

  /**
   * Update all active particles
   */
  update(deltaTime: number) {
    for (const particle of this.pool) {
      if (!particle.active) continue

      particle.life += deltaTime
      if (particle.life >= particle.maxLife) {
        particle.active = false
        continue
      }

      // Update position
      particle.position.x += particle.velocity.x * deltaTime
      particle.position.y += particle.velocity.y * deltaTime

      // Apply drag
      particle.velocity.x *= 0.95
      particle.velocity.y *= 0.95

      // Update rotation
      particle.rotation += particle.rotationSpeed * deltaTime

      // Update alpha based on lifetime
      const lifeFactor = particle.life / particle.maxLife
      particle.alpha = 1 - lifeFactor

      // Type-specific updates
      if (particle.type === 'smoke') {
        particle.scale = 1 + lifeFactor * 2
      } else if (particle.type === 'debris') {
        particle.velocity.y += 200 * deltaTime // gravity
      }
    }
  }

  /**
   * Get all active particles for rendering
   */
  getActiveParticles(): PooledParticle[] {
    return this.pool.filter(p => p.active)
  }

  /**
   * Clear all particles
   */
  clear() {
    for (const particle of this.pool) {
      particle.active = false
    }
  }
}
