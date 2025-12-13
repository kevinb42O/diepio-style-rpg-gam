/**
 * Advanced particle system for visual effects
 * Supports various particle types with efficient pooling
 */

import { ObjectPool } from '@/utils/ObjectPool'
import type { Vector2 } from '@/lib/types'

export interface Particle {
  position: Vector2
  velocity: Vector2
  life: number
  maxLife: number
  alpha: number
  color: string
  size: number
  rotation?: number
  rotationSpeed?: number
  scale?: number
  type?: ParticleType
}

export type ParticleType = 
  | 'default'
  | 'bullet-trail'
  | 'muzzle-flash'
  | 'explosion'
  | 'level-up'
  | 'damage-number'
  | 'debris'

export class ParticleSystem {
  private particles: Particle[] = []
  private particlePool: ObjectPool<Particle>
  private maxParticles: number
  private isMobile: boolean

  constructor() {
    // Detect mobile device
    this.isMobile = typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Reduce maxParticles from 500 to 150 on mobile
    this.maxParticles = this.isMobile ? 150 : 500
    
    this.particlePool = new ObjectPool<Particle>(
      () => ({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        life: 0,
        maxLife: 1,
        alpha: 1,
        color: '#ffffff',
        size: 1,
        type: 'default'
      }),
      (p) => {
        p.life = 0
        p.alpha = 1
        p.scale = 1
        p.rotation = 0
        p.rotationSpeed = 0
      },
      this.isMobile ? 50 : 100,
      this.maxParticles
    )
  }

  /**
   * Create a burst of particles
   */
  createBurst(
    position: Vector2,
    count: number,
    options: Partial<{
      color: string
      size: number
      speed: number
      life: number
      spread: number
      type: ParticleType
    }> = {}
  ): void {
    const {
      color = '#ffaa44',
      size = 3,
      speed = 100,
      life = 0.5,
      spread = Math.PI * 2,
      type = 'default'
    } = options

    for (let i = 0; i < count; i++) {
      const angle = (spread * i) / count + Math.random() * 0.2
      const velocity = speed * (0.8 + Math.random() * 0.4)
      
      this.emit({
        position: { x: position.x, y: position.y },
        velocity: {
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity
        },
        life,
        maxLife: life,
        alpha: 1,
        color,
        size,
        type
      })
    }
  }

  /**
   * Create bullet trail particles
   */
  createBulletTrail(position: Vector2, velocity: Vector2, color: string = '#00B2E1'): void {
    if (this.particles.length >= this.maxParticles) return

    this.emit({
      position: { x: position.x, y: position.y },
      velocity: { x: velocity.x * 0.1, y: velocity.y * 0.1 },
      life: 0.15,
      maxLife: 0.15,
      alpha: 0.6,
      color,
      size: 2,
      type: 'bullet-trail'
    })
  }

  /**
   * Create explosion effect
   */
  createExplosion(position: Vector2, size: number = 20, color: string = '#ff8800'): void {
    // Reduce particle count on mobile (reduce from ~15 to ~5 for typical size)
    const baseCount = Math.floor(size / 3)
    const particleCount = this.isMobile ? Math.max(3, Math.floor(baseCount / 3)) : baseCount
    this.createBurst(position, particleCount, {
      color,
      size: 3 + size / 10,
      speed: 80 + size * 2,
      life: 0.4 + size / 50,
      type: 'explosion'
    })
  }

  /**
   * Create level-up celebration particles
   */
  createLevelUpEffect(position: Vector2): void {
    // Reduce from 12 to 5 particles on mobile
    const count = this.isMobile ? 5 : 12
    this.createBurst(position, count, {
      color: '#bb88ff',
      size: 5,
      speed: 150,
      life: 0.7,
      type: 'level-up'
    })
  }

  /**
   * Create floating damage number
   */
  createDamageNumber(position: Vector2, damage: number): void {
    this.emit({
      position: { x: position.x, y: position.y },
      velocity: { x: 0, y: -30 },
      life: 1.0,
      maxLife: 1.0,
      alpha: 1,
      color: '#ffdd44',
      size: Math.min(10, 6 + damage / 10),
      type: 'damage-number',
      scale: damage // Store damage value in scale property for rendering
    })
  }

  /**
   * Create debris particles
   */
  createDebris(position: Vector2, count: number = 4, color: string = '#ffaa44'): void {
    // Reduce particle count to 3 on mobile
    const adjustedCount = this.isMobile ? Math.max(2, Math.min(3, count)) : count
    this.createBurst(position, adjustedCount, {
      color,
      size: 3,
      speed: 120,
      life: 0.5,
      type: 'debris'
    })
  }

  /**
   * Emit a single particle
   */
  private emit(config: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      return
    }

    const particle = this.particlePool.acquire()
    Object.assign(particle, config)
    this.particles.push(particle)
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      
      p.life -= deltaTime
      if (p.life <= 0) {
        this.particlePool.release(p)
        this.particles.splice(i, 1)
        continue
      }

      // Update position
      p.position.x += p.velocity.x * deltaTime
      p.position.y += p.velocity.y * deltaTime

      // Apply gravity for some particle types
      if (p.type === 'debris' || p.type === 'explosion') {
        p.velocity.y += 100 * deltaTime
      }

      // Apply drag
      p.velocity.x *= 0.98
      p.velocity.y *= 0.98

      // Update alpha based on life
      p.alpha = Math.max(0, p.life / p.maxLife)

      // Update rotation if applicable
      if (p.rotationSpeed) {
        p.rotation = (p.rotation || 0) + p.rotationSpeed * deltaTime
      }
    }
  }

  /**
   * Get all active particles
   */
  getParticles(): Particle[] {
    return this.particles
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particlePool.releaseAll(this.particles)
    this.particles = []
  }

  /**
   * Get particle count
   */
  get count(): number {
    return this.particles.length
  }
}
