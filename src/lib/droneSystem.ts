import type { Drone, DroneControlMode, Vector2, Player, Loot } from './types'
import { TANK_CONFIGS } from './tankConfigs'

export class DroneSystem {
  private drones: Drone[] = []
  private controlMode: DroneControlMode = 'idle'
  private lastSpawnTimes: Map<string, number> = new Map()
  private droneIdCounter = 0
  private camera: Vector2 = { x: 0, y: 0 }
  private viewportWidth: number = 800
  private viewportHeight: number = 600

  setViewport(camera: Vector2, width: number, height: number) {
    this.camera = camera
    this.viewportWidth = width
    this.viewportHeight = height
  }

  update(deltaTime: number, mousePosition: Vector2, player: Player, targets: Loot[]) {
    // Update all drones
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i]
      
      // Remove dead drones
      if (drone.health <= 0) {
        this.drones.splice(i, 1)
        continue
      }
      
      this.updateDrone(drone, deltaTime, mousePosition, player, targets)
    }
    
    // Spawn new drones for drone classes
    this.trySpawnDrones(player)
  }

  private updateDrone(drone: Drone, deltaTime: number, mousePosition: Vector2, player: Player, targets: Loot[]) {
    const tankConfig = TANK_CONFIGS[player.tankClass]
    
    // Sniper evolution classes (Overseer, Overlord, Manager, Factory, Battleship, Hybrid, Overtrapper)
    // should auto-attack without mouse control
    const isAutoAttackClass = tankConfig?.isDroneClass && 
      ['overseer', 'overlord', 'manager', 'factory', 'battleship', 'hybrid', 'overtrapper'].includes(player.tankClass)
    
    if (isAutoAttackClass) {
      // Check distance from player - prioritize staying close but allow full screen travel
      const distToPlayer = this.getDistance(drone.position, player.position)
      const maxFollowDistance = Math.max(this.viewportWidth, this.viewportHeight) * 1.5
      const maxAttackRange = maxFollowDistance
      
      // If drone is far from player, force return
      if (distToPlayer > maxFollowDistance) {
        drone.state = 'returning'
        drone.target = null
        this.orbitAroundPlayer(drone, player, deltaTime)
        return
      }
      
      // Only look for targets when close to player
      if (drone.state !== 'attacking' || !drone.target || (drone.target.health && drone.target.health <= 0)) {
        // Find targets only within screen space and attack range
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
      if (drone.state === 'attacking' && drone.target) {
        // Check if target is still valid and in range
        if (drone.target.health && drone.target.health > 0) {
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

  getDrones(): Drone[] {
    return this.drones
  }

  getPlayerDrones(playerId: string): Drone[] {
    return this.drones.filter(d => d.ownerId === playerId)
  }

  clear() {
    this.drones = []
    this.lastSpawnTimes.clear()
  }

  removeDrone(droneId: string) {
    const index = this.drones.findIndex(d => d.id === droneId)
    if (index !== -1) {
      this.drones.splice(index, 1)
    }
  }
}
