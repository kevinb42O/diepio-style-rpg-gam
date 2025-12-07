import { TANK_CONFIGS, getUpgradesForClassAtLevel } from './tankConfigs'

export type StatType = 'healthRegen' | 'maxHealth' | 'bodyDamage' | 'bulletSpeed' | 'bulletPenetration' | 'bulletDamage' | 'reload' | 'movementSpeed' | 'lootRange'

export interface PlayerStats {
  healthRegen: number
  maxHealth: number
  bodyDamage: number
  bulletSpeed: number
  bulletPenetration: number
  bulletDamage: number
  reload: number
  movementSpeed: number
  lootRange: number
}

export interface TankClass {
  name: string
  tier: number
  requiredLevel: number
  parent: string | null
  barrels: BarrelConfig[]
  description: string
}

export interface BarrelConfig {
  offsetX: number
  offsetY: number
  angle: number
  width: number
  length: number
}

const SKILL_POINTS_BY_LEVEL_LEGACY: { [key: number]: number } = {
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9,
  11: 10, 12: 11, 13: 12, 14: 13, 15: 14, 16: 15, 17: 16, 18: 17, 19: 18, 20: 19,
  21: 20, 22: 21, 23: 22, 24: 23, 25: 24, 26: 25, 27: 26, 28: 27,
  29: 27, 30: 28, 31: 28, 32: 29, 33: 29, 34: 30, 35: 30, 36: 31,
  37: 31, 38: 31, 39: 32, 40: 32, 41: 32, 42: 33, 43: 33, 44: 33, 45: 33
}

function getSkillPointsForLevel(level: number): number {
  return level - 1
}

const XP_CURVE: { [key: number]: number } = {
  1: 0, 2: 100, 3: 250, 4: 500, 5: 850, 6: 1300, 7: 1900, 8: 2700, 9: 3700, 10: 5000,
  11: 6600, 12: 8500, 13: 10800, 14: 13500, 15: 16700, 16: 20500, 17: 24900, 18: 30000, 19: 35900, 20: 42700,
  21: 50500, 22: 59500, 23: 69800, 24: 81500, 25: 94800, 26: 110000, 27: 127000, 28: 146000, 29: 167000, 30: 190000,
  31: 216000, 32: 245000, 33: 277000, 34: 313000, 35: 353000, 36: 398000, 37: 448000, 38: 504000, 39: 566000, 40: 635000,
  41: 712000, 42: 797000, 43: 891000, 44: 995000, 45: 1110000
}

const LOOT_RANGE_GROWTH = 1.35
const LOOT_RANGE_CAP_POINTS = 8
const SOFT_STAT_CAP = 30
const HARD_STAT_CAP = 40
const MAX_STAT_POINTS = 40

