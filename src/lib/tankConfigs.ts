export interface BarrelConfig {
  angle: number
  length: number
  width: number
  offsetX?: number
  offsetY?: number
  isTrapezoid?: boolean
}

export interface TankConfig {
  name: string
  barrels: BarrelConfig[]
  tier: number
  unlocksAt: number
  upgradesFrom?: string[]
  bodyShape?: 'circle' | 'square' | 'hexagon' | 'spikyHexagon'
  bodySpikes?: number
  isDroneClass?: boolean
  droneCount?: number
  droneType?: 'triangle' | 'square' | 'minion'
  spawnerCount?: number
  invisibility?: { delay: number, maxAlpha: number }
  hasSpeedLines?: boolean
  autoTurrets?: number
  isTrapper?: boolean
  trapConfig?: { size: number, health: number, duration: number }
}

export const TANK_CONFIGS: Record<string, TankConfig> = {
  basic: {
    name: 'Basic',
    barrels: [
      { angle: 0, length: 40, width: 14 }
    ],
    tier: 0,
    unlocksAt: 1
  },
  
  twin: {
    name: 'Twin',
    barrels: [
      { angle: -15, length: 40, width: 12, offsetY: -6 },
      { angle: 15, length: 40, width: 12, offsetY: 6 }
    ],
    tier: 1,
    unlocksAt: 15,
    upgradesFrom: ['basic']
  },
  
  sniper: {
    name: 'Sniper',
    barrels: [
      { angle: 0, length: 55, width: 11 }
    ],
    tier: 1,
    unlocksAt: 15,
    upgradesFrom: ['basic']
  },
  
  machinegun: {
    name: 'Machine Gun',
    barrels: [
      { angle: 0, length: 35, width: 14, isTrapezoid: true }
    ],
    tier: 1,
    unlocksAt: 15,
    upgradesFrom: ['basic']
  },
  
  flankguard: {
    name: 'Flank Guard',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 180, length: 40, width: 14 }
    ],
    tier: 1,
    unlocksAt: 15,
    upgradesFrom: ['basic']
  },
  
  tripleshot: {
    name: 'Triple Shot',
    barrels: [
      { angle: -20, length: 40, width: 12 },
      { angle: 0, length: 40, width: 12 },
      { angle: 20, length: 40, width: 12 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['twin']
  },
  
  quadtank: {
    name: 'Quad Tank',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 90, length: 40, width: 14 },
      { angle: 180, length: 40, width: 14 },
      { angle: 270, length: 40, width: 14 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['flankguard']
  },
  
  assassin: {
    name: 'Assassin',
    barrels: [
      { angle: 0, length: 60, width: 10 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['sniper']
  },
  
  overseer: {
    name: 'Overseer',
    barrels: [
      { angle: 45, length: 12, width: 18, isTrapezoid: true },
      { angle: 135, length: 12, width: 18, isTrapezoid: true },
      { angle: 225, length: 12, width: 18, isTrapezoid: true },
      { angle: 315, length: 12, width: 18, isTrapezoid: true }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['sniper'],
    isDroneClass: true,
    droneCount: 8,
    droneType: 'triangle',
    spawnerCount: 2
  },
  
  destroyer: {
    name: 'Destroyer',
    barrels: [
      { angle: 0, length: 45, width: 22 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['basic']
  },
  
  triangle: {
    name: 'Tri-Angle',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 150, length: 30, width: 12 },
      { angle: 210, length: 30, width: 12 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['flankguard']
  },
  
  pentashot: {
    name: 'Penta Shot',
    barrels: [
      { angle: -30, length: 38, width: 11 },
      { angle: -15, length: 40, width: 11 },
      { angle: 0, length: 42, width: 11 },
      { angle: 15, length: 40, width: 11 },
      { angle: 30, length: 38, width: 11 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['tripleshot']
  },
  
  octotank: {
    name: 'Octo Tank',
    barrels: [
      { angle: 0, length: 38, width: 13 },
      { angle: 45, length: 38, width: 13 },
      { angle: 90, length: 38, width: 13 },
      { angle: 135, length: 38, width: 13 },
      { angle: 180, length: 38, width: 13 },
      { angle: 225, length: 38, width: 13 },
      { angle: 270, length: 38, width: 13 },
      { angle: 315, length: 38, width: 13 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['quadtank']
  },
  
  ranger: {
    name: 'Ranger',
    barrels: [
      { angle: 0, length: 70, width: 9 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['assassin']
  },
  
  annihilator: {
    name: 'Annihilator',
    barrels: [
      { angle: 0, length: 50, width: 26 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['destroyer']
  },
  
  booster: {
    name: 'Booster',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 140, length: 28, width: 11 },
      { angle: 160, length: 28, width: 11 },
      { angle: 200, length: 28, width: 11 },
      { angle: 220, length: 28, width: 11 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['triangle'],
    hasSpeedLines: true
  },
  
  // === TIER 1: NEW TANKS ===
  
  smasher: {
    name: 'Smasher',
    barrels: [],
    tier: 1,
    unlocksAt: 15,
    upgradesFrom: ['basic'],
    bodyShape: 'hexagon'
  },
  
  // === TIER 2: NEW TANKS ===
  
  hunter: {
    name: 'Hunter',
    barrels: [
      { angle: 0, length: 50, width: 11, offsetY: -3 },
      { angle: 0, length: 40, width: 13, offsetY: 3 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['sniper']
  },
  
  twinflank: {
    name: 'Twin Flank',
    barrels: [
      { angle: 0, length: 40, width: 12, offsetY: -6 },
      { angle: 0, length: 40, width: 12, offsetY: 6 },
      { angle: 180, length: 40, width: 12, offsetY: -6 },
      { angle: 180, length: 40, width: 12, offsetY: 6 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['twin', 'flankguard']
  },
  
  gunner: {
    name: 'Gunner',
    barrels: [
      { angle: 0, length: 38, width: 8, offsetY: -9 },
      { angle: 0, length: 38, width: 8, offsetY: -3 },
      { angle: 0, length: 38, width: 8, offsetY: 3 },
      { angle: 0, length: 38, width: 8, offsetY: 9 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['machinegun']
  },
  
  trapper: {
    name: 'Trapper',
    barrels: [
      { angle: 0, length: 25, width: 20, isTrapezoid: true }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['sniper'],
    isTrapper: true,
    trapConfig: { size: 15, health: 50, duration: 30000 }
  },
  
  auto3: {
    name: 'Auto 3',
    barrels: [
      { angle: 0, length: 30, width: 11 },
      { angle: 120, length: 30, width: 11 },
      { angle: 240, length: 30, width: 11 }
    ],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['flankguard'],
    autoTurrets: 3
  },
  
  // === TIER 3: NEW TANKS ===
  
  triplet: {
    name: 'Triplet',
    barrels: [
      { angle: 0, length: 50, width: 11, offsetY: -8 },
      { angle: 0, length: 52, width: 11, offsetY: 0 },
      { angle: 0, length: 50, width: 11, offsetY: 8 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['tripleshot']
  },
  
  spreadshot: {
    name: 'Spread Shot',
    barrels: [
      { angle: -45, length: 35, width: 10 },
      { angle: -37, length: 36, width: 10 },
      { angle: -30, length: 38, width: 10 },
      { angle: -22, length: 39, width: 10 },
      { angle: -15, length: 40, width: 10 },
      { angle: 0, length: 42, width: 11 },
      { angle: 15, length: 40, width: 10 },
      { angle: 22, length: 39, width: 10 },
      { angle: 30, length: 38, width: 10 },
      { angle: 37, length: 36, width: 10 },
      { angle: 45, length: 35, width: 10 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['tripleshot']
  },
  
  stalker: {
    name: 'Stalker',
    barrels: [
      { angle: 0, length: 70, width: 9 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['assassin'],
    invisibility: { delay: 2, maxAlpha: 0.8 }
  },
  
  predator: {
    name: 'Predator',
    barrels: [
      { angle: 0, length: 55, width: 10, offsetY: -6 },
      { angle: 0, length: 58, width: 11, offsetY: 0 },
      { angle: 0, length: 55, width: 10, offsetY: 6 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['hunter']
  },
  
  streamliner: {
    name: 'Streamliner',
    barrels: [
      { angle: 0, length: 48, width: 8, offsetY: -8 },
      { angle: 0, length: 50, width: 8, offsetY: -4 },
      { angle: 0, length: 52, width: 8, offsetY: 0 },
      { angle: 0, length: 50, width: 8, offsetY: 4 },
      { angle: 0, length: 48, width: 8, offsetY: 8 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['hunter']
  },
  
  necromancer: {
    name: 'Necromancer',
    barrels: [],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['overseer'],
    bodyShape: 'square',
    isDroneClass: true,
    droneCount: 34,
    droneType: 'square'
  },
  
  manager: {
    name: 'Manager',
    barrels: [
      { angle: 0, length: 12, width: 18, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['overseer'],
    isDroneClass: true,
    droneCount: 8,
    droneType: 'triangle',
    spawnerCount: 1,
    invisibility: { delay: 1, maxAlpha: 1.0 }
  },
  
  factory: {
    name: 'Factory',
    barrels: [
      { angle: 0, length: 20, width: 28, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['overseer'],
    isDroneClass: true,
    droneCount: 6,
    droneType: 'minion',
    spawnerCount: 1
  },
  
  battleship: {
    name: 'Battleship',
    barrels: [
      { angle: 45, length: 12, width: 16, isTrapezoid: true, offsetX: -8, offsetY: -8 },
      { angle: 135, length: 12, width: 16, isTrapezoid: true, offsetX: -8, offsetY: 8 },
      { angle: 225, length: 12, width: 16, isTrapezoid: true, offsetX: 8, offsetY: 8 },
      { angle: 315, length: 12, width: 16, isTrapezoid: true, offsetX: 8, offsetY: -8 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['twinflank'],
    isDroneClass: true,
    droneCount: 16,
    droneType: 'triangle',
    spawnerCount: 4
  },
  
  fighter: {
    name: 'Fighter',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 90, length: 32, width: 11 },
      { angle: 270, length: 32, width: 11 },
      { angle: 150, length: 28, width: 11 },
      { angle: 210, length: 28, width: 11 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['triangle'],
    hasSpeedLines: true
  },
  
  hybrid: {
    name: 'Hybrid',
    barrels: [
      { angle: 0, length: 45, width: 22 },
      { angle: 135, length: 12, width: 18, isTrapezoid: true },
      { angle: 225, length: 12, width: 18, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['destroyer'],
    isDroneClass: true,
    droneCount: 2,
    droneType: 'triangle',
    spawnerCount: 2
  },
  
  skimmer: {
    name: 'Skimmer',
    barrels: [
      { angle: 0, length: 45, width: 22 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['destroyer']
  },
  
  rocketeer: {
    name: 'Rocketeer',
    barrels: [
      { angle: 0, length: 45, width: 22 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['destroyer']
  },
  
  spike: {
    name: 'Spike',
    barrels: [],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['smasher'],
    bodyShape: 'spikyHexagon',
    bodySpikes: 6
  },
  
  landmine: {
    name: 'Landmine',
    barrels: [],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['smasher'],
    bodyShape: 'hexagon',
    invisibility: { delay: 3, maxAlpha: 1.0 }
  },
  
  autosmasher: {
    name: 'Auto Smasher',
    barrels: [
      { angle: 0, length: 30, width: 11 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['smasher'],
    bodyShape: 'hexagon',
    autoTurrets: 1
  },
  
  auto5: {
    name: 'Auto 5',
    barrels: [
      { angle: 0, length: 30, width: 11 },
      { angle: 72, length: 30, width: 11 },
      { angle: 144, length: 30, width: 11 },
      { angle: 216, length: 30, width: 11 },
      { angle: 288, length: 30, width: 11 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['auto3'],
    autoTurrets: 5
  },
  
  autogunner: {
    name: 'Auto Gunner',
    barrels: [
      { angle: 0, length: 38, width: 8, offsetY: -9 },
      { angle: 0, length: 38, width: 8, offsetY: -3 },
      { angle: 0, length: 38, width: 8, offsetY: 3 },
      { angle: 0, length: 38, width: 8, offsetY: 9 },
      { angle: 180, length: 30, width: 11 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['gunner'],
    autoTurrets: 1
  },
  
  sprayer: {
    name: 'Sprayer',
    barrels: [
      { angle: 0, length: 38, width: 18, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['machinegun']
  },
  
  tripletwin: {
    name: 'Triple Twin',
    barrels: [
      { angle: 0, length: 40, width: 11, offsetY: -5 },
      { angle: 0, length: 40, width: 11, offsetY: 5 },
      { angle: 120, length: 40, width: 11, offsetY: -5 },
      { angle: 120, length: 40, width: 11, offsetY: 5 },
      { angle: 240, length: 40, width: 11, offsetY: -5 },
      { angle: 240, length: 40, width: 11, offsetY: 5 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['twinflank']
  },
  
  megatrapper: {
    name: 'Mega Trapper',
    barrels: [
      { angle: 0, length: 30, width: 28, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['trapper'],
    isTrapper: true,
    trapConfig: { size: 25, health: 150, duration: 45000 }
  },
  
  overtrapper: {
    name: 'Overtrapper',
    barrels: [
      { angle: 0, length: 25, width: 20, isTrapezoid: true },
      { angle: 135, length: 12, width: 16, isTrapezoid: true },
      { angle: 225, length: 12, width: 16, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['trapper'],
    isTrapper: true,
    trapConfig: { size: 15, health: 50, duration: 30000 },
    isDroneClass: true,
    droneCount: 2,
    droneType: 'triangle',
    spawnerCount: 2
  },
  
  gunnertrapper: {
    name: 'Gunner Trapper',
    barrels: [
      { angle: 0, length: 38, width: 8, offsetY: -6 },
      { angle: 0, length: 38, width: 8, offsetY: 6 },
      { angle: 180, length: 25, width: 20, isTrapezoid: true }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['gunner'],
    isTrapper: true,
    trapConfig: { size: 15, health: 50, duration: 30000 }
  },
  
  overlord: {
    name: 'Overlord',
    barrels: [
      { angle: 0, length: 12, width: 18, isTrapezoid: true, offsetY: -8 },
      { angle: 0, length: 12, width: 18, isTrapezoid: true, offsetY: 8 },
      { angle: 90, length: 12, width: 18, isTrapezoid: true, offsetY: -8 },
      { angle: 90, length: 12, width: 18, isTrapezoid: true, offsetY: 8 },
      { angle: 180, length: 12, width: 18, isTrapezoid: true, offsetY: -8 },
      { angle: 180, length: 12, width: 18, isTrapezoid: true, offsetY: 8 },
      { angle: 270, length: 12, width: 18, isTrapezoid: true, offsetY: -8 },
      { angle: 270, length: 12, width: 18, isTrapezoid: true, offsetY: 8 }
    ],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['overseer'],
    isDroneClass: true,
    droneCount: 8,
    droneType: 'triangle',
    spawnerCount: 4
  }
}

export function getAvailableUpgrades(currentClass: string, level: number): TankConfig[] {
  const available: TankConfig[] = []
  
  for (const key in TANK_CONFIGS) {
    const config = TANK_CONFIGS[key]
    if (config.unlocksAt === level && config.upgradesFrom?.includes(currentClass)) {
      available.push(config)
    }
  }
  
  return available
}

export function getUpgradesForClassAtLevel(currentClass: string, level: number): TankConfig[] {
  const available: TankConfig[] = []
  
  for (const key in TANK_CONFIGS) {
    const config = TANK_CONFIGS[key]
    if (config.unlocksAt <= level && config.upgradesFrom?.includes(currentClass)) {
      const currentConfig = TANK_CONFIGS[currentClass]
      if (config.tier === (currentConfig?.tier || 0) + 1) {
        available.push(config)
      }
    }
  }
  
  return available
}
