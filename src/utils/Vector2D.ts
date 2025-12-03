/**
 * Vector2D utility class for 2D vector operations
 * Provides efficient vector math for game physics
 */
export class Vector2D {
  x: number
  y: number

  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }

  static from(obj: { x: number; y: number }): Vector2D {
    return new Vector2D(obj.x, obj.y)
  }

  static zero(): Vector2D {
    return new Vector2D(0, 0)
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y)
  }

  set(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  copy(v: Vector2D): this {
    this.x = v.x
    this.y = v.y
    return this
  }

  add(v: Vector2D): this {
    this.x += v.x
    this.y += v.y
    return this
  }

  subtract(v: Vector2D): this {
    this.x -= v.x
    this.y -= v.y
    return this
  }

  multiply(scalar: number): this {
    this.x *= scalar
    this.y *= scalar
    return this
  }

  divide(scalar: number): this {
    this.x /= scalar
    this.y /= scalar
    return this
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y
  }

  normalize(): this {
    const mag = this.magnitude()
    if (mag > 0) {
      this.x /= mag
      this.y /= mag
    }
    return this
  }

  distance(v: Vector2D): number {
    const dx = this.x - v.x
    const dy = this.y - v.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  distanceSquared(v: Vector2D): number {
    const dx = this.x - v.x
    const dy = this.y - v.y
    return dx * dx + dy * dy
  }

  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y
  }

  angle(): number {
    return Math.atan2(this.y, this.x)
  }

  rotate(angle: number): this {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const x = this.x * cos - this.y * sin
    const y = this.x * sin + this.y * cos
    this.x = x
    this.y = y
    return this
  }

  limit(max: number): this {
    const magSq = this.magnitudeSquared()
    if (magSq > max * max) {
      this.normalize().multiply(max)
    }
    return this
  }

  lerp(v: Vector2D, t: number): this {
    this.x += (v.x - this.x) * t
    this.y += (v.y - this.y) * t
    return this
  }

  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }
}