export const TANK_CLASSES: { [key: string]: TankClass } = {
  basic: {
    name: 'Basic Tank',
    tier: 0,
    requiredLevel: 1,
    parent: null,
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 }],
    description: 'The foundation of all tanks'
  },
  twin: {
    name: 'Twin',
    tier: 1,
    requiredLevel: 15,
    parent: 'basic',
    barrels: [
      { offsetX: 0, offsetY: -6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 10, length: 20 }
    ],
    description: 'Dual barrels for sustained fire'
  },
  sniper: {
    name: 'Sniper',
    tier: 1,
    requiredLevel: 15,
    parent: 'basic',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 28 }],
    description: 'Long range precision'
  },
  machinegun: {
    name: 'Machine Gun',
    tier: 1,
    requiredLevel: 15,
    parent: 'basic',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 14, length: 18 }],
    description: 'Rapid fire at the cost of accuracy'
  },
  flankguard: {
    name: 'Flank Guard',
    tier: 1,
    requiredLevel: 15,
    parent: 'basic',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI, width: 12, length: 22 }
    ],
    description: 'Front and back firepower'
  },
  tripleshot: {
    name: 'Triple Shot',
    tier: 2,
    requiredLevel: 30,
    parent: 'twin',
    barrels: [
      { offsetX: 0, offsetY: -8, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 8, angle: 0, width: 10, length: 20 }
    ],
    description: 'Triple the firepower'
  },
  quadtank: {
    name: 'Quad Tank',
    tier: 2,
    requiredLevel: 30,
    parent: 'twin',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 2, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 2, width: 12, length: 22 }
    ],
    description: 'Fire in all directions'
  },
  assassin: {
    name: 'Assassin',
    tier: 2,
    requiredLevel: 30,
    parent: 'sniper',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 8, length: 32 }],
    description: 'Enhanced zoom and penetration'
  },
  overseer: {
    name: 'Overseer',
    tier: 2,
    requiredLevel: 30,
    parent: 'sniper',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: Math.PI / 4, width: 14, length: 8 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 4, width: 14, length: 8 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 3 / 4, width: 14, length: 8 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 3 / 4, width: 14, length: 8 }
    ],
    description: 'Control drone swarms'
  },
  destroyer: {
    name: 'Destroyer',
    tier: 2,
    requiredLevel: 30,
    parent: 'machinegun',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 20, length: 20 }],
    description: 'Massive bullets with huge recoil'
  },
  triangle: {
    name: 'Tri-Angle',
    tier: 2,
    requiredLevel: 30,
    parent: 'flankguard',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 6, width: 10, length: 16 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 5 / 6, width: 10, length: 16 }
    ],
    description: 'Speed through recoil'
  },
  pentashot: {
    name: 'Penta Shot',
    tier: 3,
    requiredLevel: 45,
    parent: 'tripleshot',
    barrels: [
      { offsetX: 0, offsetY: -12, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: -6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 12, angle: 0, width: 10, length: 20 }
    ],
    description: 'Five barrels of devastation'
  },
  octotank: {
    name: 'Octo Tank',
    tier: 3,
    requiredLevel: 45,
    parent: 'quadtank',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 4, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 2, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 3 / 4, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: Math.PI, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 3 / 4, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 2, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 4, width: 10, length: 20 }
    ],
    description: 'Eight directions of fire'
  },
  ranger: {
    name: 'Ranger',
    tier: 3,
    requiredLevel: 45,
    parent: 'assassin',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 6, length: 36 }],
    description: 'Maximum range and vision'
  },
  overlord: {
    name: 'Overlord',
    tier: 3,
    requiredLevel: 45,
    parent: 'overseer',
    barrels: [
      { offsetX: 0, offsetY: 6, angle: 0, width: 14, length: 8 },
      { offsetX: 0, offsetY: -6, angle: 0, width: 14, length: 8 },
      { offsetX: 0, offsetY: 6, angle: Math.PI, width: 14, length: 8 },
      { offsetX: 0, offsetY: -6, angle: Math.PI, width: 14, length: 8 }
    ],
    description: 'Command powerful drone armies'
  },
  annihilator: {
    name: 'Annihilator',
    tier: 3,
    requiredLevel: 45,
    parent: 'destroyer',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 24, length: 22 }],
    description: 'Ultimate destructive power'
  },
  booster: {
    name: 'Booster',
    tier: 3,
    requiredLevel: 45,
    parent: 'triangle',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 4, angle: Math.PI * 5 / 6, width: 8, length: 14 },
      { offsetX: 0, offsetY: -4, angle: -Math.PI * 5 / 6, width: 8, length: 14 },
      { offsetX: 0, offsetY: 8, angle: Math.PI, width: 8, length: 14 },
      { offsetX: 0, offsetY: -8, angle: Math.PI, width: 8, length: 14 }
    ],
    description: 'Maximum speed and agility'
  },
  
  // === TIER 1: NEW TANKS ===
  
  smasher: {
    name: 'Smasher',
    tier: 1,
    requiredLevel: 15,
    parent: 'basic',
    barrels: [],
    description: 'Pure body damage, hexagon body'
  },

  crusher: {
    name: 'Crusher',
    tier: 2,
    requiredLevel: 30,
    parent: 'smasher',
    barrels: [],
    description: 'Armored ram chassis with reinforced spin'
  },
  
  // === TIER 2: NEW TANKS ===
  
  hunter: {
    name: 'Hunter',
    tier: 2,
    requiredLevel: 30,
    parent: 'sniper',
    barrels: [
      { offsetX: 0, offsetY: -3, angle: 0, width: 11, length: 25 },
      { offsetX: 0, offsetY: 3, angle: 0, width: 13, length: 20 }
    ],
    description: 'Dual stacked barrels for heavy hits'
  },
  
  twinflank: {
    name: 'Twin Flank',
    tier: 2,
    requiredLevel: 30,
    parent: 'twin',
    barrels: [
      { offsetX: 0, offsetY: -6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: -6, angle: Math.PI, width: 10, length: 20 },
      { offsetX: 0, offsetY: 6, angle: Math.PI, width: 10, length: 20 }
    ],
    description: 'Twin barrels front and back'
  },
  
  gunner: {
    name: 'Gunner',
    tier: 2,
    requiredLevel: 30,
    parent: 'machinegun',
    barrels: [
      { offsetX: 0, offsetY: -9, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: -3, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 3, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 9, angle: 0, width: 8, length: 19 }
    ],
    description: 'Rapid fire with 4 small barrels'
  },
  
  trapper: {
    name: 'Trapper',
    tier: 2,
    requiredLevel: 30,
    parent: 'sniper',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 20, length: 12 }
    ],
    description: 'Deploy stationary traps'
  },
  
  auto3: {
    name: 'Auto 3',
    tier: 2,
    requiredLevel: 30,
    parent: 'flankguard',
    barrels: [], // No player-controlled barrels - only auto turrets
    description: 'Three auto-turrets'
  },
  
  // === TIER 3: NEW TANKS ===
  
  triplet: {
    name: 'Triplet',
    tier: 3,
    requiredLevel: 45,
    parent: 'tripleshot',
    barrels: [
      { offsetX: 0, offsetY: -8, angle: 0, width: 11, length: 25 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 11, length: 26 },
      { offsetX: 0, offsetY: 8, angle: 0, width: 11, length: 25 }
    ],
    description: 'Focused triple firepower'
  },
  
  spreadshot: {
    name: 'Spread Shot',
    tier: 3,
    requiredLevel: 45,
    parent: 'tripleshot',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 4, width: 10, length: 17 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 6, width: 10, length: 18 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 7, width: 10, length: 19 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 12, width: 10, length: 19 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 24, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 11, length: 21 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 24, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 12, width: 10, length: 19 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 7, width: 10, length: 19 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 6, width: 10, length: 18 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 4, width: 10, length: 17 }
    ],
    description: 'Wall of bullets'
  },
  
  stalker: {
    name: 'Stalker',
    tier: 3,
    requiredLevel: 45,
    parent: 'assassin',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 6, length: 35 }
    ],
    description: 'Invisibility when stationary'
  },
  
  predator: {
    name: 'Predator',
    tier: 3,
    requiredLevel: 45,
    parent: 'hunter',
    barrels: [
      { offsetX: 0, offsetY: -6, angle: 0, width: 10, length: 27 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 11, length: 29 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 10, length: 27 }
    ],
    description: 'Triple stacked barrels'
  },
  
  streamliner: {
    name: 'Streamliner',
    tier: 3,
    requiredLevel: 45,
    parent: 'hunter',
    barrels: [
      { offsetX: 0, offsetY: -8, angle: 0, width: 8, length: 24 },
      { offsetX: 0, offsetY: -4, angle: 0, width: 8, length: 25 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 8, length: 26 },
      { offsetX: 0, offsetY: 4, angle: 0, width: 8, length: 25 },
      { offsetX: 0, offsetY: 8, angle: 0, width: 8, length: 24 }
    ],
    description: 'Extreme fire rate'
  },
  
  necromancer: {
    name: 'Necromancer',
    tier: 3,
    requiredLevel: 45,
    parent: 'overseer',
    barrels: [],
    description: 'Convert killed shapes to drones'
  },
  
  manager: {
    name: 'Manager',
    tier: 3,
    requiredLevel: 45,
    parent: 'overseer',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 18, length: 6 }
    ],
    description: 'Invisible when not shooting'
  },
  
  factory: {
    name: 'Factory',
    tier: 3,
    requiredLevel: 45,
    parent: 'overseer',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 28, length: 10 }
    ],
    description: 'Spawn AI mini-tanks'
  },
  
  battleship: {
    name: 'Battleship',
    tier: 3,
    requiredLevel: 45,
    parent: 'twinflank',
    barrels: [
      { offsetX: -8, offsetY: -8, angle: Math.PI / 4, width: 16, length: 6 },
      { offsetX: -8, offsetY: 8, angle: Math.PI * 3 / 4, width: 16, length: 6 },
      { offsetX: 8, offsetY: 8, angle: Math.PI * 5 / 4, width: 16, length: 6 },
      { offsetX: 8, offsetY: -8, angle: Math.PI * 7 / 4, width: 16, length: 6 }
    ],
    description: 'Swarm of tiny drones'
  },
  
  fighter: {
    name: 'Fighter',
    tier: 3,
    requiredLevel: 45,
    parent: 'triangle',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 2, width: 11, length: 16 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 2, width: 11, length: 16 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 6, width: 11, length: 14 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 5 / 6, width: 11, length: 14 }
    ],
    description: 'Speed and offense combined'
  },
  
  hybrid: {
    name: 'Hybrid',
    tier: 3,
    requiredLevel: 45,
    parent: 'destroyer',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 22, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 3 / 4, width: 18, length: 6 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 4, width: 18, length: 6 }
    ],
    description: 'Destroyer plus drones'
  },
  
  skimmer: {
    name: 'Skimmer',
    tier: 3,
    requiredLevel: 45,
    parent: 'destroyer',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 22, length: 22 }
    ],
    description: 'Bullets spawn mini-bullets'
  },
  
  rocketeer: {
    name: 'Rocketeer',
    tier: 3,
    requiredLevel: 45,
    parent: 'destroyer',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 22, length: 22 }
    ],
    description: 'Guided missiles'
  },
  
  spike: {
    name: 'Spike',
    tier: 3,
    requiredLevel: 45,
    parent: 'crusher',
    barrels: [],
    description: 'Spiky hexagon, max body damage'
  },
  
  landmine: {
    name: 'Landmine',
    tier: 3,
    requiredLevel: 45,
    parent: 'crusher',
    barrels: [],
    description: 'Full invisibility when still'
  },
  
  autosmasher: {
    name: 'Auto Smasher',
    tier: 3,
    requiredLevel: 45,
    parent: 'crusher',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 11, length: 15 }
    ],
    description: 'Hexagon with auto-turret'
  },

  // === TIER 4: EVOLUTION ===

  siegebreaker: {
    name: 'Siegebreaker',
    tier: 4,
    requiredLevel: 60,
    parent: 'annihilator',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 18, length: 38 }
    ],
    description: 'Charge a single siege shell that obliterates targets'
  },

  aegisvanguard: {
    name: 'Aegis Vanguard',
    tier: 4,
    requiredLevel: 60,
    parent: 'spike',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 6, width: 8, length: 16 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 5 / 6, width: 8, length: 16 }
    ],
    description: 'Deploy rotating shields and empowered collisions'
  },

  mirage: {
    name: 'Mirage',
    tier: 4,
    requiredLevel: 60,
    parent: 'stalker',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 8, length: 30 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 12, width: 7, length: 24 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 12, width: 7, length: 24 }
    ],
    description: 'Invisible assassin projecting a controllable decoy'
  },

  // === TIER 5: MYTHIC ===

  obelisk: {
    name: 'Obelisk',
    tier: 5,
    requiredLevel: 75,
    parent: 'ranger',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 8, length: 32 },
      { offsetX: 0, offsetY: 0, angle: Math.PI / 4, width: 6, length: 14 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI / 4, width: 6, length: 14 }
    ],
    description: 'Laser pylons form death grids at range'
  },

  tempest: {
    name: 'Tempest',
    tier: 5,
    requiredLevel: 75,
    parent: 'autogunner',
    barrels: [
      { offsetX: 0, offsetY: -6, angle: 0, width: 8, length: 22 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 8, length: 22 },
      { offsetX: 0, offsetY: -6, angle: Math.PI * 2 / 3, width: 8, length: 22 },
      { offsetX: 0, offsetY: 6, angle: Math.PI * 2 / 3, width: 8, length: 22 },
      { offsetX: 0, offsetY: -6, angle: Math.PI * 4 / 3, width: 8, length: 22 },
      { offsetX: 0, offsetY: 6, angle: Math.PI * 4 / 3, width: 8, length: 22 }
    ],
    description: 'Cyclone barrages swap arcs every salvo'
  },

  // === TIER 6: ASCENDED ===

  riftwalker: {
    name: 'Riftwalker',
    tier: 6,
    requiredLevel: 90,
    parent: 'overlord',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 16 }
    ],
    description: 'Teleporting drone commander that folds space'
  },

  catalyst: {
    name: 'Catalyst',
    tier: 6,
    requiredLevel: 90,
    parent: 'fighter',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 24 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 6, width: 8, length: 18 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 5 / 6, width: 8, length: 18 }
    ],
    description: 'Builds momentum stacks to unleash shockwaves'
  },
  
  auto5: {
    name: 'Auto 5',
    tier: 3,
    requiredLevel: 45,
    parent: 'auto3',
    barrels: [], // No player-controlled barrels - only auto turrets
    description: 'Five auto-turrets'
  },
  
  autogunner: {
    name: 'Auto Gunner',
    tier: 3,
    requiredLevel: 45,
    parent: 'gunner',
    barrels: [
      { offsetX: 0, offsetY: -9, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: -3, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 3, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 9, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 0, angle: Math.PI, width: 11, length: 15 }
    ],
    description: 'Gunner with auto-turret'
  },
  
  sprayer: {
    name: 'Sprayer',
    tier: 3,
    requiredLevel: 45,
    parent: 'machinegun',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 18, length: 19 }
    ],
    description: 'Chaotic bullet spread'
  },
  
  tripletwin: {
    name: 'Triple Twin',
    tier: 3,
    requiredLevel: 45,
    parent: 'twinflank',
    barrels: [
      { offsetX: 0, offsetY: -5, angle: 0, width: 11, length: 20 },
      { offsetX: 0, offsetY: 5, angle: 0, width: 11, length: 20 },
      { offsetX: 0, offsetY: -5, angle: Math.PI * 2 / 3, width: 11, length: 20 },
      { offsetX: 0, offsetY: 5, angle: Math.PI * 2 / 3, width: 11, length: 20 },
      { offsetX: 0, offsetY: -5, angle: Math.PI * 4 / 3, width: 11, length: 20 },
      { offsetX: 0, offsetY: 5, angle: Math.PI * 4 / 3, width: 11, length: 20 }
    ],
    description: 'Six barrels in three directions'
  },
  
  megatrapper: {
    name: 'Mega Trapper',
    tier: 3,
    requiredLevel: 45,
    parent: 'trapper',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 28, length: 15 }
    ],
    description: 'Giant traps'
  },
  
  overtrapper: {
    name: 'Overtrapper',
    tier: 3,
    requiredLevel: 45,
    parent: 'trapper',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 20, length: 12 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 3 / 4, width: 16, length: 6 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 4, width: 16, length: 6 }
    ],
    description: 'Traps plus drones'
  },
  
  gunnertrapper: {
    name: 'Gunner Trapper',
    tier: 3,
    requiredLevel: 45,
    parent: 'gunner',
    barrels: [
      { offsetX: 0, offsetY: -6, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 8, length: 19 },
      { offsetX: 0, offsetY: 0, angle: Math.PI, width: 20, length: 12 }
    ],
    description: 'Gunner with trap launcher'
  }
}

