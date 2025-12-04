/**
 * Bot AI System
 * Manages bot spawning, behavior, and combat with team support
 */

import type { BotPlayer, Vector2, Projectile, Loot, Drone, Zone, Team, BotPersonality } from './types'
import { TANK_CONFIGS } from './tankConfigs'
import { TeamSystem } from './TeamSystem'
import { BotNameGenerator } from './BotNameGenerator'

// AI behavior constants
const TEAM_BATTLE_RANGE = 500 // Range for prioritizing team battles over farming
const CLOSE_ATTACK_RANGE = 400 // Range for triggering attack mode in non-passive bots
const PASSIVE_ATTACK_RANGE = 300 // Range for passive bots to attack

export class BotAISystem {
  private bots: BotPlayer[] = []
  private botIdCounter = 0
  private lastSpawnTime = 0
  private worldCenter: Vector2 = { x: 8000, y: 8000 }
  private teamSystem: TeamSystem
  private nameGenerator: BotNameGenerator

  constructor(teamSystem: TeamSystem) {
    this.teamSystem = teamSystem
    this.nameGenerator = new BotNameGenerator()
  }

  /**
   * Get all bots
   */
  getBots(): BotPlayer[] {
    return this.bots
  }

  /**
   * Get team system
   */
  getTeamSystem(): TeamSystem {
    return this.teamSystem
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
    const tankClass = this.selectRandomTankClass(zone.enemyTiers, level)

    // Assign team (balanced)
    const blueBots = this.bots.filter(b => b.team === 'blue').length
    const redBots = this.bots.filter(b => b.team === 'red').length
    const team = this.teamSystem.assignBotTeam(blueBots, redBots)

    // Assign personality
    const personality = this.assignPersonality(level)

    // Calculate farming priority based on level and personality
    const farmingPriority = this.calculateFarmingPriority(level, personality)

    // Generate bot name
    const name = this.nameGenerator.generateName()

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
      xpToNextLevel: this.getXPForLevel(level + 1),
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
      behaviorState: 'farming',
      targetPlayer: false,
      lastBehaviorChange: Date.now(),
      spawnZone: zone.id,
      statPoints: this.generateStatPoints(level, tankClass),
      barrelRecoils: [],
      team,
      name,
      personality,
      farmingPriority,
      aimAccuracy: this.getAimAccuracy(personality),
      reactionTime: this.getReactionTime(personality),
      lastReactionTime: 0,
      currentTarget: null,
      aimAngle: 0,
    }

    // Initialize barrel recoils
    const barrelCount = TANK_CONFIGS[tankClass]?.barrels.length || 1
    bot.barrelRecoils = new Array(barrelCount).fill(0)

    // Apply stat points to bot
    this.applyStatPointsToBot(bot)

