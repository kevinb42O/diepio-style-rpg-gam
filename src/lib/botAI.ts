/**
 * Bot AI System
 * Manages bot spawning, behavior, and combat
 */

import type { BotPlayer, Vector2, Projectile, Loot, Drone, Zone } from './types'
import { TANK_CONFIGS } from './tankConfigs'

export class BotAISystem {
  private bots: BotPlayer[] = []
  private botIdCounter = 0
  private lastSpawnTime = 0
  private worldCenter: Vector2 = { x: 8000, y: 8000 }

  /**
   * Get all bots
   */
  getBots(): BotPlayer[] {
    return this.bots
  }

  /**
   * Update bot spawning based on zones
   */
  updateSpawning(zones: Zone[], currentTime: number) {
    // Spawn bots if needed (every 5 seconds check)
    if (currentTime - this.lastSpawnTime < 5000) return
    this.lastSpawnTime = currentTime

    for (const zone of zones) {
      if (zone.maxBots === 0) continue

      const botsInZone = this.bots.filter(b => b.spawnZone === zone.id).length
      const needToSpawn = zone.maxBots - botsInZone

      for (let i = 0; i < needToSpawn; i++) {
        this.spawnBot(zone)
      }
    }
  }

  /**
   * Spawn a bot in a zone
   */
  private spawnBot(zone: Zone) {
    // Random position in zone
    const angle = Math.random() * Math.PI * 2
    const distance = zone.radiusMin + Math.random() * (zone.radiusMax - zone.radiusMin)
    const position = {
      x: this.worldCenter.x + Math.cos(angle) * distance,
      y: this.worldCenter.y + Math.sin(angle) * distance,
    }

    // Random level in zone range
    const level = zone.enemyLevelMin + Math.floor(Math.random() * (zone.enemyLevelMax - zone.enemyLevelMin + 1))

    // Random tank class from allowed tiers
    const tankClass = this.selectRandomTankClass(zone.enemyTiers)

    // Create bot
    const bot: BotPlayer = {
      id: `bot_${this.botIdCounter++}`,
      position,
      velocity: { x: 0, y: 0 },
      radius: 15,
      health: 100 + level * 5,
      maxHealth: 100 + level * 5,
      level,
      xp: 0,
      xpToNextLevel: 100,
      damage: 10 + level * 2,
      fireRate: 300,
      speed: 150 + Math.random() * 50,
      lastShotTime: 0,
      weapon: null,
      armor: null,
      kills: 0,
      bulletSpeed: 400,
      bulletPenetration: 5 + level,
      bodyDamage: 10 + level * 2,
      healthRegen: 1,
      lastRegenTime: 0,
      tankClass,
      lootRange: 50,
      invisibility: 0,
      invisibilityTimer: 0,
      bodyShape: TANK_CONFIGS[tankClass]?.bodyShape || 'circle',
      behaviorState: 'patrolling',
      targetPlayer: false,
      lastBehaviorChange: Date.now(),
      spawnZone: zone.id,
      statPoints: this.generateStatPoints(level, tankClass),
      barrelRecoils: [],
    }

    // Initialize barrel recoils
    const barrelCount = TANK_CONFIGS[tankClass]?.barrels.length || 1
    bot.barrelRecoils = new Array(barrelCount).fill(0)

    this.bots.push(bot)
  }

  /**
   * Select random tank class from allowed tiers
   */
  private selectRandomTankClass(allowedTiers: number[]): string {
    const availableClasses: string[] = []

    for (const [className, config] of Object.entries(TANK_CONFIGS)) {
      if (allowedTiers.includes(config.tier)) {
        availableClasses.push(className)
      }
    }

    if (availableClasses.length === 0) return 'basic'
    return availableClasses[Math.floor(Math.random() * availableClasses.length)]
  }

