/**
 * QuadTree spatial partitioning for efficient collision detection
 * Dramatically improves performance for large numbers of entities
 */

export interface QuadTreeItem {
  x: number
  y: number
  radius: number
  [key: string]: unknown
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export class QuadTree {
  private maxObjects: number = 10
  private maxLevels: number = 5
  private level: number
  private bounds: Bounds
  private objects: QuadTreeItem[] = []
  private nodes: QuadTree[] = []

  constructor(bounds: Bounds, level: number = 0) {
    this.bounds = bounds
    this.level = level
  }

  clear(): void {
    this.objects = []
    for (const node of this.nodes) {
      node.clear()
    }
    this.nodes = []
  }

  private split(): void {
    const subWidth = this.bounds.width / 2
    const subHeight = this.bounds.height / 2
    const x = this.bounds.x
    const y = this.bounds.y

    this.nodes[0] = new QuadTree(
      { x: x + subWidth, y: y, width: subWidth, height: subHeight },
      this.level + 1
    )
    this.nodes[1] = new QuadTree(
      { x: x, y: y, width: subWidth, height: subHeight },
      this.level + 1
    )
    this.nodes[2] = new QuadTree(
      { x: x, y: y + subHeight, width: subWidth, height: subHeight },
      this.level + 1
    )
    this.nodes[3] = new QuadTree(
      { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
      this.level + 1
    )
  }

  private getIndex(item: QuadTreeItem): number {
    let index = -1
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2

    const topQuadrant = item.y - item.radius < horizontalMidpoint && 
                        item.y + item.radius < horizontalMidpoint
    const bottomQuadrant = item.y - item.radius > horizontalMidpoint

    if (item.x - item.radius < verticalMidpoint && 
        item.x + item.radius < verticalMidpoint) {
      if (topQuadrant) {
        index = 1
      } else if (bottomQuadrant) {
        index = 2
      }
    } else if (item.x - item.radius > verticalMidpoint) {
      if (topQuadrant) {
        index = 0
      } else if (bottomQuadrant) {
        index = 3
      }
    }

    return index
  }

  insert(item: QuadTreeItem): void {
    if (this.nodes.length > 0) {
      const index = this.getIndex(item)
      if (index !== -1) {
        this.nodes[index].insert(item)
        return
      }
    }

    this.objects.push(item)

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.split()
      }

      let i = 0
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i])
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0])
        } else {
          i++
        }
      }
    }
  }

  retrieve(item: QuadTreeItem): QuadTreeItem[] {
    const returnObjects: QuadTreeItem[] = []
    const index = this.getIndex(item)

    if (index !== -1 && this.nodes.length > 0) {
      returnObjects.push(...this.nodes[index].retrieve(item))
    } else {
      for (const node of this.nodes) {
        returnObjects.push(...node.retrieve(item))
      }
    }

    returnObjects.push(...this.objects)
    return returnObjects
  }

  retrieveInBounds(bounds: Bounds): QuadTreeItem[] {
    const returnObjects: QuadTreeItem[] = []

    if (this.nodes.length > 0) {
      for (const node of this.nodes) {
        if (this.boundsIntersect(node.bounds, bounds)) {
          returnObjects.push(...node.retrieveInBounds(bounds))
        }
      }
    }

    returnObjects.push(...this.objects)
    return returnObjects
  }

  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return !(
      a.x > b.x + b.width ||
      a.x + a.width < b.x ||
      a.y > b.y + b.height ||
      a.y + a.height < b.y
    )
  }
}