    this.bots.push(bot)
  }

  /**
   * Select random tank class from allowed tiers based on bot level
   */
  private selectRandomTankClass(allowedTiers: number[], level: number): string {
    const availableClasses: string[] = []

    // Filter by tier and level requirements
    for (const [className, config] of Object.entries(TANK_CONFIGS)) {
      if (allowedTiers.includes(config.tier) && level >= config.unlocksAt) {
        // Exclude pure drone classes without barrels (they need special drone AI)
        if (config.isDroneClass && (!config.barrels || config.barrels.length === 0)) {
          continue
        }
        availableClasses.push(className)
      }
    }

    if (availableClasses.length === 0) return 'basic'
    return availableClasses[Math.floor(Math.random() * availableClasses.length)]
  }

  /**
   * Assign personality based on level
   */
  private assignPersonality(level: number): BotPersonality {
    const rand = Math.random()
    
    if (level < 10) {
      // Low level - more noobs
      if (rand < 0.4) return 'noob'
      if (rand < 0.6) return 'passive'
      if (rand < 0.8) return 'opportunist'
      return 'aggressive'
    } else if (level < 30) {
      // Mid level - balanced
      if (rand < 0.2) return 'noob'
      if (rand < 0.4) return 'passive'
      if (rand < 0.6) return 'opportunist'
      if (rand < 0.8) return 'aggressive'
      return 'territorial'
    } else {
      // High level - more pros
      if (rand < 0.2) return 'pro'
      if (rand < 0.4) return 'aggressive'
      if (rand < 0.6) return 'territorial'
      if (rand < 0.8) return 'opportunist'
      return 'passive'
    }
  }

  /**
   * Calculate farming priority based on level and personality
   */
  private calculateFarmingPriority(level: number, personality: BotPersonality): number {
    let basePriority = 0.8 - (level * 0.015) // Decreases as level increases
    basePriority = Math.max(0.1, Math.min(0.9, basePriority))

    // Adjust based on personality
    switch (personality) {
      case 'passive':
        return Math.min(0.95, basePriority + 0.3)
      case 'aggressive':
        return Math.max(0.1, basePriority - 0.4)
      case 'opportunist':
        return basePriority
      case 'territorial':
        return Math.max(0.2, basePriority - 0.2)
      case 'noob':
        return Math.min(0.9, basePriority + 0.2)
      case 'pro':
        return Math.max(0.3, basePriority - 0.1)
      default:
        return basePriority
    }
  }

  /**
   * Get aim accuracy based on personality
   */
  private getAimAccuracy(personality: BotPersonality): number {
    switch (personality) {
      case 'pro':
        return 0.9 + Math.random() * 0.1 // 90-100%
      case 'aggressive':
        return 0.75 + Math.random() * 0.15 // 75-90%
      case 'territorial':
        return 0.7 + Math.random() * 0.2 // 70-90%
      case 'opportunist':
        return 0.65 + Math.random() * 0.2 // 65-85%
      case 'passive':
        return 0.6 + Math.random() * 0.2 // 60-80%
      case 'noob':
        return 0.3 + Math.random() * 0.3 // 30-60%
      default:
        return 0.7
    }
  }

  /**
   * Get reaction time based on personality (in milliseconds)
   */
  private getReactionTime(personality: BotPersonality): number {
    switch (personality) {
      case 'pro':
        return 50 + Math.random() * 100 // 50-150ms
      case 'aggressive':
        return 100 + Math.random() * 150 // 100-250ms
      case 'territorial':
        return 150 + Math.random() * 150 // 150-300ms
      case 'opportunist':
        return 200 + Math.random() * 200 // 200-400ms
      case 'passive':
        return 300 + Math.random() * 300 // 300-600ms
      case 'noob':
        return 500 + Math.random() * 500 // 500-1000ms
      default:
        return 200
    }
  }

  /**
   * Get XP required for a level
   */
  private getXPForLevel(level: number): number {
    if (level <= 1) return 0
    return Math.floor(100 * Math.pow(1.5, level - 1))
  }

  /**
   * Apply stat points to bot stats
   */
  private applyStatPointsToBot(bot: BotPlayer) {
    // Apply stat multipliers based on stat points
    bot.maxHealth = Math.floor(bot.maxHealth * (1 + bot.statPoints.maxHealth * 0.05))
    bot.health = bot.maxHealth
    bot.damage = Math.floor(bot.damage * (1 + bot.statPoints.bulletDamage * 0.1))
    bot.fireRate = Math.floor(bot.fireRate * (1 - bot.statPoints.reloadSpeed * 0.02))
    bot.speed = Math.floor(bot.speed * (1 + bot.statPoints.movementSpeed * 0.05))
    bot.bulletSpeed = Math.floor(bot.bulletSpeed * (1 + bot.statPoints.bulletSpeed * 0.05))
    bot.bulletPenetration = Math.floor(bot.bulletPenetration * (1 + bot.statPoints.bulletPenetration * 0.1))
    bot.bodyDamage = Math.floor(bot.bodyDamage * (1 + bot.statPoints.bodyDamage * 0.1))
    bot.healthRegen = bot.healthRegen * (1 + bot.statPoints.healthRegen * 0.2)
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
   * Level up a bot
   */
  private levelUpBot(bot: BotPlayer) {
    bot.level++
    bot.xp = 0
    bot.xpToNextLevel = this.getXPForLevel(bot.level + 1)
    
    // Update farming priority for new level
    bot.farmingPriority = this.calculateFarmingPriority(bot.level, bot.personality)
    
    // Allocate a stat point randomly based on class
    const statKeys = Object.keys(bot.statPoints) as Array<keyof typeof bot.statPoints>
    const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)]
    bot.statPoints[randomStat]++
    
    // Apply the new stat
    this.applyStatPointsToBot(bot)
    
    // Check for tank upgrades at levels 15, 30, 45
    if (bot.level === 15 || bot.level === 30 || bot.level === 45) {
      this.tryUpgradeBotTank(bot)
    }
  }

  /**
   * Try to upgrade bot tank at milestone levels
   */
  private tryUpgradeBotTank(bot: BotPlayer) {
    const currentConfig = TANK_CONFIGS[bot.tankClass]
    if (!currentConfig) return

    // Find available upgrades
    const availableUpgrades: string[] = []
    for (const [className, config] of Object.entries(TANK_CONFIGS)) {
      if (config.upgradesFrom?.includes(bot.tankClass) && 
          config.unlocksAt === bot.level &&
          config.tier === currentConfig.tier + 1) {
        availableUpgrades.push(className)
      }
    }

    if (availableUpgrades.length > 0) {
      // Pick a random upgrade
      const newClass = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]
      bot.tankClass = newClass
      
      // Update body shape
      const newConfig = TANK_CONFIGS[newClass]
      if (newConfig) {
        bot.bodyShape = newConfig.bodyShape || 'circle'
        const barrelCount = newConfig.barrels.length || 1
        bot.barrelRecoils = new Array(barrelCount).fill(0)
      }
      
      // Regenerate stat distribution for new class
      bot.statPoints = this.generateStatPoints(bot.level, newClass)
      this.applyStatPointsToBot(bot)
    }
  }

  /**
   * Decide bot behavior based on personality and situation
   */
  private decideBehavior(
    bot: BotPlayer,
    distanceToPlayer: number,
    isPlayerEnemy: boolean,
    healthPercent: number,
    allBots: BotPlayer[]
  ) {
    // Find nearest enemy bot
    let nearestEnemyBot: BotPlayer | null = null
    let nearestEnemyDist = Infinity
    
    for (const otherBot of allBots) {
      if (otherBot.id === bot.id) continue
      if (this.teamSystem.areAllies(bot.team, otherBot.team)) continue
      
      const dist = this.getDistance(bot.position, otherBot.position)
      if (dist < nearestEnemyDist && dist < 800) {
        nearestEnemyBot = otherBot
        nearestEnemyDist = dist
      }
    }

    // Low health - retreat regardless of personality
    if (healthPercent < 0.3 && bot.personality !== 'aggressive') {
      bot.behaviorState = 'fleeing'
      return
    }

    // Prioritize team battles: if enemy is within range and bot health > 50%, attack
    const enemyInRange = (isPlayerEnemy && distanceToPlayer < TEAM_BATTLE_RANGE) || (nearestEnemyBot && nearestEnemyDist < TEAM_BATTLE_RANGE)
    if (enemyInRange && healthPercent > 0.5 && bot.personality !== 'passive') {
      bot.behaviorState = 'attacking'
      bot.currentTarget = nearestEnemyDist < distanceToPlayer && nearestEnemyBot ? nearestEnemyBot.id : 'player'
      return
    }

    // For all non-passive personalities, attack if enemy within close range
    if (bot.personality !== 'passive') {
      const closeEnemy = (isPlayerEnemy && distanceToPlayer < CLOSE_ATTACK_RANGE) || (nearestEnemyBot && nearestEnemyDist < CLOSE_ATTACK_RANGE)
      if (closeEnemy) {
        bot.behaviorState = 'attacking'
        bot.currentTarget = nearestEnemyDist < distanceToPlayer && nearestEnemyBot ? nearestEnemyBot.id : 'player'
        return
      }
    }

    // Personality-based decision making
    switch (bot.personality) {
      case 'aggressive':
        // Always seek combat if enemy is nearby
        if ((isPlayerEnemy && distanceToPlayer < 800) || nearestEnemyBot) {
          bot.behaviorState = 'attacking'
          bot.currentTarget = nearestEnemyBot ? nearestEnemyBot.id : 'player'
        } else {
          bot.behaviorState = 'patrolling'
        }
        break

      case 'passive':
        // Prioritize farming, only fight if attacked or very close
        if ((isPlayerEnemy && distanceToPlayer < PASSIVE_ATTACK_RANGE) || (nearestEnemyBot && nearestEnemyDist < PASSIVE_ATTACK_RANGE)) {
          bot.behaviorState = 'attacking'
          bot.currentTarget = nearestEnemyDist < distanceToPlayer ? nearestEnemyBot!.id : 'player'
        } else {
          bot.behaviorState = 'farming'
        }
        break

      case 'opportunist':
        // Attack weakened enemies or farm
        const shouldAttackPlayer = isPlayerEnemy && distanceToPlayer < 600 && healthPercent > 0.6
        const shouldAttackBot = nearestEnemyBot && nearestEnemyDist < 600 && 
                               nearestEnemyBot.health / nearestEnemyBot.maxHealth < 0.5
        
        if (shouldAttackPlayer || shouldAttackBot) {
          bot.behaviorState = 'attacking'
          bot.currentTarget = shouldAttackBot && nearestEnemyBot ? nearestEnemyBot.id : 'player'
        } else {
          bot.behaviorState = Math.random() < bot.farmingPriority ? 'farming' : 'patrolling'
        }
        break

      case 'territorial':
        // Stay in area and defend it
        const distFromSpawn = this.getDistance(bot.position, { 
          x: this.worldCenter.x, 
          y: this.worldCenter.y 
        })
        
        if ((isPlayerEnemy && distanceToPlayer < TEAM_BATTLE_RANGE) || (nearestEnemyBot && nearestEnemyDist < TEAM_BATTLE_RANGE)) {
          bot.behaviorState = 'attacking'
          bot.currentTarget = nearestEnemyDist < distanceToPlayer && nearestEnemyBot ? nearestEnemyBot.id : 'player'
        } else if (distFromSpawn > 600) {
          bot.behaviorState = 'patrolling' // Return to territory
        } else {
          bot.behaviorState = 'farming'
        }
        break

      case 'noob':
        // Random, inefficient behavior
        const rand = Math.random()
        if (rand < 0.4) {
          bot.behaviorState = 'farming'
        } else if (rand < 0.7 && ((isPlayerEnemy && distanceToPlayer < CLOSE_ATTACK_RANGE) || nearestEnemyBot)) {
          bot.behaviorState = 'attacking'
          bot.currentTarget = nearestEnemyBot ? nearestEnemyBot.id : 'player'
        } else {
          bot.behaviorState = 'patrolling'
        }
        break

      case 'pro':
        // Efficient, smart behavior - farm when safe, fight when advantageous
        const enemyLevel = nearestEnemyBot ? nearestEnemyBot.level : (isPlayerEnemy ? 1 : 999)
        const hasAdvantage = healthPercent > 0.7 && bot.level >= enemyLevel - 5
        const enemyNearby = (isPlayerEnemy && distanceToPlayer < 700) || (nearestEnemyBot && nearestEnemyDist < 700)
        
        if (enemyNearby && hasAdvantage) {
          bot.behaviorState = 'attacking'
          bot.currentTarget = nearestEnemyDist < distanceToPlayer && nearestEnemyBot ? nearestEnemyBot.id : 'player'
        } else if (enemyNearby && !hasAdvantage) {
          bot.behaviorState = healthPercent < 0.5 ? 'fleeing' : 'patrolling'
        } else {
          bot.behaviorState = Math.random() < bot.farmingPriority ? 'farming' : 'patrolling'
        }
        break

      default:
        bot.behaviorState = 'farming'
    }
  }

  /**
   * Farming behavior - find and destroy shapes
   */
  private farmingBehavior(
    bot: BotPlayer,
    loot: Loot[]
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    const config = TANK_CONFIGS[bot.tankClass]
    const isSmasher = config?.bodyShape === 'hexagon' || config?.bodyShape === 'spikyHexagon'
    
    // Find nearest valuable loot
    const nearestLoot = this.findBestFarmTarget(bot, loot)
    
    if (nearestLoot) {
      const distToLoot = this.getDistance(bot.position, nearestLoot.position)
      
      // For smashers, just ram into it
      if (isSmasher) {
        return {
          targetPosition: nearestLoot.position,
          shouldShoot: false,
          shootTarget: null,
          farmTargetId: nearestLoot.id
        }
      }
      
      // For shooters, keep distance and shoot
      const optimalDist = 250
      let targetPosition = nearestLoot.position
      
      if (distToLoot < optimalDist * 0.7) {
        // Too close, back up
        const angle = Math.atan2(bot.position.y - nearestLoot.position.y, bot.position.x - nearestLoot.position.x)
        targetPosition = {
          x: bot.position.x + Math.cos(angle) * 50,
          y: bot.position.y + Math.sin(angle) * 50
        }
      }
      
      return {
        targetPosition,
        shouldShoot: distToLoot < 350,
        shootTarget: nearestLoot.position,
        farmTargetId: nearestLoot.id
      }
    }
    
    // No loot nearby, patrol
    return this.patrollingBehavior(bot, Date.now())
  }

  /**
   * Attacking behavior - engage enemy
   */
  private attackingBehavior(
    bot: BotPlayer,
    playerPosition: Vector2,
    isPlayerEnemy: boolean,
    allBots: BotPlayer[],
    currentTime: number
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    const config = TANK_CONFIGS[bot.tankClass]
    
    // Find target (player or enemy bot)
    let targetPos = playerPosition
    let targetId = 'player'
    
    if (bot.currentTarget && bot.currentTarget !== 'player') {
      const targetBot = allBots.find(b => b.id === bot.currentTarget)
      if (targetBot && this.teamSystem.areEnemies(bot.team, targetBot.team)) {
        targetPos = targetBot.position
        targetId = targetBot.id
      }
    } else if (!isPlayerEnemy) {
      // Player is not enemy, find an enemy bot
      for (const otherBot of allBots) {
        if (this.teamSystem.areEnemies(bot.team, otherBot.team)) {
          const dist = this.getDistance(bot.position, otherBot.position)
          if (dist < 600) {
            targetPos = otherBot.position
            targetId = otherBot.id
            break
          }
        }
      }
    }
    
    const distance = this.getDistance(bot.position, targetPos)
    
    // Apply aim inaccuracy
    const aimOffset = this.applyAimError(bot, targetPos)
    
    // Class-specific behavior
    return this.getClassSpecificAttackBehavior(bot, targetPos, aimOffset, distance)
  }

  /**
   * Fleeing behavior - retreat from danger
   */
  private fleeingBehavior(
    bot: BotPlayer,
    playerPosition: Vector2,
    allBots: BotPlayer[]
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    // Find nearest threat
    let threatPos = playerPosition
    let minThreatDist = this.getDistance(bot.position, playerPosition)
    
    for (const otherBot of allBots) {
      if (this.teamSystem.areEnemies(bot.team, otherBot.team)) {
        const dist = this.getDistance(bot.position, otherBot.position)
        if (dist < minThreatDist) {
          threatPos = otherBot.position
          minThreatDist = dist
        }
      }
    }
    
    // Run away from threat
    const angle = Math.atan2(bot.position.y - threatPos.y, bot.position.x - threatPos.x)
    const fleeDistance = 300
    
    return {
      targetPosition: {
        x: bot.position.x + Math.cos(angle) * fleeDistance,
        y: bot.position.y + Math.sin(angle) * fleeDistance
      },
      shouldShoot: false, // Don't shoot while fleeing
      shootTarget: null,
      farmTargetId: null
    }
  }

  /**
   * Patrolling behavior - wander around
   */
  private patrollingBehavior(
    bot: BotPlayer,
    currentTime: number
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    // Random patrol direction
    if (currentTime - bot.lastBehaviorChange > 2000 || !bot.velocity.x && !bot.velocity.y) {
      const angle = Math.random() * Math.PI * 2
      const patrolDist = 150 + Math.random() * 150
      
      return {
        targetPosition: {
          x: bot.position.x + Math.cos(angle) * patrolDist,
          y: bot.position.y + Math.sin(angle) * patrolDist
        },
        shouldShoot: false,
        shootTarget: null,
        farmTargetId: null
      }
    }
    
    return { targetPosition: null, shouldShoot: false, shootTarget: null, farmTargetId: null }
  }

  /**
   * Find best farm target based on bot level and value
   */
  private findBestFarmTarget(bot: BotPlayer, loot: Loot[]): Loot | null {
    let bestTarget: Loot | null = null
    let bestScore = -1
    const maxDistance = 500
    
    for (const item of loot) {
      if (item.type !== 'box' && item.type !== 'treasure' && item.type !== 'boss') continue
      if (!item.health || item.health <= 0) continue
      
      const dist = this.getDistance(bot.position, item.position)
      if (dist > maxDistance) continue
      
      // Score based on value, distance, and size
      const valueScore = item.value / 100
      const distScore = (maxDistance - dist) / maxDistance
      const sizeScore = (item.radius || 20) / 50
      
      // Low level bots prefer small shapes, high level prefer big ones
      const levelPreference = bot.level < 20 
        ? (1 - sizeScore) // Prefer small shapes
        : sizeScore // Prefer big shapes
      
      const score = valueScore * 0.4 + distScore * 0.4 + levelPreference * 0.2
      
      if (score > bestScore) {
        bestScore = score
        bestTarget = item
      }
    }
    
    return bestTarget
  }

  /**
   * Apply aim error based on bot accuracy
   */
  private applyAimError(bot: BotPlayer, targetPos: Vector2): Vector2 {
    const error = (1 - bot.aimAccuracy) * 100 // Max 100 pixels error
    const errorAngle = Math.random() * Math.PI * 2
    
    return {
      x: targetPos.x + Math.cos(errorAngle) * error,
      y: targetPos.y + Math.sin(errorAngle) * error
    }
  }

  /**
   * Get class-specific attack behavior
   */
  private getClassSpecificAttackBehavior(
    bot: BotPlayer,
    targetPos: Vector2,
    aimTarget: Vector2,
    distance: number
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    const config = TANK_CONFIGS[bot.tankClass]
    
    // Smasher behavior - aggressive ramming
    if (config?.bodyShape === 'hexagon' || config?.bodyShape === 'spikyHexagon') {
      return {
        targetPosition: targetPos,
        shouldShoot: false,
        shootTarget: null,
        farmTargetId: null
      }
    }
    
    // Sniper behavior - keep distance
    if (bot.tankClass.includes('sniper') || bot.tankClass.includes('ranger') || bot.tankClass.includes('assassin')) {
      const optimalDistance = 500
      let targetPosition = targetPos
      
      if (distance < optimalDistance) {
        // Retreat
        const angle = Math.atan2(bot.position.y - targetPos.y, bot.position.x - targetPos.x)
        targetPosition = {
          x: bot.position.x + Math.cos(angle) * 100,
          y: bot.position.y + Math.sin(angle) * 100
        }
      } else {
        // Strafe
        const angle = Math.atan2(targetPos.y - bot.position.y, targetPos.x - bot.position.x)
        const perpAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1)
        targetPosition = {
          x: bot.position.x + Math.cos(perpAngle) * 50,
          y: bot.position.y + Math.sin(perpAngle) * 50
        }
      }
      
      return {
        targetPosition,
        shouldShoot: distance < 700,
        shootTarget: aimTarget,
        farmTargetId: null
      }
    }
    
    // Drone class behavior - orbit
    if (config?.isDroneClass) {
      const orbitDistance = 400
      const angle = Math.atan2(bot.position.y - targetPos.y, bot.position.x - targetPos.x)
      
      return {
        targetPosition: {
          x: targetPos.x + Math.cos(angle) * orbitDistance,
          y: targetPos.y + Math.sin(angle) * orbitDistance
        },
        shouldShoot: distance < 500,
        shootTarget: aimTarget,
        farmTargetId: null
      }
    }
    
    // Speed tanks - aggressive rushers
    if (bot.tankClass.includes('booster') || bot.tankClass.includes('fighter')) {
      if (distance < 200) {
        // Rush away briefly
        const angle = Math.atan2(bot.position.y - targetPos.y, bot.position.x - targetPos.x)
        return {
          targetPosition: {
            x: bot.position.x + Math.cos(angle) * 150,
            y: bot.position.y + Math.sin(angle) * 150
          },
          shouldShoot: true,
          shootTarget: aimTarget,
          farmTargetId: null
        }
      } else {
        // Aggressively rush in
        return {
          targetPosition: targetPos,
          shouldShoot: distance < 450,
          shootTarget: aimTarget,
          farmTargetId: null
        }
      }
    }
    
    // Default bullet tank - close combat strafe
    const optimalDistance = 250
    let targetPosition = targetPos
    
    if (distance < optimalDistance - 50) {
      // Back up slightly
      const angle = Math.atan2(bot.position.y - targetPos.y, bot.position.x - targetPos.x)
      targetPosition = {
        x: bot.position.x + Math.cos(angle) * 60,
        y: bot.position.y + Math.sin(angle) * 60
      }
    } else if (distance > optimalDistance + 100) {
      // Aggressively approach
      targetPosition = targetPos
    } else {
      // Strafe at medium range
      const angle = Math.atan2(targetPos.y - bot.position.y, targetPos.x - bot.position.x)
      const perpAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1)
      targetPosition = {
        x: bot.position.x + Math.cos(perpAngle) * 50,
        y: bot.position.y + Math.sin(perpAngle) * 50
      }
    }
    
    return {
      targetPosition,
      shouldShoot: distance < 500,
      shootTarget: aimTarget,
      farmTargetId: null
    }
  }

  /**
   * Execute current behavior and return action
   */
  private executeBehavior(
    bot: BotPlayer,
    playerPosition: Vector2,
    currentTime: number,
    loot: Loot[],
    isPlayerEnemy: boolean,
    allBots: BotPlayer[]
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    const config = TANK_CONFIGS[bot.tankClass]

    switch (bot.behaviorState) {
      case 'farming':
        return this.farmingBehavior(bot, loot)
      
      case 'attacking':
        return this.attackingBehavior(bot, playerPosition, isPlayerEnemy, allBots, currentTime)
      
      case 'fleeing':
        return this.fleeingBehavior(bot, playerPosition, allBots)
      
      case 'patrolling':
        return this.patrollingBehavior(bot, currentTime)
      
      default:
        return { targetPosition: null, shouldShoot: false, shootTarget: null, farmTargetId: null }
    }
  }

  /**
   * Update all bots
   */
  update(
    deltaTime: number,
    playerPosition: Vector2,
    playerRadius: number,
    currentTime: number,
    loot: Loot[],
    playerTeam: Team
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

      // Health regeneration
      if (bot.health < bot.maxHealth && currentTime - bot.lastRegenTime > 1000) {
        bot.health = Math.min(bot.health + bot.healthRegen * deltaTime, bot.maxHealth)
      }

      // Check for level up
      if (bot.xp >= bot.xpToNextLevel) {
        this.levelUpBot(bot)
      }

      // Update barrel recoils
      if (bot.barrelRecoils) {
        for (let j = 0; j < bot.barrelRecoils.length; j++) {
          bot.barrelRecoils[j] = Math.max(0, bot.barrelRecoils[j] - deltaTime * 20)
        }
      }

      // Update behavior (now includes farming and team awareness)
      const behavior = this.updateBehavior(bot, playerPosition, playerRadius, currentTime, loot, playerTeam, this.bots)
      
      // Calculate and store aim angle based on actual target
      if (behavior.shootTarget) {
        const dx = behavior.shootTarget.x - bot.position.x
        const dy = behavior.shootTarget.y - bot.position.y
        bot.aimAngle = Math.atan2(dy, dx)
      } else if (behavior.targetPosition) {
        // If not shooting but moving, aim towards movement direction
        const dx = behavior.targetPosition.x - bot.position.x
        const dy = behavior.targetPosition.y - bot.position.y
        bot.aimAngle = Math.atan2(dy, dx)
      }
      
      // Move bot
      this.moveBot(bot, behavior.targetPosition, deltaTime)

      // Shoot at target (player, bot, or loot)
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
   * Update bot behavior based on class, personality, and team
   */
  private updateBehavior(
    bot: BotPlayer,
    playerPosition: Vector2,
    playerRadius: number,
    currentTime: number,
    loot: Loot[],
    playerTeam: Team,
    allBots: BotPlayer[]
  ): { targetPosition: Vector2 | null; shouldShoot: boolean; shootTarget: Vector2 | null; farmTargetId: string | null } {
    const distanceToPlayer = this.getDistance(bot.position, playerPosition)
    const config = TANK_CONFIGS[bot.tankClass]
    const isPlayerAlly = this.teamSystem.areAllies(bot.team, playerTeam)
    const isPlayerEnemy = this.teamSystem.areEnemies(bot.team, playerTeam)

    // Health-based retreat logic
    const healthPercent = bot.health / bot.maxHealth
    if (healthPercent < 0.3 && bot.personality !== 'aggressive') {
      bot.behaviorState = 'fleeing'
    }

    // Reaction time - don't instantly react to everything
    const timeSinceLastReaction = currentTime - bot.lastReactionTime
    if (timeSinceLastReaction < bot.reactionTime) {
      // Still in reaction delay, use previous behavior
      return this.executeBehavior(bot, playerPosition, currentTime, loot, isPlayerEnemy, allBots)
    }

    bot.lastReactionTime = currentTime

    // Change behavior periodically based on personality
    const behaviorChangeInterval = bot.personality === 'pro' ? 2000 : 
                                   bot.personality === 'noob' ? 5000 : 3000
    
    if (currentTime - bot.lastBehaviorChange > behaviorChangeInterval) {
      bot.lastBehaviorChange = currentTime
      
      // Decide behavior based on personality and situation
      this.decideBehavior(bot, distanceToPlayer, isPlayerEnemy, healthPercent, allBots)
    }

    // Execute the behavior
    return this.executeBehavior(bot, playerPosition, currentTime, loot, isPlayerEnemy, allBots)
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
   * Try to shoot at target (player or loot)
   */
  private tryShoot(bot: BotPlayer, targetPosition: Vector2, currentTime: number): Projectile[] {
    const config = TANK_CONFIGS[bot.tankClass]
    // Allow shooting if bot has barrels, even if it's a drone class or smasher
    if (!config || !config.barrels || config.barrels.length === 0) {
      return []
    }

    const distance = this.getDistance(bot.position, targetPosition)
    
    const maxRange = bot.tankClass.includes('sniper') || bot.tankClass.includes('ranger') || bot.tankClass.includes('assassin')
      ? 600
      : 400

    if (distance > maxRange) {
      return []
    }

    const fireRate = bot.fireRate * (1 - bot.statPoints.reloadSpeed * 0.02)
    if (currentTime - bot.lastShotTime < fireRate) {
      return []
    }

    bot.lastShotTime = currentTime

    const projectiles: Projectile[] = []
    const angle = Math.atan2(targetPosition.y - bot.position.y, targetPosition.x - bot.position.x)

    const damage = bot.damage * (1 + bot.statPoints.bulletDamage * 0.1)

    for (let i = 0; i < config.barrels.length; i++) {
      const barrel = config.barrels[i]
      const barrelAngle = angle + (barrel.angle * Math.PI) / 180

      if (bot.barrelRecoils && bot.barrelRecoils[i] !== undefined) {
        bot.barrelRecoils[i] = 8
      }

      const spawnDist = bot.radius + barrel.length + 5
      const spawnX = bot.position.x + Math.cos(barrelAngle) * spawnDist
      const spawnY = bot.position.y + Math.sin(barrelAngle) * spawnDist

      const bulletSpeed = bot.bulletSpeed * (1 + bot.statPoints.bulletSpeed * 0.05)

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
        ownerId: bot.id,
        team: bot.team,
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
    bot.lastRegenTime = Date.now()
    return bot.health <= 0
  }

  /**
   * Award XP to a bot (for killing shapes or enemies)
   */
  awardXP(botId: string, xp: number) {
    const bot = this.bots.find(b => b.id === botId)
    if (!bot) return

    bot.xp += xp
  }

  /**
   * Award XP to bot by loot ID (for farming)
   */
  awardXPForLoot(farmTargets: Map<string, string>, lootId: string, xpValue: number) {
    for (const [botId, targetId] of farmTargets.entries()) {
      if (targetId === lootId) {
        this.awardXP(botId, xpValue)
      }
    }
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
