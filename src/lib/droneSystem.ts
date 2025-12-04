import type { Drone, DroneControlMode, Vector2, Player, Loot, BotPlayer, Team } from './types'
import { TANK_CONFIGS } from './tankConfigs'
import type { TeamSystem } from './TeamSystem'

// Union type for drone targets (can be loot or enemy bots)
interface DroneTarget {
  id: string
  position: Vector2
  health: number
  maxHealth?: number
  radius?: number
  isBot?: boolean
}

export class DroneSystem {
  private drones: Drone[] = []
  private controlMode: DroneControlMode = 'idle'
  private lastSpawnTimes: Map<string, number> = new Map()
  private droneIdCounter = 0
  private camera: Vector2 = { x: 0, y: 0 }
  private viewportWidth: number = 800
  private viewportHeight: number = 600
  private teamSystem: TeamSystem | null = null
  private botTargets: Map<string, string> = new Map() // droneId -> botId mapping

  constructor(teamSystem?: TeamSystem) {
    this.teamSystem = teamSystem ?? null
  }

  setViewport(camera: Vector2, width: number, height: number) {
    this.camera = camera
    this.viewportWidth = width
    this.viewportHeight = height
  }

  update(deltaTime: number, mousePosition: Vector2, player: Player, targets: Loot[], bots?: BotPlayer[]) {
    // Update all drones
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i]
      
      // Remove dead drones
      if (drone.health <= 0) {
        this.botTargets.delete(drone.id)
        this.drones.splice(i, 1)
        continue
      }
      
