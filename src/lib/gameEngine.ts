import type { Player, Projectile, Loot, Vector2, Rarity, Weapon, Armor, DroneControlMode, PointOfInterest } from './types'
import { UpgradeManager, type StatType } from './upgradeSystem'
import { ParticleSystem } from '@/systems/ParticleSystem'
import { QuadTree } from '@/utils/QuadTree'
import { ScreenEffects } from '@/utils/ScreenEffects'
import { Physics } from '@/utils/Physics'
import { audioManager } from '@/audio/AudioManager'
import { ObjectPool } from '@/utils/ObjectPool'
import { TANK_CONFIGS } from './tankConfigs'
import { DroneSystem } from './droneSystem'
import { ParticlePool } from './particlePool'
import { ZoneSystem } from './zoneSystem'
import { BotAISystem } from './botAI'
import { TeamSystem } from './TeamSystem'

export class GameEngine {
  upgradeManager: UpgradeManager
  player: Player
  projectiles: Projectile[] = []
  loot: Loot[] = []
  mousePosition: Vector2 = { x: 0, y: 0 }
  keys: Set<string> = new Set()
  isShooting = false
  lastBoxSpawnTime = 0
  boxSpawnInterval = 3000
  gameTime = 0
  particles: Particle[] = []
  mobileInput: Vector2 = { x: 0, y: 0 }
  mobileShootDirection: Vector2 = { x: 0, y: 0 }
  worldSize = 16000 // Circular world diameter
  worldRadius = 8000
  worldCenter: Vector2 = { x: 8000, y: 8000 }
  camera: Vector2 = { x: 0, y: 0 }
  cameraVelocity = { x: 0, y: 0 }
  viewportWidth = 800
  viewportHeight = 600
  barrelRecoil = 0
  muzzleFlashes: MuzzleFlash[] = []
  onLevelUp: (() => void) | null = null
  private renderCallback: (() => void) | null = null
  
  // Enhanced systems
  particleSystem: ParticleSystem
  screenEffects: ScreenEffects
  quadTree: QuadTree
  projectilePool: ObjectPool<Projectile>
  droneSystem: DroneSystem
  droneControlMode: DroneControlMode = 'idle'
  autoFire = false
  invincibilityFrames = 0
  comboKills = 0
  lastKillTime = 0
  comboMultiplier = 1
  currentBarrelIndex = 0 // For alternating fire pattern
  
  // New systems
  particlePool: ParticlePool
  zoneSystem: ZoneSystem
  botAISystem: BotAISystem
  teamSystem: TeamSystem
  botFarmTargets: Map<string, string> = new Map()

  constructor() {
    this.teamSystem = new TeamSystem()
    this.upgradeManager = new UpgradeManager()
    this.player = this.createPlayer()
    this.particleSystem = new ParticleSystem()
    this.screenEffects = new ScreenEffects()
    this.quadTree = new QuadTree({ x: 0, y: 0, width: this.worldSize, height: this.worldSize })
    this.droneSystem = new DroneSystem(this.teamSystem)
    this.projectilePool = new ObjectPool<Projectile>(
      () => ({
        id: `proj_${Date.now()}_${Math.random()}`,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        damage: 10,
        radius: 5,
        isPlayerProjectile: true,
      }),
      (p) => {
        p.position.x = 0
        p.position.y = 0
        p.velocity.x = 0
        p.velocity.y = 0
      },
      20,
      100
    )
    this.particlePool = new ParticlePool()
    this.zoneSystem = new ZoneSystem()
    this.botAISystem = new BotAISystem(this.teamSystem)
  }

  setRenderCallback(callback: (() => void) | null) {
    this.renderCallback = callback
  }

  createPlayer(): Player {
    return {
      id: 'player',
      position: { x: this.worldCenter.x, y: this.worldCenter.y },
      velocity: { x: 0, y: 0 },
      radius: 15,
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      damage: 10,
      fireRate: 300,
      speed: 200,
      lastShotTime: 0,
      weapon: null,
      armor: null,
      kills: 0,
      bulletSpeed: 400,
      bulletPenetration: 5,
      bodyDamage: 10,
      healthRegen: 1,
      lastRegenTime: 0,
      tankClass: 'basic',
      lootRange: 50,
      invisibility: 0,
      invisibilityTimer: 0,
      bodyShape: 'circle',
      barrelRecoils: [0],
      team: this.teamSystem.getPlayerTeam(),
      name: 'You',
    }
  }

  reset() {
    this.teamSystem.reset()
    this.upgradeManager.reset()
    this.player = this.createPlayer()
    this.projectiles = []
    this.loot = []
    this.particles = []
    this.gameTime = 0
    this.lastBoxSpawnTime = 0
    this.particleSystem.clear()
    this.screenEffects.clear()
    this.droneSystem.clear()
    this.droneControlMode = 'idle'
    this.invincibilityFrames = 2.0 // 2 seconds of invincibility after respawn
    this.comboKills = 0
    this.lastKillTime = 0
    this.comboMultiplier = 1
    this.particlePool.clear()
    this.botAISystem.clear()
    
    this.generateWorldLoot()
  }

