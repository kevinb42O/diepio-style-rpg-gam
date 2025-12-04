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
    upgradesFrom: ['triangle']
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
