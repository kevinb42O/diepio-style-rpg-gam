export interface Vector2 {
  x: number
  y: number
}

export type Team = 'blue' | 'red' | 'neutral'

export interface Entity {
  id: string
  position: Vector2
  velocity: Vector2
  radius: number
  health: number
  maxHealth: number
}

export interface DecoyState {
  active: boolean
  visible: boolean
  position: Vector2
  target: Vector2
  velocity: Vector2
  wanderPhase: number
  hitFlash?: number
}

export interface PlayerSynergyState {
  barrelSyncBonus: number
  rangeMultiplier: number
  heatDissipation: number
  rotationResponsiveness: number
  collisionForceMultiplier: number
  droneSpeedBonus: number
  modifiers: Record<string, number>
}

export const createDefaultSynergyState = (): PlayerSynergyState => ({
  barrelSyncBonus: 0,
  rangeMultiplier: 1,
  heatDissipation: 0,
  rotationResponsiveness: 1,
  collisionForceMultiplier: 1,
  droneSpeedBonus: 1,
  modifiers: {},
})

export interface Player extends Entity {
  level: number
  xp: number
  xpToNextLevel: number
  damage: number
  fireRate: number
  speed: number
  lastShotTime: number
  weapon: Weapon | null
  armor: Armor | null
  kills: number
  bulletSpeed: number
  bulletPenetration: number
  bodyDamage: number
  healthRegen: number
  lastRegenTime: number
  tankClass: string
  lootRange: number
  invisibility: number
  invisibilityTimer: number
  bodyShape: 'circle' | 'square' | 'hexagon' | 'spikyHexagon'
  barrelRecoils?: number[] // Per-barrel recoil tracking
  team: Team
  name?: string
  decoy: DecoyState
  synergy: PlayerSynergyState
}

export interface Enemy extends Entity {
  damage: number
  xpValue: number
  speed: number
  type: EnemyType
}

export interface Projectile {
  id: string
  position: Vector2
  velocity: Vector2
  damage: number
  radius: number
  isPlayerProjectile: boolean
  ownerId?: string
  team?: Team
  splashRadius?: number
  splashDamage?: number
  slowAmount?: number
  slowDuration?: number
  specialTag?: 'siege' | 'rift' | 'skimmer' | 'rocketeer' | 'destroyer' | 'autoturret' | 'streamliner'
  meta?: Record<string, unknown>
  maxTravelDistance?: number
  distanceTraveled?: number
  // Skimmer: spawns mini-bullets while flying
  skimmerTimer?: number
  skimmerSpawnInterval?: number
  // Rocketeer: homes towards enemies
  homingStrength?: number
  targetId?: string
  // Visual enhancements for Destroyer-line
  isHeavyProjectile?: boolean
  trailColor?: string
}

export interface Loot {
  id: string
  position: Vector2
  type: 'xp' | 'weapon' | 'armor' | 'box' | 'treasure' | 'boss'
  value: number
  rarity?: Rarity
  item?: Weapon | Armor
  health?: number
  maxHealth?: number
  radius?: number
  contactDamage?: number
  driftAngle?: number
  driftSpeed?: number
  spawnAlpha?: number
  rotationAngle?: number
  isBoss?: boolean
  isTreasure?: boolean
  convertedToHusk?: boolean
}

export interface Weapon {
  name: string
  damage: number
  fireRate: number
  rarity: Rarity
}

export interface Armor {
  name: string
  health: number
  rarity: Rarity
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export type EnemyType = 'grunt' | 'fast' | 'tank' | 'elite'

export interface GameStats {
  timeSurvived: number
  levelReached: number
  enemiesKilled: number
}

export interface HighScore {
  timeSurvived: number
  levelReached: number
  enemiesKilled: number
  date: number
}

// Drone visual styles for different tank classes
export type DroneStyle = 
  | 'overseer'      // Classic triangle - sleek hunter
  | 'necromancer'   // Square - corrupted/dark
  | 'gravemind'     // Husk thralls with ritual glow
  | 'manager'       // Triangle - stealthy/ghostly
  | 'factory'       // Minion - mini tank with barrel
  | 'battleship'    // Tiny triangle - swarm
  | 'hybrid'        // Triangle - fiery/aggressive

export interface Drone {
  id: string
  position: Vector2
  velocity: Vector2
  targetPosition: Vector2 | null
  health: number
  maxHealth: number
  damage: number
  speed: number
  radius: number
  ownerId: string
  droneType: 'triangle' | 'square' | 'minion'
  droneStyle: DroneStyle
  state: 'idle' | 'attacking' | 'returning' | 'controlled'
  orbitAngle: number
  target: Loot | null
  team: Team
  pulsePhase?: number  // For visual effects
  aimAngle?: number
}

export type DroneControlMode = 'idle' | 'attract' | 'repel'

export interface Trap {
  id: string
  position: Vector2
  velocity: Vector2
  health: number
  maxHealth: number
  radius: number
  damage: number
  lifetime: number
  ownerId: string
}

export type BotPersonality = 'aggressive' | 'passive' | 'opportunist' | 'territorial' | 'noob' | 'pro'

export interface BotPlayer extends Player {
  behaviorState: 'idle' | 'attacking' | 'fleeing' | 'patrolling' | 'farming'
  targetPlayer: boolean
  lastBehaviorChange: number
  spawnZone: number
  statPoints: Record<string, number>
  personality: BotPersonality
  farmingPriority: number // 0-1, how much to prioritize farming over combat
  aimAccuracy: number // 0-1, how accurate the aim is
  reactionTime: number // milliseconds delay before reacting
  lastReactionTime: number
  currentTarget: string | null // ID of current target (bot or shape)
  aimAngle: number // Angle bot is aiming at (towards actual target)
}

export interface Zone {
  id: number
  name: string
  radiusMin: number
  radiusMax: number
  floorColorInner: string
  floorColorOuter: string
  enemyLevelMin: number
  enemyLevelMax: number
  enemyTiers: number[]
  maxBots: number
  lootRarities: Rarity[]
  poi?: PointOfInterest
}

export interface PointOfInterest {
  id: string
  name: string
  position: Vector2
  radius: number
  type: 'sanctuary' | 'arena' | 'nexus'
  guardCount: number
  lootRarity: Rarity
  lootRespawnTime: number
  lastLootSpawn: number
}

export interface PooledParticle {
  position: Vector2
  velocity: Vector2
  life: number
  maxLife: number
  alpha: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  scale: number
  type: 'muzzle' | 'smoke' | 'spark' | 'energy' | 'levelup' | 'debris' | 'trail'
  active: boolean
}