  /**
   * Generate optimal stat points for bot based on level and class
   * Points are calculated as level / 2 to match player progression
   * Points are distributed based on class archetype for optimal builds
   */
  private generateStatPoints(level: number, tankClass: string): Record<string, number> {
    const points = Math.floor(level / 2)
    const stats: Record<string, number> = {
      maxHealth: 0,
      healthRegen: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reloadSpeed: 0,
      movementSpeed: 0,
    }

    const config = TANK_CONFIGS[tankClass]

    // Distribute points based on class type
    if (config?.bodyShape === 'hexagon' || config?.bodyShape === 'spikyHexagon') {
      // Smasher builds - focus on health and speed
      stats.maxHealth = Math.floor(points * 0.4)
      stats.healthRegen = Math.floor(points * 0.2)
      stats.bodyDamage = Math.floor(points * 0.3)
      stats.movementSpeed = Math.floor(points * 0.1)
    } else if (tankClass.includes('sniper') || tankClass.includes('ranger') || tankClass.includes('assassin')) {
      // Sniper builds - focus on bullet stats
      stats.bulletSpeed = Math.floor(points * 0.3)
      stats.bulletPenetration = Math.floor(points * 0.3)
      stats.bulletDamage = Math.floor(points * 0.3)
      stats.reloadSpeed = Math.floor(points * 0.1)
    } else if (config?.isDroneClass) {
      // Drone builds - balanced
      stats.maxHealth = Math.floor(points * 0.2)
      stats.bulletSpeed = Math.floor(points * 0.2)
      stats.bulletPenetration = Math.floor(points * 0.3)
      stats.bulletDamage = Math.floor(points * 0.3)
    } else if (tankClass.includes('booster') || tankClass.includes('fighter')) {
      // Speed tanks - speed and damage
      stats.movementSpeed = Math.floor(points * 0.3)
      stats.bulletSpeed = Math.floor(points * 0.2)
      stats.bulletDamage = Math.floor(points * 0.3)
      stats.reloadSpeed = Math.floor(points * 0.2)
    } else {
      // Bullet tanks - balanced offense
      stats.bulletSpeed = Math.floor(points * 0.2)
      stats.bulletPenetration = Math.floor(points * 0.2)
      stats.bulletDamage = Math.floor(points * 0.3)
      stats.reloadSpeed = Math.floor(points * 0.2)
      stats.maxHealth = Math.floor(points * 0.1)
    }

    return stats
  }

  /**
   * Update all bots
   */
  update(
    deltaTime: number,
    playerPosition: Vector2,
    playerRadius: number,
    currentTime: number,
    loot: Loot[]
  ): { projectiles: Projectile[]; targetPositions: Map<string, Vector2>; farmTargets: Map<string, string> } {
    const projectiles: Projectile[] = []
    const targetPositions = new Map<string, Vector2>()
    const farmTargets = new Map<string, string>()

    for (let i = this.bots.length - 1; i >= 0; i--) {
      const bot = this.bots[i]

      // Remove dead bots
      if (bot.health <= 0) {
        this.bots.splice(i, 1)
        continue
      }

      // Update barrel recoils
      if (bot.barrelRecoils) {
        for (let j = 0; j < bot.barrelRecoils.length; j++) {
          bot.barrelRecoils[j] = Math.max(0, bot.barrelRecoils[j] - deltaTime * 20)
        }
      }

      // Update behavior (now includes farming)
      const behavior = this.updateBehavior(bot, playerPosition, playerRadius, currentTime, loot)
      
      // Move bot
      this.moveBot(bot, behavior.targetPosition, deltaTime)

      // Shoot at target (player or loot)
      if (behavior.shouldShoot && behavior.shootTarget) {
        const newProjectiles = this.tryShoot(bot, behavior.shootTarget, currentTime)
        projectiles.push(...newProjectiles)
      }

      // Store target position for rendering
      if (behavior.targetPosition) {
        targetPositions.set(bot.id, behavior.targetPosition)
      }
      
      // Store farm target for damage tracking
      if (behavior.farmTargetId) {
        farmTargets.set(bot.id, behavior.farmTargetId)
      }
    }

    return { projectiles, targetPositions, farmTargets }
  }

