import type { Vector2, Team, Projectile, Loot, BotPlayer } from './types'
import { TANK_CONFIGS } from './tankConfigs'

/**
 * Auto Turret interface representing a single auto turret
 */
export interface AutoTurret {
  id: string
  ownerId: string
  position: Vector2
  rotation: number
  targetRotation: number
  baseAngle: number
  reloadTimer: number
  lastShotTime: number
  isTracking: boolean
  barrelRecoil: number
}

interface OwnerInfo {
  position: Vector2
  team: Team
  tankClass: string
  bulletSpeed: number
  damage: number
  radius: number
}

/**
 * AutoTurretSystem manages all auto turrets in the game
 * Auto turrets are independent gun turrets that automatically track and shoot enemies
 */
export class AutoTurretSystem {
  private turrets: Map<string, AutoTurret[]> = new Map()
  private nextTurretId = 0

  // Constants
  private readonly DETECTION_RANGE = 400
  private readonly ROTATION_SPEED = 3.0 // radians per second
  private readonly IDLE_ROTATION_SPEED = 0.5 // radians per second when no target
  private readonly FIRE_RATE = 400 // milliseconds between shots
  private readonly BULLET_DAMAGE_MULTIPLIER = 0.7
  private readonly BULLET_SPEED_MULTIPLIER = 0.8

  /**
   * Create auto turrets for a tank owner
   */
  createTurretsForTank(
    ownerId: string,
    tankClass: string,
    ownerPosition: Vector2
  ): void {
    const tankConfig = TANK_CONFIGS[tankClass]
    if (!tankConfig || !tankConfig.autoTurrets) {
      return
    }

    // Remove existing turrets for this owner
    this.removeTurretsForOwner(ownerId)

    const turretCount = tankConfig.autoTurrets
    const turrets: AutoTurret[] = []

    for (let i = 0; i < turretCount; i++) {
      // Calculate base angle for turret positioning
      // For multiple turrets, evenly space them around the tank
      const baseAngle = (Math.PI * 2 * i) / turretCount

      turrets.push({
        id: `turret_${this.nextTurretId++}`,
        ownerId,
        position: { ...ownerPosition },
        rotation: baseAngle,
        targetRotation: baseAngle,
        baseAngle,
        reloadTimer: 0,
        lastShotTime: 0,
        isTracking: false,
        barrelRecoil: 0,
      })
    }

    this.turrets.set(ownerId, turrets)
  }

  /**
   * Update all turrets - returns array of projectiles to spawn
   */
  update(
    deltaTime: number,
    owners: Map<string, OwnerInfo>,
    enemies: Array<{ id: string; position: Vector2; team: Team; radius: number }>,
    loot: Loot[],
    currentTime: number
  ): Projectile[] {
    const projectiles: Projectile[] = []

    // Update each owner's turrets
    for (const [ownerId, ownerTurrets] of this.turrets.entries()) {
      const owner = owners.get(ownerId)
      if (!owner) {
        // Owner no longer exists, will be cleaned up
        continue
      }

      for (const turret of ownerTurrets) {
        // Update turret position to follow owner
        turret.position.x = owner.position.x
        turret.position.y = owner.position.y

        // Update barrel recoil
        if (turret.barrelRecoil > 0) {
          turret.barrelRecoil = Math.max(0, turret.barrelRecoil - deltaTime * 30)
        }

        // Find target
        const target = this.findNearestTarget(
          turret,
          owner.position,
          owner.team,
          enemies,
          loot
        )

        // Update aim
        this.updateTurretAim(turret, target, deltaTime)

        // Try to shoot
        const projectile = this.tryShoot(turret, owner, currentTime)
        if (projectile) {
          projectiles.push(projectile)
        }

        // Update reload timer
        if (turret.reloadTimer > 0) {
          turret.reloadTimer -= deltaTime * 1000
        }
      }
    }

    return projectiles
  }