export class UpgradeManager {
  private stats: PlayerStats
  private statPoints: { [key in StatType]: number }
  private level: number
  private currentClass: string
  private totalXP: number

  constructor() {
    this.stats = {
      healthRegen: 0,
      maxHealth: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reload: 0,
      movementSpeed: 0,
      lootRange: 0
    }
    this.statPoints = {
      healthRegen: 0,
      maxHealth: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reload: 0,
      movementSpeed: 0,
      lootRange: 0
    }
    this.level = 1
    this.currentClass = 'basic'
    this.totalXP = 0
  }

  getAvailableSkillPoints(): number {
    const totalAllocated = Object.values(this.statPoints).reduce((sum, val) => sum + val, 0)
    const maxPoints = getSkillPointsForLevel(this.level)
    return maxPoints - totalAllocated
  }

  canAllocateStat(stat: StatType): boolean {
    return this.getAvailableSkillPoints() > 0 && this.statPoints[stat] < MAX_STAT_POINTS
  }

  allocateStat(stat: StatType): boolean {
    if (!this.canAllocateStat(stat)) return false
    
    this.statPoints[stat]++
    this.stats[stat] = this.calculateStatValue(stat, this.statPoints[stat])
    return true
  }

  calculateStatValue(stat: StatType, points: number): number {
    const baseValues = {
      healthRegen: 1,
      maxHealth: 100,
      bodyDamage: 10,
      bulletSpeed: 400,
      bulletPenetration: 5,
      bulletDamage: 10,
      reload: 300,
      movementSpeed: 200,
      lootRange: 50
    }

    const base = baseValues[stat]
    const effectivePoints = this.applyStatPointCaps(points)

    switch (stat) {
      case 'reload':
        return base * Math.pow(0.93, effectivePoints)
      
      case 'healthRegen':
        return base * Math.pow(1.35, effectivePoints)
      
      case 'maxHealth':
        return base + (effectivePoints * 25)
      
      case 'bodyDamage':
        return base * Math.pow(1.15, effectivePoints)
      
      case 'bulletSpeed':
        return base * Math.pow(1.04, effectivePoints)
      
      case 'bulletPenetration':
        return base * Math.pow(1.2, effectivePoints)
      
      case 'bulletDamage':
        return base * Math.pow(1.15, effectivePoints)
      
      case 'movementSpeed':
        return base * Math.pow(1.03, effectivePoints)
      
      case 'lootRange': {
        const maxRange = base * Math.pow(LOOT_RANGE_GROWTH, LOOT_RANGE_CAP_POINTS)
        if (effectivePoints >= LOOT_RANGE_CAP_POINTS) {
          return maxRange
        }
        return base * Math.pow(LOOT_RANGE_GROWTH, effectivePoints)
      }
      
      default:
        return base
    }
  }

