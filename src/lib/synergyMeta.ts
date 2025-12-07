import { TANK_CONFIGS } from './tankConfigs'
import type { StatType } from './upgradeSystem'

export const TWIN_LINE_CLASSES = new Set([
  'twin',
  'tripleshot',
  'quadtank',
  'twinflank',
  'pentashot',
  'triplet',
  'spreadshot',
  'octotank',
  'auto5',
  'tripletwin',
])

export const SNIPER_RANGE_CLASSES = new Set(['sniper', 'assassin', 'hunter', 'ranger', 'stalker', 'predator', 'streamliner'])

export const MACHINE_GUN_LINE_CLASSES = new Set([
  'machinegun',
  'destroyer',
  'gunner',
  'annihilator',
  'hybrid',
  'skimmer',
  'rocketeer',
  'sprayer',
  'autogunner',
  'gunnertrapper',
])

export const FLANK_LINE_CLASSES = new Set(['flankguard', 'triangle', 'booster', 'fighter'])

export const SMASHER_LINE_CLASSES = new Set(['smasher', 'crusher', 'spike', 'landmine', 'autosmasher'])

const NOTE_KEYWORDS: Record<StatType, RegExp> = {
  reload: /\breload\b/i,
  bulletSpeed: /bullet ?speed/i,
  bulletDamage: /bullet ?damage/i,
  bulletPenetration: /penetration|pierc/i,
  movementSpeed: /movement ?speed/i,
  maxHealth: /max ?health|shield/i,
  healthRegen: /health ?regen/i,
  bodyDamage: /body ?damage|collision|ram|slam/i,
  lootRange: /loot ?range|radius/i,
}

function collectLowTierSynergies(tankKey: string): StatType[] {
  const stats: StatType[] = []
  if (TWIN_LINE_CLASSES.has(tankKey)) stats.push('reload')
  if (SNIPER_RANGE_CLASSES.has(tankKey)) stats.push('bulletSpeed')
  if (MACHINE_GUN_LINE_CLASSES.has(tankKey)) stats.push('reload')
  if (FLANK_LINE_CLASSES.has(tankKey)) stats.push('movementSpeed')
  if (SMASHER_LINE_CLASSES.has(tankKey)) stats.push('bodyDamage')
  return stats
}

export function getSynergyStatsForClass(tankKey: string): StatType[] {
  const config = TANK_CONFIGS[tankKey]
  if (!config) return []

  const stats = new Set<StatType>()
  collectLowTierSynergies(tankKey).forEach(stat => stats.add(stat))

  if (config.isDroneClass) {
    stats.add('bulletSpeed')
  }

  if (config.synergyNote) {
    const note = config.synergyNote
    for (const [stat, regex] of Object.entries(NOTE_KEYWORDS)) {
      if (regex.test(note)) {
        stats.add(stat as StatType)
      }
    }
  }

  return Array.from(stats)
}

function extractClauses(note: string): string[] {
  const base = note.split(/\.|;/)
  const clauses: string[] = []
  for (const fragment of base) {
    fragment
      .split(/(?:\bwhile\b|\band\b)/i)
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => clauses.push(part))
  }
  return clauses.filter(Boolean)
}

export function getSynergyDescription(tankKey: string, stat: StatType): string | null {
  const config = TANK_CONFIGS[tankKey]
  if (!config) return null

  if (TWIN_LINE_CLASSES.has(tankKey) && stat === 'reload') {
    return 'Reload keeps paired barrels synchronized for the Twin line.'
  }
  if (SNIPER_RANGE_CLASSES.has(tankKey) && stat === 'bulletSpeed') {
    return 'Bullet Speed extends reach for precision sniper branches.'
  }
  if (MACHINE_GUN_LINE_CLASSES.has(tankKey) && stat === 'reload') {
    return 'Reload controls spin-up and heat dissipation for machine gun tanks.'
  }
  if (FLANK_LINE_CLASSES.has(tankKey) && stat === 'movementSpeed') {
    return 'Movement Speed tightens thruster pivots for flank guards.'
  }
  if (SMASHER_LINE_CLASSES.has(tankKey) && stat === 'bodyDamage') {
    return 'Body Damage multiplies collision force for smasher hulls.'
  }
  if (config.isDroneClass && stat === 'bulletSpeed') {
    return 'Bullet Speed accelerates drone orbits and chase behavior.'
  }

  if (config.synergyNote && NOTE_KEYWORDS[stat]?.test(config.synergyNote)) {
    const clauses = extractClauses(config.synergyNote)
    const clause = clauses.find(cl => NOTE_KEYWORDS[stat].test(cl)) || config.synergyNote
    return clause.trim()
  }

  return null
}
