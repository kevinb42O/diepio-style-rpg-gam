import type { Drone, DroneControlMode, Vector2, Player, Loot } from './types'
import { TANK_CONFIGS } from './tankConfigs'

export class DroneSystem {
  private drones: Drone[] = []
  private controlMode: DroneControlMode = 'idle'
  private lastSpawnTimes: Map<string, number> = new Map()
  private droneIdCounter = 0

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
    const dt = deltaTime / 1000 // Convert to seconds
    
    // Update state based on control mode
    switch (this.controlMode) {
      case 'attract':
        drone.state = 'controlled'
        drone.targetPosition = { ...mousePosition }
        break
      
      case 'repel':
        drone.state = 'controlled'
        // Calculate repel position (away from mouse)
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
        // Check for nearby targets if not already attacking
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
    switch (drone.state) {
      case 'controlled':
        if (drone.targetPosition) {
          this.moveDroneToPosition(drone, drone.targetPosition, dt)
        }
        break
      
      case 'attacking':
        if (drone.target && drone.target.health && drone.target.health > 0) {
          drone.targetPosition = { ...drone.target.position }
          this.moveDroneToPosition(drone, drone.targetPosition, dt)
        } else {
          drone.state = 'returning'
          drone.target = null
        }
        break
      
      case 'returning':
      case 'idle':
        // Orbit around player
        this.orbitAroundPlayer(drone, player, dt)
        break
    }
    
    // Check if drone is too far from player
    const distToPlayer = this.getDistance(drone.position, player.position)
    if (distToPlayer > 800) {
      drone.state = 'returning'
      drone.target = null
    }
  }

  private moveDroneToPosition(drone: Drone, target: Vector2, dt: number) {
    const dx = target.x - drone.position.x
    const dy = target.y - drone.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 5) {
      const dirX = dx / dist
      const dirY = dy / dist
      
      drone.velocity.x = dirX * drone.speed
      drone.velocity.y = dirY * drone.speed
      
      drone.position.x += drone.velocity.x * dt
      drone.position.y += drone.velocity.y * dt
    } else {
      drone.velocity.x = 0
      drone.velocity.y = 0
    }
  }

  private orbitAroundPlayer(drone: Drone, player: Player, dt: number) {
    const orbitRadius = 80
    const orbitSpeed = 2 // radians per second
    
    drone.orbitAngle += orbitSpeed * dt
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
      
      drone.position.x += drone.velocity.x * dt
      drone.position.y += drone.velocity.y * dt
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
    
    // Calculate spawn rate from player stats
    const baseSpawnRate = 2000 // 2 seconds base
    const spawnRate = baseSpawnRate / (1 + (player.fireRate / 300) * 0.5)
    
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