  getXPForLevel(level: number): number {
    if (level <= 45) {
      return XP_CURVE[level] || 0
    }
    const baseXP = XP_CURVE[45] || 1110000
    const levelsAbove45 = level - 45
    return baseXP + (levelsAbove45 * 125000)
  }

  addXP(amount: number): boolean {
    this.totalXP += amount
    const nextLevel = this.level + 1
    
    if (this.totalXP >= this.getXPForLevel(nextLevel)) {
      this.level = nextLevel
      return true
    }
    return false
  }

  getAvailableUpgrades(): TankClass[] {
    return getUpgradesForClassAtLevel(this.currentClass, this.level).map((config) =>
      this.resolveTankClass(config.key || '')
    )
  }

  upgradeTank(tankKey: string): boolean {
    // Use TANK_CONFIGS for consistency with tankConfigs.ts
    const config = TANK_CONFIGS[tankKey]
    if (!config) return false
    
    // Check if this tank can be upgraded from current class
    if (config.upgradesFrom?.includes(this.currentClass) && this.level >= config.unlocksAt) {
      this.currentClass = tankKey
      return true
    }
    return false
  }

  getCurrentTank(): TankClass {
    return this.resolveTankClass(this.currentClass)
  }

  getStats(): PlayerStats {
    const baseValues = {
      healthRegen: 1,
      maxHealth: 100,
      bodyDamage: 10,
      bulletSpeed: 400,
      bulletPenetration: 5,
      bulletDamage: 10,
      reload: 300,
      movementSpeed: 200,
      lootRange: 50
    }
    
    const stats = { ...this.stats }
    
    for (const stat in baseValues) {
      const statKey = stat as StatType
      if (this.statPoints[statKey] === 0) {
        stats[statKey] = baseValues[statKey]
      }
    }
    
    return stats
  }

