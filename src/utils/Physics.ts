/**
 * Physics utilities for momentum, collision, and forces
 */

// Local Vector2 type for consistency
type Vector2 = { x: number; y: number }

export interface PhysicsBody {
  position: Vector2
  velocity: Vector2
  acceleration?: Vector2
  mass?: number
  radius: number
}

export class Physics {
  /**
   * Apply friction/drag to velocity
   */
  static applyDrag(velocity: Vector2, dragCoefficient: number, deltaTime: number): void {
    const drag = Math.pow(dragCoefficient, deltaTime * 60)
    velocity.x *= drag
    velocity.y *= drag
  }

  /**
   * Apply acceleration to velocity
   */
  static applyAcceleration(velocity: Vector2, acceleration: Vector2, deltaTime: number): void {
    velocity.x += acceleration.x * deltaTime
    velocity.y += acceleration.y * deltaTime
  }

  /**
   * Apply velocity to position
   */
  static applyVelocity(position: Vector2, velocity: Vector2, deltaTime: number): void {
    position.x += velocity.x * deltaTime
    position.y += velocity.y * deltaTime
  }

  /**
   * Check circle-circle collision
   */
  static checkCircleCollision(a: PhysicsBody, b: PhysicsBody): boolean {
    const dx = a.position.x - b.position.x
    const dy = a.position.y - b.position.y
    const distSq = dx * dx + dy * dy
    const radiusSum = a.radius + b.radius
    return distSq < radiusSum * radiusSum
  }

  /**
   * Apply knockback between two bodies
   */
  static applyKnockback(
    body: PhysicsBody,
    fromPosition: Vector2,
    force: number
  ): void {
    const dx = body.position.x - fromPosition.x
    const dy = body.position.y - fromPosition.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 0) {
      const normalX = dx / dist
      const normalY = dy / dist
      body.velocity.x += normalX * force
      body.velocity.y += normalY * force
    }
  }

  /**
   * Apply recoil force (opposite direction of velocity)
   */
  static applyRecoil(body: PhysicsBody, direction: Vector2, force: number): void {
    body.velocity.x -= direction.x * force
    body.velocity.y -= direction.y * force
  }

  /**
   * Constrain body to bounds
   */
  static constrainToBounds(
    position: Vector2,
    radius: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    position.x = Math.max(bounds.x + radius, Math.min(bounds.x + bounds.width - radius, position.x))
    position.y = Math.max(bounds.y + radius, Math.min(bounds.y + bounds.height - radius, position.y))
  }

  /**
   * Calculate distance between two points
   */
  static distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate distance squared (faster, no sqrt)
   */
  static distanceSquared(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy
  }

  /**
   * Normalize a vector
   */
  static normalize(v: Vector2): Vector2 {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y)
    if (mag > 0) {
      return { x: v.x / mag, y: v.y / mag }
    }
    return { x: 0, y: 0 }
  }

  /**
   * Lerp between two values
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * Smooth damp for camera following
   */
  static smoothDamp(current: number, target: number, velocity: number, smoothTime: number, deltaTime: number): { value: number; velocity: number } {
    const omega = 2 / smoothTime
    const x = omega * deltaTime
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    const change = current - target
    const temp = (velocity + omega * change) * deltaTime
    const newVelocity = (velocity - omega * temp) * exp
    const newValue = target + (change + temp) * exp
    return { value: newValue, velocity: newVelocity }
  }
}
