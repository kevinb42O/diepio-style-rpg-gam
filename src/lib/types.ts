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
  type: 'xp' | 'weapon' | 'armor' | 'box'
  value: number
  rarity?: Rarity
  item?: Weapon | Armor
  health?: number
  maxHealth?: number
  radius?: number
  contactDamage?: number
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
