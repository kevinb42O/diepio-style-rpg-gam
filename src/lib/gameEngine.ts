import type { Player, Projectile, Loot, Vector2, Rarity, Weapon, Armor, DroneControlMode, PointOfInterest, Team, DecoyState, BotPlayer, PlayerSynergyState, Drone } from './types'
import { createDefaultSynergyState } from './types'
import { UpgradeManager, type StatType } from './upgradeSystem'
import { FLANK_LINE_CLASSES, MACHINE_GUN_LINE_CLASSES, SMASHER_LINE_CLASSES, SNIPER_RANGE_CLASSES, TWIN_LINE_CLASSES } from './synergyMeta'
import { ParticleSystem } from '@/systems/ParticleSystem'
import { QuadTree } from '@/utils/QuadTree'
import { ScreenEffects } from '@/utils/ScreenEffects'
import { Physics } from '@/utils/Physics'
import { audioManager } from '@/audio/AudioManager'
import { ObjectPool } from '@/utils/ObjectPool'
import { TANK_CONFIGS, type TankConfig } from './tankConfigs'
import { DroneSystem } from './droneSystem'
import { ParticlePool } from './particlePool'
import { ZoneSystem } from './zoneSystem'
import { BotAISystem } from './botAI'
import { TeamSystem } from './TeamSystem'
import { AutoTurretSystem, AutoTurretProfile } from './autoTurretSystem'
import { TrapSystem, type TrapConfig } from './trapSystem'
import { PylonSystem, createPylonLinks } from './pylonSystem'
import type { PylonPlacementConfig } from './pylonSystem'

// Game constants
const TRAP_SELF_DAMAGE_MULTIPLIER = 0.5 // Traps take 50% damage when they hit enemies
const OBELISK_BEAM_TICK = 0.08
const SHIELD_LINE_CLASSES = new Set(['aegisvanguard', 'bulwarkprime', 'bastioneternal'])
const SIEGE_LINE_CLASSES = new Set(['siegebreaker', 'cataclysmengine', 'doomsdayharbinger'])
const TEMPEST_LINE_CLASSES = new Set(['tempest', 'maelstromsovereign'])
const PYLON_LINE_CLASSES = new Set(['obelisk', 'prismarchon'])
const STAT_DEBUG_ORDER: StatType[] = [
  'healthRegen',
  'maxHealth',
  'bodyDamage',
  'bulletSpeed',
  'bulletPenetration',
  'bulletDamage',
  'reload',
  'movementSpeed',
  'lootRange',
]

export class GameEngine {
  upgradeManager: UpgradeManager
  player: Player
  projectiles: Projectile[] = []
  loot: Loot[] = []
  mousePosition: Vector2 = { x: 0, y: 0 } // World-space mouse position (updated every frame)
  mouseScreenPosition: Vector2 = { x: 0, y: 0 } // Screen-space mouse position (set on mouse move)
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
  
  // Admin zoom feature
  zoom = 1
  targetZoom = 1
  zoomVelocity = 0
  readonly ZOOM_MIN = 0.1  // Can zoom out to see almost entire map
  readonly ZOOM_MAX = 2.0   // Can zoom in for detail
  readonly ZOOM_SPEED = 0.15 // Scroll wheel sensitivity
  readonly ZOOM_SMOOTH_TIME = 0.12 // Smooth zoom interpolation time
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
  private droneWeaponCooldowns = new Map<string, number>()
  autoFire = false
  invincibilityFrames = 0
  comboKills = 0
  lastKillTime = 0
  comboMultiplier = 1
  currentBarrelIndex = 0 // For alternating fire pattern
  abilityState = {
    siegeCharge: 0,
    pendingSiegeCharge: 0,
    siegeMinCharge: 0.4,
    siegeMaxCharge: 1.8,
    decoyTeleportCooldown: 0,
    decoySwapCooldown: 0,
    riftTeleportCooldown: 0,
    aegisShields: [] as Array<{ angle: number; position: Vector2 }>,
    riftAnomalies: [] as Array<{ position: Vector2; life: number; radius: number }>,
    obelisk: {
      beamAccumulator: 0,
    },
    tempest: {
      spinAngle: 0,
      spinVelocity: 0,
      direction: 1,
      swapTimer: 0.6,
    },
    orbitalArray: {
      angle: 0,
      cooldown: 0,
      nodes: [] as Array<{ x: number; y: number }>,
    },
    predatorScope: {
      active: false,
      blend: 0,
      lastDirection: { x: 1, y: 0 },
    },
    starfall: {
      volleys: [] as Array<{ delay: number; angle: number; phase: number }>,
    },
    phaseSentinel: {
      charge: 0,
    },
    ionTrail: [] as Array<{ position: Vector2; life: number; radius: number }>,
    cycloneBulwark: {
      cooldown: 0,
      phase: 0,
    },
    velocityReaver: {
      cooldown: 0,
    },
    bastionOvershield: {
      value: 0,
      max: 0,
    },
    astralRegent: {
      anchors: [] as Array<{ position: Vector2; life: number; spawnTimer: number }>,
      cooldown: 0,
    },
    catalyst: {
      stacks: 0,
    },
    cataclysmFields: [] as Array<{ position: Vector2; radius: number; life: number; dps: number; team: Team }>,
  }
  
  // New systems
  particlePool: ParticlePool
  zoneSystem: ZoneSystem
  botAISystem: BotAISystem
  teamSystem: TeamSystem
  botFarmTargets: Map<string, string> = new Map()
  autoTurretSystem: AutoTurretSystem
  trapSystem: TrapSystem
  pylonSystem: PylonSystem

  constructor() {
    this.teamSystem = new TeamSystem()
    this.upgradeManager = new UpgradeManager()
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
    // Create player AFTER zoneSystem is initialized (player spawn position depends on it)
    this.player = this.createPlayer()
    this.autoTurretSystem = new AutoTurretSystem()
    this.trapSystem = new TrapSystem()
    this.pylonSystem = new PylonSystem()
    this.resetAbilityState()
    this.registerDebugHelpers()
  }

  setRenderCallback(callback: (() => void) | null) {
    this.renderCallback = callback
  }

