import type { Team, Vector2 } from './types'

export interface PylonPlacementConfig {
  radius: number
  health: number
  duration: number
}

export interface PylonNode {
  id: string
  ownerId: string
  team: Team
  position: Vector2
  radius: number
  health: number
  maxHealth: number
  createdAt: number
  duration: number
}

export interface PylonLink {
  id: string
  ownerId: string
  team: Team
  start: Vector2
  end: Vector2
}

export const MAX_PYLONS_PER_OWNER = 4

export class PylonSystem {
  private pylonsByOwner: Map<string, PylonNode[]> = new Map()
  private nextId = 0

  placePylon(
    ownerId: string,
    team: Team,
    position: Vector2,
    config: PylonPlacementConfig,
    currentTime: number
  ): PylonNode | null {
    if (!config.radius || !config.health || !config.duration) {
      return null
    }

    const pylon: PylonNode = {
      id: `pylon_${this.nextId++}_${Date.now()}`,
      ownerId,
      team,
      position: { x: position.x, y: position.y },
      radius: config.radius,
      health: config.health,
      maxHealth: config.health,
      createdAt: currentTime,
      duration: config.duration,
    }

    const existing = this.pylonsByOwner.get(ownerId) ?? []

    if (existing.length >= MAX_PYLONS_PER_OWNER) {
      existing.sort((a, b) => a.createdAt - b.createdAt)
      existing.shift()
    }

    existing.push(pylon)
    this.pylonsByOwner.set(ownerId, existing)
    return pylon
  }

  update(_deltaTime: number, currentTime: number) {
    for (const [ownerId, pylons] of this.pylonsByOwner.entries()) {
      const active = pylons.filter(
        (pylon) => pylon.health > 0 && currentTime - pylon.createdAt <= pylon.duration
      )
      if (active.length === 0) {
        this.pylonsByOwner.delete(ownerId)
      } else {
        this.pylonsByOwner.set(ownerId, active)
      }
    }
  }

  damagePylon(pylonId: string, damage: number): boolean {
    for (const [ownerId, pylons] of this.pylonsByOwner.entries()) {
      const target = pylons.find((p) => p.id === pylonId)
      if (!target) continue

      target.health -= damage
      if (target.health <= 0) {
        const remaining = pylons.filter((p) => p.id !== pylonId)
        if (remaining.length === 0) {
          this.pylonsByOwner.delete(ownerId)
        } else {
          this.pylonsByOwner.set(ownerId, remaining)
        }
        return true
      }
      return false
    }
    return false
  }

  getPylons(): PylonNode[] {
    const all: PylonNode[] = []
    for (const pylons of this.pylonsByOwner.values()) {
      all.push(...pylons)
    }
    return all
  }

  getPylonsForOwner(ownerId: string): PylonNode[] {
    return this.pylonsByOwner.get(ownerId) ?? []
  }

  getOwners(): string[] {
    return Array.from(this.pylonsByOwner.keys())
  }

  removeOwner(ownerId: string) {
    this.pylonsByOwner.delete(ownerId)
  }

  clear() {
    this.pylonsByOwner.clear()
    this.nextId = 0
  }
}

export function createPylonLinks(pylons: PylonNode[]): PylonLink[] {
  if (pylons.length < 2) {
    return []
  }

  const sorted = [...pylons].sort((a, b) => a.createdAt - b.createdAt)
  const links: PylonLink[] = []

  if (sorted.length === 2) {
    const [a, b] = sorted
    links.push({
      id: `link_${a.id}_${b.id}`,
      ownerId: a.ownerId,
      team: a.team,
      start: { x: a.position.x, y: a.position.y },
      end: { x: b.position.x, y: b.position.y },
    })
    return links
  }

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const next = sorted[(i + 1) % sorted.length]
    links.push({
      id: `link_${current.id}_${next.id}`,
      ownerId: current.ownerId,
      team: current.team,
      start: { x: current.position.x, y: current.position.y },
      end: { x: next.position.x, y: next.position.y },
    })
  }

  return links
}