  /**
   * Update bot behavior based on class and situation
   */
  private updateBehavior(
    bot: BotPlayer,
    playerPosition: Vector2,
    playerRadius: number,
    currentTime: number,
    loot: Loot[]
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    const distance = this.getDistance(bot.position, playerPosition)
    const config = TANK_CONFIGS[bot.tankClass]

    // Change behavior periodically
    if (currentTime - bot.lastBehaviorChange > 3000) {
      bot.lastBehaviorChange = currentTime
      if (distance < 600) {
        bot.targetPlayer = true
      } else if (Math.random() > 0.7) {
        bot.targetPlayer = false
      }
    }

    // Behavior based on class type
    let targetPosition: Vector2 | null = null
    let shouldShoot = false
    let shootTarget: Vector2 | null = null
    let farmTargetId: string | null = null
    const visualRange = 800

    if (!bot.targetPlayer || distance > visualRange) {
      // Not targeting player - find loot to farm
      const nearestLoot = this.findNearestLoot(bot.position, loot, 400)
      
      if (nearestLoot) {
        // Farm the loot
        targetPosition = nearestLoot.position
        
        // Shoot at loot if not a smasher
        if (config?.bodyShape !== 'hexagon' && config?.bodyShape !== 'spikyHexagon') {
          const distToLoot = this.getDistance(bot.position, nearestLoot.position)
          if (distToLoot < 300) {
            shouldShoot = true
            shootTarget = nearestLoot.position
            farmTargetId = nearestLoot.id
          }
        }
        
        return { targetPosition, shouldShoot, shootTarget, farmTargetId }
      }
      
      // No loot nearby - patrol around spawn zone
      if (currentTime - bot.lastBehaviorChange > 2000) {
        const angle = Math.random() * Math.PI * 2
        const patrolDist = 200
        targetPosition = {
          x: bot.position.x + Math.cos(angle) * patrolDist,
          y: bot.position.y + Math.sin(angle) * patrolDist,
        }
      }
      return { targetPosition, shouldShoot: false, shootTarget: null, farmTargetId: null }
    }

    // Smasher behavior - aggressive ramming
    if (config?.bodyShape === 'hexagon' || config?.bodyShape === 'spikyHexagon') {
      targetPosition = playerPosition
      shouldShoot = false
    }
    // Sniper behavior - keep distance
    else if (bot.tankClass.includes('sniper') || bot.tankClass.includes('ranger') || bot.tankClass.includes('assassin')) {
      const optimalDistance = 500
      if (distance < optimalDistance) {
        // Retreat
        const angle = Math.atan2(bot.position.y - playerPosition.y, bot.position.x - playerPosition.x)
        targetPosition = {
          x: bot.position.x + Math.cos(angle) * 100,
          y: bot.position.y + Math.sin(angle) * 100,
        }
      } else {
        // Strafe
        const angle = Math.atan2(playerPosition.y - bot.position.y, playerPosition.x - bot.position.x)
        const perpAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1)
        targetPosition = {
          x: bot.position.x + Math.cos(perpAngle) * 50,
          y: bot.position.y + Math.sin(perpAngle) * 50,
        }
      }
      shouldShoot = distance < 700
    }
    // Drone class behavior - orbit and attack
    else if (config?.isDroneClass) {
      const orbitDistance = 400
      const angle = Math.atan2(bot.position.y - playerPosition.y, bot.position.x - playerPosition.x)
      targetPosition = {
        x: playerPosition.x + Math.cos(angle) * orbitDistance,
        y: playerPosition.y + Math.sin(angle) * orbitDistance,
      }
      shouldShoot = distance < 500
    }
    // Speed tanks - hit and run
    else if (bot.tankClass.includes('booster') || bot.tankClass.includes('fighter')) {
      if (distance < 300) {
        // Rush away
        const angle = Math.atan2(bot.position.y - playerPosition.y, bot.position.x - playerPosition.x)
        targetPosition = {
          x: bot.position.x + Math.cos(angle) * 200,
          y: bot.position.y + Math.sin(angle) * 200,
        }
      } else {
        // Rush in
        targetPosition = playerPosition
      }
      shouldShoot = distance < 400 && distance > 200
    }
    // Bullet tanks - medium distance, strafe
    else {
      const optimalDistance = 350
      if (distance < optimalDistance - 50) {
        // Back up
        const angle = Math.atan2(bot.position.y - playerPosition.y, bot.position.x - playerPosition.x)
        targetPosition = {
          x: bot.position.x + Math.cos(angle) * 80,
          y: bot.position.y + Math.sin(angle) * 80,
        }
      } else if (distance > optimalDistance + 50) {
        // Approach
        targetPosition = playerPosition
      } else {
        // Strafe
        const angle = Math.atan2(playerPosition.y - bot.position.y, playerPosition.x - bot.position.x)
        const perpAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1)
        targetPosition = {
          x: bot.position.x + Math.cos(perpAngle) * 60,
          y: bot.position.y + Math.sin(perpAngle) * 60,
        }
      }
      shouldShoot = distance < 500
    }

    return { targetPosition, shouldShoot }
  }

  /**
   * Move bot towards target position
   */
  private moveBot(bot: BotPlayer, targetPosition: Vector2 | null, deltaTime: number) {
    if (!targetPosition) return

    const dx = targetPosition.x - bot.position.x
    const dy = targetPosition.y - bot.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 10) {
      const speed = bot.speed * (1 + bot.statPoints.movementSpeed * 0.05)
      bot.velocity.x = (dx / distance) * speed
      bot.velocity.y = (dy / distance) * speed
    } else {
      bot.velocity.x *= 0.9
      bot.velocity.y *= 0.9
    }

    bot.position.x += bot.velocity.x * deltaTime
    bot.position.y += bot.velocity.y * deltaTime

    // Keep in world bounds (with margin from edge)
    const worldRadius = 8000
    const margin = 200
    const distFromCenter = this.getDistance(bot.position, this.worldCenter)
    if (distFromCenter > worldRadius - margin) {
      const angle = Math.atan2(bot.position.y - this.worldCenter.y, bot.position.x - this.worldCenter.x)
      bot.position.x = this.worldCenter.x + Math.cos(angle) * (worldRadius - margin)
      bot.position.y = this.worldCenter.y + Math.sin(angle) * (worldRadius - margin)
    }
  }

  /**
   * Try to shoot at player
   */
  private tryShoot(bot: BotPlayer, playerPosition: Vector2, currentTime: number): Projectile[] {
    const config = TANK_CONFIGS[bot.tankClass]
    if (!config || config.isDroneClass || config.bodyShape === 'hexagon' || config.bodyShape === 'spikyHexagon') {
      return []
    }

    const fireRate = bot.fireRate * (1 - bot.statPoints.reloadSpeed * 0.02)
    if (currentTime - bot.lastShotTime < fireRate) {
      return []
    }

    bot.lastShotTime = currentTime

    const projectiles: Projectile[] = []
    const angle = Math.atan2(playerPosition.y - bot.position.y, playerPosition.x - bot.position.x)

    // Calculate bullet speed and damage with stat boosts
    const bulletSpeed = bot.bulletSpeed * (1 + bot.statPoints.bulletSpeed * 0.05)
    const damage = bot.damage * (1 + bot.statPoints.bulletDamage * 0.1)

    for (let i = 0; i < config.barrels.length; i++) {
      const barrel = config.barrels[i]
      const barrelAngle = angle + (barrel.angle * Math.PI) / 180

      // Set barrel recoil
      if (bot.barrelRecoils && bot.barrelRecoils[i] !== undefined) {
        bot.barrelRecoils[i] = 8
      }

      const spawnDist = bot.radius + barrel.length + 5
      const spawnX = bot.position.x + Math.cos(barrelAngle) * spawnDist
      const spawnY = bot.position.y + Math.sin(barrelAngle) * spawnDist

      projectiles.push({
        id: `proj_bot_${bot.id}_${Date.now()}_${i}`,
        position: { x: spawnX, y: spawnY },
        velocity: {
          x: Math.cos(barrelAngle) * bulletSpeed,
          y: Math.sin(barrelAngle) * bulletSpeed,
        },
        damage,
        radius: 5,
        isPlayerProjectile: false,
      })
    }

    return projectiles
  }

  /**
   * Damage a bot
   */
  damageBot(botId: string, damage: number): boolean {
    const bot = this.bots.find(b => b.id === botId)
    if (!bot) return false

    bot.health -= damage
    return bot.health <= 0
  }

  /**
   * Get distance between two points
   */
  private getDistance(p1: Vector2, p2: Vector2): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Clear all bots
   */
  clear() {
    this.bots = []
    this.botIdCounter = 0
  }
}