  createPlayer(): Player {
    // Spawn player at their team's base
    const spawnPosition = this.zoneSystem.getSpawnPosition(this.teamSystem.getPlayerTeam())
    
    return {
      id: 'player',
      position: { x: spawnPosition.x, y: spawnPosition.y },
      velocity: { x: 0, y: 0 },
      radius: 15,
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: this.upgradeManager.getTotalXP(), // Sync from UpgradeManager
      xpToNextLevel: this.upgradeManager.getXPToNextLevel(),
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
      decoy: {
        active: false,
        visible: false,
        position: { x: spawnPosition.x, y: spawnPosition.y },
        target: { x: spawnPosition.x, y: spawnPosition.y },
        velocity: { x: 0, y: 0 },
        wanderPhase: 0,
        hitFlash: 0,
      },
      synergy: createDefaultSynergyState(),
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
    this.droneWeaponCooldowns.clear()
    this.droneControlMode = 'idle'
    this.invincibilityFrames = 2.0 // 2 seconds of invincibility after respawn
    this.comboKills = 0
    this.lastKillTime = 0
    this.comboMultiplier = 1
    this.particlePool.clear()
    this.botAISystem.clear()
    this.autoTurretSystem.clear()
    this.trapSystem.clear()
    this.pylonSystem.clear()
    this.resetAbilityState()
    
    this.generateWorldLoot()
  }

  private resetAbilityState() {
    this.abilityState = {
      siegeCharge: 0,
      pendingSiegeCharge: 0,
      siegeMinCharge: 0.4,
      siegeMaxCharge: 1.8,
      decoyTeleportCooldown: 0,
      decoySwapCooldown: 0,
      riftTeleportCooldown: 0,
      aegisShields: [] as Array<{ angle: number; position: Vector2 }>,
      riftAnomalies: [],
      obelisk: {
        beamAccumulator: 0,
      },
      tempest: {
        spinAngle: 0,
        spinVelocity: 0,
        direction: 1,
        swapTimer: 0.6,
      },
      orbitalArray: {
        angle: 0,
        cooldown: 0,
        nodes: [] as Array<{ x: number; y: number }>,
      },
      predatorScope: {
        active: false,
        blend: 0,
        lastDirection: { x: 1, y: 0 },
      },
      starfall: {
        volleys: [] as Array<{ delay: number; angle: number; phase: number }>,
      },
      phaseSentinel: {
        charge: 0,
      },
      ionTrail: [] as Array<{ position: Vector2; life: number; radius: number }>,
      cycloneBulwark: {
        cooldown: 0,
        phase: 0,
      },
      velocityReaver: {
        cooldown: 0,
      },
      bastionOvershield: {
        value: 0,
        max: 0,
      },
      astralRegent: {
        anchors: [],
        cooldown: 0,
      },
      catalyst: {
        stacks: 0,
      },
      cataclysmFields: [] as Array<{ position: Vector2; radius: number; life: number; dps: number; team: Team }>,
    }
  }

  generateWorldLoot() {
    const bounds = this.zoneSystem.getWorldBounds()
    const lanes = this.zoneSystem.lanes
    
    // Generate loot along the lanes
    for (const lane of lanes) {
      const lootCount = Math.floor(lane.lootDensity * 100)
      const laneY = lane.startBlue.y
      const halfWidth = lane.width / 2
      
      for (let i = 0; i < lootCount; i++) {
        // Random position along the lane
        const x = lane.startBlue.x + Math.random() * (lane.endRed.x - lane.startBlue.x)
        const y = laneY - halfWidth + Math.random() * lane.width
        
        // Size based on lane danger level
        const baseSize = 0.3 + lane.dangerLevel * 0.2
        const size = baseSize + Math.random() * 0.4
        
        let radius: number, health: number, contactDamage: number, xpValue: number
        
        if (size < 0.5) {
          radius = 15
          health = 20 * lane.dangerLevel
          contactDamage = 5 * lane.dangerLevel
          xpValue = 15 * lane.dangerLevel
        } else if (size < 0.8) {
          radius = 25
          health = 50 * lane.dangerLevel
          contactDamage = 15 * lane.dangerLevel
          xpValue = 40 * lane.dangerLevel
        } else if (size < 1.1) {
          radius = 35
          health = 100 * lane.dangerLevel
          contactDamage = 30 * lane.dangerLevel
          xpValue = 80 * lane.dangerLevel
        } else {
          radius = 50
          health = 200 * lane.dangerLevel
          contactDamage = 50 * lane.dangerLevel
          xpValue = 150 * lane.dangerLevel
        }
        
        this.loot.push({
          id: `box_${lane.id}_${i}`,
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
    
    // Generate loot in the Nexus area (higher value)
    const nexus = this.zoneSystem.nexus
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = 200 + Math.random() * (nexus.captureRadius - 200)
      const x = nexus.position.x + Math.cos(angle) * distance
      const y = nexus.position.y + Math.sin(angle) * distance
      
      // Nexus has bigger, better loot
      const size = 0.6 + Math.random() * 0.6
      let radius: number, health: number, contactDamage: number, xpValue: number
      
      if (size < 0.8) {
        radius = 25
        health = 80
        contactDamage = 20
        xpValue = 60
      } else if (size < 1.0) {
        radius = 35
        health = 150
        contactDamage = 40
        xpValue = 120
      } else {
        radius = 50
        health = 300
        contactDamage = 70
        xpValue = 250
      }
      
      // Apply nexus loot multiplier
      xpValue = Math.floor(xpValue * 2.5) // Nexus provides 2.5x XP
      
      this.loot.push({
        id: `box_nexus_${i}`,
        position: { x, y },
        type: 'box',
        value: xpValue,
        health,
        maxHealth: health,
        radius,
        contactDamage,
      })
    }
    
    // Generate scattered loot in the wilderness (between lanes)
    for (let i = 0; i < 150; i++) {
      const x = 2500 + Math.random() * 11000
      const y = 1000 + Math.random() * 10000
      
      // Skip if too close to a base
      const blueBase = this.zoneSystem.teamBases.get('blue')
      const redBase = this.zoneSystem.teamBases.get('red')
      
      if (blueBase && Math.hypot(x - blueBase.position.x, y - blueBase.position.y) < blueBase.outerRadius) continue
      if (redBase && Math.hypot(x - redBase.position.x, y - redBase.position.y) < redBase.outerRadius) continue
      
      const size = 0.3 + Math.random() * 0.5
      let radius: number, health: number, contactDamage: number, xpValue: number
      
      if (size < 0.5) {
        radius = 15
        health = 30
        contactDamage = 8
        xpValue = 20
      } else if (size < 0.7) {
        radius = 25
        health = 60
        contactDamage = 15
        xpValue = 45
      } else {
        radius = 35
        health = 100
        contactDamage = 25
        xpValue = 80
      }
      
      this.loot.push({
        id: `box_wild_${i}`,
        position: { x, y },
        type: 'box',
        value: xpValue,
        health,
        maxHealth: health,
        radius,
        contactDamage,
      })
    }
    
    // Add boss shapes near control points
    for (const cp of this.zoneSystem.controlPoints) {
      if (cp.id === 'nexus_point') continue // Nexus has its own boss
      
      const angle = Math.random() * Math.PI * 2
      const distance = cp.radius + 100 + Math.random() * 200
      
      this.loot.push({
        id: `boss_${cp.id}`,
        position: {
          x: cp.position.x + Math.cos(angle) * distance,
          y: cp.position.y + Math.sin(angle) * distance
        },
        type: 'boss',
        value: 800,
        health: 400,
        maxHealth: 400,
        radius: 35, // Smaller hitbox so you can fight them properly
        contactDamage: 25, // Reduced from 60 - still dangerous but not insta-kill
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

    // PERF: Cache bots array once per frame to avoid repeated getBots() calls
    const cachedBots = this.botAISystem.getBots()

    this.updatePlayer(deltaTime)
    this.updateProjectiles(deltaTime)
    this.handleAegisShieldInteractions()
    this.updateLoot(deltaTime)
    this.updateParticles(deltaTime)
    this.updateRecoilAndFlash(deltaTime)
    this.updateCameraSmooth(deltaTime)
    this.updateInvisibility(deltaTime)
    this.updateDecoy(deltaTime)
    this.updateAbilityState(deltaTime)
    this.spawnLootBoxes()
    this.checkCollisionsOptimized()
    this.cleanupEntities()
    
    // Update enhanced systems
    this.particleSystem.update(deltaTime)
    this.screenEffects.update(deltaTime)
    
    // Update low health vignette based on current health
    const healthPercent = this.player.health / this.player.maxHealth
    this.screenEffects.updateLowHealthVignette(healthPercent)
    
    // Update new systems
    this.particlePool.update(deltaTime)
    this.zoneSystem.updatePlayerZone(this.player.position, this.gameTime)
    
    // NEW: Update zone system with all entity positions for control point capture
    const allEntities: Array<{position: {x: number, y: number}, team: 'blue' | 'red' | 'neutral', id: string}> = [
      { position: this.player.position, team: this.player.team, id: this.player.id }
    ]
    for (const bot of cachedBots) {
      allEntities.push({ position: bot.position, team: bot.team, id: bot.id })
    }
    this.zoneSystem.update(deltaTime, this.gameTime, allEntities)
    
    // Apply team buffs to player
    this.applyTeamBuffs()
    
    // Check for forge healing
    this.checkForgeHealing(deltaTime)
    
    // Check for supply drop pickups
    this.checkSupplyDropPickup()
    
    // Check for dynamic event effects (meteor damage, energy surge buff)
    this.checkDynamicEventEffects(deltaTime)
    
    this.botAISystem.updateSpawning(this.zoneSystem.getZones(), this.gameTime)
    const botUpdate = this.botAISystem.update(
      deltaTime,
      this.player.position,
      this.player.radius,
      this.gameTime,
      this.loot,
      this.player.team,
      this.player.decoy
    )
    this.projectiles.push(...botUpdate.projectiles)
    this.botFarmTargets = botUpdate.farmTargets
    this.applyRiftAnomalyEffects(deltaTime)
    
    // Sync bot auto turrets - create turrets for bots that should have them
    this.syncBotAutoTurrets()
    
    // Update auto turrets - collect owner info
    const ownerInfoMap = new Map()
    const playerTurretProfile = this.getAutoTurretProfile(this.player.tankClass, this.player.radius, this.player.synergy)
    ownerInfoMap.set(this.player.id, {
      position: this.player.position,
      team: this.player.team,
      tankClass: this.player.tankClass,
      bulletSpeed: this.player.bulletSpeed,
      damage: this.player.damage,
      radius: this.player.radius,
      turretProfile: playerTurretProfile
    })
    for (const bot of cachedBots) {
      const botTurretProfile = this.getAutoTurretProfile(bot.tankClass, bot.radius)
      ownerInfoMap.set(bot.id, {
        position: bot.position,
        team: bot.team,
        tankClass: bot.tankClass,
        bulletSpeed: bot.bulletSpeed,
        damage: bot.damage,
        radius: bot.radius,
        turretProfile: botTurretProfile
      })
    }
    
    // Collect enemies for turret targeting (player + bots from opposing teams)
    const enemiesForTurrets: Array<{ id: string; position: Vector2; team: Team; radius: number }> = []
    
    // Player as enemy for enemy turrets
    enemiesForTurrets.push({
      id: this.player.id,
      position: this.player.position,
      team: this.player.team,
      radius: this.player.radius
    })
    
    // Bots as enemies
    for (const bot of cachedBots) {
      enemiesForTurrets.push({
        id: bot.id,
        position: bot.position,
        team: bot.team,
        radius: bot.radius
      })
    }
    
    const turretProjectiles = this.autoTurretSystem.update(
      deltaTime,
      ownerInfoMap,
      enemiesForTurrets,
      this.loot,
      this.gameTime
    )
    this.projectiles.push(...turretProjectiles)

    // Update traps
    this.trapSystem.update(deltaTime, this.gameTime)
    this.pylonSystem.update(deltaTime, this.gameTime)

    // Handle bot trap spawning
    this.spawnBotTraps()

    this.checkTrapCollisions()
    this.handlePylonProjectileCollisions()
    this.applyPylonBeamDamage(deltaTime)
    
    // Update drones with bot information for enemy targeting
    this.droneSystem.setViewport(this.camera, this.viewportWidth, this.viewportHeight)
    this.droneSystem.update(deltaTime, this.mousePosition, this.player, this.loot, cachedBots)
    this.updateDroneWeaponry()
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
    // Update zoom smoothly
    this.updateZoom(deltaTime)
    
    // Get effective viewport size (accounting for zoom)
    const effectiveViewport = this.getEffectiveViewport()
    
    let targetX = this.player.position.x - effectiveViewport.width / 2
    let targetY = this.player.position.y - effectiveViewport.height / 2
    
    if (this.player.tankClass === 'predator') {
      const scopeState = this.abilityState.predatorScope
      if (scopeState) {
        const desiredBlend = scopeState.active ? 1 : 0
        const lerpSpeed = scopeState.active ? 6 : 4
        scopeState.blend = this.lerp(scopeState.blend, desiredBlend, Math.min(1, deltaTime * lerpSpeed))
        
        const aimDir = this.getScopedAimDirection(scopeState)
        const scopeDistance = 260
        targetX += aimDir.x * scopeDistance * scopeState.blend
        targetY += aimDir.y * scopeDistance * scopeState.blend
      }
    } else if (this.abilityState.predatorScope) {
      this.abilityState.predatorScope.active = false
      this.abilityState.predatorScope.blend = 0
    }
    
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
    
    // Use new world bounds from zone system
    const bounds = this.zoneSystem.getWorldBounds()
    this.camera.x = Math.max(0, Math.min(bounds.width - effectiveViewport.width, this.camera.x))
    this.camera.y = Math.max(0, Math.min(bounds.height - effectiveViewport.height, this.camera.y))
    
    // Update world-space mouse position based on current camera position AND zoom
    // This ensures the tank always aims at where the mouse pointer is on screen
    if (this.zoom > 0 && isFinite(this.zoom) && 
        isFinite(this.mouseScreenPosition.x) && isFinite(this.mouseScreenPosition.y) &&
        isFinite(this.camera.x) && isFinite(this.camera.y)) {
      this.mousePosition.x = this.mouseScreenPosition.x / this.zoom + this.camera.x
      this.mousePosition.y = this.mouseScreenPosition.y / this.zoom + this.camera.y
    } else {
      console.log('Invalid zoom/camera/mouse data:', {
        zoom: this.zoom,
        mouseScreen: this.mouseScreenPosition,
        camera: this.camera
      })
      // Fallback to default values
      this.mousePosition.x = this.player?.position?.x ?? 0
      this.mousePosition.y = this.player?.position?.y ?? 0
    }
  }

  updateInvisibility(deltaTime: number) {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    
    if (!tankConfig || (!tankConfig.invisibility && !tankConfig.hasDecoy)) {
      this.player.invisibility = 0
      this.player.invisibilityTimer = 0
      return
    }
    
    // Special handling for decoy-based stealth classes
    if (tankConfig.hasDecoy && tankConfig.decoyConfig) {
      const timeSinceShot = Math.max(0, (this.gameTime - this.player.lastShotTime) / 1000)
      const revealDuration = tankConfig.decoyConfig.revealDuration ?? 3
      const fadeDuration = tankConfig.decoyConfig.fadeDuration ?? 1
      const recloakFactor = this.getSynergyValue('mirageRecloak', 1)
      const effectiveReveal = revealDuration * recloakFactor
      const effectiveFade = fadeDuration * Math.max(0.4, recloakFactor)
      
      if (this.isShooting || timeSinceShot < effectiveReveal) {
        this.player.invisibility = 0
        this.player.invisibilityTimer = 0
        return
      }
      
      const fadeProgress = Math.min(1, Math.max(0, (timeSinceShot - effectiveReveal) / effectiveFade))
      this.player.invisibility = fadeProgress
      this.player.invisibilityTimer = timeSinceShot
      return
    }
    
    const isMoving = this.player.velocity.x !== 0 || this.player.velocity.y !== 0
    const recentShot = this.gameTime - this.player.lastShotTime < 100
    
    if (isMoving || recentShot) {
      // Reset invisibility
      this.player.invisibilityTimer = 0
      this.player.invisibility = 0
    } else {
      // Build up invisibility
      this.player.invisibilityTimer += deltaTime
      
      const delay = tankConfig.invisibility?.delay ?? 0
      if (this.player.invisibilityTimer >= delay) {
        const fadeTime = 1.0 // 1 second to fully fade
        const timeSinceDelay = this.player.invisibilityTimer - delay
        this.player.invisibility = Math.min(1, timeSinceDelay / fadeTime)
      }
    }
  }

  private updateDecoy(deltaTime: number) {
    const decoyState = this.player.decoy
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    
    if (!decoyState || !tankConfig?.hasDecoy || !tankConfig.decoyConfig) {
      if (decoyState) {
        decoyState.active = false
        decoyState.visible = false
      }
      return
    }
    
    decoyState.active = true
    if (typeof decoyState.hitFlash === 'number' && decoyState.hitFlash > 0) {
      decoyState.hitFlash = Math.max(0, decoyState.hitFlash - deltaTime)
    }
    
    const fullyInvisible = this.player.invisibility >= 0.98
    if (this.isShooting || !fullyInvisible) {
      decoyState.visible = false
      decoyState.velocity.x = 0
      decoyState.velocity.y = 0
      return
    }
    
    if (!decoyState.visible) {
      decoyState.position.x = this.player.position.x
      decoyState.position.y = this.player.position.y
      decoyState.velocity.x = 0
      decoyState.velocity.y = 0
    }
    
    decoyState.visible = true

    const responsiveness = this.getSynergyValue('mirageResponsiveness', 1)
    const baseMoveSpeed = tankConfig.decoyConfig.moveSpeed ?? 900
    const moveSpeed = baseMoveSpeed * responsiveness
    const playerSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.y)
    const wanderSpeed = 0.8 + responsiveness * 0.4
    decoyState.wanderPhase = (decoyState.wanderPhase + deltaTime * wanderSpeed) % (Math.PI * 2)

    let aiTargetX = this.mousePosition.x
    let aiTargetY = this.mousePosition.y

    if (playerSpeed > 20) {
      const moveDirX = this.player.velocity.x / playerSpeed
      const moveDirY = this.player.velocity.y / playerSpeed
      const perpDirX = -moveDirY
      const perpDirY = moveDirX
      const leadDistance = Math.min(250, playerSpeed * 0.9)
      const strafeAmp = 60 + responsiveness * 35
      aiTargetX = this.player.position.x + moveDirX * leadDistance + perpDirX * Math.sin(decoyState.wanderPhase) * strafeAmp
      aiTargetY = this.player.position.y + moveDirY * leadDistance + perpDirY * Math.sin(decoyState.wanderPhase) * strafeAmp
    } else {
      const orbitDistance = 80 + responsiveness * 20
      aiTargetX = this.player.position.x + Math.cos(decoyState.wanderPhase) * orbitDistance
      aiTargetY = this.player.position.y + Math.sin(decoyState.wanderPhase) * orbitDistance
    }

    const cursorBias = 0.55
    const targetX = this.mousePosition.x * (1 - cursorBias) + aiTargetX * cursorBias
    const targetY = this.mousePosition.y * (1 - cursorBias) + aiTargetY * cursorBias

    decoyState.target.x = targetX
    decoyState.target.y = targetY
    
    const dx = decoyState.target.x - decoyState.position.x
    const dy = decoyState.target.y - decoyState.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 3) {
      const desiredVX = (dx / dist) * moveSpeed
      const desiredVY = (dy / dist) * moveSpeed
      const smoothing = Math.min(1, deltaTime * (3 + responsiveness * 2))
      decoyState.velocity.x = this.lerp(decoyState.velocity.x, desiredVX, smoothing)
      decoyState.velocity.y = this.lerp(decoyState.velocity.y, desiredVY, smoothing)
      decoyState.position.x += decoyState.velocity.x * deltaTime
      decoyState.position.y += decoyState.velocity.y * deltaTime
    } else {
      decoyState.position.x = decoyState.target.x
      decoyState.position.y = decoyState.target.y
      decoyState.velocity.x *= 0.5
      decoyState.velocity.y *= 0.5
    }
  }

  private updateAbilityState(deltaTime: number) {
    this.abilityState.decoyTeleportCooldown = Math.max(0, this.abilityState.decoyTeleportCooldown - deltaTime)
    this.abilityState.decoySwapCooldown = Math.max(0, this.abilityState.decoySwapCooldown - deltaTime)
    this.abilityState.riftTeleportCooldown = Math.max(0, this.abilityState.riftTeleportCooldown - deltaTime)
    if (this.player.tankClass !== 'siegebreaker') {
      this.abilityState.siegeCharge = 0
      this.abilityState.pendingSiegeCharge = 0
    }
    
    const shieldConfig = this.getShieldOrbitConfig(this.player.tankClass)
    if (shieldConfig) {
      if (this.abilityState.aegisShields.length !== shieldConfig.segments) {
        this.abilityState.aegisShields = Array.from({ length: shieldConfig.segments }, (_, i) => ({
          angle: (i / shieldConfig.segments) * Math.PI * 2,
          position: { x: this.player.position.x, y: this.player.position.y }
        }))
      }
      const orbit = this.player.radius + shieldConfig.orbitPadding
      const movementSpin = this.getSynergyValue('shieldSpinBonus', 1)
      const bastionSpin = this.player.tankClass === 'bastioneternal' ? this.getSynergyValue('bastionRotation', 1) : 1
      const spinBoost = shieldConfig.spinSpeed * movementSpin * bastionSpin
      for (const shield of this.abilityState.aegisShields) {
        shield.angle = (shield.angle + deltaTime * spinBoost) % (Math.PI * 2)
        shield.position.x = this.player.position.x + Math.cos(shield.angle) * orbit
        shield.position.y = this.player.position.y + Math.sin(shield.angle) * orbit
      }
    } else if (this.abilityState.aegisShields.length) {
      this.abilityState.aegisShields = []
    }

    this.updateRiftAnomalies(deltaTime)
    this.updateTempestSpin(deltaTime)
    this.applyTempestAura(deltaTime)
    this.updateStarfallSalvo(deltaTime)
    this.updateOrbitalArray(deltaTime)
    this.updatePhaseReticle(deltaTime)
    this.updateCycloneBulwark(deltaTime)
    this.updateAstralAnchors(deltaTime)
    if (this.abilityState.velocityReaver) {
      this.abilityState.velocityReaver.cooldown = Math.max(0, this.abilityState.velocityReaver.cooldown - deltaTime)
    }
    if (this.player.tankClass === 'bastioneternal' && this.abilityState.bastionOvershield) {
      const shield = this.abilityState.bastionOvershield
      if (shield.max > 0) {
        shield.value = Math.min(shield.max, shield.value + shield.max * 0.15 * deltaTime)
      }
    }
    this.updateCataclysmFields(deltaTime)
  }

  private updateRiftAnomalies(deltaTime: number) {
    if (!this.abilityState.riftAnomalies.length) return
    for (const anomaly of this.abilityState.riftAnomalies) {
      anomaly.life -= deltaTime
    }
    this.abilityState.riftAnomalies = this.abilityState.riftAnomalies.filter(a => a.life > 0)
  }

  private updateTempestSpin(deltaTime: number) {
    const tempestState = this.abilityState.tempest
    if (!tempestState) return

    if (!this.isTempestLine(this.player.tankClass)) {
      tempestState.spinVelocity = Math.max(0, tempestState.spinVelocity - deltaTime * 2)
      if (tempestState.spinVelocity === 0) {
        tempestState.spinAngle = 0
        tempestState.direction = 1
        tempestState.swapTimer = 0.6
      }
      return
    }

    const isFiring = this.isShooting || this.autoFire
    const shotsPerSecond = 1000 / Math.max(120, this.player.fireRate)
    const spinBonus = this.getSynergyValue('tempestSpinBoost', 1)
    const acceleration = shotsPerSecond * 0.45 * spinBonus
    const decayRate = 1.3

    if (isFiring) {
      tempestState.spinVelocity = Math.min(3, tempestState.spinVelocity + acceleration * deltaTime)
      tempestState.swapTimer -= deltaTime
      if (tempestState.swapTimer <= 0) {
        tempestState.direction *= -1
        const swapDelay = Math.max(0.35, 1.1 - shotsPerSecond * 0.12)
        tempestState.swapTimer = swapDelay
      }
    } else {
      tempestState.spinVelocity = Math.max(0, tempestState.spinVelocity - decayRate * deltaTime)
      if (tempestState.spinVelocity === 0) {
        tempestState.direction = 1
      }
    }

    const angularSpeed = (2 + tempestState.spinVelocity * 3) * spinBonus
    tempestState.spinAngle = (tempestState.spinAngle + angularSpeed * deltaTime * tempestState.direction) % (Math.PI * 2)
    if (tempestState.spinAngle < 0) {
      tempestState.spinAngle += Math.PI * 2
    }

    if (this.player.tankClass === 'maelstromsovereign') {
      tempestState.swapTimer -= deltaTime
      if (tempestState.swapTimer <= 0) {
        tempestState.direction *= -1
        tempestState.swapTimer = this.getSynergyValue('maelstromFrequency', 0.4)
      }
      const cap = 1.25 + Math.min(0.3, this.getSynergyValue('maelstromRadiusBonus', 0) / 200)
      tempestState.spinVelocity = Math.min(cap, tempestState.spinVelocity + deltaTime * 0.35)
    }
  }

  private updateStarfallSalvo(deltaTime: number) {
    const starfallState = this.abilityState.starfall
    if (!starfallState?.volleys?.length) return
    for (let i = starfallState.volleys.length - 1; i >= 0; i--) {
      const volley = starfallState.volleys[i]
      volley.delay -= deltaTime
      if (volley.delay <= 0) {
        this.fireStarfallVolley(volley.angle, volley.phase)
        starfallState.volleys.splice(i, 1)
      }
    }
  }

  private queueStarfallSalvo(baseAngle: number) {
    const starfallState = this.abilityState.starfall
    if (!starfallState) return
    const stagger = this.getSynergyValue('starfallStagger', 0.18)
    const volleyOrder = [0, 1, 2]
    for (const phase of volleyOrder) {
      starfallState.volleys.push({
        delay: phase * stagger,
        angle: baseAngle,
        phase,
      })
    }

    if (this.player.barrelRecoils) {
      for (let i = 0; i < this.player.barrelRecoils.length; i++) {
        this.player.barrelRecoils[i] = 6
      }
    }

    const recoil = 4
    this.player.velocity.x -= Math.cos(baseAngle) * recoil
    this.player.velocity.y -= Math.sin(baseAngle) * recoil
    audioManager.play('shoot')
  }

  private fireStarfallVolley(baseAngle: number, phase: number) {
    const crescents = phase === 1 ? 3 : 2
    const arcSpread = 0.18 + phase * 0.06
    const forwardOffset = this.player.radius + 35 + phase * 6
    const speedMultiplier = 1 + phase * 0.08
    const damageScale = 0.6 + phase * 0.12
    const pierceCharges = Math.max(0, Math.floor(this.getSynergyValue('starfallPierce', 0)))
    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    const teamColor = this.teamSystem.getTeamColor(this.player.team)

    for (let i = 0; i < crescents; i++) {
      const offsetIndex = i - (crescents - 1) / 2
      const shotAngle = baseAngle + offsetIndex * arcSpread
      const spawnX = this.player.position.x + Math.cos(shotAngle) * forwardOffset
      const spawnY = this.player.position.y + Math.sin(shotAngle) * forwardOffset
      const meta: Record<string, unknown> = { starfallPhase: phase }
      if (pierceCharges > 0) {
        meta.pierceCharges = pierceCharges
      }
      const projectile: Projectile = {
        id: `starfall_${Date.now()}_${Math.random()}`,
        position: { x: spawnX, y: spawnY },
        velocity: {
          x: Math.cos(shotAngle) * this.player.bulletSpeed * speedMultiplier,
          y: Math.sin(shotAngle) * this.player.bulletSpeed * speedMultiplier,
        },
        damage: this.player.damage * totalDamageMultiplier * damageScale,
        radius: 4 + phase,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
        specialTag: 'starfall',
        meta,
      }

      this.projectiles.push(projectile)
      this.particleSystem.createBurst({ x: spawnX, y: spawnY }, 3, {
        color: teamColor,
        size: 3,
        speed: 90 + phase * 15,
        life: 0.18,
        spread: Math.PI / 3,
      })
      this.particlePool.emitEnergySwirl({ x: spawnX, y: spawnY }, '#ffd493')
    }

    this.screenEffects.startShake(2 + phase, 0.12)
  }

  private updateOrbitalArray(deltaTime: number) {
    const orbitalState = this.abilityState.orbitalArray
    if (!orbitalState) return
    if (this.player.tankClass !== 'orbitalarray') {
      orbitalState.nodes = []
      orbitalState.cooldown = 0
      return
    }

    const satelliteCount = 8
    const spacing = this.getSynergyValue('orbitalSpacing', 110)
    const rotationSpeed = 0.8 + Math.min(1.4, this.player.bulletSpeed / 600)
    orbitalState.angle = (orbitalState.angle + deltaTime * rotationSpeed) % (Math.PI * 2)
    orbitalState.nodes = []
    for (let i = 0; i < satelliteCount; i++) {
      const theta = orbitalState.angle + (i / satelliteCount) * Math.PI * 2
      orbitalState.nodes.push({
        x: this.player.position.x + Math.cos(theta) * spacing,
        y: this.player.position.y + Math.sin(theta) * spacing,
      })
    }

    orbitalState.cooldown -= deltaTime
    if (orbitalState.cooldown <= 0) {
      this.fireOrbitalVolley(orbitalState.nodes, spacing)
      orbitalState.cooldown = this.getSynergyValue('orbitalVolleyDelay', 0.65)
    }
  }

  private applyTempestAura(deltaTime: number) {
    const tempestState = this.abilityState.tempest
    if (!tempestState || !this.isTempestLine(this.player.tankClass)) return
    const spinStrength = tempestState.spinVelocity
    if (spinStrength < 0.6) return

    const radiusBonus =
      this.player.tankClass === 'maelstromsovereign'
        ? this.getSynergyValue('maelstromRadiusBonus', 0)
        : this.getSynergyValue('tempestOrbitBonus', 0)
    const auraRadius = 80 + radiusBonus
    const auraDamage = this.player.damage * 0.18 * spinStrength * deltaTime
    const bots = this.botAISystem.getBots()
    for (const bot of bots) {
      if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
      const dx = bot.position.x - this.player.position.x
      const dy = bot.position.y - this.player.position.y
      if (dx * dx + dy * dy <= auraRadius * auraRadius) {
        this.botAISystem.damageBot(bot.id, auraDamage)
      }
    }
    this.particlePool.emitEnergySwirl({ ...this.player.position }, '#88f0ff')
  }

  private fireOrbitalVolley(nodes: Array<{ x: number; y: number }>, spacing: number) {
    if (!nodes.length) return
    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    const shotsPerVolley = 4
    const step = Math.floor(nodes.length / shotsPerVolley)
    const startIndex = Math.floor(((this.abilityState.orbitalArray.angle % (Math.PI * 2)) / (Math.PI * 2)) * nodes.length)

    for (let i = 0; i < shotsPerVolley; i++) {
      const nodeIndex = (startIndex + i * step) % nodes.length
      const node = nodes[nodeIndex]
      const dx = node.x - this.player.position.x
      const dy = node.y - this.player.position.y
      const dist = Math.hypot(dx, dy) || 1
      const dirX = dx / dist
      const dirY = dy / dist

      const projectile: Projectile = {
        id: `orbital_${Date.now()}_${nodeIndex}`,
        position: { x: node.x, y: node.y },
        velocity: {
          x: dirX * this.player.bulletSpeed * 1.05,
          y: dirY * this.player.bulletSpeed * 1.05,
        },
        damage: this.player.damage * totalDamageMultiplier * 0.75,
        radius: 4,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
      }

      this.projectiles.push(projectile)
      this.particlePool.emitEnergySwirl({ x: node.x, y: node.y }, '#9ad9ff')
    }
  }

  private updatePhaseReticle(deltaTime: number) {
    const state = this.abilityState.phaseSentinel
    if (!state) return
    if (this.player.tankClass !== 'phasesentinel') {
      state.charge = 0
      return
    }
    const chargeRate = this.getSynergyValue('phaseReticleRate', 0.6)
    state.charge = Math.min(1, state.charge + deltaTime * chargeRate)
  }

  private applyPhaseShotProperties(projectile: Projectile) {
    const state = this.abilityState.phaseSentinel
    if (!state) return
    const railMultiplier = this.getSynergyValue('phaseRailMultiplier', 1.2)
    if (projectile.maxTravelDistance) {
      projectile.maxTravelDistance *= railMultiplier
    } else {
      projectile.maxTravelDistance = 1400 * railMultiplier
      projectile.distanceTraveled = 0
    }

    if (state.charge >= 0.99) {
      projectile.damage *= 1.35
      projectile.radius += 1
      projectile.meta = { ...(projectile.meta || {}), phased: true }
      // Ability activation flash - phase rail fully charged
      this.screenEffects.triggerFlash('ability', 0.6)
      this.particlePool.emitEnergySwirl({ ...projectile.position }, '#d6e1ff')
    }
    state.charge = 0
  }

  private updateCycloneBulwark(deltaTime: number) {
    const state = this.abilityState.cycloneBulwark
    if (!state) return
    if (this.player.tankClass !== 'cyclonebulwark') {
      state.cooldown = 0
      state.phase = 0
      return
    }

    state.phase = (state.phase + deltaTime * 2.2) % (Math.PI * 2)
    state.cooldown -= deltaTime
    if (state.cooldown <= 0) {
      this.emitCyclonePulse(state.phase)
      state.cooldown = this.getSynergyValue('cyclonePulseInterval', 0.6)
    }
  }

  private emitCyclonePulse(startAngle: number) {
    const petals = 6
    const arcSpread = this.getSynergyValue('cycloneArcSpread', 0.3)
    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    for (let i = 0; i < petals; i++) {
      const angle = startAngle + i * arcSpread
      const projectile: Projectile = {
        id: `cyclone_${Date.now()}_${i}`,
        position: { x: this.player.position.x, y: this.player.position.y },
        velocity: {
          x: Math.cos(angle) * this.player.bulletSpeed * 0.85,
          y: Math.sin(angle) * this.player.bulletSpeed * 0.85,
        },
        damage: this.player.damage * totalDamageMultiplier * 0.5,
        radius: 3,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
        maxTravelDistance: 600,
        distanceTraveled: 0,
      }
      this.projectiles.push(projectile)
    }

    this.particlePool.emitEnergySwirl({ ...this.player.position }, '#99f6ff')
    this.screenEffects.startShake(1.2, 0.08)
  }

  private spawnFusionRockets(baseAngle: number) {
    const rocketDamage = this.getSynergyValue('fusionRocketDamage', this.player.bodyDamage * 0.5)
    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    const offsets = [-0.3, 0.3]
    for (const offset of offsets) {
      const rocketAngle = baseAngle + Math.PI + offset
      const spawnX = this.player.position.x + Math.cos(rocketAngle) * (this.player.radius * 0.6)
      const spawnY = this.player.position.y + Math.sin(rocketAngle) * (this.player.radius * 0.6)
      const projectile: Projectile = {
        id: `fusion_rocket_${Date.now()}_${Math.random()}`,
        position: { x: spawnX, y: spawnY },
        velocity: {
          x: Math.cos(rocketAngle) * this.player.bulletSpeed * 0.75,
          y: Math.sin(rocketAngle) * this.player.bulletSpeed * 0.75,
        },
        damage: rocketDamage * totalDamageMultiplier,
        radius: 4,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
        maxTravelDistance: 550,
        distanceTraveled: 0,
      }
      this.projectiles.push(projectile)
      this.particlePool.emitSmoke({ x: spawnX, y: spawnY }, rocketAngle)
    }
  }

  private updateAstralAnchors(deltaTime: number) {
    const state = this.abilityState.astralRegent
    if (!state) return
    if (this.player.tankClass !== 'astralregent') {
      state.anchors = []
      state.cooldown = 0
      return
    }

    state.cooldown -= deltaTime
    if (state.cooldown <= 0) {
      state.anchors.push({
        position: { x: this.player.position.x, y: this.player.position.y },
        life: 8,
        spawnTimer: 0.6,
      })
      state.cooldown = this.getSynergyValue('astralAnchorInterval', 8)
      this.particlePool.emitEnergySwirl(this.player.position, '#f0f4ff')
    }

    const redeployRate = this.getSynergyValue('astralRedeploySpeed', 1)
    for (const anchor of state.anchors) {
      anchor.life -= deltaTime
      anchor.spawnTimer -= deltaTime
      if (anchor.spawnTimer <= 0) {
        this.droneSystem.spawnDrone(this.player, 'triangle', { x: anchor.position.x, y: anchor.position.y })
        anchor.spawnTimer = Math.max(0.4, 1.1 / redeployRate)
      }
      const dx = anchor.position.x - this.player.position.x
      const dy = anchor.position.y - this.player.position.y
      if (dx * dx + dy * dy <= 160 * 160) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.healthRegen * 0.6 * deltaTime)
      }
    }
    state.anchors = state.anchors.filter(anchor => anchor.life > 0)
  }

  private emitIonTrail(deltaTime: number) {
    const nodes = this.abilityState.ionTrail ?? []
    if (this.player.tankClass !== 'ionvanguard') {
      if (nodes.length) {
        nodes.splice(0, nodes.length)
      }
      this.abilityState.ionTrail = nodes
      return
    }
    const density = this.getSynergyValue('ionTrailDensity', 0.3)
    const spawnChance = density * deltaTime * 3
    if (Math.random() < spawnChance) {
      nodes.push({
        position: { x: this.player.position.x, y: this.player.position.y },
        life: 1,
        radius: 28 + Math.random() * 30,
      })
      this.particlePool.emitEnergySwirl({ ...this.player.position }, '#b2f5ff')
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      nodes[i].life -= deltaTime * 0.85
      if (nodes[i].life <= 0) {
        nodes.splice(i, 1)
      }
    }
    this.abilityState.ionTrail = nodes
  }

  private spawnIonDetonation(position: Vector2) {
    const radius = this.getSynergyValue('ionDetonationRadius', 100)
    const radiusSq = radius * radius
    const damage = this.player.damage * 0.6
    const bots = this.botAISystem.getBots()
    for (const bot of bots) {
      if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
      const dx = bot.position.x - position.x
      const dy = bot.position.y - position.y
      if (dx * dx + dy * dy <= radiusSq) {
        this.botAISystem.damageBot(bot.id, damage)
      }
    }
    this.particleSystem.createExplosion(position, radius, '#bfffef')
  }

  private handleCatalystComboGain() {
    if (this.player.tankClass !== 'catalyst') return
    const state = this.abilityState.catalyst
    if (!state) return
    state.stacks += this.getSynergyValue('catalystComboGain', 1)
    if (state.stacks >= 5) {
      this.releaseCatalystShockwave()
      state.stacks = 0
    }
  }

  private releaseCatalystShockwave() {
    const radius = 180
    const damage = this.player.bodyDamage * this.getSynergyValue('catalystShockwave', 1)
    const bots = this.botAISystem.getBots()
    for (const bot of bots) {
      if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
      const dx = bot.position.x - this.player.position.x
      const dy = bot.position.y - this.player.position.y
      if (dx * dx + dy * dy <= radius * radius) {
        this.botAISystem.damageBot(bot.id, damage)
      }
    }
    this.particleSystem.createExplosion(this.player.position, radius, '#ffc9f2')
    this.screenEffects.startShake(4, 0.2)
  }

  private applyVelocityCritDamage(baseDamage: number): number {
    if (this.player.tankClass !== 'velocityreaver') {
      return baseDamage
    }
    const critChance = this.getSynergyValue('velocityCritChance', 0)
    if (Math.random() <= critChance) {
      const critMultiplier = this.getSynergyValue('velocityCritMultiplier', 1.5)
      this.particlePool.emitSparkBurst({ ...this.player.position }, 6)
      return baseDamage * critMultiplier
    }
    return baseDamage
  }

  private getShieldOrbitConfig(tankClass: string) {
    switch (tankClass) {
      case 'aegisvanguard':
        return { segments: 4, orbitPadding: 45, spinSpeed: 2.1, blockPadding: 18, slamMultiplier: 0.35 }
      case 'bulwarkprime':
        return {
          segments: 5,
          orbitPadding: 52,
          spinSpeed: 2.4,
          blockPadding: 22,
          slamMultiplier: 0.45,
          retaliation: true,
        }
      case 'bastioneternal':
        return {
          segments: 6,
          orbitPadding: 60,
          spinSpeed: 2.7,
          blockPadding: 26,
          slamMultiplier: 0.55,
          retaliation: true,
          pulse: true,
        }
      default:
        return null
    }
  }

  private getAutoTurretProfile(tankClass: string, radius: number, synergy?: PlayerSynergyState): AutoTurretProfile | undefined {
    const config = TANK_CONFIGS[tankClass]
    if (!config?.autoTurrets) return undefined

    const profile: AutoTurretProfile = {
      detectionRange: 400,
      fireRate: 400,
      trackingRotationSpeed: 3,
      idleRotationSpeed: 0.5,
      bulletDamageMultiplier: 0.7,
      bulletSpeedMultiplier: 0.8,
      orbitRadius: Math.max(radius * 0.9, radius - 4),
      orbitSpin: 0,
    }

    const detectionBonus = synergy?.modifiers.autoTurretDetection ?? 1
    const fireRateScale = synergy?.modifiers.autoTurretFireRate ?? 1
    const orbitBonus = synergy?.modifiers.autoTurretOrbit ?? 0
    const spinBonus = synergy?.modifiers.autoTurretSpin ?? 0
    const bulletSpeedBonus = synergy?.modifiers.autoTurretBulletSpeed ?? 1
    const bulletDamageBonus = synergy?.modifiers.autoTurretDamage ?? 1

    if (tankClass === 'auto3' || tankClass === 'auto5') {
      const baseDetection = tankClass === 'auto5' ? 520 : 460
      const baseFireRate = tankClass === 'auto5' ? 320 : 360
      const baseDamage = tankClass === 'auto5' ? 0.85 : 0.75
      profile.detectionRange = baseDetection * detectionBonus
      profile.fireRate = Math.max(220, baseFireRate * fireRateScale)
      profile.trackingRotationSpeed = 3.4
      profile.idleRotationSpeed = 0.9
      profile.orbitRadius = radius + (tankClass === 'auto5' ? 28 : 20) + orbitBonus
      profile.orbitSpin = (tankClass === 'auto5' ? 0.8 : 0.55) + spinBonus
      profile.bulletSpeedMultiplier = 0.9 * bulletSpeedBonus
      profile.bulletDamageMultiplier = baseDamage * bulletDamageBonus
    } else {
      profile.detectionRange = profile.detectionRange! * detectionBonus
      profile.fireRate = Math.max(250, profile.fireRate! * fireRateScale)
      profile.orbitRadius = (profile.orbitRadius ?? radius) + orbitBonus
      profile.orbitSpin = spinBonus
      profile.bulletSpeedMultiplier = profile.bulletSpeedMultiplier! * bulletSpeedBonus
      profile.bulletDamageMultiplier = profile.bulletDamageMultiplier! * bulletDamageBonus
    }

    return profile
  }

  private isSiegeClass(tankClass: string) {
    return SIEGE_LINE_CLASSES.has(tankClass)
  }

  private isTempestLine(tankClass: string) {
    return TEMPEST_LINE_CLASSES.has(tankClass)
  }

  private isPylonSummoner(tankClass: string) {
    return PYLON_LINE_CLASSES.has(tankClass)
  }

  private handleAegisShieldInteractions() {
    const shieldConfig = this.getShieldOrbitConfig(this.player.tankClass)
    if (!shieldConfig || this.abilityState.aegisShields.length === 0) return
    
    const plating = this.player.tankClass === 'bulwarkprime' ? this.getSynergyValue('bulwarkPlating', 1) : 1
    const blockRadius = (this.player.radius * 0.9 + shieldConfig.blockPadding) * plating
    const enemyProjectiles = this.projectiles
    
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = enemyProjectiles[i]
      if (projectile.isPlayerProjectile) continue
      if (!projectile.team || !this.teamSystem.areEnemies(projectile.team, this.player.team)) continue
      
      let blocked = false
      for (const shield of this.abilityState.aegisShields) {
        const dx = projectile.position.x - shield.position.x
        const dy = projectile.position.y - shield.position.y
        const rad = blockRadius + projectile.radius
        if (dx * dx + dy * dy <= rad * rad) {
          this.particlePool.emitEnergySwirl({ ...shield.position }, '#54f0ff')
          // Shield block feedback - satisfying confirmation you blocked damage
          this.screenEffects.startShake(2, 0.1)
          this.screenEffects.triggerFlash('shield', 0.5)
          enemyProjectiles.splice(i, 1)
          this.emitShieldRetaliation(shield.position, shieldConfig)
          blocked = true
          break
        }
      }
      if (blocked) continue
    }
    
    const bots = this.botAISystem.getBots()
    for (const bot of bots) {
      if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
      for (const shield of this.abilityState.aegisShields) {
        const dx = bot.position.x - shield.position.x
        const dy = bot.position.y - shield.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < blockRadius + bot.radius) {
          let slamDamage = Math.max(8, this.player.bodyDamage * shieldConfig.slamMultiplier)
          if (this.player.tankClass === 'bulwarkprime') {
            slamDamage *= this.getSynergyValue('bulwarkSlam', 1)
          }
          const killed = this.botAISystem.damageBot(bot.id, slamDamage)
          const pushAngle = Math.atan2(dy, dx)
          bot.velocity.x += Math.cos(pushAngle) * 120
          bot.velocity.y += Math.sin(pushAngle) * 120
          this.particlePool.emitSparkBurst({ ...shield.position }, 6)
          this.emitShieldRetaliation(shield.position, shieldConfig)
          if (killed) {
            this.createDeathParticles(bot.position)
          } else {
            this.particleSystem.createDamageNumber(bot.position, slamDamage)
          }
          break
        }
      }
    }
  }

  private emitShieldRetaliation(position: Vector2, config: ReturnType<typeof this.getShieldOrbitConfig>) {
    if (!config?.retaliation && !config?.pulse) return
    const retaliationRadius = 80 + (config.pulse ? 20 : 0)
    let damage = Math.max(6, this.player.bodyDamage * (config.slamMultiplier ?? 0.32) * 0.45)
    if (this.player.tankClass === 'bulwarkprime') {
      damage *= this.getSynergyValue('bulwarkSlam', 1)
    }
    this.particlePool.emitEnergySwirl(position, '#8af8ff')
    this.particleSystem.createBurst(position, 4, {
      color: '#a7f7ff',
      size: 3,
      speed: 90,
      life: 0.3,
    })

    for (const bot of this.botAISystem.getBots()) {
      if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
      const dx = bot.position.x - position.x
      const dy = bot.position.y - position.y
      if (dx * dx + dy * dy > retaliationRadius * retaliationRadius) continue
      const killed = this.botAISystem.damageBot(bot.id, damage)
      bot.velocity.x += dx * 0.12
      bot.velocity.y += dy * 0.12
      if (killed) {
        this.createDeathParticles(bot.position)
      }
    }

    if (config.pulse) {
      // Shield pulse ability effect
      this.screenEffects.triggerFlash('shield', 0.7)
    }
  }

  private getSiegeConfig(tankClass: string) {
    switch (tankClass) {
      case 'cataclysmengine':
        return {
          minCharge: 0.35,
          maxCharge: 2.0,
          damageScale: 1.12,
          splashScale: 1.2,
          recoilScale: 1.05,
          fireDelayScale: 0.92,
          decayRate: 0.5,
          aftershock: { radius: 170, duration: 3.5, dps: 0.32, chains: 1 },
        }
      case 'doomsdayharbinger':
        return {
          minCharge: 0.4,
          maxCharge: 2.2,
          damageScale: 1.25,
          splashScale: 1.35,
          recoilScale: 1.2,
          fireDelayScale: 0.85,
          decayRate: 0.45,
          aftershock: { radius: 210, duration: 4.8, dps: 0.4, chains: 2 },
        }
      default:
        return {
          minCharge: 0.4,
          maxCharge: 1.8,
          damageScale: 1,
          splashScale: 1,
          recoilScale: 1,
          fireDelayScale: 1,
          decayRate: 0.6,
        }
    }
  }

  private applyRiftAnomalyEffects(deltaTime: number) {
    if (!this.abilityState.riftAnomalies.length) return
    const bots = this.botAISystem.getBots()
    for (const anomaly of this.abilityState.riftAnomalies) {
      for (const bot of bots) {
        if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
        const dx = bot.position.x - anomaly.position.x
        const dy = bot.position.y - anomaly.position.y
        const distSq = dx * dx + dy * dy
        const radius = anomaly.radius
        if (distSq <= radius * radius) {
          bot.velocity.x *= 0.6
          bot.velocity.y *= 0.6
          const tickDamage = Math.max(2, this.player.damage * 0.05) * deltaTime
          this.botAISystem.damageBot(bot.id, tickDamage)
        }
      }
    }
  }

  private updateCataclysmFields(deltaTime: number) {
    const fields = this.abilityState.cataclysmFields
    if (!fields?.length) return

    const bots = this.botAISystem.getBots()
    for (const field of fields) {
      field.life -= deltaTime
      if (field.life <= 0) continue
      if (Math.random() < 0.25) {
        this.particlePool.emitEnergySwirl(field.position, '#ff9b52')
      }

      for (const bot of bots) {
        if (bot.health <= 0) continue
        if (field.team && this.teamSystem.areAllies(bot.team, field.team)) continue
        const dx = bot.position.x - field.position.x
        const dy = bot.position.y - field.position.y
        if (dx * dx + dy * dy <= field.radius * field.radius) {
          const damage = field.dps * deltaTime
          const killed = this.botAISystem.damageBot(bot.id, damage)
          if (killed && field.team === this.player.team) {
            this.createDeathParticles(bot.position)
          }
        }
      }

      if (field.team && !this.teamSystem.areAllies(field.team, this.player.team)) {
        const dx = this.player.position.x - field.position.x
        const dy = this.player.position.y - field.position.y
        if (dx * dx + dy * dy <= (field.radius + this.player.radius) * (field.radius + this.player.radius) && this.invincibilityFrames <= 0) {
          this.applyDamageToPlayer(field.dps * deltaTime)
          this.player.lastRegenTime = this.gameTime
          if (this.player.health < 0) this.player.health = 0
        }
      }
    }

    this.abilityState.cataclysmFields = fields.filter((field) => field.life > 0)
  }

  private handleProjectileAftermath(projectile: Projectile, impactPoint: Vector2) {
    if (projectile.specialTag === 'siege' && projectile.meta && 'aftershock' in projectile.meta) {
      const meta = projectile.meta as {
        siegeClass?: string
        aftershock?: { radius: number; duration: number; dps: number; chains?: number }
      }
    if (meta.aftershock) {
      this.spawnCataclysmField(impactPoint, projectile.team ?? this.player.team, meta.aftershock)
      const chains = meta.aftershock.chains ?? 0
      for (let i = 0; i < chains; i++) {
        const angle = Math.random() * Math.PI * 2
          const distance = meta.aftershock.radius * (0.6 + Math.random() * 0.8)
          const offset = {
            x: impactPoint.x + Math.cos(angle) * distance,
            y: impactPoint.y + Math.sin(angle) * distance,
          }
          this.spawnCataclysmField(offset, projectile.team ?? this.player.team, {
            radius: meta.aftershock.radius * 0.8,
            duration: Math.max(1.5, meta.aftershock.duration * 0.75),
            dps: meta.aftershock.dps * 0.8,
        })
      }
    }

    if (projectile.meta && (projectile.meta as { ionLance?: boolean }).ionLance && projectile.isPlayerProjectile) {
      this.spawnIonDetonation(impactPoint)
    }
  }
  }

  private spawnCataclysmField(position: Vector2, team: Team | undefined, config: { radius: number; duration: number; dps: number }) {
    this.abilityState.cataclysmFields.push({
      position: { ...position },
      radius: config.radius,
      life: config.duration,
      dps: config.dps,
      team: team ?? this.player.team,
    })
    this.particleSystem.createExplosion(position, config.radius, '#ff8b45')
  }

  private applyDamageToPlayer(amount: number) {
    if (amount <= 0) return
    let remaining = amount
    if (this.player.tankClass === 'bastioneternal') {
      const shield = this.abilityState.bastionOvershield
      if (shield && shield.value > 0) {
        const absorbed = Math.min(shield.value, remaining)
        shield.value -= absorbed
        remaining -= absorbed
        // Shield absorbed damage - cyan flash
        if (absorbed > 0) {
          this.screenEffects.triggerFlash('shield', Math.min(1, absorbed / 20))
        }
      }
    }
    if (remaining > 0) {
      this.player.health -= remaining
      // Red damage flash - intensity based on damage relative to max health
      const damagePercent = remaining / this.player.maxHealth
      this.screenEffects.triggerFlash('damage', Math.min(1, damagePercent * 3))
    }
  }

  private consumePierceCharge(projectile: Projectile): boolean {
    if (!projectile.meta) return false
    const meta = projectile.meta as { pierceCharges?: number }
    if (!meta || typeof meta.pierceCharges !== 'number') return false
    if (meta.pierceCharges <= 0) return false
    meta.pierceCharges -= 1
    const keepAlive = meta.pierceCharges > 0
    if (!keepAlive) {
      delete meta.pierceCharges
      return false
    }

    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1
    projectile.position.x += (projectile.velocity.x / speed) * projectile.radius * 1.5
    projectile.position.y += (projectile.velocity.y / speed) * projectile.radius * 1.5
    this.particlePool.emitEnergySwirl({ ...projectile.position }, '#ffe6c2')
    return true
  }

  tryDecoyTeleport(): { success: boolean; message?: string } {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    if (!tankConfig?.hasDecoy) return { success: false }
    if (!this.player.decoy.visible) return { success: false, message: 'Decoy must be active to teleport.' }
    if (this.abilityState.decoyTeleportCooldown > 0) {
      return { success: false, message: `Teleport ready in ${this.abilityState.decoyTeleportCooldown.toFixed(1)}s` }
    }

    const target = { ...this.player.decoy.position }
    const prevPosition = { ...this.player.position }
    this.player.position.x = target.x
    this.player.position.y = target.y
    this.player.velocity.x = 0
    this.player.velocity.y = 0
    this.player.decoy.visible = false
    this.abilityState.decoyTeleportCooldown = 8
    // Decoy teleport ability effect
    this.screenEffects.triggerFlash('ability', 1)
    this.screenEffects.startShake(3, 0.12)
    this.particlePool.emitEnergySwirl(prevPosition, '#88f')
    this.particlePool.emitEnergySwirl(target, '#88f')
    return { success: true }
  }

  tryDecoySwap(): { success: boolean; message?: string } {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    if (!tankConfig?.hasDecoy) return { success: false }
    if (!this.player.decoy.visible) return { success: false, message: 'Decoy must be active to swap.' }
    if (this.abilityState.decoySwapCooldown > 0) {
      return { success: false, message: `Swap ready in ${this.abilityState.decoySwapCooldown.toFixed(1)}s` }
    }

    const temp = { ...this.player.position }
    this.player.position.x = this.player.decoy.position.x
    this.player.position.y = this.player.decoy.position.y
    this.player.decoy.position.x = temp.x
    this.player.decoy.position.y = temp.y
    this.abilityState.decoySwapCooldown = 6
    this.screenEffects.startShake(4, 0.2)
    return { success: true }
  }

  private interceptProjectileWithDecoy(projectile: Projectile): boolean {
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    const decoyState = this.player.decoy
    if (!tankConfig?.hasDecoy || !decoyState?.visible) {
      return false
    }

    const decoyRadius = Math.max(12, this.player.radius * 0.9)
    const dx = projectile.position.x - decoyState.position.x
    const dy = projectile.position.y - decoyState.position.y
    const radSum = projectile.radius + decoyRadius
    if (dx * dx + dy * dy > radSum * radSum) {
      return false
    }

    decoyState.hitFlash = 0.2
    this.particlePool.emitSparkBurst(decoyState.position, 4)
    this.particleSystem.createBurst(decoyState.position, 4, {
      color: '#b3c2ff',
      size: 3,
      speed: 80,
      life: 0.25,
    })
    return true
  }

  tryRiftTeleport(mousePriority: boolean = false): { success: boolean; message?: string } {
    if (this.player.tankClass !== 'riftwalker') return { success: false, message: 'Teleport requires Riftwalker.' }
    if (this.abilityState.riftTeleportCooldown > 0) {
      return { success: false, message: `Rift ready in ${this.abilityState.riftTeleportCooldown.toFixed(1)}s` }
    }
    const drones = this.droneSystem.getPlayerDrones(this.player.id)
    if (!drones.length) return { success: false, message: 'No drones available to warp to.' }

    let targetDrone = drones[0]
    if (mousePriority) {
      const sorted = [...drones].sort((a, b) => {
        const distA = (a.position.x - this.mousePosition.x) ** 2 + (a.position.y - this.mousePosition.y) ** 2
        const distB = (b.position.x - this.mousePosition.x) ** 2 + (b.position.y - this.mousePosition.y) ** 2
        return distA - distB
      })
      targetDrone = sorted[0]
    }

    const previousPosition = { ...this.player.position }
    this.player.position.x = targetDrone.position.x
    this.player.position.y = targetDrone.position.y
    this.player.velocity.x = 0
    this.player.velocity.y = 0

    this.abilityState.riftTeleportCooldown = this.getSynergyValue('riftCooldown', 6)
    this.abilityState.riftAnomalies.push({
      position: previousPosition,
      life: 3,
      radius: 200
    })
    // Rift teleport ability effect - more intense for major ability
    this.screenEffects.triggerFlash('ability', 1)
    this.screenEffects.startShake(4, 0.15)
    this.particlePool.emitEnergySwirl(previousPosition, '#b88bff')
    this.particlePool.emitEnergySwirl(targetDrone.position, '#b88bff')
    return { success: true }
  }

  tryVelocityDash(): { success: boolean; message?: string } {
    if (this.player.tankClass !== 'velocityreaver') {
      return { success: false, message: 'Requires Velocity Reaver.' }
    }
    const state = this.abilityState.velocityReaver
    if (!state) return { success: false }
    if (state.cooldown > 0) {
      return { success: false, message: `Dash ready in ${state.cooldown.toFixed(1)}s` }
    }

    let dirX = this.mousePosition.x - this.player.position.x
    let dirY = this.mousePosition.y - this.player.position.y
    const length = Math.hypot(dirX, dirY)
    if (length === 0) {
      dirX = 1
      dirY = 0
    } else {
      dirX /= length
      dirY /= length
    }

    const dashDistance = 220 + this.player.speed * 0.7
    this.player.position.x += dirX * dashDistance
    this.player.position.y += dirY * dashDistance
    this.player.position.x = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.x))
    this.player.position.y = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.y))

    this.player.velocity.x = dirX * this.player.speed * 1.5
    this.player.velocity.y = dirY * this.player.speed * 1.5
    this.invincibilityFrames = Math.max(this.invincibilityFrames, 0.25)
    state.cooldown = this.getSynergyValue('velocityDashCooldown', 2.5)
    this.screenEffects.startShake(4, 0.18)
    this.particlePool.emitEnergySwirl({ ...this.player.position }, '#6cf3ff')

    return { success: true }
  }

  private handleSiegebreakerFire(deltaTime: number, shouldShoot: boolean) {
    const timeSinceShot = this.gameTime - this.player.lastShotTime
    const siegeConfig = this.getSiegeConfig(this.player.tankClass)
    this.abilityState.siegeMinCharge = siegeConfig.minCharge
    this.abilityState.siegeMaxCharge = siegeConfig.maxCharge
    const reloadModifier = 1.15 - Math.min(0.35, this.player.bodyDamage / 600)
    const requiredDelay = this.player.fireRate * Math.max(0.65, reloadModifier * (siegeConfig.fireDelayScale ?? 1))

    const chargeRate = this.player.tankClass === 'cataclysmengine' ? this.getSynergyValue('cataclysmChargeRate', 1) : 1
    const cadence = this.player.tankClass === 'doomsdayharbinger' ? this.getSynergyValue('doomsdayCadence', 1) : 1
    if (shouldShoot) {
      this.abilityState.siegeCharge = Math.min(
        this.abilityState.siegeMaxCharge,
        this.abilityState.siegeCharge + deltaTime * chargeRate
      )
    } else {
      const decayRate = siegeConfig.decayRate ?? 0.6
      this.abilityState.siegeCharge = Math.max(0, this.abilityState.siegeCharge - deltaTime * decayRate)
    }

    if (
      shouldShoot &&
      this.abilityState.siegeCharge >= this.abilityState.siegeMinCharge &&
      timeSinceShot > requiredDelay * cadence
    ) {
      this.abilityState.pendingSiegeCharge = this.abilityState.siegeCharge
      this.shootProjectile()
      this.player.lastShotTime = this.gameTime
      this.abilityState.siegeCharge = 0
    }
  }

  private fireSiegebreakerProjectile(angle: number) {
    const siegeConfig = this.getSiegeConfig(this.player.tankClass)
    const charge = Math.max(this.abilityState.siegeMinCharge, this.abilityState.pendingSiegeCharge)
    const chargeRatio = Math.min(1, charge / this.abilityState.siegeMaxCharge)
    const muzzleDistance = this.player.radius + 60
    const origin = {
      x: this.player.position.x + Math.cos(angle) * muzzleDistance,
      y: this.player.position.y + Math.sin(angle) * muzzleDistance
    }

    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    const baseDamage = (400 + this.player.damage * 1.5) * (siegeConfig.damageScale ?? 1)
    let splashRadius = (130 + 90 * chargeRatio) * (siegeConfig.splashScale ?? 1)
    let splashDamage = baseDamage * 0.7 * chargeRatio * totalDamageMultiplier * (siegeConfig.splashScale ?? 1)
    if (this.player.tankClass === 'cataclysmengine') {
      splashDamage *= this.getSynergyValue('cataclysmShockwave', 1)
    }
    if (this.player.tankClass === 'doomsdayharbinger') {
      const rupture = this.getSynergyValue('doomsdayRupture', 1)
      splashRadius *= rupture
      splashDamage *= rupture
    }
    const baseAftershock = siegeConfig.aftershock
    const aftershockData = baseAftershock ? { ...baseAftershock } : undefined
    if (aftershockData) {
      if (this.player.tankClass === 'cataclysmengine') {
        const shock = this.getSynergyValue('cataclysmShockwave', 1)
        aftershockData.dps = (aftershockData.dps ?? 0) * shock
      }
      if (this.player.tankClass === 'doomsdayharbinger') {
        const rupture = this.getSynergyValue('doomsdayRupture', 1)
        aftershockData.radius *= rupture
        aftershockData.dps = (aftershockData.dps ?? 0) * rupture
      }
    }
    const projectileMeta = aftershockData
      ? { siegeClass: this.player.tankClass, aftershock: aftershockData }
      : { siegeClass: this.player.tankClass }
    const projectile: Projectile = {
      id: `siege_${Date.now()}`,
      position: origin,
      velocity: {
        x: Math.cos(angle) * (this.player.bulletSpeed * 0.6),
        y: Math.sin(angle) * (this.player.bulletSpeed * 0.6),
      },
      damage: baseDamage * chargeRatio * totalDamageMultiplier,
      radius: 22 + 10 * chargeRatio,
      isPlayerProjectile: true,
      ownerId: this.player.id,
      team: this.player.team,
      splashRadius,
      splashDamage,
      slowAmount: 0.4,
      slowDuration: 1.2,
      specialTag: 'siege',
      meta: projectileMeta,
    }

    this.projectiles.push(projectile)
    const recoilForce = 180 * chargeRatio * (siegeConfig.recoilScale ?? 1)
    this.player.velocity.x -= Math.cos(angle) * recoilForce
    this.player.velocity.y -= Math.sin(angle) * recoilForce
    this.barrelRecoil = 12
    this.particlePool.emitSmoke(origin, angle)
    this.particleSystem.createBurst(origin, 6, {
      color: '#ffaa00',
      size: 4,
      speed: 120,
      life: 0.3,
      spread: Math.PI / 3
    })
    this.screenEffects.startShake(6 * chargeRatio * (siegeConfig.recoilScale ?? 1), 0.25)
    if (this.player.tankClass === 'doomsdayharbinger') {
      // Big cannon ability flash - warm color for explosive
      this.screenEffects.triggerFlash('critical', 0.6)
    }
  }

  private fireTempestVortex(baseAngle: number) {
    const tempestState = this.abilityState.tempest
    const spinStrength = tempestState ? Math.max(0.3, tempestState.spinVelocity) : 0.3
    const direction = tempestState?.direction ?? 1
    const isMaelstrom = this.player.tankClass === 'maelstromsovereign'
    const orbitBase = this.player.radius + 20
    const bulletSpeedBonus = Math.max(0, this.player.bulletSpeed - 300)
    const orbitBonus = this.getSynergyValue(isMaelstrom ? 'maelstromRadiusBonus' : 'tempestOrbitBonus', 0)
    const orbitRadius = orbitBase + Math.min(90, bulletSpeedBonus * 0.2) + (isMaelstrom ? 10 : 0) + orbitBonus
    const projectileSpeed = this.player.bulletSpeed * (1 + spinStrength * 0.15 + (isMaelstrom ? 0.05 : 0))
    const arcSpread = 0.35 + spinStrength * 0.25 + (isMaelstrom ? 0.08 : 0)
    const streams = isMaelstrom ? 4 : 3
    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    const damageScale = (0.65 + spinStrength * 0.25) * (isMaelstrom ? 1.1 : 1)
    const swirlAngle = tempestState?.spinAngle ?? 0
    const teamColor = this.teamSystem.getTeamColor(this.player.team)

    for (let i = 0; i < streams; i++) {
      const streamPhase = swirlAngle + i * ((Math.PI * 2) / streams)

      for (const polarity of [-1, 1]) {
        const rotationalOffset = streamPhase * direction
        const firingAngle = baseAngle + rotationalOffset + polarity * arcSpread
        const orbitAngle = rotationalOffset + polarity * 0.55
        const spawnX = this.player.position.x + Math.cos(orbitAngle) * orbitRadius
        const spawnY = this.player.position.y + Math.sin(orbitAngle) * orbitRadius

        const projectile: Projectile = {
          id: `tempest_proj_${Date.now()}_${Math.random()}`,
          position: { x: spawnX, y: spawnY },
          velocity: {
            x: Math.cos(firingAngle) * projectileSpeed,
            y: Math.sin(firingAngle) * projectileSpeed,
          },
          damage: this.player.damage * totalDamageMultiplier * damageScale,
          radius: isMaelstrom ? 5 : 4,
          isPlayerProjectile: true,
          ownerId: this.player.id,
          team: this.player.team,
        }

        this.projectiles.push(projectile)
        this.particleSystem.createBurst({ x: spawnX, y: spawnY }, 2, {
          color: teamColor,
          size: 2,
          speed: 70,
          life: 0.12,
          spread: Math.PI / 2,
        })
        this.particlePool.emitMuzzleFlash({ x: spawnX, y: spawnY }, firingAngle)
      }
    }

    if (this.player.barrelRecoils) {
      for (let i = 0; i < this.player.barrelRecoils.length; i++) {
        this.player.barrelRecoils[i] = 6
      }
    }

    const recoilForce = 2 + streams * 0.4 + spinStrength
    this.player.velocity.x -= Math.cos(baseAngle) * recoilForce
    this.player.velocity.y -= Math.sin(baseAngle) * recoilForce

    if (isMaelstrom) {
      this.spawnMaelstromWake()
    }

    audioManager.play('shoot')
  }

  private deployPlayerPylon(): boolean {
    // Validate mouse position
    if (!isFinite(this.mousePosition.x) || !isFinite(this.mousePosition.y)) {
      console.log('Invalid mouse position:', this.mousePosition)
      return false
    }
    
    if (!this.deployPylon(this.player, { x: this.mousePosition.x, y: this.mousePosition.y }, true)) {
      return false
    }

    if (this.player.barrelRecoils) {
      for (let i = 0; i < this.player.barrelRecoils.length; i++) {
        this.player.barrelRecoils[i] = 4
      }
    }
    audioManager.play('shoot')
    return true
  }

  private deployBotPylon(bot: BotPlayer, target: Vector2): boolean {
    return this.deployPylon(bot, target, false)
  }

  private deployPylon(owner: Player | BotPlayer, target: Vector2, isPlayer: boolean): boolean {
    const tankConfig = TANK_CONFIGS[owner.tankClass]
    
    if (!tankConfig?.trapConfig) {
      return false
    }

    const pylonConfig = this.getPylonPlacementConfig(tankConfig.trapConfig)
    
    if (!pylonConfig) {
      return false
    }

    const placementRange = this.getPylonPlacementRange(owner)
    const placement = this.computePylonPlacement(owner.position, target, placementRange)
    
    const pylon = this.pylonSystem.placePylon(
      owner.id,
      owner.team,
      placement,
      pylonConfig,
      this.gameTime
    )

    if (!pylon) return false

    const glowColor = owner.team === 'blue' ? '#7be0ff' : '#ff9d7b'
    this.particlePool.emitEnergySwirl(placement, glowColor)
    this.particleSystem.createBurst(placement, 4, {
      color: glowColor,
      size: 3,
      speed: 60,
      life: 0.25,
    })

    if (isPlayer) {
      this.screenEffects.startShake(1.5, 0.1)
    }

    return true
  }

  private getPylonPlacementRange(owner: Player | BotPlayer): number {
    const baseRange = 280
    const scaledRange = baseRange + owner.lootRange * 2.2
    const synergyBonus = owner.synergy?.modifiers?.pylonRangeBonus ?? 0
    return Math.min(900, scaledRange + synergyBonus)
  }

  private getPylonPlacementConfig(trapConfig: TrapConfig): PylonPlacementConfig | null {
    if (!trapConfig) return null
    const radius = trapConfig.size ?? 0
    const { health, duration } = trapConfig
    if (radius <= 0 || !health || !duration) {
      return null
    }
    return {
      radius,
      health,
      duration,
    }
  }

  private computePylonPlacement(origin: Vector2, target: Vector2, range: number): Vector2 {
    // Validate input coordinates
    if (!isFinite(origin.x) || !isFinite(origin.y) || !isFinite(target.x) || !isFinite(target.y)) {
      return { x: origin.x || 0, y: origin.y || 0 }
    }
    
    const dx = target.x - origin.x
    const dy = target.y - origin.y
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const clampedDistance = Math.min(range, distance)
    const normalizedX = dx / distance
    const normalizedY = dy / distance
    const position = {
      x: origin.x + normalizedX * clampedDistance,
      y: origin.y + normalizedY * clampedDistance,
    }

    const bounds = this.zoneSystem.getWorldBounds()
    
    const clampedX = Math.max(bounds.minX + 30, Math.min(bounds.maxX - 30, position.x))
    const clampedY = Math.max(bounds.minY + 30, Math.min(bounds.maxY - 30, position.y))
    
    position.x = clampedX
    position.y = clampedY
    return position
  }

  private applySplashDamage(projectile: Projectile, origin: Vector2) {
    if (!projectile.splashRadius) return
    const radiusSq = projectile.splashRadius * projectile.splashRadius
    const slowAmount = projectile.slowAmount ?? 0
    this.particlePool.emitSparkBurst(origin, 8)

    if (projectile.isPlayerProjectile) {
      for (const bot of this.botAISystem.getBots()) {
        if (bot.health <= 0 || this.teamSystem.areAllies(bot.team, this.player.team)) continue
        const dx = bot.position.x - origin.x
        const dy = bot.position.y - origin.y
        if (dx * dx + dy * dy <= radiusSq) {
          const damage = projectile.splashDamage ?? projectile.damage * 0.6
          this.botAISystem.damageBot(bot.id, damage)
          if (slowAmount > 0) {
            bot.velocity.x *= 1 - slowAmount
            bot.velocity.y *= 1 - slowAmount
          }
        }
      }
    } else {
      const dx = this.player.position.x - origin.x
      const dy = this.player.position.y - origin.y
      if (dx * dx + dy * dy <= radiusSq) {
        this.applyDamageToPlayer(projectile.splashDamage ?? projectile.damage * 0.5)
        if (slowAmount > 0) {
          this.player.velocity.x *= 1 - slowAmount
          this.player.velocity.y *= 1 - slowAmount
        }
      }
    }

    for (const item of this.loot) {
      if (!item.health || item.health <= 0) continue
      const dx = item.position.x - origin.x
      const dy = item.position.y - origin.y
      if (dx * dx + dy * dy <= radiusSq) {
        item.health -= (projectile.splashDamage ?? projectile.damage * 0.4) * 0.5
      }
    }
  }

  // NEW: Apply team control point buffs to player
  private applyTeamBuffs() {
    const buffs = this.zoneSystem.getTeamBuffs(this.player.team)
    // Buffs are now applied - they can be used elsewhere when calculating damage/speed/xp
    // Store them on a property for easy access
    ;(this.player as any).teamBuffs = buffs
  }

  // NEW: Check if player is in their forge for healing
  private checkForgeHealing(deltaTime: number) {
    const forgeCheck = this.zoneSystem.isInForge(this.player.position, this.player.team)
    
    if (forgeCheck.inForge && this.player.health < this.player.maxHealth) {
      // Heal player
      const previousHealth = this.player.health
      const healAmount = forgeCheck.regenRate * deltaTime
      this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount)
      
      // Subtle heal flash when crossing health thresholds (every 20% healed)
      const prevPercent = Math.floor(previousHealth / this.player.maxHealth * 5)
      const newPercent = Math.floor(this.player.health / this.player.maxHealth * 5)
      if (newPercent > prevPercent) {
        this.screenEffects.triggerFlash('heal', 0.4)
      }
      
      // Spawn healing particles occasionally
      if (Math.random() < 0.1) {
        this.particlePool.emitEnergySwirl(
          { x: this.player.position.x + (Math.random() - 0.5) * 30, y: this.player.position.y + (Math.random() - 0.5) * 30 },
          this.player.team === 'blue' ? '#00ffff' : '#ffaa00'
        )
      }
    }
  }

  // NEW: Check for supply drop pickups
  private checkSupplyDropPickup() {
    const drop = this.zoneSystem.getSupplyDropAt(this.player.position)
    
    if (drop) {
      const contents = this.zoneSystem.claimSupplyDrop(drop.id, this.player.team)
      
      if (contents) {
        // Apply supply drop rewards
        const didLevelUp = this.upgradeManager.addXP(contents.xpAmount)
        this.player.xp = this.upgradeManager.getTotalXP()
        
        if (contents.healthPack) {
          this.player.health = this.player.maxHealth
        }
        
        // NEW: Apply stat points if any
        if (contents.statPoints && contents.statPoints > 0) {
          this.upgradeManager.addStatPoints(contents.statPoints)
        }
        
        // NEW: Spawn loot items around the drop location
        if (contents.lootItems) {
          for (const lootSpec of contents.lootItems) {
            for (let i = 0; i < lootSpec.count; i++) {
              const angle = (i / lootSpec.count) * Math.PI * 2
              const distance = 80 + Math.random() * 120
              const x = drop.targetPosition.x + Math.cos(angle) * distance
              const y = drop.targetPosition.y + Math.sin(angle) * distance
              
              this.loot.push({
                id: `supply_loot_${Date.now()}_${i}`,
                position: { x, y },
                type: lootSpec.type,
                value: lootSpec.tier === 'legendary' ? 150 : lootSpec.tier === 'epic' ? 80 : 40,
                health: lootSpec.tier === 'legendary' ? 80 : lootSpec.tier === 'epic' ? 60 : 40,
                maxHealth: lootSpec.tier === 'legendary' ? 80 : lootSpec.tier === 'epic' ? 60 : 40,
                radius: lootSpec.type === 'treasure' ? 25 : 20,
                contactDamage: 0,
                rarity: lootSpec.tier
              })
            }
          }
        }
        
        // Create celebration particles
        this.particlePool.emitLevelUpBurst(this.player.position)
        
        // Play sound
        audioManager.play('itemCollect')
      }
    }
  }

  // Check for dynamic event effects on player
  private checkDynamicEventEffects(deltaTime: number) {
    const events = this.zoneSystem.activeEvents
    
    for (const event of events) {
      if (!event.isActive) continue
      
      const dx = this.player.position.x - event.position.x
      const dy = this.player.position.y - event.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (event.type === 'meteor_shower' && dist < event.radius) {
        // Random meteor hit chance while in zone
        if (Math.random() < 0.02) { // 2% chance per frame to get hit
          const meteorDamage = 15 + Math.random() * 10
          this.applyDamageToPlayer(meteorDamage)
          this.particlePool.emitSparkBurst(this.player.position, 5)
          // Heavy environmental damage shake
          this.screenEffects.startShake(8, 0.3)
          // Chromatic aberration for heavy impact
          this.screenEffects.triggerChromaticAberration(0.5)
          audioManager.play('playerDamage')
          
          if (this.player.health <= 0) {
            this.player.health = 0
          }
        }
      }
    }
  }

  // Get current team buffs for damage calculation
  getTeamDamageMultiplier(): number {
    const buffs = this.zoneSystem.getTeamBuffs(this.player.team)
    return buffs.damageMultiplier
  }

  // Get current team buffs for XP calculation
  getTeamXPMultiplier(): number {
    let multiplier = this.zoneSystem.getTeamBuffs(this.player.team).xpMultiplier
    
    // Blood moon doubles XP
    const bloodMoon = this.zoneSystem.activeEvents.find(e => e.type === 'blood_moon' && e.isActive)
    if (bloodMoon) {
      multiplier *= 2.0
    }
    
    return multiplier
  }

  // Get current team buffs for speed calculation
  getTeamSpeedMultiplier(): number {
    let multiplier = this.zoneSystem.getTeamBuffs(this.player.team).speedMultiplier
    
    // Energy surge gives speed boost if player is inside
    const energySurge = this.zoneSystem.activeEvents.find(e => e.type === 'energy_surge' && e.isActive)
    if (energySurge) {
      const dx = this.player.position.x - energySurge.position.x
      const dy = this.player.position.y - energySurge.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < energySurge.radius) {
        multiplier *= (1 + energySurge.intensity) // +15% from intensity
      }
    }
    
    return multiplier
  }
  
  // Get event damage multiplier (blood moon + energy surge)
  getEventDamageMultiplier(): number {
    let multiplier = 1.0
    
    // Blood moon +30% damage
    const bloodMoon = this.zoneSystem.activeEvents.find(e => e.type === 'blood_moon' && e.isActive)
    if (bloodMoon) {
      multiplier *= 1.3
    }
    
    // Energy surge gives damage boost if player is inside
    const energySurge = this.zoneSystem.activeEvents.find(e => e.type === 'energy_surge' && e.isActive)
    if (energySurge) {
      const dx = this.player.position.x - energySurge.position.x
      const dy = this.player.position.y - energySurge.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < energySurge.radius) {
        multiplier *= (1 + energySurge.intensity) // +15% from intensity
      }
    }
    
    return multiplier
  }

  private updateDroneWeaponry() {
    const drones = this.droneSystem.getPlayerDrones(this.player.id)
    if (!drones.length) {
      if (this.droneWeaponCooldowns.size) {
        this.droneWeaponCooldowns.clear()
      }
      return
    }
    
    const activeIds = new Set<string>()
    
    if (this.player.tankClass !== 'factory') {
      for (const drone of drones) {
        activeIds.add(drone.id)
      }
      for (const id of Array.from(this.droneWeaponCooldowns.keys())) {
        if (!activeIds.has(id)) {
          this.droneWeaponCooldowns.delete(id)
        }
      }
      return
    }
    
    const now = this.gameTime
    const fireInterval = this.getMinionFireInterval()
    for (const drone of drones) {
      activeIds.add(drone.id)
      if (drone.droneStyle !== 'factory') continue
      if (drone.state !== 'attacking' && drone.state !== 'controlled') continue
      
      const targetPos = this.resolveDroneTarget(drone)
      if (!targetPos) continue
      
      const dx = targetPos.x - drone.position.x
      const dy = targetPos.y - drone.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 600 || dist < 35) continue
      
      const lastShot = this.droneWeaponCooldowns.get(drone.id) || 0
      if (now - lastShot < fireInterval) continue
      
      this.droneWeaponCooldowns.set(drone.id, now)
      this.fireFactoryDrone(drone, targetPos)
    }
    
    for (const id of Array.from(this.droneWeaponCooldowns.keys())) {
      if (!activeIds.has(id)) {
        this.droneWeaponCooldowns.delete(id)
      }
    }
  }
  
  private getMinionFireInterval(): number {
    const normalizedReload = Math.max(0.4, Math.min(1.4, this.player.fireRate / 500))
    return 450 * normalizedReload
  }
  
  private resolveDroneTarget(drone: Drone): Vector2 | null {
    if (drone.targetPosition) {
      return { ...drone.targetPosition }
    }
    
    if (drone.target && drone.target.position) {
      return { ...drone.target.position }
    }
    
    return null
  }
  
  private fireFactoryDrone(drone: Drone, targetPos: Vector2) {
    const angle = Math.atan2(targetPos.y - drone.position.y, targetPos.x - drone.position.x)
    const muzzleDistance = drone.radius + 10
    const spawnPos = {
      x: drone.position.x + Math.cos(angle) * muzzleDistance,
      y: drone.position.y + Math.sin(angle) * muzzleDistance
    }
    
    const projectileSpeed = Math.max(280, this.player.bulletSpeed * 0.85)
    const damageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    const projectile: Projectile = {
      id: `minion_proj_${Date.now()}_${Math.random()}`,
      position: spawnPos,
      velocity: {
        x: Math.cos(angle) * projectileSpeed,
        y: Math.sin(angle) * projectileSpeed
      },
      damage: drone.damage * 0.75 * damageMultiplier,
      radius: 4,
      isPlayerProjectile: true,
      ownerId: this.player.id,
      team: this.player.team,
      maxTravelDistance: 650,
      distanceTraveled: 0
    }
    
    this.projectiles.push(projectile)
    drone.aimAngle = angle
    
    this.particlePool.emitMuzzleFlash(spawnPos, angle)
    this.particlePool.emitSmoke(spawnPos, angle)
  }

  private fireSprayerBurst(angle: number, tankConfig: TankConfig) {
    const primaryBarrel = tankConfig.barrels?.[0]
    if (!primaryBarrel) return
    
    const barrelAngle = angle + (primaryBarrel.angle * Math.PI / 180)
    const barrelTipDistance = this.player.radius + (primaryBarrel.length || 35)
    const barrelTip = {
      x: this.player.position.x + Math.cos(barrelAngle) * barrelTipDistance,
      y: this.player.position.y + Math.sin(barrelAngle) * barrelTipDistance
    }
    
    this.barrelRecoil = 4
    if (this.player.barrelRecoils && this.player.barrelRecoils.length > 0) {
      this.player.barrelRecoils[0] = 6
    }
    
    this.muzzleFlashes.push({
      position: { ...barrelTip },
      angle: barrelAngle,
      life: 0.06,
      maxLife: 0.06,
      alpha: 1,
      size: 10,
    })
    
    this.particleSystem.createBurst(barrelTip, 4, {
      color: '#ffd966',
      size: 2,
      speed: 70,
      life: 0.08,
      spread: Math.PI / 2,
      type: 'muzzle-flash'
    })
    this.particlePool.emitMuzzleFlash(barrelTip, barrelAngle)
    
    const pelletCount = 8
    const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()
    
    for (let i = 0; i < pelletCount; i++) {
      const spray = (Math.random() - 0.5) * 0.9
      const pelletAngle = barrelAngle + spray
      const pelletSpeed = this.player.bulletSpeed * (0.6 + Math.random() * 0.4)
      const pelletDamage = this.player.damage * totalDamageMultiplier * (0.12 + Math.random() * 0.1)
      
      const projectile: Projectile = {
        id: `spray_${Date.now()}_${i}`,
        position: { ...barrelTip },
        velocity: {
          x: Math.cos(pelletAngle) * pelletSpeed,
          y: Math.sin(pelletAngle) * pelletSpeed
        },
        damage: pelletDamage,
        radius: 3.5,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
        maxTravelDistance: 450,
        distanceTraveled: 0,
        trailColor: '#ffaa55'
      }
      
      this.projectiles.push(projectile)
    }
    
    this.screenEffects.startShake(2, 0.08)
    audioManager.play('shoot')
  }
  
  private spawnStreamlinerSegments(baseProjectile: Projectile) {
    const speed = Math.hypot(baseProjectile.velocity.x, baseProjectile.velocity.y)
    if (speed < 0.01) {
      this.projectiles.push(baseProjectile)
      return
    }
    
    const dirX = baseProjectile.velocity.x / speed
    const dirY = baseProjectile.velocity.y / speed
    const segments = 4
    const spacing = 18
    const baseMaxDistance = baseProjectile.maxTravelDistance ?? 900
    
    for (let i = 0; i < segments; i++) {
      const offset = i * spacing
      const segment: Projectile = {
        ...baseProjectile,
        id: `${baseProjectile.id}_seg_${i}`,
        position: {
          x: baseProjectile.position.x - dirX * offset,
          y: baseProjectile.position.y - dirY * offset
        },
        velocity: { ...baseProjectile.velocity },
        radius: Math.max(3, baseProjectile.radius - i),
        distanceTraveled: offset,
        maxTravelDistance: baseMaxDistance + offset,
        specialTag: 'streamliner',
        trailColor: '#a8f7ff',
        meta: { ...(baseProjectile.meta || {}), streamlinerIndex: i }
      }
      
      this.projectiles.push(segment)
    }
  }
  
  private spawnSpikeImpactEffects(position: Vector2) {
    this.particlePool.emitSparkBurst(position, 6)
    this.particleSystem.createBurst(position, 5, {
      color: '#ffbb88',
      size: 4,
      speed: 90,
      life: 0.18,
      type: 'spark'
    })
    this.screenEffects.startShake(2, 0.1)
  }
  
  private getScopedAimDirection(scopeState: { lastDirection: Vector2 }): Vector2 {
    let dirX = 0
    let dirY = 0
    
    if (this.mobileShootDirection.x !== 0 || this.mobileShootDirection.y !== 0) {
      dirX = this.mobileShootDirection.x
      dirY = this.mobileShootDirection.y
    } else {
      dirX = this.mousePosition.x - this.player.position.x
      dirY = this.mousePosition.y - this.player.position.y
    }
    
    const magnitude = Math.hypot(dirX, dirY)
    if (magnitude < 0.001) {
      return scopeState.lastDirection
    }
    
    const normalized = { x: dirX / magnitude, y: dirY / magnitude }
    scopeState.lastDirection = normalized
    return normalized
  }

  private applyPlayerKnockback(angle: number, strength: number) {
    this.player.velocity.x -= Math.cos(angle) * strength
    this.player.velocity.y -= Math.sin(angle) * strength
  }

  private setPredatorScope(active: boolean) {
    if (!this.abilityState.predatorScope) return
    this.abilityState.predatorScope.active = active
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
                this.droneSystem.convertShapeToDrone(loot, this.player, 'necromancer')
              } else if (this.player.tankClass === 'gravemindregent') {
                const conversionChance = this.getSynergyValue('gravemindHuskChance', 0)
                if (Math.random() <= conversionChance) {
                  this.droneSystem.convertShapeToDrone(loot, this.player, 'gravemind')
                }
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
          const xpGained = bot.level * 10
          this.player.kills++
          this.handleCatalystComboGain()
          
          // Particle effects
          const botColor = this.teamSystem.getTeamColor(bot.team)
          this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
          // Contextual kill feedback
          this.screenEffects.startShake(2 + Math.min(3, bot.level * 0.3), 0.15)
          this.screenEffects.triggerFlash('kill', 0.5 + Math.min(0.5, bot.level * 0.05))
          audioManager.play('polygonDeath')
          
          // Check for level up using UpgradeManager (single source of truth for XP)
          const didLevelUp = this.upgradeManager.addXP(xpGained)
          
          // Sync player.xp from UpgradeManager for display
          this.player.xp = this.upgradeManager.getTotalXP()
          
          if (didLevelUp) {
            this.player.level = this.upgradeManager.getLevel()
            this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
            
            // Add invincibility during level up
            this.invincibilityFrames = 2.0
            
            // Enhanced level up effect
            this.particleSystem.createLevelUpEffect(this.player.position)
            // Screen shake removed for mobile performance
            this.screenEffects.triggerFlash('levelUp', 1)
            audioManager.play('levelUp')
            
            if (this.onLevelUp) {
              this.onLevelUp()
            }
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

    const rotationBoost = this.player.synergy.rotationResponsiveness ?? 1
    const responsiveMovement = rotationBoost > 1.01

    if (dx !== 0 || dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy)
      const targetVX = (dx / magnitude) * this.player.speed
      const targetVY = (dy / magnitude) * this.player.speed

      if (responsiveMovement) {
        const lerpFactor = Math.min(1, deltaTime * rotationBoost * 8)
        this.player.velocity.x = this.lerp(this.player.velocity.x, targetVX, lerpFactor)
        this.player.velocity.y = this.lerp(this.player.velocity.y, targetVY, lerpFactor)
      } else {
        this.player.velocity.x = targetVX
        this.player.velocity.y = targetVY
      }
    } else {
      if (responsiveMovement) {
        const lerpFactor = Math.min(1, deltaTime * rotationBoost * 6)
        this.player.velocity.x = this.lerp(this.player.velocity.x, 0, lerpFactor)
        this.player.velocity.y = this.lerp(this.player.velocity.y, 0, lerpFactor)
      } else {
        this.player.velocity.x = 0
        this.player.velocity.y = 0
      }
    }

    this.player.position.x += this.player.velocity.x * deltaTime
    this.player.position.y += this.player.velocity.y * deltaTime

    this.player.position.x = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.x))
    this.player.position.y = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.y))
    this.emitIonTrail(deltaTime)

    // Shooting (manual or auto-fire)
    // Disable shooting for pure drone classes that auto-attack
    const tankConfig = TANK_CONFIGS[this.player.tankClass]
    const isAutoAttackDroneClass = tankConfig?.isDroneClass && 
      ['overseer', 'overlord', 'manager', 'factory', 'battleship'].includes(this.player.tankClass)
    
      if (!isAutoAttackDroneClass) {
        const shouldShoot = this.isShooting || this.autoFire
        if (this.isSiegeClass(this.player.tankClass)) {
          this.handleSiegebreakerFire(deltaTime, shouldShoot)
        } else if (shouldShoot && this.gameTime - this.player.lastShotTime > this.player.fireRate) {
          this.shootProjectile()
          this.player.lastShotTime = this.gameTime
        }
      }
  }

  shootProjectile() {
    // Get tank configuration
    const tankConfig = TANK_CONFIGS[this.player.tankClass] || TANK_CONFIGS.basic
    
    // Tanks with no barrels (auto turret tanks like auto3, auto5) don't shoot manually
    if (!tankConfig.barrels || tankConfig.barrels.length === 0) {
      return
    }
    
    // Drone classes don't shoot regular bullets (except Manager and Hybrid variants)
    // They control drones instead, which is handled by mouse down/up events
    const isDronePureClass = tankConfig.isDroneClass && 
      !['manager', 'hybrid', 'overtrapper', 'gunnertrapper'].includes(this.player.tankClass)
    
    if (isDronePureClass) {
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

    if (this.isSiegeClass(this.player.tankClass)) {
      this.fireSiegebreakerProjectile(angle)
      this.abilityState.pendingSiegeCharge = 0
      return
    }

    if (this.isTempestLine(this.player.tankClass)) {
      this.fireTempestVortex(angle)
      return
    }

    if (this.player.tankClass === 'starfallarsenal') {
      this.queueStarfallSalvo(angle)
      return
    }

    if (this.isPylonSummoner(this.player.tankClass)) {
      this.deployPlayerPylon()
      return
    }

    if (this.player.tankClass === 'sprayer') {
      this.fireSprayerBurst(angle, tankConfig)
      return
    }

    const barrels = tankConfig.barrels
    const isTwinLine = TWIN_LINE_CLASSES.has(this.player.tankClass)
    const isSniperLine = SNIPER_RANGE_CLASSES.has(this.player.tankClass)
    const isStreamliner = this.player.tankClass === 'streamliner'
    const barrelSyncBonus = this.player.synergy.barrelSyncBonus ?? 0
    
    // Check if this is a trapper tank
    if (tankConfig.isTrapper && tankConfig.trapConfig) {
      const activeTrapConfig = this.getTrapConfigForPlayer(tankConfig.trapConfig)
      // Spawn traps instead of bullets
      for (const barrel of barrels) {
        // Only spawn traps from trapezoid barrels (trap launchers)
        if (!barrel.isTrapezoid) continue
        
        const barrelAngle = angle + (barrel.angle * Math.PI / 180)
        const barrelTipDistance = this.player.radius + (barrel.length || 35)
        const barrelTipX = this.player.position.x + Math.cos(barrelAngle) * barrelTipDistance
        const barrelTipY = this.player.position.y + Math.sin(barrelAngle) * barrelTipDistance
        
        this.trapSystem.spawnTrap(
          this.player.id,
          this.player.team,
          { x: barrelTipX, y: barrelTipY },
          barrelAngle,
          activeTrapConfig,
          { damage: this.player.damage }
        )
        
        // Visual feedback for trap launch
        this.muzzleFlashes.push({
          position: { x: barrelTipX, y: barrelTipY },
          angle: barrelAngle,
          life: 0.08,
          maxLife: 0.08,
          alpha: 1,
          size: 10, // Slightly larger for trap launchers
        })
        
        // Trap spawn effects
        this.particlePool.emitMuzzleFlash({ x: barrelTipX, y: barrelTipY }, barrelAngle)
        this.particlePool.emitSmoke({ x: barrelTipX, y: barrelTipY }, barrelAngle)
        this.particleSystem.createBurst({ x: barrelTipX, y: barrelTipY }, 3, {
          color: this.teamSystem.getTeamColor(this.player.team),
          size: 4,
          speed: 80,
          life: 0.15,
          spread: Math.PI / 3,
        })
      }
      
      // For hybrid tanks like overtrapper and gunnertrapper, continue to shoot from non-trap barrels
      if (!['overtrapper', 'gunnertrapper'].includes(this.player.tankClass)) {
        audioManager.play('shoot')
        return
      }
    }

    // For multi-barrel tanks, implement firing pattern
    let barrelsToFire: number[] = []
    
    if (barrels.length === 1) {
      // Single barrel - always fire
      barrelsToFire = [0]
    } else if (barrels.length === 2) {
      const dualFire = isTwinLine && (barrelSyncBonus >= 0.9 || Math.random() < barrelSyncBonus * 0.5)
      if (dualFire) {
        barrelsToFire = [0, 1]
      } else {
        barrelsToFire = [this.currentBarrelIndex % 2]
      }
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
      let spread = barrels.length > 1 ? (Math.random() - 0.5) * 0.05 : 0
      if (isTwinLine && barrelSyncBonus > 0) {
        const reduction = Math.min(0.75, barrelSyncBonus * 0.6)
        spread *= 1 - reduction
      }
      const finalAngle = barrelAngle + spread
      
      // Apply event and team damage multipliers
      const totalDamageMultiplier = this.getTeamDamageMultiplier() * this.getEventDamageMultiplier()

      const projectile: Projectile = {
        id: `proj_${Date.now()}_${Math.random()}_${barrelIdx}`,
        position: { x: barrelTipX, y: barrelTipY },
        velocity: {
          x: Math.cos(finalAngle) * this.player.bulletSpeed,
          y: Math.sin(finalAngle) * this.player.bulletSpeed,
        },
        damage: this.player.damage * totalDamageMultiplier,
        radius: 5,
        isPlayerProjectile: true,
        ownerId: this.player.id,
        team: this.player.team,
      }

      if (isSniperLine) {
        const baseRange = 1400
        projectile.maxTravelDistance = baseRange * (this.player.synergy.rangeMultiplier ?? 1)
        projectile.distanceTraveled = 0
      }

      if (this.player.tankClass === 'phasesentinel') {
        this.applyPhaseShotProperties(projectile)
      }

      if (this.player.tankClass === 'fusionhydra' && barrel.angle === 0) {
        projectile.damage *= this.getSynergyValue('fusionLanceBonus', 1)
      }

      if (this.player.tankClass === 'armadacolossus') {
        projectile.damage *= this.getSynergyValue('armadaCannonBonus', 1)
      }

      if (this.player.tankClass === 'ionvanguard') {
        projectile.meta = { ...(projectile.meta || {}), ionLance: true }
      }

      // SKIMMER: Projectiles spawn mini-bullets while flying
      if (this.player.tankClass === 'skimmer') {
        projectile.specialTag = 'skimmer'
        projectile.skimmerTimer = 0
        projectile.skimmerSpawnInterval = 0.15 // Spawn mini-bullets every 0.15s
        projectile.radius = 12 // Larger destroyer-style projectile
        projectile.damage *= 1.8 // Higher damage for main projectile
        projectile.isHeavyProjectile = true
        projectile.trailColor = '#666666'
        projectile.maxTravelDistance = 800
        projectile.distanceTraveled = 0
        // Enhanced recoil for Skimmer
        this.barrelRecoil = 10
        this.screenEffects.startShake(4, 0.15)
      }
      
      // ROCKETEER: Homing missiles that track enemies
      if (this.player.tankClass === 'rocketeer') {
        projectile.specialTag = 'rocketeer'
        projectile.homingStrength = 4 // How aggressively it turns
        projectile.radius = 10 // Larger projectile
        projectile.damage *= 1.5 // Good damage
        projectile.isHeavyProjectile = true
        projectile.trailColor = '#FF6600'
        projectile.maxTravelDistance = 1200
        projectile.distanceTraveled = 0
        // Slower initial speed but homes in
        projectile.velocity.x *= 0.7
        projectile.velocity.y *= 0.7
        // Enhanced recoil
        this.barrelRecoil = 8
        this.screenEffects.startShake(3, 0.12)
      }
      
      // DESTROYER-LINE: Enhanced heavy projectiles (destroyer, annihilator, hybrid)
      const isDestroyerLine = ['destroyer', 'annihilator', 'hybrid'].includes(this.player.tankClass)
      if (isDestroyerLine) {
        projectile.isHeavyProjectile = true
        projectile.trailColor = '#555555'
        // Scale radius based on barrel width
        const baseRadius = this.player.tankClass === 'annihilator' ? 14 : 10
        projectile.radius = baseRadius
        // Destroyer line has massive damage
        const damageBoost = this.player.tankClass === 'annihilator' ? 2.5 : 1.8
        projectile.damage *= damageBoost
        // Heavy recoil
        this.barrelRecoil = this.player.tankClass === 'annihilator' ? 15 : 10
        this.screenEffects.startShake(this.player.tankClass === 'annihilator' ? 6 : 4, 0.2)
        if (barrelIdx === 0) {
          const knockbackStrength = this.player.tankClass === 'annihilator' ? 28 : 16
          this.applyPlayerKnockback(finalAngle, knockbackStrength)
          if (this.player.tankClass === 'annihilator') {
            this.screenEffects.startFlash('rgba(255, 215, 180, 0.25)', 0.12)
          }
        }
      }

      if (isStreamliner) {
        this.spawnStreamlinerSegments(projectile)
      } else {
        this.projectiles.push(projectile)
      }
    }

    if (this.player.tankClass === 'fusionhydra') {
      this.spawnFusionRockets(angle)
    }

    // Apply recoil force to player (stronger for more barrels)
    const recoilForce = 5 * (1 + barrelsToFire.length * 0.2)
    const recoilDir = { x: Math.cos(angle), y: Math.sin(angle) }
    this.player.velocity.x -= recoilDir.x * recoilForce
    this.player.velocity.y -= recoilDir.y * recoilForce
    
    // Play shoot sound
    audioManager.play('shoot')
  }

  private getTrapConfigForPlayer(baseConfig: TrapConfig): TrapConfig {
    if (this.player.tankClass !== 'citadelshaper') return baseConfig
    const reinforcement = this.getSynergyValue('citadelTrapReinforce', 1)
    const weaveSpeed = this.getSynergyValue('citadelWeaveSpeed', 1)
    return {
      ...baseConfig,
      health: Math.floor(baseConfig.health * reinforcement),
      duration: Math.floor(baseConfig.duration * Math.min(1.5, 0.85 + reinforcement * 0.35)),
      initialSpeed: (baseConfig.initialSpeed ?? 300) * weaveSpeed,
    }
  }



  updateProjectiles(deltaTime: number) {
    const newProjectiles: Projectile[] = []
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      
      // Handle Rocketeer homing missiles
      if (projectile.specialTag === 'rocketeer' && projectile.homingStrength) {
        this.updateRocketeerHoming(projectile, deltaTime)
      }
      
      const stepX = projectile.velocity.x * deltaTime
      const stepY = projectile.velocity.y * deltaTime
      projectile.position.x += stepX
      projectile.position.y += stepY

      if (projectile.maxTravelDistance !== undefined) {
        const travel = Math.sqrt(stepX * stepX + stepY * stepY)
        projectile.distanceTraveled = (projectile.distanceTraveled || 0) + travel
        if (projectile.distanceTraveled >= projectile.maxTravelDistance) {
          this.handleProjectileAftermath(projectile, { ...projectile.position })
          this.projectiles.splice(i, 1)
          continue
        }
      }
      
      // Handle Skimmer projectiles spawning mini-bullets
      if (projectile.specialTag === 'skimmer' && projectile.skimmerSpawnInterval) {
        projectile.skimmerTimer = (projectile.skimmerTimer || 0) + deltaTime
        if (projectile.skimmerTimer >= projectile.skimmerSpawnInterval) {
          projectile.skimmerTimer = 0
          const miniBullets = this.spawnSkimmerMiniBullets(projectile)
          newProjectiles.push(...miniBullets)
        }
      }
      
      // Create bullet trail particles - enhanced for heavy projectiles
      if (projectile.isHeavyProjectile) {
        // Heavy projectiles always leave smoke trails
        if (Math.random() < 0.6) {
          const trailColor = projectile.trailColor || '#888888'
          this.particlePool.emitSmoke(projectile.position, Math.atan2(projectile.velocity.y, projectile.velocity.x) + Math.PI)
          this.particleSystem.createBulletTrail(projectile.position, projectile.velocity, trailColor)
        }
      } else if (Math.random() < 0.3) {
        this.particleSystem.createBulletTrail(
          projectile.position,
          projectile.velocity,
          projectile.isPlayerProjectile ? '#00B2E1' : '#FF0000'
        )
      }
    }
    
    // Add newly spawned projectiles (from Skimmer)
    if (newProjectiles.length > 0) {
      this.projectiles.push(...newProjectiles)
    }
  }
  
  // Rocketeer homing logic - seeks nearest enemy
  private updateRocketeerHoming(projectile: Projectile, deltaTime: number) {
    const homingStrength = projectile.homingStrength || 3
    let target: Vector2 | null = null
    let nearestDistSq = 600 * 600 // Max homing range
    
    // Find nearest enemy based on projectile ownership
    if (projectile.isPlayerProjectile) {
      // Home towards enemy bots
      for (const bot of this.botAISystem.getBots()) {
        if (bot.health <= 0) continue
        if (projectile.team && this.teamSystem.areAllies(projectile.team, bot.team)) continue
        
        const dx = bot.position.x - projectile.position.x
        const dy = bot.position.y - projectile.position.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq
          target = bot.position
        }
      }
      
      // Also check loot boxes as potential targets
      for (const item of this.loot) {
        if (item.type !== 'box' && item.type !== 'treasure' && item.type !== 'boss') continue
        if (!item.health || item.health <= 0) continue
        
        const dx = item.position.x - projectile.position.x
        const dy = item.position.y - projectile.position.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq
          target = item.position
        }
      }
    } else {
      // Enemy projectile homes towards player
      if (!this.teamSystem.areAllies(projectile.team || 'neutral', this.player.team)) {
        const dx = this.player.position.x - projectile.position.x
        const dy = this.player.position.y - projectile.position.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < nearestDistSq) {
          target = this.player.position
        }
      }
    }
    
    if (target) {
      // Calculate desired direction
      const dx = target.x - projectile.position.x
      const dy = target.y - projectile.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > 10) {
        const desiredDirX = dx / dist
        const desiredDirY = dy / dist
        
        // Current direction
        const speed = Math.sqrt(projectile.velocity.x * projectile.velocity.x + projectile.velocity.y * projectile.velocity.y)
        const currentDirX = projectile.velocity.x / speed
        const currentDirY = projectile.velocity.y / speed
        
        // Interpolate towards desired direction
        const turnRate = homingStrength * deltaTime
        const newDirX = currentDirX + (desiredDirX - currentDirX) * turnRate
        const newDirY = currentDirY + (desiredDirY - currentDirY) * turnRate
        
        // Normalize and apply speed
        const newDist = Math.sqrt(newDirX * newDirX + newDirY * newDirY)
        projectile.velocity.x = (newDirX / newDist) * speed
        projectile.velocity.y = (newDirY / newDist) * speed
      }
    }
  }
  
  // Skimmer mini-bullet spawning
  private spawnSkimmerMiniBullets(parentProjectile: Projectile): Projectile[] {
    const bullets: Projectile[] = []
    const angle = Math.atan2(parentProjectile.velocity.y, parentProjectile.velocity.x)
    const speed = Math.sqrt(parentProjectile.velocity.x * parentProjectile.velocity.x + parentProjectile.velocity.y * parentProjectile.velocity.y)
    
    // Spawn 2 mini-bullets at slight angles
    const spreadAngles = [-0.4, 0.4]
    
    for (const spread of spreadAngles) {
      const bulletAngle = angle + spread
      const bulletSpeed = speed * 0.7 // Slower than parent
      
      const bullet: Projectile = {
        id: `skimmer_mini_${Date.now()}_${Math.random()}`,
        position: { x: parentProjectile.position.x, y: parentProjectile.position.y },
        velocity: {
          x: Math.cos(bulletAngle) * bulletSpeed,
          y: Math.sin(bulletAngle) * bulletSpeed,
        },
        damage: parentProjectile.damage * 0.25, // Mini-bullets deal 25% damage
        radius: 4,
        isPlayerProjectile: parentProjectile.isPlayerProjectile,
        ownerId: parentProjectile.ownerId,
        team: parentProjectile.team,
        maxTravelDistance: 250,
        distanceTraveled: 0,
      }
      
      bullets.push(bullet)
    }
    
    // Visual effect for mini-bullet spawn
    this.particlePool.emitMuzzleFlash(parentProjectile.position, angle)
    
    return bullets
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
    const SPAWN_SAFE_ZONE = 200  // Slightly larger than Sanctuary POI radius (150) to give spawn protection

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
      
      const distToCenter = Math.sqrt(
        Math.pow(x - this.worldCenter.x, 2) + 
        Math.pow(y - this.worldCenter.y, 2)
      )
      if (distToCenter < SPAWN_SAFE_ZONE) {
        continue
      }
      
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
            if (projectile.splashRadius) {
              this.applySplashDamage(projectile, { ...projectile.position })
            }
            const persisted = this.consumePierceCharge(projectile)
            if (!persisted) {
              this.handleProjectileAftermath(projectile, { ...projectile.position })
              this.projectiles.splice(i, 1)
            }
            
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
                // Award XP to bot if projectile is from bot (not player auto turret)
                if (!projectile.isPlayerProjectile && projectile.ownerId && projectile.ownerId !== this.player.id) {
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
    const collisionBoost = this.player.synergy.collisionForceMultiplier ?? 1

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
          this.applyDamageToPlayer(actualDamage * 0.016)
          this.player.lastRegenTime = this.gameTime
          
          // Add invincibility frames for boss contact to prevent spam damage
          if (item.type === 'boss') {
            this.invincibilityFrames = 0.5 // Half second of immunity
            // Heavy boss contact - extra shake and chromatic aberration
            this.screenEffects.startShake(6, 0.3)
            this.screenEffects.triggerChromaticAberration(0.4)
            audioManager.play('playerDamage')
          }
          
          const knockbackForce = 15 * collisionBoost
          const dx2 = this.player.position.x - item.position.x
          const dy2 = this.player.position.y - item.position.y
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          if (dist > 0) {
            this.player.velocity.x += (dx2 / dist) * knockbackForce
            this.player.velocity.y += (dy2 / dist) * knockbackForce
          }
          
          const bodyDamage = this.applyVelocityCritDamage(this.player.bodyDamage * collisionBoost * 0.016)
          item.health -= bodyDamage
          
          if (this.player.tankClass === 'spike') {
            this.spawnSpikeImpactEffects(item.position)
          }
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
    
    // Check bot-loot (XP gem) collection
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const item = this.loot[i]
      
      // Only check XP gems for bot collection
      if (item.type !== 'xp') continue
      
      for (const bot of bots) {
        const dx = item.position.x - bot.position.x
        const dy = item.position.y - bot.position.y
        const distSq = dx * dx + dy * dy
        
        // Bots collect XP within their loot range
        const collectRangeSq = bot.lootRange * bot.lootRange
        
        if (distSq < collectRangeSq) {
          // Bot collects the XP gem
          this.botAISystem.awardXP(bot.id, item.value)
          this.loot.splice(i, 1)
          break
        }
      }
    }
    
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
            if (projectile.splashRadius) {
              this.applySplashDamage(projectile, { ...projectile.position })
            }
            const persisted = this.consumePierceCharge(projectile)
            if (!persisted) {
              this.handleProjectileAftermath(projectile, { ...projectile.position })
              this.projectiles.splice(i, 1)
            }
            
            // Particle effects
            const botColor = this.teamSystem.getTeamColor(bot.team)
            this.particlePool.emitSparkBurst(bot.position, 5)
            this.particleSystem.createDamageNumber(bot.position, projectile.damage)
            audioManager.play('hit')
            
            if (killed) {
              // Bot died - give XP
              const xpGained = bot.level * 10
              this.player.kills++
              this.handleCatalystComboGain()
              this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
              // Contextual kill feedback
              this.screenEffects.startShake(2 + Math.min(3, bot.level * 0.3), 0.15)
              this.screenEffects.triggerFlash('kill', 0.5 + Math.min(0.5, bot.level * 0.05))
              audioManager.play('polygonDeath')
              
              // Check for level up using UpgradeManager (single source of truth for XP)
              const didLevelUp = this.upgradeManager.addXP(xpGained)
              
              // Sync player.xp from UpgradeManager for display
              this.player.xp = this.upgradeManager.getTotalXP()
              
              if (didLevelUp) {
                this.player.level = this.upgradeManager.getLevel()
                this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
                
                // Add invincibility during level up
                this.invincibilityFrames = 2.0
                
                // Enhanced level up effect
                this.particleSystem.createLevelUpEffect(this.player.position)
                // Screen shake removed for mobile performance
                this.screenEffects.triggerFlash('levelUp', 1)
                audioManager.play('levelUp')
                
                if (this.onLevelUp) {
                  this.onLevelUp()
                }
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
          if (this.interceptProjectileWithDecoy(projectile)) {
            this.projectiles.splice(i, 1)
            continue
          }
          const dx = projectile.position.x - this.player.position.x
          const dy = projectile.position.y - this.player.position.y
          const distSq = dx * dx + dy * dy
          const radSum = projectile.radius + this.player.radius
          
          if (distSq < radSum * radSum && this.invincibilityFrames <= 0) {
            this.applyDamageToPlayer(projectile.damage)
            this.player.lastRegenTime = this.gameTime
            if (projectile.splashRadius) {
              this.applySplashDamage(projectile, { ...projectile.position })
            }
            this.handleProjectileAftermath(projectile, { ...projectile.position })
            this.projectiles.splice(i, 1)
            
            // Particle effects
            this.particlePool.emitSparkBurst(this.player.position, 3)
            // Shake scales with damage relative to max health
            const damageIntensity = Math.min(1, projectile.damage / this.player.maxHealth * 5)
            this.screenEffects.startShake(3 + damageIntensity * 4, 0.2 + damageIntensity * 0.1)
            // Heavy hits get chromatic aberration
            if (damageIntensity > 0.3) {
              this.screenEffects.triggerChromaticAberration(damageIntensity * 0.5)
            }
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
            if (projectile.splashRadius) {
              this.applySplashDamage(projectile, { ...projectile.position })
            }
            this.handleProjectileAftermath(projectile, { ...projectile.position })
            this.projectiles.splice(i, 1)
            
            // Particle effects
            this.particlePool.emitSparkBurst(bot.position, 3)
            audioManager.play('hit')
            
            if (killed && projectile.ownerId) {
              const xpGained = bot.level * 10
              // Check if the killer is the player (e.g., player's auto turret)
              if (projectile.ownerId === this.player.id) {
                this.player.kills++
                this.handleCatalystComboGain()
                const botColor = this.teamSystem.getTeamColor(bot.team)
                this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
                this.screenEffects.startShake(2 + Math.min(3, bot.level * 0.3), 0.15)
                this.screenEffects.triggerFlash('kill', 0.5 + Math.min(0.5, bot.level * 0.05))
                audioManager.play('polygonDeath')
                
                const didLevelUp = this.upgradeManager.addXP(xpGained)
                this.player.xp = this.upgradeManager.getTotalXP()
                
                if (didLevelUp) {
                  this.player.level = this.upgradeManager.getLevel()
                  this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
                  this.invincibilityFrames = 2.0
                  this.particleSystem.createLevelUpEffect(this.player.position)
                  // Screen shake removed for mobile performance
                  this.screenEffects.triggerFlash('levelUp', 1)
                  audioManager.play('levelUp')
                  if (this.onLevelUp) {
                    this.onLevelUp()
                  }
                }
              } else {
                // Award XP to the killer bot
                this.botAISystem.awardXP(projectile.ownerId, xpGained)
              }
            }
            break
          }
        }
      }
    }
    
    const collisionBoost = this.player.synergy.collisionForceMultiplier ?? 1
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
      const playerDamage = this.applyVelocityCritDamage(this.player.bodyDamage * collisionBoost)
        const botDamage = bot.bodyDamage
        
        this.applyDamageToPlayer(botDamage * 0.016)
        this.player.lastRegenTime = this.gameTime
        this.botAISystem.damageBot(bot.id, playerDamage * 0.016)
        
        if (this.player.tankClass === 'spike') {
          this.spawnSpikeImpactEffects(bot.position)
        }
        
        // Knockback
        const dist = Math.sqrt(distSq)
        if (dist > 0) {
          const knockbackForce = 15 * collisionBoost
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

  syncBotAutoTurrets() {
    const bots = this.botAISystem.getBots()
    const allTurrets = this.autoTurretSystem.getAllTurrets()
    
    // Check each bot
    for (const bot of bots) {
      const tankConfig = TANK_CONFIGS[bot.tankClass]
      const hasTurrets = allTurrets.has(bot.id)
      
      // Bot should have turrets but doesn't
      if (tankConfig?.autoTurrets && !hasTurrets) {
        this.autoTurretSystem.createTurretsForTank(bot.id, bot.tankClass, bot.position)
      }
      
      // Bot has turrets but shouldn't
      if (!tankConfig?.autoTurrets && hasTurrets) {
        this.autoTurretSystem.removeTurretsForOwner(bot.id)
      }
    }
    
    // Remove turrets for dead bots
    const botIds = new Set(bots.map(b => b.id))
    for (const ownerId of allTurrets.keys()) {
      if (ownerId !== this.player.id && !botIds.has(ownerId)) {
        this.autoTurretSystem.removeTurretsForOwner(ownerId)
      }
    }
  }

  spawnBotTraps() {
    const bots = this.botAISystem.getBots()
    
    for (const bot of bots) {
      const tankConfig = TANK_CONFIGS[bot.tankClass]
      if (!tankConfig || !tankConfig.isTrapper || !tankConfig.trapConfig) {
        continue
      }
      
      // The bot AI system sets bot.lastShotTime when it would normally fire
      // We check here again to ensure trap spawning follows the same timing
      const fireRate = bot.fireRate
      if (this.gameTime - bot.lastShotTime < fireRate) {
        continue
      }
      
      // Find target to aim at
      let targetPos: Vector2 | null = null
      
      // Aim at player if enemy
      if (!this.teamSystem.areAllies(bot.team, this.player.team)) {
        const dx = this.player.position.x - bot.position.x
        const dy = this.player.position.y - bot.position.y
        const distSq = dx * dx + dy * dy
        if (distSq < 400 * 400) {
          targetPos = this.player.position
        }
      }
      
      // Or aim at nearest enemy bot
      if (!targetPos) {
        const otherBots = bots.filter(b => 
          b.id !== bot.id && !this.teamSystem.areAllies(bot.team, b.team)
        )
        
        let nearestDist = 400 * 400
        for (const enemy of otherBots) {
          const dx = enemy.position.x - bot.position.x
          const dy = enemy.position.y - bot.position.y
          const distSq = dx * dx + dy * dy
          if (distSq < nearestDist) {
            nearestDist = distSq
            targetPos = enemy.position
          }
        }
      }

      // Spawn trap if we have a target
      if (this.isPylonSummoner(bot.tankClass)) {
        if (targetPos) {
          const placed = this.deployBotPylon(bot, { x: targetPos.x, y: targetPos.y })
          if (placed) {
            bot.lastShotTime = this.gameTime
          }
        }
        continue
      }

      if (targetPos) {
        const angle = Math.atan2(targetPos.y - bot.position.y, targetPos.x - bot.position.x)
        let spawned = false

        for (const barrel of tankConfig.barrels) {
          if (!barrel.isTrapezoid) continue

          const barrelAngle = angle + (barrel.angle * Math.PI / 180)
          const barrelTipDistance = bot.radius + (barrel.length || 35)
          const barrelTipX = bot.position.x + Math.cos(barrelAngle) * barrelTipDistance
          const barrelTipY = bot.position.y + Math.sin(barrelAngle) * barrelTipDistance
          
          this.trapSystem.spawnTrap(
            bot.id,
            bot.team,
            { x: barrelTipX, y: barrelTipY },
            barrelAngle,
            tankConfig.trapConfig,
            { damage: bot.damage }
          )
          spawned = true

          // Add visual effects for bot trap spawning
          this.particlePool.emitMuzzleFlash({ x: barrelTipX, y: barrelTipY }, barrelAngle)
        }

        if (spawned) {
          bot.lastShotTime = this.gameTime
        }
      }
    }
  }

  checkTrapCollisions() {
    const bots = this.botAISystem.getBots()
    const entities: Array<{ id: string; position: Vector2; team: Team; radius: number }> = []
    
    // Add player as potential target
    entities.push({
      id: this.player.id,
      position: this.player.position,
      team: this.player.team,
      radius: this.player.radius
    })
    
    // Add bots as potential targets
    for (const bot of bots) {
      entities.push({
        id: bot.id,
        position: bot.position,
        team: bot.team,
        radius: bot.radius
      })
    }
    
    // Check trap collisions with entities
    const trapCollisions = this.trapSystem.checkCollisions(entities)
    
    for (const collision of trapCollisions) {
      // Damage the entity that was hit
      if (collision.enemyId === this.player.id && this.invincibilityFrames <= 0) {
        this.applyDamageToPlayer(collision.damage)
        this.player.lastRegenTime = this.gameTime
        
        this.particlePool.emitSparkBurst(this.player.position, 3)
        // Trap damage shake - scales with damage
        const damageIntensity = Math.min(1, collision.damage / this.player.maxHealth * 4)
        this.screenEffects.startShake(3 + damageIntensity * 3, 0.2)
        if (damageIntensity > 0.25) {
          this.screenEffects.triggerChromaticAberration(damageIntensity * 0.4)
        }
        audioManager.play('playerDamage')
        
        if (this.player.health <= 0) {
          this.player.health = 0
        }
      } else {
        // Check if it's a bot
        const bot = bots.find(b => b.id === collision.enemyId)
        if (bot) {
          const killed = this.botAISystem.damageBot(bot.id, collision.damage)
          
          this.particlePool.emitSparkBurst(bot.position, 3)
          audioManager.play('hit')
          
          if (killed) {
            // Find trap owner to award XP
            const traps = this.trapSystem.getTraps()
            const trap = traps.find(t => t.id === collision.trapId)
            
            if (trap && trap.ownerId === this.player.id) {
              const xpGained = bot.level * 10
              this.player.kills++
              this.handleCatalystComboGain()
              
              const botColor = this.teamSystem.getTeamColor(bot.team)
              this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
              // Contextual kill feedback
              this.screenEffects.startShake(2 + Math.min(3, bot.level * 0.3), 0.15)
              this.screenEffects.triggerFlash('kill', 0.5 + Math.min(0.5, bot.level * 0.05))
              audioManager.play('polygonDeath')
              
              const didLevelUp = this.upgradeManager.addXP(xpGained)
              this.player.xp = this.upgradeManager.getTotalXP()
              
              if (didLevelUp) {
                this.player.level = this.upgradeManager.getLevel()
                this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
                this.invincibilityFrames = 2.0
                this.particleSystem.createLevelUpEffect(this.player.position)
                // Screen shake removed for mobile performance
                this.screenEffects.triggerFlash('levelUp', 1)
                audioManager.play('levelUp')
                
                if (this.onLevelUp) {
                  this.onLevelUp()
                }
              }
            }
          }
        }
      }
      
      // Damage the trap (traps take damage when they hit)
      this.trapSystem.damageTrap(collision.trapId, collision.damage * TRAP_SELF_DAMAGE_MULTIPLIER)
    }
    
    // Check projectile-trap collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      const traps = this.trapSystem.getTraps()
      
      for (const trap of traps) {
        // Skip friendly traps
        if (projectile.team && projectile.team === trap.team) {
          continue
        }
        
        const dx = projectile.position.x - trap.position.x
        const dy = projectile.position.y - trap.position.y
        const distSq = dx * dx + dy * dy
        const radSum = projectile.radius + trap.size
        
        if (distSq < radSum * radSum) {
          // Projectile hit trap - damage the trap
          const destroyed = this.trapSystem.damageTrap(trap.id, projectile.damage)
          if (projectile.splashRadius) {
            this.applySplashDamage(projectile, { ...projectile.position })
          }
          this.projectiles.splice(i, 1)
          
          this.particleSystem.createBurst(trap.position, 3, {
            color: this.teamSystem.getTeamColor(trap.team),
            size: 2,
            speed: 60,
            life: 0.2,
          })
          
          audioManager.play('hit')
          
          if (destroyed) {
            // Enhanced trap destruction effects
            const trapColor = this.teamSystem.getTeamColor(trap.team)
            this.particlePool.emitDebris(trap.position, { x: 0, y: 0 }, trapColor)
            this.particleSystem.createExplosion(trap.position, trap.size, trapColor)
            this.particleSystem.createDebris(trap.position, 6, trapColor)
            audioManager.play('polygonDeath')
          }
          break
        }
      }
    }
  }

  private handlePylonProjectileCollisions() {
    const pylons = this.pylonSystem.getPylons()
    if (!pylons.length) return

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]

      for (const pylon of pylons) {
        if (projectile.team && projectile.team === pylon.team) {
          continue
        }

        const dx = projectile.position.x - pylon.position.x
        const dy = projectile.position.y - pylon.position.y
        const radSum = projectile.radius + pylon.radius

        if (dx * dx + dy * dy <= radSum * radSum) {
          const destroyed = this.pylonSystem.damagePylon(pylon.id, projectile.damage)
          if (projectile.splashRadius) {
            this.applySplashDamage(projectile, { ...projectile.position })
          }
          this.projectiles.splice(i, 1)

          const color = this.teamSystem.getTeamColor(pylon.team)
          this.particleSystem.createBurst(pylon.position, 4, {
            color,
            size: 3,
            speed: 70,
            life: 0.2,
          })
          audioManager.play('hit')

          if (destroyed) {
            this.particlePool.emitDebris(pylon.position, { x: 0, y: 0 }, color)
            this.particleSystem.createExplosion(pylon.position, pylon.radius, color)
          }
          break
        }
      }
    }
  }

  private applyPylonBeamDamage(deltaTime: number) {
    const owners = this.pylonSystem.getOwners()
    if (!owners.length) return

    const beamState = this.abilityState.obelisk
    beamState.beamAccumulator = Math.min(beamState.beamAccumulator + deltaTime, OBELISK_BEAM_TICK * 3)
    if (beamState.beamAccumulator < OBELISK_BEAM_TICK) return

    const elapsed = beamState.beamAccumulator
    beamState.beamAccumulator = 0

    const bots = this.botAISystem.getBots()
    const botsByTeam: Record<Team, BotPlayer[]> = { blue: [], red: [], neutral: [] }
    for (const bot of bots) {
      botsByTeam[bot.team].push(bot)
    }

    const destructibleLoot = this.loot.filter(
      (item) =>
        (item.type === 'box' || item.type === 'treasure' || item.type === 'boss') &&
        item.radius &&
        item.health &&
        item.health > 0
    )

    for (const ownerId of owners) {
      const owner = ownerId === this.player.id ? this.player : this.botAISystem.getBotById(ownerId)
      if (!owner) {
        this.pylonSystem.removeOwner(ownerId)
        continue
      }

      const pylons = this.pylonSystem.getPylonsForOwner(ownerId)
      if (pylons.length < 2) continue

      const links = createPylonLinks(pylons)
      if (!links.length) continue

      let extension = 30 + owner.bulletPenetration * 8
      let beamRadius = 10 + owner.bulletPenetration * 0.6
      let damagePerSecond = Math.max(22, owner.damage * 0.55)
      if (owner.tankClass === 'prismarchon') {
        extension += 40
        beamRadius += 4
        damagePerSecond *= 1.3
      }
      const tickDamage = damagePerSecond * elapsed

      const enemyBots =
        owner.team === 'blue'
          ? botsByTeam.red
          : owner.team === 'red'
            ? botsByTeam.blue
            : bots

      for (const link of links) {
        const beam = this.extendBeamSegment(link.start, link.end, extension)
        this.damageEntitiesAlongBeam(owner, beam.start, beam.end, beamRadius, tickDamage, enemyBots, destructibleLoot)
        if (owner.tankClass === 'prismarchon') {
          this.spawnPrismRefractions(owner, beam.start, beam.end, beamRadius, tickDamage * 0.35, enemyBots, destructibleLoot)
        }
      }
    }
  }

  private extendBeamSegment(start: Vector2, end: Vector2, extension: number) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const normX = dx / distance
    const normY = dy / distance

    return {
      start: {
        x: start.x - normX * extension,
        y: start.y - normY * extension,
      },
      end: {
        x: end.x + normX * extension,
        y: end.y + normY * extension,
      },
    }
  }

  private spawnPrismRefractions(
    owner: Player | BotPlayer,
    start: Vector2,
    end: Vector2,
    beamRadius: number,
    damage: number,
    enemyBots: BotPlayer[],
    destructibleLoot: Loot[]
  ) {
    const mid = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    }
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const perp = angle + Math.PI / 2
    const reach = 140
    const pulseEnds = [
      {
        x: mid.x + Math.cos(perp) * reach,
        y: mid.y + Math.sin(perp) * reach,
      },
      {
        x: mid.x - Math.cos(perp) * reach,
        y: mid.y - Math.sin(perp) * reach,
      },
    ]
    this.particlePool.emitEnergySwirl(mid, '#ffe8ff')
    for (const endPoint of pulseEnds) {
      this.damageEntitiesAlongBeam(owner, mid, endPoint, beamRadius * 0.6, damage, enemyBots, destructibleLoot)
    }
  }

  private spawnMaelstromWake() {
    const segments = 8
    const radius = this.player.radius + 25
    for (let i = 0; i < segments; i++) {
      const theta = (Math.PI * 2 * i) / segments
      const pos = {
        x: this.player.position.x + Math.cos(theta) * radius,
        y: this.player.position.y + Math.sin(theta) * radius,
      }
      this.particlePool.emitEnergySwirl(pos, '#a1f4ff')
    }
    this.screenEffects.startShake(2.4, 0.12)
  }

  private damageEntitiesAlongBeam(
    owner: Player | BotPlayer,
    start: Vector2,
    end: Vector2,
    beamRadius: number,
    damage: number,
    enemyBots: BotPlayer[],
    destructibleLoot: Loot[]
  ) {
    for (const bot of enemyBots) {
      if (bot.health <= 0 || bot.id === owner.id) continue

      const distSq = this.distanceSqPointToSegment(bot.position, start, end)
      const threshold = (beamRadius + bot.radius) * (beamRadius + bot.radius)
      if (distSq <= threshold) {
        const killed = this.botAISystem.damageBot(bot.id, damage)
        this.particlePool.emitSparkBurst(bot.position, 2)
        if (killed && owner.id === this.player.id) {
          this.rewardPlayerForBotKill(bot)
        }
      }
    }

    if (!this.teamSystem.areAllies(this.player.team, owner.team) && this.invincibilityFrames <= 0) {
      const distSq = this.distanceSqPointToSegment(this.player.position, start, end)
      const threshold = (beamRadius + this.player.radius) * (beamRadius + this.player.radius)
      if (distSq <= threshold) {
        this.applyDamageToPlayer(damage)
        this.player.lastRegenTime = this.gameTime
        this.particlePool.emitSparkBurst(this.player.position, 3)
        this.screenEffects.startShake(2, 0.1)
        audioManager.play('playerDamage')
        if (this.player.health <= 0) {
          this.player.health = 0
        }
      }
    }

    for (const loot of destructibleLoot) {
      if (!loot.radius || !loot.health) continue
      const distSq = this.distanceSqPointToSegment(loot.position, start, end)
      const threshold = (beamRadius + loot.radius) * (beamRadius + loot.radius)
      if (distSq <= threshold) {
        loot.health = Math.max(0, loot.health - damage)
        if (loot.health <= 0) {
          const index = this.loot.indexOf(loot)
          if (index !== -1) {
            this.breakLootBox(index)
          }
        }
      }
    }
  }

  private distanceSqPointToSegment(point: Vector2, start: Vector2, end: Vector2): number {
    const vx = end.x - start.x
    const vy = end.y - start.y
    const wx = point.x - start.x
    const wy = point.y - start.y

    const lengthSq = vx * vx + vy * vy
    if (lengthSq === 0) {
      return wx * wx + wy * wy
    }

    let t = (wx * vx + wy * vy) / lengthSq
    t = Math.max(0, Math.min(1, t))

    const projX = start.x + vx * t
    const projY = start.y + vy * t
    const dx = point.x - projX
    const dy = point.y - projY
    return dx * dx + dy * dy
  }

  private rewardPlayerForBotKill(bot: BotPlayer) {
    const xpGained = bot.level * 10
    this.player.kills++
    this.handleCatalystComboGain()

    const botColor = this.teamSystem.getTeamColor(bot.team)
    this.particlePool.emitDebris(bot.position, bot.velocity, botColor)
    // Shake scales with enemy level
    this.screenEffects.startShake(2 + Math.min(3, bot.level * 0.3), 0.15)
    // Brief kill confirmation flash
    this.screenEffects.triggerFlash('kill', 0.5 + Math.min(0.5, bot.level * 0.05))
    audioManager.play('polygonDeath')

    const didLevelUp = this.upgradeManager.addXP(xpGained)
    this.player.xp = this.upgradeManager.getTotalXP()

    if (didLevelUp) {
      this.player.level = this.upgradeManager.getLevel()
      this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
      this.invincibilityFrames = 2.0
      this.particleSystem.createLevelUpEffect(this.player.position)
      // Screen shake removed for mobile performance
      this.screenEffects.triggerFlash('levelUp', 1)
      audioManager.play('levelUp')

      if (this.onLevelUp) {
        this.onLevelUp()
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
      // Epic boss kill - massive screen effects
      this.screenEffects.startShake(15, 0.8)
      this.screenEffects.startFlash('#FF0066', 0.5)
      this.screenEffects.triggerChromaticAberration(0.8)
    } else if (isTreasure) {
      this.particleSystem.createExplosion(box.position, explosionSize * 1.5, '#FFD700')
      this.particlePool.emitDebris(box.position, { x: 0, y: 0 }, '#FFD700')
      // Treasure - gold flash
      this.screenEffects.startShake(10, 0.5)
      this.screenEffects.triggerFlash('critical', 1)
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
    this.handleCatalystComboGain()
    
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

    this.trySpawnHuskFromLoot(box)
    this.loot.splice(index, 1)
  }

  private trySpawnHuskFromLoot(box: Loot) {
    if (this.player.tankClass !== 'gravemindregent') return
    if (!box.position) return
    if (box.convertedToHusk) return
    const conversionChance = this.getSynergyValue('gravemindHuskChance', 0)
    if (Math.random() > conversionChance) return
    const drone = this.droneSystem.spawnDrone(this.player, 'square', { x: box.position.x, y: box.position.y })
    if (drone) {
      drone.velocity.x = 0
      drone.velocity.y = 0
      drone.pulsePhase = Math.random() * Math.PI * 2
    }
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
      // UpgradeManager is the single source of truth for XP
      const didLevelUp = this.upgradeManager.addXP(item.value)
      
      // Sync player.xp from UpgradeManager for display
      this.player.xp = this.upgradeManager.getTotalXP()
      
      // Audio
      audioManager.play('xpCollect')
      
      if (didLevelUp) {
        this.player.level = this.upgradeManager.getLevel()
        this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
        
        // Add invincibility during level up
        this.invincibilityFrames = 2.0
        
        // Enhanced level up effect
        this.particleSystem.createLevelUpEffect(this.player.position)
        // Screen shake removed for mobile performance
        this.screenEffects.triggerFlash('levelUp', 1)
        audioManager.play('levelUp')
        
        if (this.onLevelUp) {
          this.onLevelUp()
        }
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
      
      // Update drone stats when bullet-related stats are upgraded
      // Drones are the player's "bullets" for drone classes
      if (stat === 'bulletSpeed' || stat === 'bulletDamage' || stat === 'bulletPenetration') {
        this.droneSystem.updateDroneStats(this.player)
      }
    }
  }

  // Calculate player radius based on maxHealth to scale properly
  private calculatePlayerRadius(maxHealth: number): number {
    // Base radius at 100 health is 15
    // Scale proportionally with health: radius = 15 * sqrt(maxHealth / 100)
    // Using square root for more reasonable scaling
    const baseRadius = 15
    const baseHealth = 100
    const scaleFactor = Math.sqrt(maxHealth / baseHealth)
    return Math.max(baseRadius, baseRadius * scaleFactor)
  }

  applyStatsToPlayer() {
    const stats = this.upgradeManager.getStats()
    const statPoints = this.upgradeManager.getStatPoints()
    const oldMaxHealth = this.player.maxHealth
    const healthPercentage = this.player.health / oldMaxHealth
    
    this.player.maxHealth = Math.floor(stats.maxHealth)
    this.player.damage = Math.floor(stats.bulletDamage)
    let fireRate = Math.max(45, Math.floor(stats.reload))
    this.player.speed = Math.floor(stats.movementSpeed)
    this.player.bulletSpeed = Math.floor(stats.bulletSpeed)
    this.player.bulletPenetration = Math.floor(stats.bulletPenetration)
    this.player.bodyDamage = Math.floor(stats.bodyDamage)
    this.player.healthRegen = stats.healthRegen
    this.player.lootRange = Math.floor(stats.lootRange)
    
    // Update radius based on maxHealth
    this.player.radius = this.calculatePlayerRadius(this.player.maxHealth)
    
    this.player.health = Math.max(1, Math.floor(healthPercentage * this.player.maxHealth))
    
    this.player.fireRate = fireRate
    this.applyStatSynergies(statPoints)
    // Sync XP display values from UpgradeManager
    this.player.xpToNextLevel = this.upgradeManager.getXPToNextLevel()
  }

  private applyStatSynergies(statPoints: Record<StatType, number>) {
    const synergy = createDefaultSynergyState()
    const tankClass = this.player.tankClass

    if (TWIN_LINE_CLASSES.has(tankClass)) {
      const reloadPoints = statPoints.reload ?? 0
      synergy.barrelSyncBonus = Math.min(reloadPoints * 0.035, 1)
    }

    if (SNIPER_RANGE_CLASSES.has(tankClass)) {
      const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
      synergy.rangeMultiplier = 1 + Math.min(bulletSpeedPoints * 0.025, 0.75)
    }

    if (MACHINE_GUN_LINE_CLASSES.has(tankClass)) {
      const reloadPoints = statPoints.reload ?? 0
      synergy.heatDissipation = Math.min(reloadPoints * 0.02, 0.35)
      const fireRateModifier = Math.max(0.55, 1 - synergy.heatDissipation * 0.5)
      this.player.fireRate = Math.max(35, Math.floor(this.player.fireRate * fireRateModifier))
    }

    if (FLANK_LINE_CLASSES.has(tankClass)) {
      const movePoints = statPoints.movementSpeed ?? 0
      synergy.rotationResponsiveness = 1 + Math.min(movePoints * 0.03, 0.65)
    }

    if (SMASHER_LINE_CLASSES.has(tankClass)) {
      const bodyPoints = statPoints.bodyDamage ?? 0
      synergy.collisionForceMultiplier = 1 + Math.min(bodyPoints * 0.04, 1.2)
    }

    const tankConfig = TANK_CONFIGS[tankClass]
    if (tankConfig?.isDroneClass) {
      const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
      synergy.droneSpeedBonus = 1 + Math.min(bulletSpeedPoints * 0.03, 0.9)
    }

    synergy.modifiers = {}
    this.applyAdvancedSynergies(synergy, statPoints)
    this.player.synergy = synergy
    this.syncBastionOvershield()
  }

  private applyAdvancedSynergies(synergy: PlayerSynergyState, statPoints: Record<StatType, number>) {
    const tankClass = this.player.tankClass
    switch (tankClass) {
      case 'mirage': {
        const reloadPoints = statPoints.reload ?? 0
        const movePoints = statPoints.movementSpeed ?? 0
        const recloakMultiplier = Math.max(0.35, 1 - Math.min(0.65, reloadPoints * 0.035))
        const responsiveness = 1 + Math.min(0.9, movePoints * 0.045)
        this.setSynergyModifier(synergy, 'mirageRecloak', recloakMultiplier)
        this.setSynergyModifier(synergy, 'mirageResponsiveness', responsiveness)
        break
      }
      case 'auto3':
      case 'auto5': {
        const reloadPoints = statPoints.reload ?? 0
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const bulletDamagePoints = statPoints.bulletDamage ?? 0
        const lootPoints = statPoints.lootRange ?? 0
        const movePoints = statPoints.movementSpeed ?? 0
        const detection = 1 + Math.min(0.8, lootPoints * 0.03)
        const fireRateScale = Math.max(0.55, 1 - Math.min(0.45, reloadPoints * 0.03))
        const orbitBonus = Math.min(26, lootPoints * 1.2)
        const spinBonus = Math.min(0.65, movePoints * 0.02)
        const bulletSpeedBonus = 1 + Math.min(0.6, bulletSpeedPoints * 0.02)
        const bulletDamageBonus = 1 + Math.min(0.65, bulletDamagePoints * 0.025)
        this.setSynergyModifier(synergy, 'autoTurretDetection', detection)
        this.setSynergyModifier(synergy, 'autoTurretFireRate', fireRateScale)
        this.setSynergyModifier(synergy, 'autoTurretOrbit', orbitBonus)
        this.setSynergyModifier(synergy, 'autoTurretSpin', spinBonus)
        this.setSynergyModifier(synergy, 'autoTurretBulletSpeed', bulletSpeedBonus)
        this.setSynergyModifier(synergy, 'autoTurretDamage', bulletDamageBonus)
        break
      }
      case 'starfallarsenal': {
        const reloadPoints = statPoints.reload ?? 0
        const penetrationPoints = statPoints.bulletPenetration ?? 0
        const stagger = Math.max(0.05, 0.22 - reloadPoints * 0.0055)
        const pierce = Math.max(0, Math.floor(penetrationPoints / 5))
        this.setSynergyModifier(synergy, 'starfallStagger', stagger)
        this.setSynergyModifier(synergy, 'starfallPierce', pierce)
        break
      }
      case 'orbitalarray': {
        const lootPoints = statPoints.lootRange ?? 0
        const reloadPoints = statPoints.reload ?? 0
        const spacing = 100 + Math.min(lootPoints * 6, 200)
        const volleyDelay = Math.max(0.25, 0.85 - reloadPoints * 0.02)
        this.setSynergyModifier(synergy, 'orbitalSpacing', spacing)
        this.setSynergyModifier(synergy, 'orbitalVolleyDelay', volleyDelay)
        break
      }
      case 'phasesentinel': {
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const reloadPoints = statPoints.reload ?? 0
        const railMultiplier = 1 + Math.min(1, bulletSpeedPoints * 0.035)
        const reticleRate = 0.5 + Math.min(1.5, reloadPoints * 0.05)
        this.setSynergyModifier(synergy, 'phaseRailMultiplier', railMultiplier)
        this.setSynergyModifier(synergy, 'phaseReticleRate', reticleRate)
        break
      }
      case 'gravemindregent': {
        const regenPoints = statPoints.healthRegen ?? 0
        const damagePoints = statPoints.bulletDamage ?? 0
        const huskChance = Math.min(0.65, regenPoints * 0.03)
        const thrallBonus = 1 + Math.min(1.2, damagePoints * 0.035)
        this.setSynergyModifier(synergy, 'gravemindHuskChance', huskChance)
        this.setSynergyModifier(synergy, 'gravemindThrallBonus', thrallBonus)
        break
      }
      case 'armadacolossus': {
        const damagePoints = statPoints.bulletDamage ?? 0
        const lootPoints = statPoints.lootRange ?? 0
        const cannonBonus = 1 + Math.min(1.15, damagePoints * 0.025)
        const patrolExtra = Math.min(150, lootPoints * 4)
        this.setSynergyModifier(synergy, 'armadaCannonBonus', cannonBonus)
        this.setSynergyModifier(synergy, 'armadaPatrolRadius', patrolExtra)
        break
      }
      case 'citadelshaper': {
        const penetrationPoints = statPoints.bulletPenetration ?? 0
        const reloadPoints = statPoints.reload ?? 0
        const reinforcement = 1 + Math.min(1.4, penetrationPoints * 0.045)
        const weaveSpeed = 1 + Math.min(0.9, reloadPoints * 0.03)
        this.setSynergyModifier(synergy, 'citadelTrapReinforce', reinforcement)
        this.setSynergyModifier(synergy, 'citadelWeaveSpeed', weaveSpeed)
        break
      }
      case 'obelisk': {
        const lootPoints = statPoints.lootRange ?? 0
        const rangeBonus = Math.min(280, lootPoints * 8)
        this.setSynergyModifier(synergy, 'pylonRangeBonus', rangeBonus)
        break
      }
      case 'cyclonebulwark': {
        const reloadPoints = statPoints.reload ?? 0
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const interval = Math.max(0.2, 0.8 - reloadPoints * 0.025)
        const arcSpread = 0.25 + Math.min(0.4, bulletSpeedPoints * 0.015)
        this.setSynergyModifier(synergy, 'cyclonePulseInterval', interval)
        this.setSynergyModifier(synergy, 'cycloneArcSpread', arcSpread)
        break
      }
      case 'tempest': {
        const reloadPoints = statPoints.reload ?? 0
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const spinBoost = 1 + Math.min(0.8, reloadPoints * 0.03)
        const orbitBonus = Math.min(80, bulletSpeedPoints * 2.5)
        this.setSynergyModifier(synergy, 'tempestSpinBoost', spinBoost)
        this.setSynergyModifier(synergy, 'tempestOrbitBonus', orbitBonus)
        break
      }
      case 'maelstromsovereign': {
        const reloadPoints = statPoints.reload ?? 0
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const frequency = Math.max(0.25, 0.7 - reloadPoints * 0.02)
        const radiusBonus = Math.min(140, bulletSpeedPoints * 3)
        this.setSynergyModifier(synergy, 'maelstromFrequency', frequency)
        this.setSynergyModifier(synergy, 'maelstromRadiusBonus', radiusBonus)
        break
      }
      case 'aegisvanguard': {
        const movePoints = statPoints.movementSpeed ?? 0
        const spinBonus = 1 + Math.min(0.6, movePoints * 0.025)
        this.setSynergyModifier(synergy, 'shieldSpinBonus', spinBonus)
        break
      }
      case 'bulwarkprime': {
        const maxHealthPoints = statPoints.maxHealth ?? 0
        const bodyPoints = statPoints.bodyDamage ?? 0
        const movePoints = statPoints.movementSpeed ?? 0
        const plating = 1 + Math.min(0.8, maxHealthPoints * 0.03)
        const slamBoost = 1 + Math.min(0.9, bodyPoints * 0.03)
        this.setSynergyModifier(synergy, 'bulwarkPlating', plating)
        this.setSynergyModifier(synergy, 'bulwarkSlam', slamBoost)
        this.setSynergyModifier(synergy, 'shieldSpinBonus', 1 + Math.min(0.5, movePoints * 0.02))
        break
      }
      case 'bastioneternal': {
        const maxHealthPoints = statPoints.maxHealth ?? 0
        const movePoints = statPoints.movementSpeed ?? 0
        const overshield = this.player.maxHealth * Math.min(0.8, maxHealthPoints * 0.04)
        const rotation = 1 + Math.min(0.8, movePoints * 0.025)
        this.setSynergyModifier(synergy, 'bastionOvershield', overshield)
        this.setSynergyModifier(synergy, 'bastionRotation', rotation)
        this.setSynergyModifier(synergy, 'shieldSpinBonus', 1 + Math.min(0.7, movePoints * 0.03))
        break
      }
      case 'cataclysmengine': {
        const reloadPoints = statPoints.reload ?? 0
        const damagePoints = statPoints.bulletDamage ?? 0
        const chargeRate = 1 + Math.min(0.9, reloadPoints * 0.03)
        const shockwave = 1 + Math.min(1, damagePoints * 0.03)
        this.setSynergyModifier(synergy, 'cataclysmChargeRate', chargeRate)
        this.setSynergyModifier(synergy, 'cataclysmShockwave', shockwave)
        break
      }
      case 'doomsdayharbinger': {
        const reloadPoints = statPoints.reload ?? 0
        const penPoints = statPoints.bulletPenetration ?? 0
        const cadence = Math.max(0.35, 0.95 - reloadPoints * 0.025)
        const rupture = 1 + Math.min(1, penPoints * 0.03)
        this.setSynergyModifier(synergy, 'doomsdayCadence', cadence)
        this.setSynergyModifier(synergy, 'doomsdayRupture', rupture)
        break
      }
      case 'astralregent': {
        const regenPoints = statPoints.healthRegen ?? 0
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const interval = Math.max(3, 9 - regenPoints * 0.25)
        const redeploy = 1 + Math.min(1.1, bulletSpeedPoints * 0.03)
        this.setSynergyModifier(synergy, 'astralAnchorInterval', interval)
        this.setSynergyModifier(synergy, 'astralRedeploySpeed', redeploy)
        break
      }
      case 'ionvanguard': {
        const movePoints = statPoints.movementSpeed ?? 0
        const damagePoints = statPoints.bulletDamage ?? 0
        const trail = 0.3 + Math.min(0.7, movePoints * 0.02)
        const detonation = 80 + Math.min(180, damagePoints * 4)
        this.setSynergyModifier(synergy, 'ionTrailDensity', trail)
        this.setSynergyModifier(synergy, 'ionDetonationRadius', detonation)
        break
      }
      case 'riftwalker': {
        const regenPoints = statPoints.healthRegen ?? 0
        const bulletSpeedPoints = statPoints.bulletSpeed ?? 0
        const cooldown = Math.max(2, 6 - regenPoints * 0.15)
        const droneSpeed = 1 + Math.min(1, bulletSpeedPoints * 0.03)
        this.setSynergyModifier(synergy, 'riftCooldown', cooldown)
        this.setSynergyModifier(synergy, 'riftDroneSpeed', droneSpeed)
        break
      }
      case 'catalyst': {
        const movePoints = statPoints.movementSpeed ?? 0
        const bodyPoints = statPoints.bodyDamage ?? 0
        const comboGain = 1 + Math.min(1.2, movePoints * 0.03)
        const shockwave = 1 + Math.min(1.1, bodyPoints * 0.035)
        this.setSynergyModifier(synergy, 'catalystComboGain', comboGain)
        this.setSynergyModifier(synergy, 'catalystShockwave', shockwave)
        break
      }
      case 'prismarchon': {
        const penPoints = statPoints.bulletPenetration ?? 0
        const lootPoints = statPoints.lootRange ?? 0
        const refraction = Math.min(0.6, penPoints * 0.02)
        const rangeBonus = Math.min(320, lootPoints * 9)
        this.setSynergyModifier(synergy, 'prismRefraction', refraction)
        this.setSynergyModifier(synergy, 'pylonRangeBonus', rangeBonus)
        break
      }
      case 'fusionhydra': {
        const bodyPoints = statPoints.bodyDamage ?? 0
        const bulletPoints = statPoints.bulletDamage ?? 0
        const lanceBonus = 1 + Math.min(1.05, bulletPoints * 0.03)
        const rocketDamage = this.player.bodyDamage * (0.5 + Math.min(1, bodyPoints * 0.03))
        this.setSynergyModifier(synergy, 'fusionLanceBonus', lanceBonus)
        this.setSynergyModifier(synergy, 'fusionRocketDamage', rocketDamage)
        break
      }
      case 'velocityreaver': {
        const movePoints = statPoints.movementSpeed ?? 0
        const bodyPoints = statPoints.bodyDamage ?? 0
        const dashCooldown = Math.max(0.6, 2.8 - movePoints * 0.08)
        const critChance = Math.min(0.55, bodyPoints * 0.02)
        const critMultiplier = 1.4 + Math.min(0.9, bodyPoints * 0.03)
        this.setSynergyModifier(synergy, 'velocityDashCooldown', dashCooldown)
        this.setSynergyModifier(synergy, 'velocityCritChance', critChance)
        this.setSynergyModifier(synergy, 'velocityCritMultiplier', critMultiplier)
        break
      }
      default:
        break
    }
  }

  private syncBastionOvershield() {
    if (this.player.tankClass !== 'bastioneternal') {
      if (this.abilityState.bastionOvershield) {
        this.abilityState.bastionOvershield.value = 0
        this.abilityState.bastionOvershield.max = 0
      }
      return
    }
    const max = this.getSynergyValue('bastionOvershield', 0)
    if (!this.abilityState.bastionOvershield) {
      this.abilityState.bastionOvershield = { value: max, max }
      return
    }
    this.abilityState.bastionOvershield.max = max
    this.abilityState.bastionOvershield.value = Math.min(max, this.abilityState.bastionOvershield.value || max)
  }

  private setSynergyModifier(synergy: PlayerSynergyState, key: string, value: number) {
    synergy.modifiers[key] = value
  }

  private getSynergyValue(key: string, defaultValue: number = 0): number {
    return this.player.synergy.modifiers[key] ?? defaultValue
  }

  private lerp(current: number, target: number, t: number) {
    const clampedT = Math.max(0, Math.min(1, t))
    return current + (target - current) * clampedT
  }

  private registerDebugHelpers() {
    if (typeof window === 'undefined') return

    const globalScope = window as typeof window & {
      debugTank?: {
        setStats: (stats: number[]) => void
        testSynergy: (tankClass: string) => void
        showEffectiveness: () => void
        rapidUpgrade: (targetClass: string) => void
      }
    }

    const engine = this
    const MAX_POINTS = 40

    globalScope.debugTank = {
      setStats(values: number[]) {
        if (!Array.isArray(values)) {
          console.warn('[debugTank] Expected an array of stat values.')
          return
        }

        for (let i = 0; i < STAT_DEBUG_ORDER.length; i++) {
          const stat = STAT_DEBUG_ORDER[i]
          const desired = Math.max(0, Math.min(values[i] ?? 0, MAX_POINTS))
          engine.upgradeManager['statPoints'][stat] = desired
          engine.upgradeManager['stats'][stat] = engine.upgradeManager.calculateStatValue(stat, desired)
        }

        engine.applyStatsToPlayer()
        console.info('[debugTank] Applied custom stat distribution', engine.upgradeManager.getStatPoints())
      },
      testSynergy(tankClass: string) {
        if (!TANK_CONFIGS[tankClass]) {
          console.warn('[debugTank] Unknown tank class', tankClass)
          return
        }
        engine.player.tankClass = tankClass
        engine.upgradeManager['currentClass'] = tankClass
        engine.applyStatsToPlayer()
        console.info('[debugTank] Testing synergy for', tankClass, engine.player.synergy)
      },
      showEffectiveness() {
        console.table({
          stats: engine.upgradeManager.getStats(),
          points: engine.upgradeManager.getStatPoints(),
          synergy: engine.player.synergy,
        })
      },
      rapidUpgrade(targetClass: string) {
        const config = TANK_CONFIGS[targetClass]
        if (!config) {
          console.warn('[debugTank] Unknown target class', targetClass)
          return
        }
        engine.upgradeManager['currentClass'] = targetClass
        engine.upgradeManager['level'] = Math.max(engine.upgradeManager['level'], config.unlocksAt)
        engine.player.level = Math.max(engine.player.level, config.unlocksAt)
        engine.player.tankClass = targetClass
        engine.applyStatsToPlayer()
        console.info('[debugTank] Rapid upgraded to', targetClass)
      },
    }
  }

  upgradeTank(tankKey: string): boolean {
    const success = this.upgradeManager.upgradeTank(tankKey)
    if (success) {
      this.resetAbilityState()
      this.player.tankClass = tankKey
      this.pylonSystem.removeOwner(this.player.id)
      
      // Update body shape based on new tank
      const tankConfig = TANK_CONFIGS[tankKey]
      if (tankConfig) {
        this.player.bodyShape = tankConfig.bodyShape || 'circle'
        
        // Initialize per-barrel recoils
        const barrelCount = tankConfig.barrels.length
        this.player.barrelRecoils = new Array(barrelCount).fill(0)
        
        // Create auto turrets if tank has them
        if (tankConfig.autoTurrets) {
          this.autoTurretSystem.createTurretsForTank(
            this.player.id,
            tankKey,
            this.player.position
          )
        } else {
          // Remove turrets if switching away from auto turret tank
          this.autoTurretSystem.removeTurretsForOwner(this.player.id)
        }

        if (tankConfig.hasDecoy) {
          this.player.decoy.active = true
          this.player.decoy.visible = false
          this.player.decoy.position.x = this.player.position.x
          this.player.decoy.position.y = this.player.position.y
          this.player.decoy.target.x = this.player.position.x
          this.player.decoy.target.y = this.player.position.y
          this.player.decoy.velocity.x = 0
          this.player.decoy.velocity.y = 0
          this.player.decoy.wanderPhase = 0
          this.player.decoy.hitFlash = 0
        } else {
          this.player.decoy.active = false
          this.player.decoy.visible = false
          this.player.decoy.velocity.x = 0
          this.player.decoy.velocity.y = 0
          this.player.decoy.wanderPhase = 0
          this.player.decoy.hitFlash = 0
        }
      }
      
      this.applyStatsToPlayer()
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

  // Admin zoom methods
  isAdmin(): boolean {
    return this.player.name?.toUpperCase() === 'ADMIN'
  }

  handleZoom(delta: number): boolean {
    if (!this.isAdmin()) return false
    
    // Negative delta = scroll up = zoom in, Positive delta = scroll down = zoom out
    const zoomDirection = delta > 0 ? -1 : 1
    this.targetZoom = Math.max(
      this.ZOOM_MIN,
      Math.min(this.ZOOM_MAX, this.targetZoom + zoomDirection * this.ZOOM_SPEED)
    )
    return true
  }

  resetZoom(): void {
    this.targetZoom = 1
  }

  updateZoom(deltaTime: number): void {
    if (!this.isAdmin()) {
      this.zoom = 1
      this.targetZoom = 1
      return
    }
    
    // Smooth zoom interpolation
    const diff = this.targetZoom - this.zoom
    const smoothTime = this.ZOOM_SMOOTH_TIME
    
    if (Math.abs(diff) < 0.001) {
      this.zoom = this.targetZoom
      this.zoomVelocity = 0
    } else {
      // Simple smooth damp for zoom
      const omega = 2 / smoothTime
      const x = omega * deltaTime
      const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
      const change = (this.zoomVelocity + omega * diff) * deltaTime
      this.zoomVelocity = (this.zoomVelocity - omega * change) * exp
      this.zoom += (diff - change) * exp + change
    }
  }

  // Get the effective viewport size accounting for zoom
  getEffectiveViewport(): { width: number; height: number } {
    return {
      width: this.viewportWidth / this.zoom,
      height: this.viewportHeight / this.zoom
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
    if (this.player.tankClass === 'predator' && button === 2) {
      this.setPredatorScope(true)
    }
    
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
    if (this.player.tankClass === 'predator' && button === 2) {
      this.setPredatorScope(false)
    }
    
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
