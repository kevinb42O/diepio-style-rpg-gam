/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         🎮 NEXUS WARS ARENA 🎮                               ║
 * ║                                                                               ║
 * ║  A revolutionary team-based battleground designed for epic multiplayer       ║
 * ║  warfare. Two teams clash for territorial control across strategic zones.    ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  • Team Bases with regeneration forges                                       ║
 * ║  • 5 Capture Points with unique power-ups                                    ║
 * ║  • 3 Strategic Lanes (Top/Mid/Bot)                                           ║
 * ║  • Dynamic Events (Meteor Showers, Boss Invasions, Supply Drops)             ║
 * ║  • Central Nexus with legendary rewards                                      ║
 * ║  • Territorial Control = Team Buffs                                          ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Zone, PointOfInterest, Vector2, Rarity, Team } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL POINT SYSTEM - Strategic locations teams fight to control
// ═══════════════════════════════════════════════════════════════════════════════

export interface ControlPoint {
  id: string
  name: string
  position: Vector2
  radius: number
  controllingTeam: Team
  captureProgress: number // -100 (full red) to +100 (full blue), 0 = neutral
  contestedBy: Team[]
  powerUpType: 'damage' | 'speed' | 'health' | 'xp' | 'regen'
  powerUpStrength: number // Multiplier (e.g., 1.15 = 15% boost)
  isContested: boolean
  captureSpeed: number // Points per second when capturing
  visualPulse: number // For rendering effects
}

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC EVENTS - Keep the battlefield exciting and unpredictable
// ═══════════════════════════════════════════════════════════════════════════════

export type EventType = 
  | 'meteor_shower'   // Dangerous but drops rare loot
  | 'energy_surge'    // Power-up field that boosts everyone inside
  | 'boss_invasion'   // Powerful boss spawns - team that kills it gets rewards
  | 'supply_drop'     // Parachuting legendary crate
  | 'blood_moon'      // All damage increased, XP doubled
  | 'forge_overcharge' // Bases provide mega healing

