export interface Vector2 {
  x: number
  y: number
}

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