  /**
   * Find the nearest valid target for a turret
   */
  private findNearestTarget(
    turret: AutoTurret,
    ownerPos: Vector2,
    ownerTeam: Team,
    enemies: Array<{ id: string; position: Vector2; team: Team; radius: number }>,
    loot: Loot[]
  ): Vector2 | null {
    let nearestTarget: Vector2 | null = null
    let nearestDistSq = this.DETECTION_RANGE * this.DETECTION_RANGE

    // Priority 1: Enemy players/bots
    for (const enemy of enemies) {
      // Skip allies
      if (enemy.team === ownerTeam) continue

      const dx = enemy.position.x - ownerPos.x
      const dy = enemy.position.y - ownerPos.y
      const distSq = dx * dx + dy * dy

      if (distSq < nearestDistSq) {
        nearestDistSq = distSq
        nearestTarget = enemy.position
      }
    }

    // Priority 2: Loot/shapes (if no enemy found)
    if (!nearestTarget) {
      for (const item of loot) {
        if (item.type !== 'box' && item.type !== 'treasure' && item.type !== 'boss') {
          continue
        }

        const dx = item.position.x - ownerPos.x
        const dy = item.position.y - ownerPos.y
        const distSq = dx * dx + dy * dy

        if (distSq < nearestDistSq) {
          nearestDistSq = distSq
          nearestTarget = item.position
        }
      }
    }

    return nearestTarget
  }

  /**
   * Update turret rotation to aim at target
   */
  private updateTurretAim(
    turret: AutoTurret,
    targetPos: Vector2 | null,
    deltaTime: number
  ): void {
    if (targetPos) {
      // Calculate angle to target
      const dx = targetPos.x - turret.position.x
      const dy = targetPos.y - turret.position.y
      turret.targetRotation = Math.atan2(dy, dx)
      turret.isTracking = true
    } else {
      // No target - slowly rotate in idle pattern
      turret.targetRotation = turret.rotation + this.IDLE_ROTATION_SPEED * deltaTime
      turret.isTracking = false
    }

    // Smoothly rotate towards target
    const rotationSpeed = turret.isTracking ? this.ROTATION_SPEED : this.IDLE_ROTATION_SPEED
    const angleDiff = this.normalizeAngle(turret.targetRotation - turret.rotation)
    const rotationAmount = rotationSpeed * deltaTime

    if (Math.abs(angleDiff) < rotationAmount) {
      turret.rotation = turret.targetRotation
    } else {
      turret.rotation += Math.sign(angleDiff) * rotationAmount
    }

    // Normalize rotation to [-PI, PI]
    turret.rotation = this.normalizeAngle(turret.rotation)
  }

  /**
   * Attempt to shoot from turret if conditions are met
   */
  private tryShoot(
    turret: AutoTurret,
    owner: OwnerInfo,
    currentTime: number
  ): Projectile | null {
    // Only shoot if tracking a target and reload is ready
    if (!turret.isTracking) {
      return null
    }

    if (currentTime - turret.lastShotTime < this.FIRE_RATE) {
      return null
    }

    // Calculate barrel tip position
    const barrelLength = 30
    const barrelTipX = turret.position.x + Math.cos(turret.rotation) * barrelLength
    const barrelTipY = turret.position.y + Math.sin(turret.rotation) * barrelLength

    // Create projectile
    const bulletSpeed = owner.bulletSpeed * this.BULLET_SPEED_MULTIPLIER
    const projectile: Projectile = {
      id: `turret_proj_${Date.now()}_${Math.random()}`,
      position: { x: barrelTipX, y: barrelTipY },
      velocity: {
        x: Math.cos(turret.rotation) * bulletSpeed,
        y: Math.sin(turret.rotation) * bulletSpeed,
      },
      damage: owner.damage * this.BULLET_DAMAGE_MULTIPLIER,
      radius: 4,
      isPlayerProjectile: false, // Auto turrets are not direct player projectiles
      ownerId: turret.ownerId,
      team: owner.team,
    }

    // Update turret state
    turret.lastShotTime = currentTime
    turret.barrelRecoil = 8

    return projectile
  }

  /**
   * Normalize angle to [-PI, PI] range
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2
    while (angle < -Math.PI) angle += Math.PI * 2
    return angle
  }

  /**
   * Remove all turrets for an owner
   */
  removeTurretsForOwner(ownerId: string): void {
    this.turrets.delete(ownerId)
  }

  /**
   * Get all turrets for an owner
   */
  getTurretsForOwner(ownerId: string): AutoTurret[] {
    return this.turrets.get(ownerId) || []
  }

  /**
   * Get all turrets (for rendering)
   */
  getAllTurrets(): Map<string, AutoTurret[]> {
    return this.turrets
  }

  /**
   * Clear all turrets
   */
  clear(): void {
    this.turrets.clear()
    this.nextTurretId = 0
  }
}