  getStatPoints(): { [key in StatType]: number } {
    return { ...this.statPoints }
  }

  getLevel(): number {
    return this.level
  }

  getTotalXP(): number {
    return this.totalXP
  }

  getXPToNextLevel(): number {
    return this.getXPForLevel(this.level + 1) - this.totalXP
  }

  getCurrentXPInLevel(): number {
    const currentLevelXP = this.getXPForLevel(this.level)
    return this.totalXP - currentLevelXP
  }

  getXPRequiredForCurrentLevel(): number {
    const currentLevelXP = this.getXPForLevel(this.level)
    const nextLevelXP = this.getXPForLevel(this.level + 1)
    return nextLevelXP - currentLevelXP
  }

  addStatPoints(amount: number): void {
    // Add the equivalent amount of levels to gain stat points
    const currentLevel = this.level
    const targetLevel = currentLevel + amount
    const targetXP = this.getXPForLevel(targetLevel)
    this.totalXP = targetXP
    this.level = targetLevel
  }

  private applyStatPointCaps(points: number): number {
    if (points <= SOFT_STAT_CAP) {
      return points
    }
    if (points <= HARD_STAT_CAP) {
      return SOFT_STAT_CAP + (points - SOFT_STAT_CAP) * 0.5
    }
    return SOFT_STAT_CAP + (HARD_STAT_CAP - SOFT_STAT_CAP) * 0.5
  }

  reset() {
    this.stats = {
      healthRegen: 0,
      maxHealth: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reload: 0,
      movementSpeed: 0,
      lootRange: 0
    }
    this.statPoints = {
      healthRegen: 0,
      maxHealth: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reload: 0,
      movementSpeed: 0,
      lootRange: 0
    }
    this.level = 1
    this.currentClass = 'basic'
    this.totalXP = 0
  }

  private resolveTankClass(key: string): TankClass {
    const legacy = TANK_CLASSES[key]
    if (legacy) return legacy

    const config = TANK_CONFIGS[key]
    if (config) {
      return {
        name: config.name,
        tier: config.tier,
        requiredLevel: config.unlocksAt,
        parent: config.upgradesFrom?.[0] ?? null,
        barrels: config.barrels ?? [],
        description: config.synergyNote || `${config.name} configuration`
      }
    }

    return {
      name: 'Unknown',
      tier: 0,
      requiredLevel: 0,
      parent: null,
      barrels: [],
      description: 'Unknown tank'
    }
  }
}
