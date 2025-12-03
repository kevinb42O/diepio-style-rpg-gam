/**
 * Generic object pool for efficient memory management
 * Reduces garbage collection by reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 0,
    maxSize: number = 1000
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn())
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }

  releaseAll(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj)
    }
  }

  clear(): void {
    this.pool = []
  }

  get size(): number {
    return this.pool.length
  }
}
