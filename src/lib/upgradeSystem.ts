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

const SKILL_POINTS_BY_LEVEL: { [key: number]: number } = {
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9,
  11: 10, 12: 11, 13: 12, 14: 13, 15: 14, 16: 15, 17: 16, 18: 17, 19: 18, 20: 19,
  21: 20, 22: 21, 23: 22, 24: 23, 25: 24, 26: 25, 27: 26, 28: 27,
  29: 27, 30: 28, 31: 28, 32: 29, 33: 29, 34: 30, 35: 30, 36: 31,
  37: 31, 38: 31, 39: 32, 40: 32, 41: 32, 42: 33, 43: 33, 44: 33, 45: 33
}

const XP_CURVE: { [key: number]: number } = {
  1: 0, 2: 100, 3: 250, 4: 500, 5: 850, 6: 1300, 7: 1900, 8: 2700, 9: 3700, 10: 5000,
  11: 6600, 12: 8500, 13: 10800, 14: 13500, 15: 16700, 16: 20500, 17: 24900, 18: 30000, 19: 35900, 20: 42700,
  21: 50500, 22: 59500, 23: 69800, 24: 81500, 25: 94800, 26: 110000, 27: 127000, 28: 146000, 29: 167000, 30: 190000,
  31: 216000, 32: 245000, 33: 277000, 34: 313000, 35: 353000, 36: 398000, 37: 448000, 38: 504000, 39: 566000, 40: 635000,
  41: 712000, 42: 797000, 43: 891000, 44: 995000, 45: 1110000
}

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
  machineGun: {
    name: 'Machine Gun',
    tier: 1,
    requiredLevel: 15,
    parent: 'basic',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 14, length: 18 }],
    description: 'Rapid fire at the cost of accuracy'
  },
  flankGuard: {
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
  tripleShot: {
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
  quadTank: {
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
    parent: 'machineGun',
    barrels: [{ offsetX: 0, offsetY: 0, angle: 0, width: 20, length: 20 }],
    description: 'Massive bullets with huge recoil'
  },
  triAngle: {
    name: 'Tri-Angle',
    tier: 2,
    requiredLevel: 30,
    parent: 'flankGuard',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 0, angle: Math.PI * 5 / 6, width: 10, length: 16 },
      { offsetX: 0, offsetY: 0, angle: -Math.PI * 5 / 6, width: 10, length: 16 }
    ],
    description: 'Speed through recoil'
  },
  pentaShot: {
    name: 'Penta Shot',
    tier: 3,
    requiredLevel: 45,
    parent: 'tripleShot',
    barrels: [
      { offsetX: 0, offsetY: -12, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: -6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 0, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 6, angle: 0, width: 10, length: 20 },
      { offsetX: 0, offsetY: 12, angle: 0, width: 10, length: 20 }
    ],
    description: 'Five barrels of devastation'
  },
  octoTank: {
    name: 'Octo Tank',
    tier: 3,
    requiredLevel: 45,
    parent: 'quadTank',
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
    parent: 'triAngle',
    barrels: [
      { offsetX: 0, offsetY: 0, angle: 0, width: 12, length: 22 },
      { offsetX: 0, offsetY: 4, angle: Math.PI * 5 / 6, width: 8, length: 14 },
      { offsetX: 0, offsetY: -4, angle: -Math.PI * 5 / 6, width: 8, length: 14 },
      { offsetX: 0, offsetY: 8, angle: Math.PI, width: 8, length: 14 },
      { offsetX: 0, offsetY: -8, angle: Math.PI, width: 8, length: 14 }
    ],
    description: 'Maximum speed and agility'
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
    const maxPoints = SKILL_POINTS_BY_LEVEL[this.level] || 0
    return maxPoints - totalAllocated
  }

  canAllocateStat(stat: StatType): boolean {
    return this.getAvailableSkillPoints() > 0
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

    switch (stat) {
      case 'reload':
        return base * Math.pow(0.93, points)
      
      case 'healthRegen':
        return base * Math.pow(1.35, points)
      
      case 'maxHealth':
        return base + (points * 25)
      
      case 'bodyDamage':
        return base * Math.pow(1.15, points)
      
      case 'bulletSpeed':
        return base * Math.pow(1.08, points)
      
      case 'bulletPenetration':
        return base * Math.pow(1.2, points)
      
      case 'bulletDamage':
        return base * Math.pow(1.15, points)
      
      case 'movementSpeed':
        return base * Math.pow(1.07, points)
      
      case 'lootRange':
        return base * Math.pow(1.35, points)
      
      default:
        return base
    }
  }

  getXPForLevel(level: number): number {
    return XP_CURVE[level] || 0
  }

  addXP(amount: number): boolean {
    this.totalXP += amount
    const nextLevel = this.level + 1
    
    if (nextLevel <= 45 && this.totalXP >= this.getXPForLevel(nextLevel)) {
      this.level = nextLevel
      return true
    }
    return false
  }

  getAvailableUpgrades(): TankClass[] {
    const available: TankClass[] = []
    
    for (const key in TANK_CLASSES) {
      const tank = TANK_CLASSES[key]
      if (tank.parent === this.currentClass && this.level >= tank.requiredLevel) {
        available.push(tank)
      }
    }
    
    return available
  }

  upgradeTank(tankKey: string): boolean {
    const tank = TANK_CLASSES[tankKey]
    if (!tank) return false
    
    if (tank.parent === this.currentClass && this.level >= tank.requiredLevel) {
      this.currentClass = tankKey
      return true
    }
    return false
  }

  getCurrentTank(): TankClass {
    return TANK_CLASSES[this.currentClass]
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
    if (this.level >= 45) return 0
    return this.getXPForLevel(this.level + 1) - this.totalXP
  }

  getCurrentXPInLevel(): number {
    const currentLevelXP = this.getXPForLevel(this.level)
    return this.totalXP - currentLevelXP
  }

  getXPRequiredForCurrentLevel(): number {
    if (this.level >= 45) return 0
    const currentLevelXP = this.getXPForLevel(this.level)
    const nextLevelXP = this.getXPForLevel(this.level + 1)
    return nextLevelXP - currentLevelXP
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
}
