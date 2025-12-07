export interface BarrelConfig {
  angle: number
  length: number
  width: number
  offsetX?: number
  offsetY?: number
  isTrapezoid?: boolean
}

export interface TankConfig {
  key?: string // Added for lookup
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
  hasDecoy?: boolean
  decoyConfig?: {
    revealDuration: number // seconds to stay visible after firing
    fadeDuration: number // seconds to fade back into invisibility
    moveSpeed: number // units per second the decoy can travel
  }
  synergyNote?: string
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
      { angle: 0, length: 40, width: 12, offsetY: -6 },
      { angle: 0, length: 40, width: 12, offsetY: 6 }
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
    upgradesFrom: ['flankguard', 'twin']
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
      { angle: 90, length: 12, width: 18, isTrapezoid: true },
      { angle: -90, length: 12, width: 18, isTrapezoid: true }
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
    upgradesFrom: ['machinegun']
  },
  
  triangle: {
    name: 'Tri-Angle',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 150, length: 30, width: 12 },
      { angle: -150, length: 30, width: 12 }
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
      { angle: 135, length: 28, width: 11 },
      { angle: 150, length: 28, width: 11 },
      { angle: -150, length: 28, width: 11 },
      { angle: -135, length: 28, width: 11 }
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

  crusher: {
    name: 'Crusher',
    barrels: [],
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['smasher'],
    bodyShape: 'hexagon',
    bodySpikes: 0
  },
  
  // === TIER 2: NEW TANKS ===
  
  hunter: {
    name: 'Hunter',
    barrels: [
      { angle: 0, length: 55, width: 14 },
      { angle: 0, length: 50, width: 10 }
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
    barrels: [], // No player-controlled barrels - only auto turrets
    tier: 2,
    unlocksAt: 30,
    upgradesFrom: ['flankguard'],
    autoTurrets: 3,
    synergyNote: 'Reload tightens turret fire cadence while lootRange extends detection rings; bulletSpeed, bulletDamage, and movementSpeed boost turret reach, punch, and orbit spin.'
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
      { angle: 0, length: 60, width: 16 },
      { angle: 0, length: 55, width: 12 },
      { angle: 0, length: 50, width: 9 }
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
    droneCount: 16,
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
    droneCount: 12,
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
    upgradesFrom: ['overseer', 'twinflank'],
    isDroneClass: true,
    droneCount: 32,
    droneType: 'triangle',
    spawnerCount: 4
  },
  
  fighter: {
    name: 'Fighter',
    barrels: [
      { angle: 0, length: 40, width: 14 },
      { angle: 90, length: 32, width: 11 },
      { angle: -90, length: 32, width: 11 },
      { angle: 150, length: 28, width: 11 },
      { angle: -150, length: 28, width: 11 }
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
    droneCount: 8,
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
    upgradesFrom: ['crusher'],
    bodyShape: 'spikyHexagon',
    bodySpikes: 6
  },
  
  landmine: {
    name: 'Landmine',
    barrels: [],
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['crusher'],
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
    upgradesFrom: ['crusher'],
    bodyShape: 'hexagon',
    autoTurrets: 1
  },
  
  auto5: {
    name: 'Auto 5',
    barrels: [], // No player-controlled barrels - only auto turrets
    tier: 3,
    unlocksAt: 45,
    upgradesFrom: ['auto3', 'quadtank'],
    autoTurrets: 5,
    synergyNote: 'Reload plus movementSpeed keep the pentagonal battery spinning while lootRange, bulletSpeed, and bulletDamage expand turret leash, tracer speed, and impact.'
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

  // === TIER 4: EVOLUTION ===

  siegebreaker: {
    name: 'Siegebreaker',
    barrels: [
      { angle: 0, length: 70, width: 26, isTrapezoid: true }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['annihilator', 'skimmer', 'rocketeer'],
    bodyShape: 'square',
    synergyNote: 'Charge cannonball damage scales with bulletDamage while reload shortens with bodyDamage.'
  },

  aegisvanguard: {
    name: 'Aegis Vanguard',
    barrels: [
      { angle: 0, length: 28, width: 18 },
      { angle: 140, length: 22, width: 10 },
      { angle: -140, length: 22, width: 10 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['spike', 'landmine', 'autosmasher'],
    bodyShape: 'spikyHexagon',
    bodySpikes: 8,
    synergyNote: 'Converts movementSpeed into shield orbit speed and bodyDamage into shield slam hits.'
  },

  mirage: {
    name: 'Mirage',
    barrels: [
      { angle: 0, length: 60, width: 10 },
      { angle: 15, length: 45, width: 8 },
      { angle: -15, length: 45, width: 8 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['stalker'],
    invisibility: { delay: 0.5, maxAlpha: 0.85 },
    hasDecoy: true,
    decoyConfig: { revealDuration: 3, fadeDuration: 1.5, moveSpeed: 900 },
    synergyNote: 'Reload lowers the re-cloak time while movementSpeed boosts decoy responsiveness.'
  },

  starfallarsenal: {
    name: 'Starfall Arsenal',
    barrels: [
      { angle: -35, length: 46, width: 11 },
      { angle: -25, length: 48, width: 11 },
      { angle: -12, length: 50, width: 12 },
      { angle: 0, length: 54, width: 13 },
      { angle: 12, length: 50, width: 12 },
      { angle: 25, length: 48, width: 11 },
      { angle: 35, length: 46, width: 11 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['pentashot', 'triplet', 'spreadshot'],
    hasSpeedLines: true,
    synergyNote: 'Reload controls staggered salvos while bulletPenetration amplifies piercing crescents.'
  },

  orbitalarray: {
    name: 'Orbital Array',
    barrels: [
      { angle: 0, length: 40, width: 13 },
      { angle: 45, length: 40, width: 13 },
      { angle: 90, length: 40, width: 13 },
      { angle: 135, length: 40, width: 13 },
      { angle: 180, length: 40, width: 13 },
      { angle: 225, length: 40, width: 13 },
      { angle: 270, length: 40, width: 13 },
      { angle: 315, length: 40, width: 13 },
      { angle: 22.5, length: 44, width: 10 },
      { angle: 67.5, length: 44, width: 10 },
      { angle: 112.5, length: 44, width: 10 },
      { angle: 157.5, length: 44, width: 10 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['octotank', 'auto5', 'tripletwin'],
    autoTurrets: 2,
    synergyNote: 'LootRange extends satellite spacing while reload syncs rotational volleys.'
  },

  phasesentinel: {
    name: 'Phase Sentinel',
    barrels: [
      { angle: 0, length: 76, width: 9 },
      { angle: 0, length: 52, width: 6, offsetY: -4 },
      { angle: 0, length: 52, width: 6, offsetY: 4 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['ranger', 'predator', 'streamliner'],
    hasSpeedLines: true,
    synergyNote: 'BulletSpeed increases rail length while reload governs the phasing reticle.'
  },

  gravemindregent: {
    name: 'Gravemind Regent',
    barrels: [],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['necromancer', 'manager'],
    bodyShape: 'square',
    isDroneClass: true,
    droneCount: 42,
    droneType: 'square',
    spawnerCount: 3,
    synergyNote: 'HealthRegen fuels husk conversion while bulletDamage fortifies thrall strikes.'
  },

  armadacolossus: {
    name: 'Armada Colossus',
    barrels: [
      { angle: 0, length: 26, width: 24, isTrapezoid: true }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['factory', 'battleship', 'overlord', 'auto5'],
    isDroneClass: true,
    droneCount: 28,
    droneType: 'triangle',
    spawnerCount: 4,
    autoTurrets: 2,
    synergyNote: 'BulletDamage empowers carrier cannons while lootRange extends drone patrol radius.'
  },

  citadelshaper: {
    name: 'Citadel Shaper',
    barrels: [
      { angle: 0, length: 32, width: 26, isTrapezoid: true },
      { angle: 135, length: 24, width: 16, isTrapezoid: true },
      { angle: 225, length: 24, width: 16, isTrapezoid: true }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['megatrapper', 'overtrapper', 'gunnertrapper'],
    isTrapper: true,
    trapConfig: { size: 32, health: 220, duration: 52000 },
    synergyNote: 'BulletPenetration reinforces trap walls while reload dictates lattice weaving speed.'
  },

  cyclonebulwark: {
    name: 'Cyclone Bulwark',
    barrels: [
      { angle: 0, length: 46, width: 12, offsetY: -10 },
      { angle: 0, length: 46, width: 12, offsetY: 10 },
      { angle: 120, length: 46, width: 12, offsetY: -10 },
      { angle: 120, length: 46, width: 12, offsetY: 10 },
      { angle: 240, length: 46, width: 12, offsetY: -10 },
      { angle: 240, length: 46, width: 12, offsetY: 10 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['autogunner', 'sprayer'],
    hasSpeedLines: true,
    autoTurrets: 1,
    synergyNote: 'Reload accelerates cyclone pulses while bulletSpeed stretches wind shear arcs.'
  },

  fusionhydra: {
    name: 'Fusion Hydra',
    barrels: [
      { angle: 0, length: 50, width: 20 },
      { angle: 140, length: 28, width: 12 },
      { angle: -140, length: 28, width: 12 },
      { angle: 180, length: 32, width: 12 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['hybrid'],
    isDroneClass: true,
    droneCount: 12,
    droneType: 'triangle',
    spawnerCount: 2,
    synergyNote: 'BodyDamage converts into recoil rockets while bulletDamage amplifies the forward lance.'
  },

  velocityreaver: {
    name: 'Velocity Reaver',
    barrels: [
      { angle: 0, length: 44, width: 14 },
      { angle: 150, length: 30, width: 10 },
      { angle: -150, length: 30, width: 10 },
      { angle: 180, length: 28, width: 10 }
    ],
    tier: 4,
    unlocksAt: 60,
    upgradesFrom: ['fighter', 'booster'],
    hasSpeedLines: true,
    bodyShape: 'hexagon',
    synergyNote: 'MovementSpeed feeds dash cooldowns while bodyDamage deepens slice crits.'
  },

  // === TIER 5: MYTHIC ===

  obelisk: {
    name: 'Obelisk',
    barrels: [
      { angle: 0, length: 65, width: 12 },
      { angle: 45, length: 30, width: 10 },
      { angle: -45, length: 30, width: 10 }
    ],
    tier: 5,
    unlocksAt: 75,
    upgradesFrom: ['phasesentinel', 'citadelshaper', 'mirage'],
    isTrapper: true,
    trapConfig: { size: 35, health: 200, duration: 50000 },
    bodyShape: 'square',
    synergyNote: 'BulletPenetration extends laser walls and lootRange increases pylon placement radius.'
  },

  tempest: {
    name: 'Tempest',
    barrels: [
      { angle: 0, length: 40, width: 12, offsetY: -10 },
      { angle: 0, length: 40, width: 12, offsetY: 10 },
      { angle: 120, length: 40, width: 12, offsetY: -10 },
      { angle: 120, length: 40, width: 12, offsetY: 10 },
      { angle: 240, length: 40, width: 12, offsetY: -10 },
      { angle: 240, length: 40, width: 12, offsetY: 10 }
    ],
    tier: 5,
    unlocksAt: 75,
    upgradesFrom: ['cyclonebulwark', 'orbitalarray'],
    hasSpeedLines: true,
    synergyNote: 'Reload controls vortex spin while bulletSpeed expands the cyclone radius.'
  },

  bulwarkprime: {
    name: 'Bulwark Prime',
    barrels: [
      { angle: 0, length: 30, width: 24, isTrapezoid: true },
      { angle: 140, length: 26, width: 14 },
      { angle: -140, length: 26, width: 14 }
    ],
    tier: 5,
    unlocksAt: 75,
    upgradesFrom: ['aegisvanguard'],
    bodyShape: 'spikyHexagon',
    bodySpikes: 10,
    synergyNote: 'MaxHealth amplifies shield plating while bodyDamage supercharges retaliatory slams.'
  },

  cataclysmengine: {
    name: 'Cataclysm Engine',
    barrels: [
      { angle: 0, length: 80, width: 30, isTrapezoid: true },
      { angle: 10, length: 60, width: 14 },
      { angle: -10, length: 60, width: 14 }
    ],
    tier: 5,
    unlocksAt: 75,
    upgradesFrom: ['siegebreaker'],
    hasSpeedLines: true,
    synergyNote: 'Reload governs siege charge while bulletDamage feeds shockwave overkill.'
  },

  astralregent: {
    name: 'Astral Regent',
    barrels: [
      { angle: 0, length: 28, width: 22, isTrapezoid: true }
    ],
    tier: 5,
    unlocksAt: 75,
    upgradesFrom: ['gravemindregent', 'armadacolossus'],
    isDroneClass: true,
    droneCount: 36,
    droneType: 'triangle',
    spawnerCount: 4,
    synergyNote: 'HealthRegen fuels warp anchors while bulletSpeed hastens redeployment.'
  },

  ionvanguard: {
    name: 'Ion Vanguard',
    barrels: [
      { angle: 0, length: 48, width: 16 },
      { angle: 150, length: 34, width: 12 },
      { angle: -150, length: 34, width: 12 }
    ],
    tier: 5,
    unlocksAt: 75,
    upgradesFrom: ['velocityreaver', 'fusionhydra', 'starfallarsenal'],
    hasSpeedLines: true,
    synergyNote: 'MovementSpeed fuels ion trails while bulletDamage amplifies lance detonations.'
  },

  // === TIER 6: ASCENDED ===

  // === TIER 6: ASCENDED ===

  riftwalker: {
    name: 'Riftwalker',
    barrels: [
      { angle: 0, length: 20, width: 24, isTrapezoid: true }
    ],
    tier: 6,
    unlocksAt: 90,
    upgradesFrom: ['astralregent'],
    isDroneClass: true,
    droneCount: 24,
    droneType: 'triangle',
    spawnerCount: 4,
    synergyNote: 'HealthRegen shortens teleport cooldown and bulletSpeed quickens drone re-materialization.'
  },

  catalyst: {
    name: 'Catalyst',
    barrels: [
      { angle: 0, length: 45, width: 16 },
      { angle: 150, length: 25, width: 10 },
      { angle: -150, length: 25, width: 10 }
    ],
    tier: 6,
    unlocksAt: 90,
    upgradesFrom: ['ionvanguard'],
    hasSpeedLines: true,
    synergyNote: 'MovementSpeed builds combo stacks faster while bodyDamage supercharges the shockwave.'
  },

  bastioneternal: {
    name: 'Bastion Eternal',
    barrels: [
      { angle: 0, length: 34, width: 26, isTrapezoid: true },
      { angle: 150, length: 28, width: 16 },
      { angle: -150, length: 28, width: 16 },
      { angle: 180, length: 30, width: 16 }
    ],
    tier: 6,
    unlocksAt: 90,
    upgradesFrom: ['bulwarkprime'],
    bodyShape: 'spikyHexagon',
    bodySpikes: 12,
    synergyNote: 'MaxHealth converts into overshield layers while movementSpeed accelerates shield rotation.'
  },

  doomsdayharbinger: {
    name: 'Doomsday Harbinger',
    barrels: [
      { angle: 0, length: 90, width: 32, isTrapezoid: true },
      { angle: 15, length: 65, width: 16 },
      { angle: -15, length: 65, width: 16 }
    ],
    tier: 6,
    unlocksAt: 90,
    upgradesFrom: ['cataclysmengine'],
    hasSpeedLines: true,
    synergyNote: 'Reload tightens apocalypse cadence while bulletPenetration expands rupture radius.'
  },

  prismarchon: {
    name: 'Prism Archon',
    barrels: [
      { angle: 0, length: 70, width: 14 },
      { angle: 60, length: 50, width: 10 },
      { angle: -60, length: 50, width: 10 }
    ],
    tier: 6,
    unlocksAt: 90,
    upgradesFrom: ['obelisk'],
    isTrapper: true,
    trapConfig: { size: 40, health: 260, duration: 60000 },
    synergyNote: 'BulletPenetration refracts beam walls while lootRange widens pylon network radius.'
  },

  maelstromsovereign: {
    name: 'Maelstrom Sovereign',
    barrels: [
      { angle: 0, length: 52, width: 14, offsetY: -12 },
      { angle: 0, length: 52, width: 14, offsetY: 12 },
      { angle: 120, length: 52, width: 14, offsetY: -12 },
      { angle: 120, length: 52, width: 14, offsetY: 12 },
      { angle: 240, length: 52, width: 14, offsetY: -12 },
      { angle: 240, length: 52, width: 14, offsetY: 12 }
    ],
    tier: 6,
    unlocksAt: 90,
    upgradesFrom: ['tempest'],
    hasSpeedLines: true,
    autoTurrets: 2,
    synergyNote: 'Reload fuels wave frequency while bulletSpeed stretches maelstrom radius.'
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
    droneCount: 8,
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
      { angle: 0, length: 12, width: 18, isTrapezoid: true },
      { angle: 90, length: 12, width: 18, isTrapezoid: true },
      { angle: 180, length: 12, width: 18, isTrapezoid: true },
      { angle: -90, length: 12, width: 18, isTrapezoid: true }
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
    // Use <= instead of === to catch level-ups even if player skipped levels
    // Allow tier jumps (>=) so branches without a mid-tier, like smashers, still show upgrades
    if (config.unlocksAt <= level && config.upgradesFrom?.includes(currentClass)) {
      const currentConfig = TANK_CONFIGS[currentClass]
      if (config.tier >= (currentConfig?.tier || 0) + 1) {
        available.push(config)
      }
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
      if (config.tier >= (currentConfig?.tier || 0) + 1) {
        available.push({ ...config, key }) // Include the key
      }
    }
  }
  
  return available
}