export interface DynamicEvent {
  id: string
  type: EventType
  name: string
  description: string
  position: Vector2
  radius: number
  startTime: number
  duration: number
  warningDuration: number // Time before event starts with warning
  isActive: boolean
  intensity: number // 0-1, affects visuals and power
  affectedTeam?: Team // Some events target specific teams
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLY DROP SYSTEM - Intense mini-battles for legendary loot
// ═══════════════════════════════════════════════════════════════════════════════

export interface SupplyDrop {
  id: string
  position: Vector2
  targetPosition: Vector2
  radius: number
  dropSpeed: number
  altitude: number // For parachute animation
  lootTier: 'rare' | 'epic' | 'legendary'
  isLanded: boolean
  landTime: number
  despawnTime: number // Disappears if not claimed
  claimedBy?: Team
  contents: SupplyDropContents
}

export interface SupplyDropContents {
  xpAmount: number
  healthPack: boolean
  weaponTier?: Rarity
  bonusType?: 'damage' | 'speed' | 'shield'
  bonusDuration?: number
  statPoints?: number // New: free stat points!
  lootItems?: Array<{type: 'box' | 'treasure', tier: Rarity, count: number}> // New: spawn actual loot
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANE SYSTEM - Three distinct paths with different strategies
// ═══════════════════════════════════════════════════════════════════════════════

export interface Lane {
  id: 'top' | 'mid' | 'bot'
  name: string
  description: string
  startBlue: Vector2
  endRed: Vector2
  width: number
  laneType: 'jungle' | 'combat' | 'farming'
  dangerLevel: number // 1-3
  lootDensity: number // Shapes per area
  botDensity: number
  color: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM BASE SYSTEM - Safe zones with regeneration forges
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeamBase {
  team: Team
  position: Vector2
  safeRadius: number // Full safety zone
  outerRadius: number // Territory but not fully safe
  forgePosition: Vector2
  forgeRadius: number
  forgeRegenRate: number // HP per second when inside
  isOvercharged: boolean // During forge_overcharge event
  color: string
  glowColor: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE NEXUS - Central capture point that expands territory when occupied
// ═══════════════════════════════════════════════════════════════════════════════

export interface Nexus {
  position: Vector2
  captureRadius: number // Base radius where players stand to capture
  territoryRadius: number // Current territory influence radius (grows when captured)
  maxTerritoryRadius: number // Maximum territory can expand to (covers entire map)
  controllingTeam: Team
  captureProgress: number // -100 (full red) to +100 (full blue), 0 = neutral
  contestedBy: Team[]
  isContested: boolean
  captureSpeed: number // Base capture speed per player
  expansionSpeed: number // How fast territory expands (units per second per player)
  occupantCount: { blue: number; red: number } // Number of players in the zone
  visualPulse: number // For rendering effects
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM BUFFS - Rewards for territorial control
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeamBuffs {
  damageMultiplier: number
  speedMultiplier: number
  xpMultiplier: number
  regenMultiplier: number
  controlPointsOwned: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ZONE SYSTEM CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoneSystem {
  // World dimensions (rectangular battlefield, not circular!)
  public readonly worldWidth = 16000
  public readonly worldHeight = 12000
  private worldCenter: Vector2 = { x: 8000, y: 6000 }
  
  // Legacy compatibility
  private zones: Zone[] = []
  private currentZone: number = 1
  private lastZoneChangeTime: number = 0
  
  // NEW: Strategic Systems
  public controlPoints: ControlPoint[] = []
  public teamBases: Map<Team, TeamBase> = new Map()
  public lanes: Lane[] = []
  public nexus!: Nexus
  
  // NEW: Dynamic Events
  public activeEvents: DynamicEvent[] = []
  public supplyDrops: SupplyDrop[] = []
  private lastEventTime: number = 0
  private eventCooldown: number = 30000 // 30 seconds between events
  private eventIdCounter: number = 0
  
  // NEW: Team Control & Buffs
  public teamBuffs: Map<Team, TeamBuffs> = new Map()
  private territoryControl = { blue: 0, red: 0 }
  private notificationTimestamps: Map<string, number> = new Map()
  
  // Event notification callback (for toast notifications)
  public onEventNotification: ((title: string, description: string, type: 'info' | 'warning' | 'success') => void) | null = null

  constructor() {
    this.initializeTeamBases()
    this.initializeControlPoints()
    this.initializeLanes()
    this.initializeNexus()
    this.initializeZonesLegacy()
    this.initializeTeamBuffs()
    
    // Spawn an initial supply drop after a short delay so players see events early
    setTimeout(() => {
      this.spawnSupplyDrop()
    }, 5000)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  private initializeTeamBases() {
    // BLUE BASE - Left side of map
    this.teamBases.set('blue', {
      team: 'blue',
      position: { x: 1500, y: 6000 },
      safeRadius: 800,
      outerRadius: 1500,
      forgePosition: { x: 1200, y: 6000 },
      forgeRadius: 200,
      forgeRegenRate: 25, // 25 HP/sec
      isOvercharged: false,
      color: '#1a3d5c',
      glowColor: '#00aaff'
    })

    // RED BASE - Right side of map  
    this.teamBases.set('red', {
      team: 'red',
      position: { x: 14500, y: 6000 },
      safeRadius: 800,
      outerRadius: 1500,
      forgePosition: { x: 14800, y: 6000 },
      forgeRadius: 200,
      forgeRegenRate: 25,
      isOvercharged: false,
      color: '#5c1a1a',
      glowColor: '#ff4444'
    })
  }

  private initializeControlPoints() {
    // 5 Strategic Control Points across the map
    this.controlPoints = [
      {
        id: 'alpha',
        name: 'Alpha Spire',
        position: { x: 4000, y: 3000 }, // Top lane, blue side
        radius: 350,
        controllingTeam: 'neutral',
        captureProgress: 0,
        contestedBy: [],
        powerUpType: 'damage',
        powerUpStrength: 1.12, // 12% damage boost
        isContested: false,
        captureSpeed: 8,
        visualPulse: 0
      },
      {
        id: 'beta',
        name: 'Beta Citadel',
        position: { x: 12000, y: 3000 }, // Top lane, red side
        radius: 350,
        controllingTeam: 'neutral',
        captureProgress: 0,
        contestedBy: [],
        powerUpType: 'speed',
        powerUpStrength: 1.15, // 15% speed boost
        isContested: false,
        captureSpeed: 8,
        visualPulse: Math.PI / 2
      },
      {
        id: 'nexus_point',
        name: 'Nexus Core',
        position: { x: 8000, y: 6000 }, // Dead center
        radius: 500,
        controllingTeam: 'neutral',
        captureProgress: 0,
        contestedBy: [],
        powerUpType: 'xp',
        powerUpStrength: 1.25, // 25% XP boost - most valuable!
        isContested: false,
        captureSpeed: 5, // Slower to capture, harder to hold
        visualPulse: Math.PI
      },
      {
        id: 'gamma',
        name: 'Gamma Forge',
        position: { x: 4000, y: 9000 }, // Bot lane, blue side
        radius: 350,
        controllingTeam: 'neutral',
        captureProgress: 0,
        contestedBy: [],
        powerUpType: 'regen',
        powerUpStrength: 1.5, // 50% regen boost
        isContested: false,
        captureSpeed: 8,
        visualPulse: Math.PI * 1.5
      },
      {
        id: 'delta',
        name: 'Delta Arsenal',
        position: { x: 12000, y: 9000 }, // Bot lane, red side
        radius: 350,
        controllingTeam: 'neutral',
        captureProgress: 0,
        contestedBy: [],
        powerUpType: 'health',
        powerUpStrength: 1.2, // 20% max health boost
        isContested: false,
        captureSpeed: 8,
        visualPulse: 0
      }
    ]
  }

  private initializeLanes() {
    this.lanes = [
      {
        id: 'top',
        name: 'Jungle Path',
        description: 'Dense with resources, high risk from ambushes',
        startBlue: { x: 2500, y: 2000 },
        endRed: { x: 13500, y: 2000 },
        width: 1200,
        laneType: 'jungle',
        dangerLevel: 2,
        lootDensity: 1.5,
        botDensity: 0.7,
        color: '#2d4a2d'
      },
      {
        id: 'mid',
        name: 'War Highway',
        description: 'The main battleground - direct path between bases',
        startBlue: { x: 2500, y: 6000 },
        endRed: { x: 13500, y: 6000 },
        width: 1800,
        laneType: 'combat',
        dangerLevel: 3,
        lootDensity: 0.8,
        botDensity: 1.5,
        color: '#4a3d2d'
      },
      {
        id: 'bot',
        name: 'Harvest Fields',
        description: 'Rich in XP shapes, safer for farming',
        startBlue: { x: 2500, y: 10000 },
        endRed: { x: 13500, y: 10000 },
        width: 1400,
        laneType: 'farming',
        dangerLevel: 1,
        lootDensity: 2.0,
        botDensity: 0.5,
        color: '#3d3d1a'
      }
    ]
  }

  private initializeNexus() {
    this.nexus = {
      position: { x: 8000, y: 6000 },
      captureRadius: 600, // Players must be within this radius to capture
      territoryRadius: 800, // Starting territory influence
      maxTerritoryRadius: Math.max(this.worldWidth, this.worldHeight), // Can expand to cover entire map
      controllingTeam: 'neutral',
      captureProgress: 0,
      contestedBy: [],
      isContested: false,
      captureSpeed: 0.14, // Base capture speed (~10 minutes solo to reach 75% control, ~13 min to 100%)
      expansionSpeed: 1.5, // Territory grows 1.5 units/sec per player (entire map takes 2+ hours solo)
      occupantCount: { blue: 0, red: 0 },
      visualPulse: 0
    }
  }

  private initializeZonesLegacy() {
    // Legacy zone system for compatibility - now maps to the new battlefield
    
    // Zone 1 - Team Bases (Safe Zones)
    this.zones.push({
      id: 1,
      name: 'Base Territory',
      radiusMin: 0,
      radiusMax: 2000,
      floorColorInner: '#1a2a3a',
      floorColorOuter: '#0d1520',
      enemyLevelMin: 0,
      enemyLevelMax: 0,
      enemyTiers: [],
      maxBots: 0,
      lootRarities: ['common', 'rare'],
      poi: {
        id: 'spawn',
        name: 'Team Spawn',
        position: { x: 1500, y: 6000 },
        radius: 300,
        type: 'sanctuary',
        guardCount: 0,
        lootRarity: 'rare',
        lootRespawnTime: 30000,
        lastLootSpawn: 0,
      }
    })

    // Zone 2 - Lane Areas
    this.zones.push({
      id: 2,
      name: 'The Lanes',
      radiusMin: 2000,
      radiusMax: 5000,
      floorColorInner: '#2a3a2a',
      floorColorOuter: '#1a2a1a',
      enemyLevelMin: 1,
      enemyLevelMax: 25,
      enemyTiers: [0, 1, 2],
      maxBots: 20,
      lootRarities: ['common', 'rare', 'epic'],
    })

    // Zone 3 - Nexus Area (Danger Zone)
    this.zones.push({
      id: 3,
      name: 'The Nexus',
      radiusMin: 5000,
      radiusMax: 8000,
      floorColorInner: '#3a2a3a',
      floorColorOuter: '#2a1a2a',
      enemyLevelMin: 15,
      enemyLevelMax: 100,
      enemyTiers: [1, 2, 3, 4, 5, 6],
      maxBots: 15,
      lootRarities: ['rare', 'epic', 'legendary'],
      poi: {
        id: 'nexus',
        name: 'The Nexus Core',
        position: { x: 8000, y: 6000 },
        radius: 400,
        type: 'nexus',
        guardCount: 5,
        lootRarity: 'legendary',
        lootRespawnTime: 60000,
        lastLootSpawn: 0,
      }
    })
  }

  private initializeTeamBuffs() {
    this.teamBuffs.set('blue', {
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      xpMultiplier: 1.0,
      regenMultiplier: 1.0,
      controlPointsOwned: 0
    })
    
    this.teamBuffs.set('red', {
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      xpMultiplier: 1.0,
      regenMultiplier: 1.0,
      controlPointsOwned: 0
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main update function - call every frame
   */
  update(deltaTime: number, currentTime: number, entities: Array<{position: Vector2, team: Team, id: string}>) {
    this.updateControlPoints(deltaTime, entities)
    this.updateTeamBuffs()
    this.updateDynamicEvents(currentTime)
    this.updateSupplyDrops(deltaTime, currentTime)
    this.updateNexus(deltaTime, entities)
    this.maybeSpawnEvent(currentTime)
  }

  private updateControlPoints(deltaTime: number, entities: Array<{position: Vector2, team: Team, id: string}>) {
    for (const cp of this.controlPoints) {
      // Check who's in the capture zone
      const blueInZone: string[] = []
      const redInZone: string[] = []
      
      for (const entity of entities) {
        const dist = this.distance(entity.position, cp.position)
        if (dist <= cp.radius) {
          if (entity.team === 'blue') blueInZone.push(entity.id)
          else if (entity.team === 'red') redInZone.push(entity.id)
        }
      }
      
      cp.contestedBy = []
      if (blueInZone.length > 0) cp.contestedBy.push('blue')
      if (redInZone.length > 0) cp.contestedBy.push('red')
      
      cp.isContested = cp.contestedBy.length > 1
      
      // Capture logic
      if (!cp.isContested) {
        const captureAmount = cp.captureSpeed * deltaTime
        
        if (blueInZone.length > 0) {
          // Blue capturing (progress goes positive)
          cp.captureProgress = Math.min(100, cp.captureProgress + captureAmount * blueInZone.length)
        } else if (redInZone.length > 0) {
          // Red capturing (progress goes negative)
          cp.captureProgress = Math.max(-100, cp.captureProgress - captureAmount * redInZone.length)
        } else {
          // No one here - slowly decay to neutral
          if (cp.captureProgress > 0) {
            cp.captureProgress = Math.max(0, cp.captureProgress - captureAmount * 0.3)
          } else if (cp.captureProgress < 0) {
            cp.captureProgress = Math.min(0, cp.captureProgress + captureAmount * 0.3)
          }
        }
      }
      
      // Update controlling team
      if (cp.captureProgress >= 100) {
        cp.controllingTeam = 'blue'
      } else if (cp.captureProgress <= -100) {
        cp.controllingTeam = 'red'
      } else if (Math.abs(cp.captureProgress) < 30) {
        cp.controllingTeam = 'neutral'
      }
      
      // Visual pulse animation
      cp.visualPulse += deltaTime * 2
    }
  }

  private updateTeamBuffs() {
    // Reset buffs
    for (const [, buffs] of this.teamBuffs) {
      buffs.damageMultiplier = 1.0
      buffs.speedMultiplier = 1.0
      buffs.xpMultiplier = 1.0
      buffs.regenMultiplier = 1.0
      buffs.controlPointsOwned = 0
    }
    
    // Apply control point bonuses
    for (const cp of this.controlPoints) {
      if (cp.controllingTeam === 'neutral') continue
      
      const buffs = this.teamBuffs.get(cp.controllingTeam)
      if (!buffs) continue
      
      buffs.controlPointsOwned++
      
      switch (cp.powerUpType) {
        case 'damage':
          buffs.damageMultiplier *= cp.powerUpStrength
          break
        case 'speed':
          buffs.speedMultiplier *= cp.powerUpStrength
          break
        case 'xp':
          buffs.xpMultiplier *= cp.powerUpStrength
          break
        case 'regen':
          buffs.regenMultiplier *= cp.powerUpStrength
          break
        case 'health':
          // Health boost is handled separately in player stats
          break
      }
    }
    
    // Domination bonus (control 4+ points)
    for (const [, buffs] of this.teamBuffs) {
      if (buffs.controlPointsOwned >= 4) {
        buffs.damageMultiplier *= 1.1
        buffs.xpMultiplier *= 1.2
      }
    }
  }

  private updateDynamicEvents(currentTime: number) {
    // Update active events
    this.activeEvents = this.activeEvents.filter(event => {
      if (!event.isActive && currentTime >= event.startTime) {
        event.isActive = true
      }
      
      const endTime = event.startTime + event.duration
      if (currentTime >= endTime) {
        return false // Remove expired event
      }
      
      // Update intensity based on time remaining
      const remaining = endTime - currentTime
      if (remaining < 5000) {
        event.intensity = remaining / 5000 // Fade out in last 5 seconds
      }
      
      return true
    })
  }

  private updateSupplyDrops(deltaTime: number, currentTime: number) {
    this.supplyDrops = this.supplyDrops.filter(drop => {
      if (!drop.isLanded) {
        // Descending
        drop.altitude -= drop.dropSpeed * deltaTime * 60
        
        if (drop.altitude <= 0) {
          drop.altitude = 0
          drop.isLanded = true
          drop.landTime = currentTime
        }
        
        // Update visual position (slight drift)
        const drift = Math.sin(currentTime / 500) * 0.5
        drop.position.x += drift
      }
      
      // Despawn after timeout
      if (drop.isLanded && currentTime - drop.landTime > drop.despawnTime) {
        return false
      }
      
      return true
    })
  }

  private updateNexus(deltaTime: number, entities: Array<{position: Vector2, team: Team, id: string}>) {
    // Count players in the nexus capture zone
    const blueInZone: string[] = []
    const redInZone: string[] = []
    
    for (const entity of entities) {
      const dist = this.distance(entity.position, this.nexus.position)
      if (dist <= this.nexus.captureRadius) {
        if (entity.team === 'blue') blueInZone.push(entity.id)
        else if (entity.team === 'red') redInZone.push(entity.id)
      }
    }
    
    this.nexus.occupantCount.blue = blueInZone.length
    this.nexus.occupantCount.red = redInZone.length
    
    // Determine who's contesting
    this.nexus.contestedBy = []
    if (blueInZone.length > 0) this.nexus.contestedBy.push('blue')
    if (redInZone.length > 0) this.nexus.contestedBy.push('red')
    
    this.nexus.isContested = this.nexus.contestedBy.length > 1
    
    // Capture logic
    if (!this.nexus.isContested) {
      const captureAmount = this.nexus.captureSpeed * deltaTime
      
      if (blueInZone.length > 0) {
        // Blue capturing (progress goes positive)
        this.nexus.captureProgress = Math.min(100, this.nexus.captureProgress + captureAmount * blueInZone.length)
      } else if (redInZone.length > 0) {
        // Red capturing (progress goes negative)
        this.nexus.captureProgress = Math.max(-100, this.nexus.captureProgress - captureAmount * redInZone.length)
      } else {
        // No one here - slowly decay to neutral
        if (this.nexus.captureProgress > 0) {
          this.nexus.captureProgress = Math.max(0, this.nexus.captureProgress - captureAmount * 0.2)
        } else if (this.nexus.captureProgress < 0) {
          this.nexus.captureProgress = Math.min(0, this.nexus.captureProgress + captureAmount * 0.2)
        }
      }
    }
    
    // Update controlling team based on capture progress
    const previousController = this.nexus.controllingTeam
    
    if (this.nexus.captureProgress >= 75) {
      this.nexus.controllingTeam = 'blue'
    } else if (this.nexus.captureProgress <= -75) {
      this.nexus.controllingTeam = 'red'
    } else if (Math.abs(this.nexus.captureProgress) < 25) {
      this.nexus.controllingTeam = 'neutral'
    }
    
    // Notify when control changes
    if (previousController !== this.nexus.controllingTeam && this.nexus.controllingTeam !== 'neutral') {
      this.notifyEvent(
        '🎯 Nexus Captured!',
        `${this.nexus.controllingTeam.toUpperCase()} team has captured the Nexus! Territory expanding...`,
        'success'
      )
    }
    
    // Territory expansion when controlled and occupied
    if (this.nexus.controllingTeam !== 'neutral') {
      const occupyingCount = this.nexus.controllingTeam === 'blue' ? blueInZone.length : redInZone.length
      
      if (occupyingCount > 0) {
        // Expand territory based on number of players in zone
        // Diminishing returns: sqrt scaling to reward coordination without making it too fast
        const expansionRate = this.nexus.expansionSpeed * Math.sqrt(occupyingCount)
        const expansionAmount = expansionRate * deltaTime * 60 // Normalize to 60fps
        
        this.nexus.territoryRadius = Math.min(
          this.nexus.maxTerritoryRadius,
          this.nexus.territoryRadius + expansionAmount
        )
        
        // Check for victory condition (territory covers ~90% of map diagonal)
        const mapDiagonal = Math.sqrt(this.worldWidth * this.worldWidth + this.worldHeight * this.worldHeight)
        if (this.nexus.territoryRadius >= mapDiagonal * 0.9) {
          this.notifyEvent(
            '🏆 VICTORY!',
            `${this.nexus.controllingTeam.toUpperCase()} team has conquered the entire map!`,
            'success'
          )
        }
      } else {
        // Team owns it but no one is there - territory slowly decays
        if (this.nexus.territoryRadius > 800) {
          this.nexus.territoryRadius = Math.max(800, this.nexus.territoryRadius - (this.nexus.expansionSpeed * 0.5 * deltaTime * 60))
        }
      }
    } else {
      // When neutral, shrink territory back to base size faster
      if (this.nexus.territoryRadius > 800) {
        this.nexus.territoryRadius = Math.max(800, this.nexus.territoryRadius - (this.nexus.expansionSpeed * 1.5 * deltaTime * 60))
      }
    }
    
    // Visual pulse animation
    this.nexus.visualPulse += deltaTime * 2
  }

  private maybeSpawnEvent(currentTime: number) {
    if (currentTime - this.lastEventTime < this.eventCooldown) return
    
    // 60% chance to spawn an event
    if (Math.random() > 0.6) return
    
    this.lastEventTime = currentTime
    this.spawnRandomEvent(currentTime)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT SPAWNING
  // ═══════════════════════════════════════════════════════════════════════════

  private spawnRandomEvent(currentTime: number) {
    // Weighted random: supply drops most common, blood moon rare
    const roll = Math.random()
    let type: EventType
    
    if (roll < 0.35) {
      type = 'supply_drop' // 35% chance
    } else if (roll < 0.55) {
      type = 'meteor_shower' // 20% chance
    } else if (roll < 0.75) {
      type = 'energy_surge' // 20% chance
    } else if (roll < 0.90) {
      type = 'boss_invasion' // 15% chance
    } else {
      type = 'blood_moon' // 10% chance (rare!)
    }
    
    switch (type) {
      case 'supply_drop':
        this.spawnSupplyDrop()
        break
      case 'meteor_shower':
        this.spawnMeteorShower(currentTime)
        break
      case 'energy_surge':
        this.spawnEnergySurge(currentTime)
        break
      case 'blood_moon':
        this.spawnBloodMoon(currentTime)
        break
      case 'boss_invasion':
        // Boss invasion removed - nexus is now a pure capture point
        break
    }
  }

  spawnSupplyDrop() {
    const id = `drop_${++this.eventIdCounter}`
    
    // Random position in mid-map area
    const targetPos = {
      x: 3000 + Math.random() * 10000,
      y: 2000 + Math.random() * 8000
    }
    
    const drop: SupplyDrop = {
      id,
      position: { x: targetPos.x, y: targetPos.y - 1000 }, // Start above
      targetPosition: targetPos,
      radius: 60,
      dropSpeed: 3,
      altitude: 1000,
      lootTier: Math.random() < 0.2 ? 'legendary' : Math.random() < 0.5 ? 'epic' : 'rare',
      isLanded: false,
      landTime: 0,
      despawnTime: 30000, // 30 seconds to claim
      contents: this.generateSupplyContents()
    }
    
    this.supplyDrops.push(drop)
    
    // Toast notification (rate limited so drops don't spam)
    const tierEmoji = drop.lootTier === 'legendary' ? '\u{1F3C6}' : drop.lootTier === 'epic' ? '\u{1F48E}' : '\u{1F4E6}'
    this.emitNotification(
      'event:supply_drop',
      `${tierEmoji} Supply Drop`,
      `${drop.lootTier.toUpperCase()} crate incoming!`,
      'success',
      7000
    )
  }

  private generateSupplyContents(): SupplyDropContents {
    const tier = Math.random()
    
    // Tier-based rewards: rare < epic < legendary
    const isRare = tier < 0.3
    const isEpic = tier < 0.7 && tier >= 0.3
    const isLegendary = tier >= 0.7
    
    const contents: SupplyDropContents = {
      xpAmount: isRare ? 800 : isEpic ? 1500 : 3000, // Increased XP
      healthPack: Math.random() < (isRare ? 0.4 : isEpic ? 0.6 : 0.8), // Better health chance for higher tiers
      weaponTier: isRare ? 'rare' : isEpic ? 'epic' : 'legendary',
      bonusType: ['damage', 'speed', 'shield'][Math.floor(Math.random() * 3)] as 'damage' | 'speed' | 'shield',
      bonusDuration: 45000, // 45 seconds
      
      // NEW: Stat points based on tier
      statPoints: isRare ? Math.floor(Math.random() * 3) + 1 : // 1-3 points
                  isEpic ? Math.floor(Math.random() * 5) + 2 : // 2-6 points
                  Math.floor(Math.random() * 8) + 4, // 4-11 points
                  
      // NEW: Actual loot items to spawn around the drop
      lootItems: [
        {
          type: Math.random() < 0.7 ? 'box' : 'treasure',
          tier: isRare ? 'rare' : isEpic ? 'epic' : 'legendary',
          count: isRare ? 2 : isEpic ? 3 : 5
        }
      ]
    }
    
    return contents
  }

  private spawnMeteorShower(currentTime: number) {
    // Random position
    const pos = {
      x: 4000 + Math.random() * 8000,
      y: 3000 + Math.random() * 6000
    }
    
    this.activeEvents.push({
      id: `event_${++this.eventIdCounter}`,
      type: 'meteor_shower',
      name: '☄️ METEOR SHOWER',
      description: 'Dodge the meteors for rare loot!',
      position: pos,
      radius: 800,
      startTime: currentTime + 5000, // 5 second warning
      duration: 20000, // 20 seconds
      warningDuration: 5000,
      isActive: false,
      intensity: 1.0
    })
    
    // Toast notification
    this.emitNotification('event:meteor', '☄️ Meteor Shower', 'Incoming! Dodge for rare loot', 'warning', 6000)
  }

  private spawnEnergySurge(currentTime: number) {
    // Center around a control point for drama
    const cp = this.controlPoints[Math.floor(Math.random() * this.controlPoints.length)]
    
    this.activeEvents.push({
      id: `event_${++this.eventIdCounter}`,
      type: 'energy_surge',
      name: '⚡ ENERGY SURGE',
      description: 'Power boost zone! All stats +15%',
      position: { ...cp.position },
      radius: 400,
      startTime: currentTime + 3000,
      duration: 12000,
      warningDuration: 3000,
      isActive: false,
      intensity: 0.15 // 15% boost, not 50%!
    })
    
    // Toast notification
    this.emitNotification(
      'event:energy',
      '⚡ Energy Surge',
      `Power zone near ${cp.name}! +15% all stats`,
      'info',
      5000
    )
  }

  private spawnBloodMoon(currentTime: number) {
    this.activeEvents.push({
      id: `event_${++this.eventIdCounter}`,
      type: 'blood_moon',
      name: '🌑 BLOOD MOON',
      description: 'All damage +30%, XP doubled!',
      position: this.worldCenter,
      radius: 10000, // Entire map
      startTime: currentTime,
      duration: 45000, // 45 seconds
      warningDuration: 0,
      isActive: true,
      intensity: 1.0
    })
    
    // Toast notification
    this.emitNotification('event:blood_moon', '🌑 Blood Moon', 'All damage +30%, XP doubled!', 'warning', 12000)
  }

  // Boss system removed - Nexus is now a pure capture point for territory control

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private notifyEvent(title: string, description: string, type: 'info' | 'warning' | 'success') {
    this.emitNotification(`event:${title}`, title, description, type, 4500)
  }

  private emitNotification(
    key: string,
    title: string,
    description: string,
    type: 'info' | 'warning' | 'success',
    cooldownMs: number
  ) {
    const now = Date.now()
    const last = this.notificationTimestamps.get(key) ?? 0
    if (now - last < cooldownMs) return
    this.notificationTimestamps.set(key, now)
    this.onEventNotification?.(title, description, type)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES & UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get team buffs for a specific team
   */
  getTeamBuffs(team: Team): TeamBuffs {
    return this.teamBuffs.get(team) || {
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      xpMultiplier: 1.0,
      regenMultiplier: 1.0,
      controlPointsOwned: 0
    }
  }

  /**
   * Check if position is in a team's base safe zone
   */
  isInSafeZone(position: Vector2, team: Team): boolean {
    const base = this.teamBases.get(team)
    if (!base) return false
    return this.distance(position, base.position) <= base.safeRadius
  }

  /**
   * Check if position is in enemy base (for damage/restriction)
   */
  isInEnemyBase(position: Vector2, myTeam: Team): boolean {
    const enemyTeam = myTeam === 'blue' ? 'red' : 'blue'
    const base = this.teamBases.get(enemyTeam)
    if (!base) return false
    return this.distance(position, base.position) <= base.safeRadius
  }

  /**
   * Check if position is in team's forge (regen zone)
   */
  isInForge(position: Vector2, team: Team): { inForge: boolean, regenRate: number } {
    const base = this.teamBases.get(team)
    if (!base) return { inForge: false, regenRate: 0 }
    
    const inForge = this.distance(position, base.forgePosition) <= base.forgeRadius
    const regenRate = inForge ? base.forgeRegenRate * (base.isOvercharged ? 3 : 1) : 0
    
    return { inForge, regenRate }
  }

  /**
   * Get the lane a position is in, if any
   */
  getLane(position: Vector2): Lane | null {
    for (const lane of this.lanes) {
      // Check if position is within lane bounds
      const laneY = lane.startBlue.y
      if (Math.abs(position.y - laneY) <= lane.width / 2) {
        if (position.x >= lane.startBlue.x && position.x <= lane.endRed.x) {
          return lane
        }
      }
    }
    return null
  }

  /**
   * Check if position is in Nexus zone
   */
  isInNexus(position: Vector2): { inNexus: boolean, inCaptureZone: boolean } {
    const dist = this.distance(position, this.nexus.position)
    return {
      inNexus: dist <= this.nexus.territoryRadius,
      inCaptureZone: dist <= this.nexus.captureRadius
    }
  }

  /**
   * Get control point at position
   */
  getControlPointAt(position: Vector2): ControlPoint | null {
    for (const cp of this.controlPoints) {
      if (this.distance(position, cp.position) <= cp.radius) {
        return cp
      }
    }
    return null
  }

  /**
   * Get spawn position for a team
   */
  getSpawnPosition(team: Team): Vector2 {
    const base = this.teamBases.get(team)
    if (!base) return { ...this.worldCenter }
    
    // Random position within safe zone
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * base.safeRadius * 0.7
    return {
      x: base.position.x + Math.cos(angle) * dist,
      y: base.position.y + Math.sin(angle) * dist
    }
  }

  /**
   * Check if event is active at position
   */
  getActiveEventAt(position: Vector2): DynamicEvent | null {
    for (const event of this.activeEvents) {
      if (!event.isActive) continue
      if (this.distance(position, event.position) <= event.radius) {
        return event
      }
    }
    return null
  }

  /**
   * Get supply drop at position (for pickup)
   */
  getSupplyDropAt(position: Vector2): SupplyDrop | null {
    for (const drop of this.supplyDrops) {
      if (!drop.isLanded) continue
      if (this.distance(position, drop.targetPosition) <= drop.radius + 30) {
        return drop
      }
    }
    return null
  }

  /**
   * Claim a supply drop
   */
  claimSupplyDrop(dropId: string, team: Team): SupplyDropContents | null {
    const index = this.supplyDrops.findIndex(d => d.id === dropId)
    if (index === -1) return null
    
    const drop = this.supplyDrops[index]
    if (drop.claimedBy) return null
    
    drop.claimedBy = team
    this.supplyDrops.splice(index, 1)
    
    return drop.contents
  }

  /**
   * Get territory control percentage (0-100)
   */
  getTerritoryControlPercentage(): number {
    const mapDiagonal = Math.sqrt(this.worldWidth * this.worldWidth + this.worldHeight * this.worldHeight)
    return Math.min(100, (this.nexus.territoryRadius / (mapDiagonal * 0.9)) * 100)
  }

  /**
   * Check if a team has achieved victory by controlling the entire map
   */
  checkVictoryCondition(): { hasWinner: boolean, winner: Team | null, controlPercentage: number } {
    const controlPercentage = this.getTerritoryControlPercentage()
    const hasWinner = controlPercentage >= 100 && this.nexus.controllingTeam !== 'neutral'
    
    return {
      hasWinner,
      winner: hasWinner ? this.nexus.controllingTeam : null,
      controlPercentage
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  getZone(position: Vector2): Zone {
    // Map new battlefield to legacy zones
    
    // Check if in any base
    for (const [, base] of this.teamBases) {
      if (this.distance(position, base.position) <= base.outerRadius) {
        return this.zones[0] // Base territory
      }
    }
    
    // Check if in Nexus
    const nexusDist = this.distance(position, this.nexus.position)
    if (nexusDist <= this.nexus.territoryRadius) {
      return this.zones[2] // Nexus zone
    }
    
    // Otherwise, lane territory
    return this.zones[1]
  }

  getCurrentZone(): number {
    return this.currentZone
  }

  updatePlayerZone(playerPosition: Vector2, currentTime: number): boolean {
    const zone = this.getZone(playerPosition)
    const wasZoneChange = zone.id !== this.currentZone
    
    if (wasZoneChange) {
      this.currentZone = zone.id
      this.lastZoneChangeTime = currentTime
    }
    
    return wasZoneChange
  }

  shouldShowZoneWarning(currentTime: number): boolean {
    return currentTime - this.lastZoneChangeTime < 3000
  }

  getDistanceFromCenter(position: Vector2): number {
    return this.distance(position, this.worldCenter)
  }

  getZones(): Zone[] {
    return this.zones
  }

  getWorldCenter(): Vector2 {
    return this.worldCenter
  }

  getRandomLootRarity(zone: Zone): Rarity {
    const weights: Record<Rarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }

    if (zone.id === 1) {
      weights.common = 60
      weights.rare = 30
      weights.epic = 10
    } else if (zone.id === 2) {
      weights.common = 40
      weights.rare = 40
      weights.epic = 20
    } else {
      weights.rare = 30
      weights.epic = 50
      weights.legendary = 20
    }

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (const rarity of zone.lootRarities) {
      random -= weights[rarity]
      if (random <= 0) {
        return rarity
      }
    }

    return zone.lootRarities[0]
  }

  isInPOI(position: Vector2): PointOfInterest | null {
    for (const zone of this.zones) {
      if (zone.poi) {
        if (this.distance(position, zone.poi.position) <= zone.poi.radius) {
          return zone.poi
        }
      }
    }
    return null
  }

  trySpawnPOILoot(currentTime: number): PointOfInterest | null {
    for (const zone of this.zones) {
      if (zone.poi && currentTime - zone.poi.lastLootSpawn >= zone.poi.lootRespawnTime) {
        zone.poi.lastLootSpawn = currentTime
        return zone.poi
      }
    }
    return null
  }

  getZoneBorders(): Array<{ radius: number; name: string; color: string }> {
    // Return empty for now - we use rectangular map now
    return []
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  private distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Get the world bounds (for rendering and collision)
   */
  getWorldBounds() {
    return {
      minX: 0,
      maxX: this.worldWidth,
      minY: 0,
      maxY: this.worldHeight,
      width: this.worldWidth,
      height: this.worldHeight
    }
  }

  /**
   * Damage the Nexus boss - DEPRECATED (boss system removed)
   * Kept for compatibility, always returns no reward
   */
  damageNexusBoss(damage: number, attackerTeam: Team): { killed: boolean, reward: number } {
    return { killed: false, reward: 0 }
  }

  /**
   * Get all team bases for rendering
   */
  getTeamBasesArray(): TeamBase[] {
    return Array.from(this.teamBases.values())
  }

  /**
   * Check if a position is valid (within world bounds)
   */
  isValidPosition(position: Vector2): boolean {
    return position.x >= 0 && position.x <= this.worldWidth &&
           position.y >= 0 && position.y <= this.worldHeight
  }

  /**
   * Clamp position to world bounds
   */
  clampToWorld(position: Vector2): Vector2 {
    return {
      x: Math.max(0, Math.min(this.worldWidth, position.x)),
      y: Math.max(0, Math.min(this.worldHeight, position.y))
    }
  }
}
