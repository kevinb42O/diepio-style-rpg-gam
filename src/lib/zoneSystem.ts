/**
 * Zone System for Circular World Map
 * Manages 3 zones: Safe Haven, Combat Grounds, Danger Zone
 */

import type { Zone, PointOfInterest, Vector2, Rarity, Loot } from './types'

export class ZoneSystem {
  private zones: Zone[] = []
  private worldCenter: Vector2 = { x: 8000, y: 8000 }
  private currentZone: number = 1
  private lastZoneChangeTime: number = 0

  constructor() {
    this.initializeZones()
  }

  private initializeZones() {
    // Zone 1 - Safe Haven
    this.zones.push({
      id: 1,
      name: 'Safe Haven',
      radiusMin: 0,
      radiusMax: 1500,
      floorColorInner: '#1a3d1a',
      floorColorOuter: '#0d2d0d',
      enemyLevelMin: 0,
      enemyLevelMax: 0,
      enemyTiers: [],
      maxBots: 0,
      lootRarities: ['common', 'rare', 'epic'],
      poi: {
        id: 'sanctuary',
        name: 'The Sanctuary',
        position: { x: 8000, y: 8000 },
        radius: 150,
        type: 'sanctuary',
        guardCount: 0,
        lootRarity: 'epic',
        lootRespawnTime: 30000,
        lastLootSpawn: 0,
      },
    })

    // Zone 2 - Combat Grounds
    this.zones.push({
      id: 2,
      name: 'Combat Grounds',
      radiusMin: 1500,
      radiusMax: 4000,
      floorColorInner: '#3d2a1a',
      floorColorOuter: '#2d1a0a',
      enemyLevelMin: 1,
      enemyLevelMax: 30,
      enemyTiers: [0, 1, 2],
      maxBots: 15,
      lootRarities: ['common', 'rare', 'epic'],
      poi: {
        id: 'arena',
        name: 'The Arena',
        position: {
          x: 8000 + Math.cos(Math.PI / 4) * 2750,
          y: 8000 + Math.sin(Math.PI / 4) * 2750,
        },
        radius: 200,
        type: 'arena',
        guardCount: 4,
        lootRarity: 'epic',
        lootRespawnTime: 45000,
        lastLootSpawn: 0,
      },
    })

    // Zone 3 - Danger Zone
    this.zones.push({
      id: 3,
      name: 'Danger Zone',
      radiusMin: 4000,
      radiusMax: 8000,
      floorColorInner: '#3d1a1a',
      floorColorOuter: '#1a0a0a',
      enemyLevelMin: 15,
      enemyLevelMax: 45,
      enemyTiers: [0, 1, 2, 3],
      maxBots: 20,
      lootRarities: ['rare', 'epic', 'legendary'],
      poi: {
        id: 'nexus',
        name: 'The Nexus',
        position: {
          x: 8000 + Math.cos(-Math.PI / 3) * 6000,
          y: 8000 + Math.sin(-Math.PI / 3) * 6000,
        },
        radius: 250,
        type: 'nexus',
        guardCount: 7,
        lootRarity: 'legendary',
        lootRespawnTime: 60000,
        lastLootSpawn: 0,
      },
    })
  }

  /**
   * Get zone based on distance from world center
   */
  getZone(position: Vector2): Zone {
    const distance = this.getDistanceFromCenter(position)
    
    for (const zone of this.zones) {
      if (distance >= zone.radiusMin && distance <= zone.radiusMax) {
        return zone
      }
    }
    
    // Default to zone 1 if somehow outside
    return this.zones[0]
  }

  /**
   * Get current zone ID
   */
  getCurrentZone(): number {
    return this.currentZone
  }

  /**
   * Update current zone based on player position
   */
  updatePlayerZone(playerPosition: Vector2, currentTime: number): boolean {
    const zone = this.getZone(playerPosition)
    const wasZoneChange = zone.id !== this.currentZone
    
    if (wasZoneChange) {
      this.currentZone = zone.id
      this.lastZoneChangeTime = currentTime
    }
    
    return wasZoneChange
  }

  /**
   * Check if zone transition warning should be shown
   */
  shouldShowZoneWarning(currentTime: number): boolean {
    return currentTime - this.lastZoneChangeTime < 3000
  }

  /**
   * Get distance from world center
   */
  getDistanceFromCenter(position: Vector2): number {
    const dx = position.x - this.worldCenter.x
    const dy = position.y - this.worldCenter.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Get all zones
   */
  getZones(): Zone[] {
    return this.zones
  }

  /**
   * Get world center
   */
  getWorldCenter(): Vector2 {
    return this.worldCenter
  }

  /**
   * Get appropriate loot rarity for a zone
   */
  getRandomLootRarity(zone: Zone): Rarity {
    const rarities = zone.lootRarities
    const weights: Record<Rarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }

    // Set weights based on zone
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

    // Select based on weights
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (const rarity of rarities) {
      random -= weights[rarity]
      if (random <= 0) {
        return rarity
      }
    }

    return rarities[0]
  }

  /**
   * Check if position is inside a POI
   */
  isInPOI(position: Vector2): PointOfInterest | null {
    for (const zone of this.zones) {
      if (zone.poi) {
        const dx = position.x - zone.poi.position.x
        const dy = position.y - zone.poi.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance <= zone.poi.radius) {
          return zone.poi
        }
      }
    }
    return null
  }

  /**
   * Try to spawn POI loot if respawn time has passed
   */
  trySpawnPOILoot(currentTime: number): PointOfInterest | null {
    for (const zone of this.zones) {
      if (zone.poi && currentTime - zone.poi.lastLootSpawn >= zone.poi.lootRespawnTime) {
        zone.poi.lastLootSpawn = currentTime
        return zone.poi
      }
    }
    return null
  }

  /**
   * Get zone border positions for rendering
   */
  getZoneBorders(): Array<{ radius: number; name: string; color: string }> {
    return [
      { radius: 1500, name: 'Combat Grounds', color: '#ff8800' },
      { radius: 4000, name: 'Danger Zone', color: '#ff0000' },
    ]
  }
}
