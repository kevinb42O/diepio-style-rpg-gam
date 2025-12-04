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
  state: 'idle' | 'attacking' | 'returning' | 'controlled'
  orbitAngle: number
  target: Loot | null
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
