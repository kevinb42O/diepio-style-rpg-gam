import type { Vector2, Team } from './types'

/**
 * Trap interface representing a deployed trap
 */
export interface Trap {
  id: string
  ownerId: string
  team: Team
  position: Vector2
  velocity: Vector2
  rotation: number
  size: number
  health: number
  maxHealth: number
  damage: number
  createdAt: number
  duration: number
  isStationary: boolean
}

/**
 * Configuration for trap spawning
 */
export interface TrapConfig {
  size: number
  health: number
  duration: number
  damage?: number
  initialSpeed?: number
}

interface Entity {
  id: string
  position: Vector2
  team?: Team
  radius: number
  health?: number
}

/**
 * TrapSystem manages all traps in the game
 * Traps are projectiles that decelerate to stationary and persist for a duration
 */
export class TrapSystem {
  private traps: Trap[] = []
  private nextTrapId = 0

  // Constants
  private readonly DECELERATION_RATE = 0.05 // Percentage of velocity lost per second
  private readonly STATIONARY_THRESHOLD = 5 // units/second
  private readonly ROTATION_SPEED = 0.5 // radians per second
  private readonly DEFAULT_DAMAGE = 30
  private readonly DEFAULT_INITIAL_SPEED = 300

  /**
   * Spawn a new trap
   */
  spawnTrap(
    ownerId: string,
    team: Team,
    position: Vector2,
    angle: number,
    config: TrapConfig,
    ownerStats: { damage: number }
  ): void {
    const initialSpeed = config.initialSpeed || this.DEFAULT_INITIAL_SPEED
    const trapDamage = config.damage || this.DEFAULT_DAMAGE

    const trap: Trap = {
      id: `trap_${this.nextTrapId++}_${Date.now()}`,
      ownerId,
      team,
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * initialSpeed,
        y: Math.sin(angle) * initialSpeed,
      },
      rotation: Math.random() * Math.PI * 2,
      size: config.size,
      health: config.health,
      maxHealth: config.health,
      damage: trapDamage + ownerStats.damage * 0.3, // Scale with owner damage
      createdAt: Date.now(),
      duration: config.duration,
      isStationary: false,
    }

    this.traps.push(trap)
  }

  /**
   * Update all traps - physics and expiration
   */
  update(deltaTime: number, currentTime: number): void {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i]

      // Check expiration
      if (this.checkTrapExpiry(trap, currentTime)) {
        this.traps.splice(i, 1)
        continue
      }

      // Update rotation for visual effect
      trap.rotation += this.ROTATION_SPEED * deltaTime

      // Update physics if not stationary
      if (!trap.isStationary) {
        this.decelerateTrap(trap, deltaTime)
      }

      // Update position
      trap.position.x += trap.velocity.x * deltaTime
      trap.position.y += trap.velocity.y * deltaTime
    }
  }

  /**
   * Decelerate trap velocity
   */
  private decelerateTrap(trap: Trap, deltaTime: number): void {
    const decelFactor = Math.pow(1 - this.DECELERATION_RATE, deltaTime)
    trap.velocity.x *= decelFactor
    trap.velocity.y *= decelFactor

    // Check if trap has become stationary
    const speed = Math.sqrt(
      trap.velocity.x * trap.velocity.x + trap.velocity.y * trap.velocity.y
    )

    if (speed < this.STATIONARY_THRESHOLD) {
      trap.velocity.x = 0
      trap.velocity.y = 0
      trap.isStationary = true
    }
  }

  /**
   * Check if trap has expired
   */
  private checkTrapExpiry(trap: Trap, currentTime: number): boolean {
    return currentTime - trap.createdAt >= trap.duration
  }

  /**
   * Check collisions between traps and entities
   * Returns array of collision results
   */
  checkCollisions(
    enemies: Entity[]
  ): Array<{ trapId: string; enemyId: string; damage: number }> {
    const collisions: Array<{ trapId: string; enemyId: string; damage: number }> = []

    for (const trap of this.traps) {
      for (const enemy of enemies) {
        // Skip friendly fire
        if (enemy.team && enemy.team === trap.team) {
          continue
        }

        const dx = trap.position.x - enemy.position.x
        const dy = trap.position.y - enemy.position.y
        const distSq = dx * dx + dy * dy
        const radSum = trap.size + enemy.radius

        if (distSq < radSum * radSum) {
          collisions.push({
            trapId: trap.id,
            enemyId: enemy.id,
            damage: trap.damage,
          })
        }
      }
    }

    return collisions
  }

  /**
   * Damage a trap - returns true if trap was destroyed
   */
  damageTrap(trapId: string, damage: number): boolean {
    const trapIndex = this.traps.findIndex((t) => t.id === trapId)
    if (trapIndex === -1) return false

    const trap = this.traps[trapIndex]
    trap.health -= damage

    if (trap.health <= 0) {
      this.traps.splice(trapIndex, 1)
      return true
    }

    return false
  }

  /**
   * Get all traps
   */
  getTraps(): Trap[] {
    return this.traps
  }

  /**
   * Get traps for a specific owner
   */
  getTrapsForOwner(ownerId: string): Trap[] {
    return this.traps.filter((t) => t.ownerId === ownerId)
  }

  /**
   * Remove a specific trap
   */
  removeTrap(trapId: string): void {
    const index = this.traps.findIndex((t) => t.id === trapId)
    if (index !== -1) {
      this.traps.splice(index, 1)
    }
  }

  /**
   * Clear all traps
   */
  clear(): void {
    this.traps = []
    this.nextTrapId = 0
  }
}