  generateWorldLoot() {
    const zones = this.zoneSystem.getZones()
    
    // Generate loot per zone
    for (const zone of zones) {
      const lootCount = zone.id === 1 ? 120 : zone.id === 2 ? 180 : 240
      
      for (let i = 0; i < lootCount; i++) {
        // Random position in zone (circular)
        const angle = Math.random() * Math.PI * 2
        const minDist = zone.radiusMin + 100
        const maxDist = zone.radiusMax - 100
        const distance = minDist + Math.random() * (maxDist - minDist)
        const x = this.worldCenter.x + Math.cos(angle) * distance
        const y = this.worldCenter.y + Math.sin(angle) * distance
        
        // Size increases with zone
        const baseSize = zone.id === 1 ? 0.3 : zone.id === 2 ? 0.5 : 0.7
        const size = baseSize + Math.random() * 0.5
        let radius: number, health: number, contactDamage: number, xpValue: number
        
        if (size < 0.5) {
          radius = 15
          health = 20 * zone.id
          contactDamage = 5 * zone.id
          xpValue = 15 * zone.id
        } else if (size < 0.8) {
          radius = 25
          health = 50 * zone.id
          contactDamage = 15 * zone.id
          xpValue = 40 * zone.id
        } else if (size < 1.1) {
          radius = 35
          health = 100 * zone.id
          contactDamage = 30 * zone.id
          xpValue = 80 * zone.id
        } else {
          radius = 50
          health = 200 * zone.id
          contactDamage = 50 * zone.id
          xpValue = 150 * zone.id
        }
        
        this.loot.push({
          id: `box_zone${zone.id}_${i}`,
          position: { x, y },
          type: 'box',
          value: xpValue,
          health,
          maxHealth: health,
          radius,
          contactDamage,
        })
      }
    }

    // Spawn POI loot at each POI
    for (const zone of zones) {
      if (zone.poi) {
        this.spawnPOILoot(zone.poi)
      }
    }

    // Add boss spawns in danger zone
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = 5000 + Math.random() * 2500
      const x = this.worldCenter.x + Math.cos(angle) * distance
      const y = this.worldCenter.y + Math.sin(angle) * distance
      
      this.loot.push({
        id: `boss_${i}`,
        position: { x, y },
        type: 'boss',
        value: 1000,
        health: 500,
        maxHealth: 500,
        radius: 60,
        contactDamage: 80,
        isBoss: true,
      })
    }
  }

  spawnPOILoot(poi: PointOfInterest) {
    // Spawn loot at POI center
    const rarityMultiplier = poi.lootRarity === 'legendary' ? 5 : poi.lootRarity === 'epic' ? 3 : 2
    
    this.loot.push({
      id: `poi_loot_${poi.id}_${Date.now()}`,
      position: { ...poi.position },
      type: 'treasure',
      value: 500 * rarityMultiplier,
      health: 200 * rarityMultiplier,
      maxHealth: 200 * rarityMultiplier,
      radius: 35,
      contactDamage: 25 * rarityMultiplier,
      isTreasure: true,
    })
  }

  update(deltaTime: number) {
    this.gameTime += deltaTime * 1000

    // Update invincibility frames
    if (this.invincibilityFrames > 0) {
      this.invincibilityFrames -= deltaTime
    }

    // Update combo system
    if (this.gameTime - this.lastKillTime > 3000) {
      this.comboKills = 0
      this.comboMultiplier = 1
    }

    this.updatePlayer(deltaTime)
    this.updateProjectiles(deltaTime)
    this.updateLoot(deltaTime)
    this.updateParticles(deltaTime)
    this.updateRecoilAndFlash(deltaTime)
    this.updateCameraSmooth(deltaTime)
    this.updateInvisibility(deltaTime)
    this.spawnLootBoxes()
    this.checkCollisionsOptimized()
    this.cleanupEntities()
    
    // Update enhanced systems
    this.particleSystem.update(deltaTime)
    this.screenEffects.update(deltaTime)
    
    // Update new systems
    this.particlePool.update(deltaTime)
    this.zoneSystem.updatePlayerZone(this.player.position, this.gameTime)
    this.botAISystem.updateSpawning(this.zoneSystem.getZones(), this.gameTime)
    const botUpdate = this.botAISystem.update(deltaTime, this.player.position, this.player.radius, this.gameTime, this.loot, this.player.team)
    this.projectiles.push(...botUpdate.projectiles)
    this.botFarmTargets = botUpdate.farmTargets
    
    // Update drones with bot information for enemy targeting
    this.droneSystem.setViewport(this.camera, this.viewportWidth, this.viewportHeight)
    this.droneSystem.update(deltaTime, this.mousePosition, this.player, this.loot, this.botAISystem.getBots())
    this.checkDroneCollisions()
    
    this.checkBotCollisions(botUpdate.farmTargets)
    
    // Check for POI loot respawn
    const poiToRespawn = this.zoneSystem.trySpawnPOILoot(this.gameTime)
    if (poiToRespawn) {
      this.spawnPOILoot(poiToRespawn)
    }

    if (this.renderCallback) {
      this.renderCallback()
    }
  }

  updateRecoilAndFlash(deltaTime: number) {
    if (this.barrelRecoil > 0) {
      this.barrelRecoil = Math.max(0, this.barrelRecoil - deltaTime * 30)
    }

    // Update per-barrel recoils
    if (this.player.barrelRecoils) {
      for (let i = 0; i < this.player.barrelRecoils.length; i++) {
        if (this.player.barrelRecoils[i] > 0) {
          this.player.barrelRecoils[i] = Math.max(0, this.player.barrelRecoils[i] - deltaTime * 30)
        }
      }
    }

    for (const flash of this.muzzleFlashes) {
      flash.life -= deltaTime
      flash.alpha = Math.max(0, flash.life / flash.maxLife)
    }

    this.muzzleFlashes = this.muzzleFlashes.filter(f => f.life > 0)
  }

  updateCamera() {
    this.camera.x = this.player.position.x - this.viewportWidth / 2
    this.camera.y = this.player.position.y - this.viewportHeight / 2
    
    this.camera.x = Math.max(0, Math.min(this.worldSize - this.viewportWidth, this.camera.x))
    this.camera.y = Math.max(0, Math.min(this.worldSize - this.viewportHeight, this.camera.y))
  }

  updateCameraSmooth(deltaTime: number) {
    const targetX = this.player.position.x - this.viewportWidth / 2
    const targetY = this.player.position.y - this.viewportHeight / 2
    
    const smoothTime = 0.15
    const resultX = Physics.smoothDamp(this.camera.x, targetX, this.cameraVelocity.x, smoothTime, deltaTime)
    const resultY = Physics.smoothDamp(this.camera.y, targetY, this.cameraVelocity.y, smoothTime, deltaTime)
    
    this.camera.x = resultX.value
    this.camera.y = resultY.value
    this.cameraVelocity.x = resultX.velocity
    this.cameraVelocity.y = resultY.velocity
    
    // Add screen shake offset
    if (this.screenEffects.isShaking()) {
      const shakeOffset = this.screenEffects.getShakeOffset()
      this.camera.x += shakeOffset.x
      this.camera.y += shakeOffset.y
    }
    
    this.camera.x = Math.max(0, Math.min(this.worldSize - this.viewportWidth, this.camera.x))
    this.camera.y = Math.max(0, Math.min(this.worldSize - this.viewportHeight, this.camera.y))
  }

  updateInvisibility(deltaTime: number) {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    
    if (!tankConfig || !tankConfig.invisibility) {
      this.player.invisibility = 0
      this.player.invisibilityTimer = 0
      return
    }
    
    const isMoving = this.player.velocity.x !== 0 || this.player.velocity.y !== 0
    const isShooting = this.gameTime - this.player.lastShotTime < 100
    
    if (isMoving || isShooting) {
      // Reset invisibility
      this.player.invisibilityTimer = 0
      this.player.invisibility = 0
    } else {
      // Build up invisibility
      this.player.invisibilityTimer += deltaTime
      
      const delay = tankConfig.invisibility.delay
      if (this.player.invisibilityTimer >= delay) {
        const fadeTime = 1.0 // 1 second to fully fade
        const timeSinceDelay = this.player.invisibilityTimer - delay
        this.player.invisibility = Math.min(1, timeSinceDelay / fadeTime)
      }
    }
  }

  checkDroneCollisions() {
    // Check drone-loot collisions
    const collisions = this.droneSystem.checkDroneCollisions(this.loot)
    
    for (const collision of collisions) {
      const lootIndex = this.loot.findIndex(l => l.id === collision.targetId)
      if (lootIndex !== -1) {
        const loot = this.loot[lootIndex]
        if (loot.health !== undefined) {
          loot.health = Math.max(0, loot.health - collision.damage)
          
          if (loot.health <= 0) {
            if (this.player.tankClass === 'necromancer') {
              this.droneSystem.convertShapeToDrone(loot, this.player)
            }
            
            this.breakLootBox(lootIndex)
          }
        }
      }
    }
    
    // Check drone-bot collisions
    const botCollisions = this.droneSystem.checkDroneBotCollisions(this.botAISystem.getBots(), this.player.team)
    
    for (const collision of botCollisions) {
      const killed = this.botAISystem.damageBot(collision.botId, collision.damage)
      
      if (killed) {
        // Find the bot for XP calculation
        const bot = this.botAISystem.getBots().find(b => b.id === collision.botId)
        if (bot) {
          this.player.xp += bot.level * 10
          this.player.kills++
          
          // Particle effects
          const botColor = this.teamSystem.getTeamColor(bot.team)
          this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
          this.screenEffects.startShake(3, 0.2)
          audioManager.play('polygonDeath')
          
          // Check for level up
          if (this.player.xp >= this.player.xpToNextLevel) {
            this.levelUp()
          }
        }
      }
    }
  }

  updatePlayer(deltaTime: number) {
    if (this.player.health < this.player.maxHealth) {
      if (this.gameTime - this.player.lastRegenTime > 1000) {
        this.player.health = Math.min(
          this.player.health + this.player.healthRegen * deltaTime,
          this.player.maxHealth
        )
      }
    }

    let dx = 0
    let dy = 0

    if (this.mobileInput.x !== 0 || this.mobileInput.y !== 0) {
      dx = this.mobileInput.x
      dy = this.mobileInput.y
    } else {
      dx = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('q') || this.keys.has('arrowleft') ? 1 : 0)
      dy = (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('z') || this.keys.has('arrowup') ? 1 : 0)
    }

    if (dx !== 0 || dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy)
      this.player.velocity.x = (dx / magnitude) * this.player.speed
      this.player.velocity.y = (dy / magnitude) * this.player.speed
    } else {
      this.player.velocity.x = 0
      this.player.velocity.y = 0
    }

    this.player.position.x += this.player.velocity.x * deltaTime
    this.player.position.y += this.player.velocity.y * deltaTime

    this.player.position.x = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.x))
    this.player.position.y = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.y))

    // Shooting (manual or auto-fire)
    // Disable shooting for pure drone classes that auto-attack
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    const isAutoAttackDroneClass = tankConfig?.isDroneClass && 
      ['overseer', 'overlord', 'manager', 'factory', 'battleship'].includes(this.player.tankClass)
    
    if (!isAutoAttackDroneClass) {
      const shouldShoot = this.isShooting || this.autoFire
      if (shouldShoot && this.gameTime - this.player.lastShotTime > this.player.fireRate) {
        this.shootProjectile()
        this.player.lastShotTime = this.gameTime
      }
    }
  }

  shootProjectile() {
    // Get tank configuration
    const tankConfig = TANK_CONFIGS[this.player.tankClass] || TANK_CONFIGS.basic
    
    // Drone classes don't shoot regular bullets (except Manager and Hybrid variants)
    // They control drones instead, which is handled by mouse down/up events
    const isDronePureClass = tankConfig.isDroneClass && 
      !['manager', 'hybrid', 'overtrapper', 'gunnertrapper'].includes(this.player.tankClass)
    
    if (isDronePureClass && tankConfig.barrels.length === 0) {
      // Pure drone classes like Overseer, Overlord, Necromancer, Factory, Battleship
      // don't shoot bullets - they only control drones
      return
    }
    
    let angle: number

    if (this.mobileShootDirection.x !== 0 || this.mobileShootDirection.y !== 0) {
      angle = Math.atan2(this.mobileShootDirection.y, this.mobileShootDirection.x)
    } else {
      angle = Math.atan2(
        this.mousePosition.y - this.player.position.y,
        this.mousePosition.x - this.player.position.x
      )
    }

    this.barrelRecoil = 5

    const barrels = tankConfig.barrels

    // For multi-barrel tanks, implement firing pattern
    let barrelsToFire: number[] = []
    
    if (barrels.length === 1) {
      // Single barrel - always fire
      barrelsToFire = [0]
    } else if (barrels.length === 2) {
      // Twin - alternate barrels
      barrelsToFire = [this.currentBarrelIndex % 2]
      this.currentBarrelIndex++
    } else if (barrels.length <= 5) {
      // Multi-barrel (3-5) - fire all at once
      barrelsToFire = Array.from({ length: barrels.length }, (_, i) => i)
    } else {
      // Many barrels (6+) - fire in pairs or groups
      const groupSize = 2
      const startIdx = (this.currentBarrelIndex * groupSize) % barrels.length
      for (let i = 0; i < groupSize && startIdx + i < barrels.length; i++) {
        barrelsToFire.push(startIdx + i)
      }
      this.currentBarrelIndex++
    }

    // Fire from each selected barrel
    for (const barrelIdx of barrelsToFire) {
      const barrel = barrels[barrelIdx]
      const barrelAngle = angle + (barrel.angle * Math.PI / 180)
      
      const barrelTipDistance = this.player.radius + (barrel.length || 35)
      const barrelTipX = this.player.position.x + Math.cos(barrelAngle) * barrelTipDistance
      const barrelTipY = this.player.position.y + Math.sin(barrelAngle) * barrelTipDistance

      // Muzzle flash
      this.muzzleFlashes.push({
        position: { x: barrelTipX, y: barrelTipY },
        angle: barrelAngle,
        life: 0.08,
        maxLife: 0.08,
        alpha: 1,
        size: 8,
      })

      // Enhanced muzzle flash particles
      this.particleSystem.createBurst({ x: barrelTipX, y: barrelTipY }, 3, {
        color: '#FFDD44',
        size: 3,
        speed: 50,
        life: 0.1,
        spread: Math.PI / 4,
        type: 'muzzle-flash'
      })

      // Particle pool effects
      this.particlePool.emitMuzzleFlash({ x: barrelTipX, y: barrelTipY }, barrelAngle)
      this.particlePool.emitSmoke({ x: barrelTipX, y: barrelTipY }, barrelAngle)

      // Set per-barrel recoil
      if (this.player.barrelRecoils && this.player.barrelRecoils[barrelIdx] !== undefined) {
        this.player.barrelRecoils[barrelIdx] = 8
      }

      // Add slight spread for multi-barrel shots
      const spread = barrels.length > 1 ? (Math.random() - 0.5) * 0.05 : 0
      const finalAngle = barrelAngle + spread

      const projectile: Projectile = {
        id: `proj_${Date.now()}_${Math.random()}_${barrelIdx}`,
        position: { x: barrelTipX, y: barrelTipY },
        velocity: {
          x: Math.cos(finalAngle) * this.player.bulletSpeed,
          y: Math.sin(finalAngle) * this.player.bulletSpeed,
        },
        damage: this.player.damage,
        radius: 5,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
      }

      this.projectiles.push(projectile)
    }

    // Apply recoil force to player (stronger for more barrels)
    const recoilForce = 5 * (1 + barrelsToFire.length * 0.2)
    const recoilDir = { x: Math.cos(angle), y: Math.sin(angle) }
    this.player.velocity.x -= recoilDir.x * recoilForce
    this.player.velocity.y -= recoilDir.y * recoilForce
    
    // Play shoot sound
    audioManager.play('shoot')
  }



  updateProjectiles(deltaTime: number) {
    for (const projectile of this.projectiles) {
      projectile.position.x += projectile.velocity.x * deltaTime
      projectile.position.y += projectile.velocity.y * deltaTime
      
      // Create bullet trail particles
      if (Math.random() < 0.3) {
        this.particleSystem.createBulletTrail(
          projectile.position,
          projectile.velocity,
          projectile.isPlayerProjectile ? '#00B2E1' : '#FF0000'
        )
      }
    }
  }

  updateLoot(deltaTime: number) {
    const lootRangeSq = this.player.lootRange * this.player.lootRange
    
    for (const item of this.loot) {
      if (item.type === 'box' || item.type === 'treasure' || item.type === 'boss') {
        if (!item.driftAngle) {
          item.driftAngle = Math.random() * Math.PI * 2
          item.driftSpeed = item.driftSpeed || (5 + Math.random() * 10)
        }
        
        const driftSpeed = item.driftSpeed || 0
        item.driftAngle = (item.driftAngle || 0) + deltaTime * 0.5
        item.position.x += Math.cos(item.driftAngle) * driftSpeed * deltaTime
        item.position.y += Math.sin(item.driftAngle) * driftSpeed * deltaTime
        
        item.position.x = Math.max(50, Math.min(this.worldSize - 50, item.position.x))
        item.position.y = Math.max(50, Math.min(this.worldSize - 50, item.position.y))
      } else if (item.type === 'xp' || item.type === 'weapon' || item.type === 'armor') {
        const dx = item.position.x - this.player.position.x
        const dy = item.position.y - this.player.position.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < lootRangeSq && distSq > 1) {
          const dist = Math.sqrt(distSq)
          const attractionSpeed = 300
          const moveX = -(dx / dist) * attractionSpeed * deltaTime
          const moveY = -(dy / dist) * attractionSpeed * deltaTime
          
          item.position.x += moveX
          item.position.y += moveY
        }
      }
    }
  }

  updateParticles(deltaTime: number) {
    for (const particle of this.particles) {
      particle.life -= deltaTime
      particle.position.x += particle.velocity.x * deltaTime
      particle.position.y += particle.velocity.y * deltaTime
      particle.alpha = particle.life / particle.maxLife
    }
  }



  spawnLootBoxes() {
    if (this.gameTime - this.lastBoxSpawnTime < this.boxSpawnInterval) return

    const numBoxes = 5 + Math.floor(Math.random() * 8)
    const LEVEL_SCALING_FACTOR = 0.15

    for (let i = 0; i < numBoxes; i++) {
      const clusterNearPlayer = Math.random() < 0.4
      let x, y
      
      if (clusterNearPlayer) {
        const angle = Math.random() * Math.PI * 2
        const distance = 400 + Math.random() * 700
        x = this.player.position.x + Math.cos(angle) * distance
        y = this.player.position.y + Math.sin(angle) * distance
      } else {
        const playerZone = this.zoneSystem.getZone(this.player.position)
        const angle = Math.random() * Math.PI * 2
        const minDist = playerZone.radiusMin + 100
        const maxDist = playerZone.radiusMax - 100
        const distance = minDist + Math.random() * (maxDist - minDist)
        x = this.worldCenter.x + Math.cos(angle) * distance
        y = this.worldCenter.y + Math.sin(angle) * distance
      }
      
      x = Math.max(100, Math.min(this.worldSize - 100, x))
      y = Math.max(100, Math.min(this.worldSize - 100, y))
      
      const levelMultiplier = 1 + (this.player.level - 1) * LEVEL_SCALING_FACTOR
      const size = Math.random()
      let radius: number, health: number, contactDamage: number, xpValue: number

      if (size < 0.5) {
        radius = 15
        health = Math.floor(20 * levelMultiplier)
        contactDamage = Math.floor(5 * levelMultiplier)
        xpValue = Math.floor(15 * levelMultiplier)
      } else if (size < 0.8) {
        radius = 25
        health = Math.floor(50 * levelMultiplier)
        contactDamage = Math.floor(15 * levelMultiplier)
        xpValue = Math.floor(40 * levelMultiplier)
      } else if (size < 0.95) {
        radius = 35
        health = Math.floor(100 * levelMultiplier)
        contactDamage = Math.floor(30 * levelMultiplier)
        xpValue = Math.floor(80 * levelMultiplier)
      } else {
        radius = 50
        health = Math.floor(200 * levelMultiplier)
        contactDamage = Math.floor(50 * levelMultiplier)
        xpValue = Math.floor(150 * levelMultiplier)
      }

      this.loot.push({
        id: `box_${Date.now()}_${i}`,
        position: { x, y },
        type: 'box',
        value: xpValue,
        health,
        maxHealth: health,
        radius,
        contactDamage,
        spawnAlpha: 0,
        rotationAngle: Math.random() * Math.PI * 2,
      })
    }

    this.lastBoxSpawnTime = this.gameTime
    this.boxSpawnInterval = 2000 + Math.random() * 2000
  }





  checkCollisionsOptimized() {
    // Build quad tree for spatial optimization
    this.quadTree.clear()
    
    for (const item of this.loot) {
      if ((item.type === 'box' || item.type === 'treasure' || item.type === 'boss') && item.radius) {
        this.quadTree.insert({
          x: item.position.x,
          y: item.position.y,
          radius: item.radius,
          loot: item
        })
      }
    }

    // Use QuadTree for projectile collision checks
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]

      const nearby = this.quadTree.retrieve({
        x: projectile.position.x,
        y: projectile.position.y,
        radius: projectile.radius
      })
      for (const item of nearby) {
        const box = item.loot as Loot | undefined
        if (!box) continue
        if ((box.type === 'box' || box.type === 'treasure' || box.type === 'boss') && box.health && box.radius) {
          const dx = projectile.position.x - box.position.x
          const dy = projectile.position.y - box.position.y
          const distSq = dx * dx + dy * dy
          const radSum = projectile.radius + box.radius

          if (distSq < radSum * radSum) {
            box.health -= projectile.damage
            this.projectiles.splice(i, 1)
            
            this.particleSystem.createBurst(box.position, 3, {
              color: '#ffaa44',
              size: 2,
              speed: 60,
              life: 0.2,
            })
            
            this.particleSystem.createDamageNumber(box.position, projectile.damage)
            audioManager.play('hit')

            if (box.health <= 0) {
              const boxIndex = this.loot.indexOf(box)
              if (boxIndex !== -1) {
                // Award XP to bot if projectile is from bot
                if (!projectile.isPlayerProjectile && projectile.ownerId) {
                  this.botAISystem.awardXP(projectile.ownerId, box.value)
                }
                this.breakLootBox(boxIndex)
              }
            }
            break
          }
        }
      }
    }

    // Still use simple check for player-loot collisions
    const viewDistance = Math.max(this.viewportWidth, this.viewportHeight) * 1.5
    const viewDistSq = viewDistance * viewDistance

    for (let i = this.loot.length - 1; i >= 0; i--) {
      const item = this.loot[i]
      const dx = item.position.x - this.player.position.x
      const dy = item.position.y - this.player.position.y
      const distSq = dx * dx + dy * dy

      if (distSq > viewDistSq && item.type !== 'box' && item.type !== 'treasure' && item.type !== 'boss') continue

      if ((item.type === 'box' || item.type === 'treasure' || item.type === 'boss') && item.radius && item.contactDamage && item.health) {
        const radSum = item.radius + this.player.radius
        if (distSq < radSum * radSum && this.invincibilityFrames <= 0) {
          const actualDamage = Math.max(0, item.contactDamage - this.player.bodyDamage * 0.5)
          this.player.health -= actualDamage * 0.016
          this.player.lastRegenTime = this.gameTime
          
          const knockbackForce = 15
          const dx2 = this.player.position.x - item.position.x
          const dy2 = this.player.position.y - item.position.y
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          if (dist > 0) {
            this.player.velocity.x += (dx2 / dist) * knockbackForce
            this.player.velocity.y += (dy2 / dist) * knockbackForce
          }
          
          item.health -= this.player.bodyDamage * 0.016
          if (item.health <= 0) {
            this.breakLootBox(i)
          }
          
          if (this.player.health < 0) this.player.health = 0
          
          this.screenEffects.startShake(3, 0.2)
          audioManager.play('playerDamage')
        }
      } else if (distSq < 900) {
        this.collectLoot(item)
        this.loot.splice(i, 1)
      }
    }
  }

  checkBotCollisions(farmTargets: Map<string, string>) {
    const bots = this.botAISystem.getBots()
    
    // Check projectile-bot collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      
      // Player projectiles vs bots
      if (projectile.isPlayerProjectile) {
        for (const bot of bots) {
          // Check for friendly fire - skip if same team
          if (this.teamSystem.areAllies(this.player.team, bot.team)) {
            continue
          }

          const dx = projectile.position.x - bot.position.x
          const dy = projectile.position.y - bot.position.y
          const distSq = dx * dx + dy * dy
          const radSum = projectile.radius + bot.radius
          
          if (distSq < radSum * radSum) {
            // Damage bot
            const killed = this.botAISystem.damageBot(bot.id, projectile.damage)
            this.projectiles.splice(i, 1)
            
            // Particle effects
            const botColor = this.teamSystem.getTeamColor(bot.team)
            this.particlePool.emitSparkBurst(bot.position, 5)
            this.particleSystem.createDamageNumber(bot.position, projectile.damage)
            audioManager.play('hit')
            
            if (killed) {
              // Bot died - give XP
              this.player.xp += bot.level * 10
              this.player.kills++
              this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
              this.screenEffects.startShake(3, 0.2)
              audioManager.play('polygonDeath')
              
              // Check for level up
              if (this.player.xp >= this.player.xpToNextLevel) {
                this.levelUp()
              }
            }
            break
          }
        }
      }
      // Bot projectiles vs player or other bots
      else {
        // Check vs player
        if (projectile.team && !this.teamSystem.areAllies(projectile.team, this.player.team)) {
          const dx = projectile.position.x - this.player.position.x
          const dy = projectile.position.y - this.player.position.y
          const distSq = dx * dx + dy * dy
          const radSum = projectile.radius + this.player.radius
          
          if (distSq < radSum * radSum && this.invincibilityFrames <= 0) {
            this.player.health -= projectile.damage
            this.player.lastRegenTime = this.gameTime
            this.projectiles.splice(i, 1)
            
            // Particle effects
            this.particlePool.emitSparkBurst(this.player.position, 3)
            this.screenEffects.startShake(5, 0.3)
            audioManager.play('playerDamage')
            
            if (this.player.health <= 0) {
              this.player.health = 0
            }
            continue
          }
        }

        // Check vs other bots
        for (const bot of bots) {
          // Skip friendly fire
          if (projectile.team && this.teamSystem.areAllies(projectile.team, bot.team)) {
            continue
          }

          const dx = projectile.position.x - bot.position.x
          const dy = projectile.position.y - bot.position.y
          const distSq = dx * dx + dy * dy
          const radSum = projectile.radius + bot.radius
          
          if (distSq < radSum * radSum) {
            const killed = this.botAISystem.damageBot(bot.id, projectile.damage)
            this.projectiles.splice(i, 1)
            
            // Particle effects
            this.particlePool.emitSparkBurst(bot.position, 3)
            audioManager.play('hit')
            
            if (killed && projectile.ownerId) {
              // Award XP to the killer bot
              this.botAISystem.awardXP(projectile.ownerId, bot.level * 10)
            }
            break
          }
        }
      }
    }
    
    // Check player-bot body collisions
    for (const bot of bots) {
      // Skip friendly collision damage
      if (this.teamSystem.areAllies(this.player.team, bot.team)) {
        continue
      }

      const dx = this.player.position.x - bot.position.x
      const dy = this.player.position.y - bot.position.y
      const distSq = dx * dx + dy * dy
      const radSum = this.player.radius + bot.radius
      
      if (distSq < radSum * radSum && this.invincibilityFrames <= 0) {
        // Deal damage both ways
        const playerDamage = this.player.bodyDamage
        const botDamage = bot.bodyDamage
        
        this.player.health -= botDamage * 0.016
        this.player.lastRegenTime = this.gameTime
        this.botAISystem.damageBot(bot.id, playerDamage * 0.016)
        
        // Knockback
        const dist = Math.sqrt(distSq)
        if (dist > 0) {
          const knockbackForce = 15
          this.player.velocity.x += (dx / dist) * knockbackForce
          this.player.velocity.y += (dy / dist) * knockbackForce
        }
      }
    }

    // Check bot-bot body collisions
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const bot1 = bots[i]
        const bot2 = bots[j]
        
        // Skip friendly collisions
        if (this.teamSystem.areAllies(bot1.team, bot2.team)) {
          continue
        }

        const dx = bot1.position.x - bot2.position.x
        const dy = bot1.position.y - bot2.position.y
        const distSq = dx * dx + dy * dy
        const radSum = bot1.radius + bot2.radius
        
        if (distSq < radSum * radSum) {
          // Deal body damage to both
          this.botAISystem.damageBot(bot1.id, bot2.bodyDamage * 0.016)
          this.botAISystem.damageBot(bot2.id, bot1.bodyDamage * 0.016)
        }
      }
    }

    // Check bot-polygon collisions for smasher bots
    for (const bot of bots) {
      const botConfig = TANK_CONFIGS[bot.tankClass]
      const isSmasher = botConfig?.bodyShape === 'hexagon' || botConfig?.bodyShape === 'spikyHexagon'
      
      if (!isSmasher) continue

      // Check if bot is targeting a polygon/loot
      const farmTargetId = farmTargets.get(bot.id)
      if (!farmTargetId) continue

      // Find the target loot
      for (let i = this.loot.length - 1; i >= 0; i--) {
        const item = this.loot[i]
        if (item.id !== farmTargetId) continue
        if (item.type !== 'box' && item.type !== 'treasure' && item.type !== 'boss') continue
        if (!item.health || item.health <= 0) continue

        const dx = bot.position.x - item.position.x
        const dy = bot.position.y - item.position.y
        const distSq = dx * dx + dy * dy
        const radSum = bot.radius + (item.radius || 20)

        if (distSq < radSum * radSum) {
          // Smasher bot is touching the polygon - deal body damage
          item.health -= bot.bodyDamage * 0.016

          if (item.health <= 0) {
            // Polygon destroyed - award XP to bot
            this.botAISystem.awardXP(bot.id, item.value)
            
            // Trigger break effects
            this.breakLootBox(i)
            this.loot.splice(i, 1)
          }
          break
        }
      }
    }
  }

  breakLootBox(index: number) {
    const box = this.loot[index]
    
    // Award XP to any bots that were farming this loot
    this.botAISystem.awardXPForLoot(this.botFarmTargets, box.id, box.value)
    
    // Enhanced explosion effect
    const explosionSize = box.radius || 20
    const isBoss = box.type === 'boss'
    const isTreasure = box.type === 'treasure'
    
    if (isBoss) {
      this.particleSystem.createExplosion(box.position, explosionSize * 2, '#FF0066')
      this.particlePool.emitDebris(box.position, { x: 0, y: 0 }, '#FF0066')
      this.screenEffects.startShake(15, 0.8)
      this.screenEffects.startFlash('#FF0066', 0.5)
    } else if (isTreasure) {
      this.particleSystem.createExplosion(box.position, explosionSize * 1.5, '#FFD700')
      this.particlePool.emitDebris(box.position, { x: 0, y: 0 }, '#FFD700')
      this.screenEffects.startShake(10, 0.5)
    } else {
      this.particleSystem.createExplosion(box.position, explosionSize, '#ff8800')
      this.particlePool.emitDebris(box.position, { x: 0, y: 0 }, '#ff8800')
      
      // Screen shake on big polygon kills
      if (explosionSize > 30) {
        this.screenEffects.startShake(5, 0.3)
      }
    }
    
    // Debris particles
    this.particleSystem.createDebris(box.position, isBoss ? 20 : isTreasure ? 12 : 6, isBoss ? '#FF0066' : isTreasure ? '#FFD700' : '#ffaa44')
    
    // Update combo system
    this.comboKills++
    this.lastKillTime = this.gameTime
    if (this.comboKills >= 3) {
      this.comboMultiplier = 1 + Math.floor(this.comboKills / 3) * 0.2
    }
    
    // Audio
    audioManager.play('polygonDeath')
    
    const xpGems = Math.min(isBoss ? 20 : isTreasure ? 10 : 4, Math.floor(box.value / 8))
    for (let i = 0; i < xpGems; i++) {
      const angle = (Math.PI * 2 * i) / xpGems + Math.random() * 0.3
      const distance = 15 + Math.random() * 15
      this.loot.push({
        id: `xp_${Date.now()}_${i}`,
        position: {
          x: box.position.x + Math.cos(angle) * distance,
          y: box.position.y + Math.sin(angle) * distance,
        },
        type: 'xp',
        value: Math.floor(box.value / xpGems * this.comboMultiplier),
      })
    }

    // Higher drop rate for boss and treasure
    const dropChance = isBoss ? 1.0 : isTreasure ? 0.8 : 0.3
    if (Math.random() < dropChance) {
      const itemType = Math.random() < 0.5 ? 'weapon' : 'armor'
      const rarity = isBoss ? this.rollBossRarity() : isTreasure ? this.rollTreasureRarity() : this.rollRarity()
      
      this.loot.push({
        id: `item_${Date.now()}`,
        position: { ...box.position },
        type: itemType,
        value: 0,
        rarity,
        item: itemType === 'weapon' ? this.generateWeapon(rarity) : this.generateArmor(rarity),
      })
    }

    this.loot.splice(index, 1)
  }

  rollBossRarity(): Rarity {
    const rand = Math.random()
    if (rand < 0.10) return 'rare'
    if (rand < 0.40) return 'epic'
    return 'legendary'
  }

  rollTreasureRarity(): Rarity {
    const rand = Math.random()
    if (rand < 0.30) return 'common'
    if (rand < 0.60) return 'rare'
    if (rand < 0.90) return 'epic'
    return 'legendary'
  }



  rollRarity(): Rarity {
    const rand = Math.random()
    if (rand < 0.55) return 'common'
    if (rand < 0.80) return 'rare'
    if (rand < 0.95) return 'epic'
    return 'legendary'
  }

  generateWeapon(rarity: Rarity): Weapon {
    const multipliers = { common: 1, rare: 1.5, epic: 2.5, legendary: 4 }
    const names = {
      common: ['Rusty Blade', 'Wooden Staff', 'Dull Axe'],
      rare: ['Steel Sword', 'Battle Axe', 'War Mace'],
      epic: ['Flamebringer', 'Frostbite', 'Thunderfury'],
      legendary: ['Ashbringer', 'Frostmourne', 'Gorehowl'],
    }

    return {
      name: names[rarity][Math.floor(Math.random() * names[rarity].length)],
      damage: Math.floor(10 * multipliers[rarity]),
      fireRate: Math.max(100, 300 - multipliers[rarity] * 30),
      rarity,
    }
  }

  generateArmor(rarity: Rarity): Armor {
    const multipliers = { common: 1, rare: 1.5, epic: 2.5, legendary: 4 }
    const names = {
      common: ['Cloth Armor', 'Leather Vest', 'Padded Tunic'],
      rare: ['Chainmail', 'Plate Armor', 'Studded Leather'],
      epic: ['Dragon Scale', 'Titansteel Plate', 'Enchanted Mail'],
      legendary: ['Tier 3 Set', 'Judgment Armor', 'Dreadnaught'],
    }

    return {
      name: names[rarity][Math.floor(Math.random() * names[rarity].length)],
      health: Math.floor(50 * multipliers[rarity]),
      rarity,
    }
  }

  collectLoot(item: Loot) {
    if (item.type === 'xp') {
      this.player.xp += item.value
      const didLevelUp = this.upgradeManager.addXP(item.value)
      
      // Audio
      audioManager.play('xpCollect')
      
      if (didLevelUp) {
        this.player.level = this.upgradeManager.getLevel()
        
        // Add invincibility during level up
        this.invincibilityFrames = 2.0
        
        // Enhanced level up effect
        this.particleSystem.createLevelUpEffect(this.player.position)
        this.screenEffects.startShake(8, 0.4)
        this.screenEffects.startFlash('#bb88ff', 0.3)
        audioManager.play('levelUp')
        
        if (this.onLevelUp) {
          this.onLevelUp()
        }
        return 'levelup'
      }
      
      if (this.player.xp >= this.player.xpToNextLevel) {
        return 'levelup'
      }
    } else if (item.type === 'weapon' && item.item) {
      const weapon = item.item as Weapon
      if (!this.player.weapon || this.getRarityValue(weapon.rarity) > this.getRarityValue(this.player.weapon.rarity)) {
        this.player.weapon = weapon
        this.player.damage = this.player.damage + weapon.damage
        this.player.fireRate = weapon.fireRate
        this.createLootParticles(item.position, this.getRarityColor(weapon.rarity))
        audioManager.play('itemCollect')
        return 'item'
      }
    } else if (item.type === 'armor' && item.item) {
      const armor = item.item as Armor
      if (!this.player.armor || this.getRarityValue(armor.rarity) > this.getRarityValue(this.player.armor.rarity)) {
        this.player.armor = armor
        this.player.maxHealth += armor.health
        this.player.health = Math.min(this.player.health + armor.health, this.player.maxHealth)
        this.createLootParticles(item.position, this.getRarityColor(armor.rarity))
        audioManager.play('itemCollect')
        return 'item'
      }
    }
  }

  getRarityValue(rarity: Rarity): number {
    return { common: 1, rare: 2, epic: 3, legendary: 4 }[rarity]
  }

  getRarityColor(rarity: Rarity): string {
    return {
      common: '#9d9d9d',
      rare: '#0070dd',
      epic: '#a335ee',
      legendary: '#ff8000',
    }[rarity]
  }

  levelUp() {
    this.player.level++
    this.player.xp = this.player.xp - this.player.xpToNextLevel
    this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5)
    this.createLevelUpParticles()
    this.particlePool.emitLevelUpBurst(this.player.position)
  }

  allocateStat(stat: StatType) {
    if (this.upgradeManager.allocateStat(stat)) {
      this.applyStatsToPlayer()
      audioManager.play('upgrade')
    }
  }

  applyStatsToPlayer() {
    const stats = this.upgradeManager.getStats()
    const oldMaxHealth = this.player.maxHealth
    const healthPercentage = this.player.health / oldMaxHealth
    
    this.player.maxHealth = Math.floor(stats.maxHealth)
    this.player.damage = Math.floor(stats.bulletDamage)
    this.player.fireRate = Math.floor(stats.reload)
    this.player.speed = Math.floor(stats.movementSpeed)
    this.player.bulletSpeed = Math.floor(stats.bulletSpeed)
    this.player.bulletPenetration = Math.floor(stats.bulletPenetration)
    this.player.bodyDamage = Math.floor(stats.bodyDamage)
    this.player.healthRegen = stats.healthRegen
    this.player.lootRange = Math.floor(stats.lootRange)
    
    this.player.health = Math.max(1, Math.floor(healthPercentage * this.player.maxHealth))
  }

  upgradeTank(tankKey: string): boolean {
    const success = this.upgradeManager.upgradeTank(tankKey)
    if (success) {
      this.player.tankClass = tankKey
      
      // Update body shape based on new tank
      const tankConfig = TANK_CONFIGS[tankKey]
      if (tankConfig) {
        this.player.bodyShape = tankConfig.bodyShape || 'circle'
        
        // Initialize per-barrel recoils
        const barrelCount = tankConfig.barrels.length
        this.player.barrelRecoils = new Array(barrelCount).fill(0)
      }
      
      audioManager.play('upgrade')
    }
    return success
  }

  // Admin methods
  setLevel(level: number) {
    if (level < 1) return false
    const xpNeeded = this.upgradeManager.getXPForLevel(level)
    this.upgradeManager['totalXP'] = xpNeeded
    this.upgradeManager['level'] = level
    this.player.level = level
    this.applyStatsToPlayer()
    return true
  }

  addStatPoints(amount: number) {
    const currentLevel = this.upgradeManager.getLevel()
    const targetLevel = currentLevel + amount
    if (this.setLevel(targetLevel)) {
      this.applyStatsToPlayer()
    }
  }

  cleanupEntities() {
    this.projectiles = this.projectiles.filter(
      p => p.position.x > -50 && p.position.x < this.worldSize + 50 && p.position.y > -50 && p.position.y < this.worldSize + 50
    )

    if (this.loot.length > 2500) {
      this.loot.sort((a, b) => {
        const dx1 = a.position.x - this.player.position.x
        const dy1 = a.position.y - this.player.position.y
        const dx2 = b.position.x - this.player.position.x
        const dy2 = b.position.y - this.player.position.y
        return (dx2 * dx2 + dy2 * dy2) - (dx1 * dx1 + dy1 * dy1)
      })
      this.loot.splice(2000)
    }

    this.particles = this.particles.filter(p => p.life > 0)
    
    if (this.particles.length > 30) {
      this.particles.splice(0, this.particles.length - 30)
    }
  }

  getDistance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  createHitParticles(position: Vector2, color: string) {
    const angle = Math.random() * Math.PI * 2
    const speed = 50 + Math.random() * 50
    this.particles.push({
      position: { ...position },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      life: 0.2,
      maxLife: 0.2,
      alpha: 1,
      color,
      size: 3,
    })
  }

  createDeathParticles(position: Vector2) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 120
      this.particles.push({
        position: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.4,
        maxLife: 0.4,
        alpha: 1,
        color: '#ff8800',
        size: 4,
      })
    }
  }

  createLootParticles(position: Vector2, color: string) {
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 60 + Math.random() * 80
      this.particles.push({
        position: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.3,
        maxLife: 0.3,
        alpha: 1,
        color,
        size: 3,
      })
    }
  }

  createLevelUpParticles() {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6
      const speed = 100 + Math.random() * 50
      this.particles.push({
        position: { ...this.player.position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        color: '#bb88ff',
        size: 5,
      })
    }
  }

  handleMouseDown(button: number) {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    if (!tankConfig || !tankConfig.isDroneClass) return
    
    // Only Necromancer uses mouse control for drones
    // Other drone classes auto-attack
    if (this.player.tankClass !== 'necromancer') return
    
    if (button === 0) {
      // Left click - attract drones
      this.droneControlMode = 'attract'
      this.droneSystem.setControlMode('attract')
    } else if (button === 2) {
      // Right click - repel drones
      this.droneControlMode = 'repel'
      this.droneSystem.setControlMode('repel')
    }
  }

  handleMouseUp(button: number) {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    if (!tankConfig || !tankConfig.isDroneClass) return
    
    // Only Necromancer uses mouse control for drones
    if (this.player.tankClass !== 'necromancer') return
    
    if (button === 0 || button === 2) {
      // Release control - return to idle
      this.droneControlMode = 'idle'
      this.droneSystem.setControlMode('idle')
    }
  }
}

interface Particle {
  position: Vector2
  velocity: Vector2
  life: number
  maxLife: number
  alpha: number
  color: string
  size: number
}

interface MuzzleFlash {
  position: Vector2
  angle: number
  life: number
  maxLife: number
  alpha: number
  size: number
}