      this.updateDrone(drone, deltaTime, mousePosition, player, targets, bots || [])
    }
    
    // Spawn new drones for drone classes
    this.trySpawnDrones(player)
  }

  private updateDrone(drone: Drone, deltaTime: number, mousePosition: Vector2, player: Player, targets: Loot[], bots: BotPlayer[]) {
    const tankConfig = TANK_CONFIGS[player.tankClass]
    
    // Create bot lookup map for O(1) access
    const botMap = new Map<string, BotPlayer>()
    for (const bot of bots) {
      botMap.set(bot.id, bot)
    }
    
    // Sniper evolution classes (Overseer, Overlord, Manager, Factory, Battleship, Hybrid, Overtrapper)
    // should auto-attack without mouse control
    const isAutoAttackClass = tankConfig?.isDroneClass && 
      ['overseer', 'overlord', 'manager', 'factory', 'battleship', 'hybrid', 'overtrapper'].includes(player.tankClass)
    
    if (isAutoAttackClass) {
      // Check distance from player - prioritize staying close but allow full screen travel
      const distToPlayer = this.getDistance(drone.position, player.position)
      const maxFollowDistance = Math.max(this.viewportWidth, this.viewportHeight) * 1.5
      const maxAttackRange = 500 // Attack enemies within 500px of the player
      
      // If drone is far from player, force return
      if (distToPlayer > maxFollowDistance) {
        drone.state = 'returning'
        drone.target = null
        this.orbitAroundPlayer(drone, player, deltaTime)
        return
      }
      
      // Continuously check for better targets (priority: enemies > shapes)
      const currentBotId = this.botTargets.get(drone.id)
      const currentBot = currentBotId ? botMap.get(currentBotId) : null
      
      // Always check for enemy bots first (highest priority)
      const nearestEnemyBot = this.findNearestEnemyBot(drone, player, bots, maxAttackRange)
      
      if (nearestEnemyBot) {
        // Switch to enemy bot if:
        // 1. We don't have a bot target yet, OR
        // 2. The new bot is closer/lower health than current target
        const distToNearestBot = this.getDistance(player.position, nearestEnemyBot.position)
        const distToCurrentBot = currentBot ? this.getDistance(player.position, currentBot.position) : Infinity
        const shouldSwitch = !currentBot || 
                            currentBot.health <= 0 ||
                            distToNearestBot < distToCurrentBot
        
        if (shouldSwitch) {
          this.botTargets.set(drone.id, nearestEnemyBot.id)
          drone.state = 'attacking'
          drone.target = null // Bot targets are tracked separately
          drone.targetPosition = { ...nearestEnemyBot.position }
        }
      } else if (drone.state !== 'attacking' || !drone.target || (drone.target.health && drone.target.health <= 0)) {
        // No enemy bots nearby, clear bot tracking and look for shapes (low priority)
        this.botTargets.delete(drone.id)
        
        const nearestTarget = this.findNearestTargetInView(drone, player, targets, maxAttackRange)
        if (nearestTarget) {
          drone.state = 'attacking'
          drone.target = nearestTarget
          drone.targetPosition = { ...nearestTarget.position }
        } else {
          drone.state = 'idle'
          drone.target = null
        }
      }
      
      // Execute behavior based on state
      if (drone.state === 'attacking') {
        // Check if we're tracking a bot target
        const trackedBotId = this.botTargets.get(drone.id)
        if (trackedBotId) {
          const targetBot = botMap.get(trackedBotId)
          if (targetBot && targetBot.health > 0) {
            // Update position of bot target and check if still in range
            const targetDistToPlayer = this.getDistance(targetBot.position, player.position)
            if (targetDistToPlayer < maxAttackRange) {
              drone.targetPosition = { ...targetBot.position }
              this.moveDroneToPosition(drone, drone.targetPosition, deltaTime)
            } else {
              // Target too far from player
              drone.state = 'returning'
              drone.target = null
              this.botTargets.delete(drone.id)
            }
          } else {
            // Bot is dead or not found
            drone.state = 'returning'
            drone.target = null
            this.botTargets.delete(drone.id)
          }
        } else if (drone.target && drone.target.health && drone.target.health > 0) {
          // Regular loot target
          const targetDistToPlayer = this.getDistance(drone.target.position, player.position)
          
          // Only continue attacking if target is within range and in view
          if (targetDistToPlayer < maxAttackRange && this.isInScreenView(drone.target.position, player)) {
            drone.targetPosition = { ...drone.target.position }
            this.moveDroneToPosition(drone, drone.targetPosition, deltaTime)
          } else {
            // Target too far or out of view, return to player
            drone.state = 'returning'
            drone.target = null
          }
        } else {
          drone.state = 'returning'
          drone.target = null
        }
      } else {
        // returning or idle - follow player at a distance
        this.orbitAroundPlayer(drone, player, deltaTime)
      }
    } else {
      // Original mouse-controlled behavior for Necromancer
      switch (this.controlMode) {
        case 'attract':
          drone.state = 'controlled'
          drone.targetPosition = { ...mousePosition }
          break
        
        case 'repel':
          drone.state = 'controlled'
          const repelDx = player.position.x - mousePosition.x
          const repelDy = player.position.y - mousePosition.y
          const repelDist = Math.sqrt(repelDx * repelDx + repelDy * repelDy)
          if (repelDist > 0) {
            const repelAngle = Math.atan2(repelDy, repelDx)
            drone.targetPosition = {
              x: player.position.x + Math.cos(repelAngle) * 400,
              y: player.position.y + Math.sin(repelAngle) * 400
            }
          }
          break
        
        case 'idle':
          if (drone.state !== 'attacking' || !drone.target || (drone.target.health && drone.target.health <= 0)) {
            const nearestTarget = this.findNearestTarget(drone, player, targets, 300)
            if (nearestTarget) {
              drone.state = 'attacking'
              drone.target = nearestTarget
              drone.targetPosition = { ...nearestTarget.position }
            } else {
              drone.state = 'idle'
              drone.target = null
            }
          }
          break
      }
      
      // Execute behavior based on state
      if (drone.state === 'controlled') {
        if (drone.targetPosition) {
          this.moveDroneToPosition(drone, drone.targetPosition, deltaTime)
        }
      } else if (drone.state === 'attacking') {
        if (drone.target && drone.target.health && drone.target.health > 0) {
          drone.targetPosition = { ...drone.target.position }
          this.moveDroneToPosition(drone, drone.targetPosition, deltaTime)
        } else {
          drone.state = 'returning'
          drone.target = null
        }
      } else {
        // returning or idle
        this.orbitAroundPlayer(drone, player, deltaTime)
      }
      
      // Check if drone is too far from player
      const distToPlayer = this.getDistance(drone.position, player.position)
      if (distToPlayer > 800) {
        drone.state = 'returning'
        drone.target = null
      }
    }
  }

  private moveDroneToPosition(drone: Drone, target: Vector2, deltaTime: number) {
    const dx = target.x - drone.position.x
    const dy = target.y - drone.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 5) {
      const dirX = dx / dist
      const dirY = dy / dist
      
      drone.velocity.x = dirX * drone.speed
      drone.velocity.y = dirY * drone.speed
      
      drone.position.x += drone.velocity.x * deltaTime
      drone.position.y += drone.velocity.y * deltaTime
    } else {
      drone.velocity.x = 0
      drone.velocity.y = 0
    }
  }

  private orbitAroundPlayer(drone: Drone, player: Player, deltaTime: number) {
    const orbitRadius = 80
    const orbitSpeed = 2
    
    drone.orbitAngle += orbitSpeed * deltaTime
    if (drone.orbitAngle > Math.PI * 2) {
      drone.orbitAngle -= Math.PI * 2
    }
    
    const targetX = player.position.x + Math.cos(drone.orbitAngle) * orbitRadius
    const targetY = player.position.y + Math.sin(drone.orbitAngle) * orbitRadius
    
    const dx = targetX - drone.position.x
    const dy = targetY - drone.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 5) {
      const dirX = dx / dist
      const dirY = dy / dist
      
      drone.velocity.x = dirX * drone.speed * 0.5
      drone.velocity.y = dirY * drone.speed * 0.5
      
      drone.position.x += drone.velocity.x * deltaTime
      drone.position.y += drone.velocity.y * deltaTime
    }
  }

  private findNearestTarget(drone: Drone, player: Player, targets: Loot[], range: number): Loot | null {
    let nearest: Loot | null = null
    let nearestDist = range
    
    for (const target of targets) {
      if (target.type !== 'box' && target.type !== 'treasure' && target.type !== 'boss') continue
      if (!target.health || target.health <= 0) continue
      
      const dist = this.getDistance(drone.position, target.position)
      if (dist < nearestDist) {
        nearest = target
        nearestDist = dist
      }
    }
    
    return nearest
  }

  private findNearestEnemyBot(drone: Drone, player: Player, bots: BotPlayer[], range: number): BotPlayer | null {
    if (!this.teamSystem) return null
    
    // Prioritize low-health enemies, then by proximity to drone
    let bestTarget: BotPlayer | null = null
    let bestDist = Infinity
    let lowestHealthPercent = 1.0
    
    for (const bot of bots) {
      // Skip if bot is dead
      if (bot.health <= 0) continue
      
      // Skip if bot is ally
      if (this.teamSystem.areAllies(player.team, bot.team)) continue
      
      // Check distance from player - attack enemies within 500px, even slightly off-screen
      const distFromPlayer = this.getDistance(player.position, bot.position)
      if (distFromPlayer > range) continue
      
      // Calculate distance from drone
      const distFromDrone = this.getDistance(drone.position, bot.position)
      
      // Prioritize low-health enemies first, then by closest to drone
      const healthPercent = bot.health / bot.maxHealth
      
      // Select if: lower health than current best, OR same health but closer to drone
      if (healthPercent < lowestHealthPercent || (healthPercent === lowestHealthPercent && distFromDrone < bestDist)) {
        bestTarget = bot
        bestDist = distFromDrone
        lowestHealthPercent = healthPercent
      }
    }
    
    return bestTarget
  }

  private findNearestTargetInView(drone: Drone, player: Player, targets: Loot[], range: number): Loot | null {
    let nearest: Loot | null = null
    let nearestDist = range
    
    for (const target of targets) {
      if (target.type !== 'box' && target.type !== 'treasure' && target.type !== 'boss') continue
      if (!target.health || target.health <= 0) continue
      
      // Check if target is in screen view
      if (!this.isInScreenView(target.position, player)) continue
      
      // Check distance from player (not drone)
      const distFromPlayer = this.getDistance(player.position, target.position)
      if (distFromPlayer > range) continue
      
      // Now check distance from drone for nearest calculation
      const dist = this.getDistance(drone.position, target.position)
      if (dist < nearestDist) {
        nearest = target
        nearestDist = dist
      }
    }
    
    return nearest
  }

  private isInScreenView(position: Vector2, player: Player): boolean {
    // Calculate screen bounds with some padding
    const padding = 100
    const screenLeft = this.camera.x - padding
    const screenRight = this.camera.x + this.viewportWidth + padding
    const screenTop = this.camera.y - padding
    const screenBottom = this.camera.y + this.viewportHeight + padding
    
    return position.x >= screenLeft && 
           position.x <= screenRight && 
           position.y >= screenTop && 
           position.y <= screenBottom
  }

  private getDistance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private trySpawnDrones(player: Player) {
    const tankConfig = TANK_CONFIGS[player.tankClass]
    if (!tankConfig || !tankConfig.isDroneClass) return
    
    const maxDrones = tankConfig.droneCount || 0
    const spawnerCount = tankConfig.spawnerCount || 0
    
    if (this.drones.length >= maxDrones || spawnerCount === 0) return
    
    const now = Date.now()
    const spawnKey = `${player.id}_spawn`
    const lastSpawn = this.lastSpawnTimes.get(spawnKey) || 0
    
    // Calculate spawn rate from player stats - faster spawning with better reload
    const baseSpawnRate = 2000
    const reloadBonus = Math.max(0, 1 - (player.fireRate / 500))
    const spawnRate = baseSpawnRate * (0.5 + reloadBonus * 0.5)
    
    if (now - lastSpawn >= spawnRate) {
      this.spawnDrone(player, tankConfig.droneType || 'triangle')
      this.lastSpawnTimes.set(spawnKey, now)
    }
  }

  spawnDrone(player: Player, droneType: 'triangle' | 'square' | 'minion'): Drone | null {
    const tankConfig = TANK_CONFIGS[player.tankClass]
    if (!tankConfig || !tankConfig.isDroneClass) return null
    
    const maxDrones = tankConfig.droneCount || 0
    if (this.drones.filter(d => d.ownerId === player.id).length >= maxDrones) return null
    
    // Calculate drone stats from player stats
    const droneSpeed = 150 + (player.speed * 0.5)
    const droneDamage = 5 + (player.damage * 0.3)
    const droneHealth = 10 + (player.bulletPenetration * 2)
    
    const angle = Math.random() * Math.PI * 2
    const spawnDist = 30
    
    const drone: Drone = {
      id: `drone_${this.droneIdCounter++}`,
      position: {
        x: player.position.x + Math.cos(angle) * spawnDist,
        y: player.position.y + Math.sin(angle) * spawnDist
      },
      velocity: { x: 0, y: 0 },
      targetPosition: null,
      health: droneHealth,
      maxHealth: droneHealth,
      damage: droneDamage,
      speed: droneSpeed,
      radius: droneType === 'minion' ? 12 : droneType === 'square' ? 8 : 10,
      ownerId: player.id,
      droneType,
      state: 'idle',
      orbitAngle: angle,
      target: null
    }
    
    this.drones.push(drone)
    return drone
  }

  canSpawnDrone(player: Player): boolean {
    const tankConfig = TANK_CONFIGS[player.tankClass]
    if (!tankConfig || !tankConfig.isDroneClass) return false
    
    const maxDrones = tankConfig.droneCount || 0
    const currentDrones = this.drones.filter(d => d.ownerId === player.id).length
    
    return currentDrones < maxDrones
  }

  setControlMode(mode: DroneControlMode) {
    this.controlMode = mode
  }

  getControlMode(): DroneControlMode {
    return this.controlMode
  }

  convertShapeToDrone(shape: Loot, player: Player): boolean {
    const tankConfig = TANK_CONFIGS[player.tankClass]
    
    // Only Necromancer can convert shapes
    if (player.tankClass !== 'necromancer') return false
    if (!tankConfig || !tankConfig.isDroneClass) return false
    
    const maxDrones = tankConfig.droneCount || 34
    const currentDrones = this.drones.filter(d => d.ownerId === player.id).length
    
    if (currentDrones >= maxDrones) return false
    
    // Create square drone at shape position
    const droneSpeed = 150 + (player.speed * 0.5)
    const droneDamage = 5 + (player.damage * 0.3)
    const droneHealth = 10 + (player.bulletPenetration * 2)
    
    const drone: Drone = {
      id: `drone_necro_${this.droneIdCounter++}`,
      position: { ...shape.position },
      velocity: { x: 0, y: 0 },
      targetPosition: null,
      health: droneHealth,
      maxHealth: droneHealth,
      damage: droneDamage,
      speed: droneSpeed,
      radius: 8,
      ownerId: player.id,
      droneType: 'square',
      state: 'idle',
      orbitAngle: Math.random() * Math.PI * 2,
      target: null
    }
    
    this.drones.push(drone)
    return true
  }

  checkDroneCollisions(targets: Loot[]): { droneId: string, targetId: string, damage: number }[] {
    const collisions: { droneId: string, targetId: string, damage: number }[] = []
    
    for (const drone of this.drones) {
      for (const target of targets) {
        if (target.type !== 'box' && target.type !== 'treasure' && target.type !== 'boss') continue
        if (!target.health || target.health <= 0) continue
        if (!target.radius) continue
        
        const dist = this.getDistance(drone.position, target.position)
        const collisionDist = drone.radius + target.radius
        
        if (dist < collisionDist) {
          collisions.push({
            droneId: drone.id,
            targetId: target.id,
            damage: drone.damage
          })
          
          // Bounce back
          const angle = Math.atan2(target.position.y - drone.position.y, target.position.x - drone.position.x)
          drone.velocity.x = -Math.cos(angle) * drone.speed
          drone.velocity.y = -Math.sin(angle) * drone.speed
        }
      }
    }
    
    return collisions
  }

  checkDroneBotCollisions(bots: BotPlayer[], playerTeam: Team): { droneId: string, botId: string, damage: number }[] {
    const collisions: { droneId: string, botId: string, damage: number }[] = []
    
    if (!this.teamSystem) return collisions
    
    for (const drone of this.drones) {
      for (const bot of bots) {
        if (bot.health <= 0) continue
        
        // Skip if bot is ally to the drone owner
        if (this.teamSystem.areAllies(playerTeam, bot.team)) continue
        
        const dist = this.getDistance(drone.position, bot.position)
        const collisionDist = drone.radius + bot.radius
        
        if (dist < collisionDist) {
          collisions.push({
            droneId: drone.id,
            botId: bot.id,
            damage: drone.damage
          })
          
          // Bounce back
          const angle = Math.atan2(bot.position.y - drone.position.y, bot.position.x - drone.position.x)
          drone.velocity.x = -Math.cos(angle) * drone.speed
          drone.velocity.y = -Math.sin(angle) * drone.speed
        }
      }
    }
    
    return collisions
  }

  getDrones(): Drone[] {
    return this.drones
  }

  getPlayerDrones(playerId: string): Drone[] {
    return this.drones.filter(d => d.ownerId === playerId)
  }

  clear() {
    this.drones = []
    this.lastSpawnTimes.clear()
    this.botTargets.clear()
  }

  removeDrone(droneId: string) {
    const index = this.drones.findIndex(d => d.id === droneId)
    if (index !== -1) {
      this.botTargets.delete(droneId)
      this.drones.splice(index, 1)
    }
  }
}
