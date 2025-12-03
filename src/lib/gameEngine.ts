import type { Player, Enemy, Projectile, Loot, Vector2, EnemyType, Rarity, Weapon, Armor } from './types'

export class GameEngine {
  player: Player
  enemies: Enemy[] = []
  projectiles: Projectile[] = []
  loot: Loot[] = []
  mousePosition: Vector2 = { x: 0, y: 0 }
  keys: Set<string> = new Set()
  isShooting = false
  lastSpawnTime = 0
  spawnInterval = 2000
  lastBoxSpawnTime = 0
  boxSpawnInterval = 5000
  gameTime = 0
  particles: Particle[] = []
  mobileInput: Vector2 = { x: 0, y: 0 }

  constructor() {
    this.player = this.createPlayer()
  }

  createPlayer(): Player {
    return {
      id: 'player',
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      radius: 15,
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      damage: 10,
      fireRate: 300,
      speed: 200,
      lastShotTime: 0,
      weapon: null,
      armor: null,
      kills: 0,
    }
  }

  reset() {
    this.player = this.createPlayer()
    this.enemies = []
    this.projectiles = []
    this.loot = []
    this.particles = []
    this.gameTime = 0
    this.lastSpawnTime = 0
    this.lastBoxSpawnTime = 0
    
    this.spawnInitialLootBoxes()
  }

  spawnInitialLootBoxes() {
    const positions = [
      { x: 200, y: 150 },
      { x: 600, y: 150 },
      { x: 400, y: 450 },
    ]

    positions.forEach((pos, i) => {
      const size = Math.random()
      let radius: number, health: number, contactDamage: number, xpValue: number

      if (size < 0.5) {
        radius = 15
        health = 20
        contactDamage = 5
        xpValue = 15
      } else if (size < 0.8) {
        radius = 25
        health = 50
        contactDamage = 15
        xpValue = 40
      } else {
        radius = 35
        health = 100
        contactDamage = 30
        xpValue = 80
      }

      this.loot.push({
        id: `box_initial_${i}`,
        position: pos,
        type: 'box',
        value: xpValue,
        health,
        maxHealth: health,
        radius,
        contactDamage,
      })
    })
  }

  update(deltaTime: number) {
    this.gameTime += deltaTime * 1000

    this.updatePlayer(deltaTime)
    this.updateEnemies(deltaTime)
    this.updateProjectiles(deltaTime)
    this.updateLoot(deltaTime)
    this.updateParticles(deltaTime)
    this.spawnEnemies()
    this.spawnLootBoxes()
    this.checkCollisions()
    this.cleanupEntities()
  }

  updatePlayer(deltaTime: number) {
    let dx = 0
    let dy = 0

    if (this.mobileInput.x !== 0 || this.mobileInput.y !== 0) {
      dx = this.mobileInput.x
      dy = this.mobileInput.y
    } else {
      dx = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0)
      dy = (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0)
    }

    if (dx !== 0 || dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy)
      this.player.velocity.x = (dx / magnitude) * this.player.speed
      this.player.velocity.y = (dy / magnitude) * this.player.speed
    } else {
      this.player.velocity.x = 0
      this.player.velocity.y = 0
    }

    this.player.position.x += this.player.velocity.x * deltaTime
    this.player.position.y += this.player.velocity.y * deltaTime

    this.player.position.x = Math.max(this.player.radius, Math.min(800 - this.player.radius, this.player.position.x))
    this.player.position.y = Math.max(this.player.radius, Math.min(600 - this.player.radius, this.player.position.y))

    if (this.isShooting && this.gameTime - this.player.lastShotTime > this.player.fireRate) {
      this.shootProjectile()
      this.player.lastShotTime = this.gameTime
    }
  }

  shootProjectile() {
    let angle: number

    if (this.mobileInput.x !== 0 || this.mobileInput.y !== 0) {
      angle = Math.atan2(this.mobileInput.y, this.mobileInput.x)
    } else {
      angle = Math.atan2(
        this.mousePosition.y - this.player.position.y,
        this.mousePosition.x - this.player.position.x
      )
    }

    const projectileSpeed = 400
    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      position: { ...this.player.position },
      velocity: {
        x: Math.cos(angle) * projectileSpeed,
        y: Math.sin(angle) * projectileSpeed,
      },
      damage: this.player.damage,
      radius: 5,
      isPlayerProjectile: true,
    }

    this.projectiles.push(projectile)
  }

  updateEnemies(deltaTime: number) {
    for (const enemy of this.enemies) {
      const dx = this.player.position.x - enemy.position.x
      const dy = this.player.position.y - enemy.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0) {
        enemy.velocity.x = (dx / distance) * enemy.speed
        enemy.velocity.y = (dy / distance) * enemy.speed
      }

      enemy.position.x += enemy.velocity.x * deltaTime
      enemy.position.y += enemy.velocity.y * deltaTime
    }
  }

  updateProjectiles(deltaTime: number) {
    for (const projectile of this.projectiles) {
      projectile.position.x += projectile.velocity.x * deltaTime
      projectile.position.y += projectile.velocity.y * deltaTime
    }
  }

  updateLoot(deltaTime: number) {
    for (const item of this.loot) {
      if (item.type !== 'box') {
        const dx = this.player.position.x - item.position.x
        const dy = this.player.position.y - item.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          const pullSpeed = 300
          item.position.x += (dx / distance) * pullSpeed * deltaTime
          item.position.y += (dy / distance) * pullSpeed * deltaTime
        }
      }
    }
  }

  updateParticles(deltaTime: number) {
    for (const particle of this.particles) {
      particle.life -= deltaTime
      particle.position.x += particle.velocity.x * deltaTime
      particle.position.y += particle.velocity.y * deltaTime
      particle.alpha = particle.life / particle.maxLife
    }
  }

  spawnEnemies() {
    if (this.gameTime - this.lastSpawnTime < this.spawnInterval) return

    const difficultyMultiplier = 1 + this.gameTime / 60000
    const spawnCount = Math.min(Math.floor(1 + this.gameTime / 30000), 3)

    for (let i = 0; i < spawnCount; i++) {
      const type = this.getRandomEnemyType()
      const enemy = this.createEnemy(type, difficultyMultiplier)
      this.enemies.push(enemy)
    }

    this.lastSpawnTime = this.gameTime
    this.spawnInterval = Math.max(1000, 2000 - this.gameTime / 100)
  }

  spawnLootBoxes() {
    if (this.gameTime - this.lastBoxSpawnTime < this.boxSpawnInterval) return

    const numBoxes = 1 + Math.floor(Math.random() * 2)

    for (let i = 0; i < numBoxes; i++) {
      const size = Math.random()
      let radius: number, health: number, contactDamage: number, xpValue: number

      if (size < 0.5) {
        radius = 15
        health = 20
        contactDamage = 5
        xpValue = 15
      } else if (size < 0.8) {
        radius = 25
        health = 50
        contactDamage = 15
        xpValue = 40
      } else {
        radius = 35
        health = 100
        contactDamage = 30
        xpValue = 80
      }

      const x = 50 + Math.random() * 700
      const y = 50 + Math.random() * 500

      this.loot.push({
        id: `box_${Date.now()}_${i}`,
        position: { x, y },
        type: 'box',
        value: xpValue,
        health,
        maxHealth: health,
        radius,
        contactDamage,
      })
    }

    this.lastBoxSpawnTime = this.gameTime
    this.boxSpawnInterval = 4000 + Math.random() * 4000
  }

  getRandomEnemyType(): EnemyType {
    const rand = Math.random()
    if (rand < 0.6) return 'grunt'
    if (rand < 0.8) return 'fast'
    if (rand < 0.95) return 'tank'
    return 'elite'
  }

  createEnemy(type: EnemyType, multiplier: number): Enemy {
    const side = Math.floor(Math.random() * 4)
    let x = 0, y = 0

    switch (side) {
      case 0: x = Math.random() * 800; y = -20; break
      case 1: x = 820; y = Math.random() * 600; break
      case 2: x = Math.random() * 800; y = 620; break
      case 3: x = -20; y = Math.random() * 600; break
    }

    const baseStats = {
      grunt: { health: 30, damage: 10, speed: 80, xp: 10, radius: 12 },
      fast: { health: 20, damage: 8, speed: 140, xp: 15, radius: 10 },
      tank: { health: 80, damage: 15, speed: 50, xp: 30, radius: 18 },
      elite: { health: 150, damage: 20, speed: 60, xp: 100, radius: 22 },
    }

    const stats = baseStats[type]

    return {
      id: `enemy_${Date.now()}_${Math.random()}`,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      radius: stats.radius,
      health: stats.health * multiplier,
      maxHealth: stats.health * multiplier,
      damage: stats.damage * multiplier,
      speed: stats.speed,
      xpValue: Math.floor(stats.xp * multiplier),
      type,
    }
  }

  checkCollisions() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]

      if (projectile.isPlayerProjectile) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j]
          const distance = this.getDistance(projectile.position, enemy.position)

          if (distance < projectile.radius + enemy.radius) {
            enemy.health -= projectile.damage
            this.projectiles.splice(i, 1)
            this.createHitParticles(enemy.position, '#ff4444')

            if (enemy.health <= 0) {
              this.killEnemy(j)
            }
            break
          }
        }

        if (i >= 0 && i < this.projectiles.length && this.projectiles[i] === projectile) {
          for (let k = this.loot.length - 1; k >= 0; k--) {
            const box = this.loot[k]
            if (box.type === 'box' && box.health && box.radius) {
              const distance = this.getDistance(projectile.position, box.position)

              if (distance < projectile.radius + box.radius) {
                box.health -= projectile.damage
                this.projectiles.splice(i, 1)
                this.createHitParticles(box.position, '#ffaa44')

                if (box.health <= 0) {
                  this.breakLootBox(k)
                }
                break
              }
            }
          }
        }
      }
    }

    for (const enemy of this.enemies) {
      const distance = this.getDistance(enemy.position, this.player.position)
      if (distance < enemy.radius + this.player.radius) {
        this.player.health -= enemy.damage * 0.016
        if (this.player.health < 0) this.player.health = 0
      }
    }

    for (let i = this.loot.length - 1; i >= 0; i--) {
      const item = this.loot[i]
      const distance = this.getDistance(item.position, this.player.position)

      if (item.type === 'box' && item.radius && item.contactDamage) {
        if (distance < item.radius + this.player.radius) {
          this.player.health -= item.contactDamage * 0.016
          if (this.player.health < 0) this.player.health = 0
        }
      } else if (distance < 20) {
        this.collectLoot(item)
        this.loot.splice(i, 1)
      }
    }
  }

  killEnemy(index: number) {
    const enemy = this.enemies[index]
    this.player.kills++
    
    this.createDeathParticles(enemy.position)
    this.dropLoot(enemy)
    this.enemies.splice(index, 1)
  }

  breakLootBox(index: number) {
    const box = this.loot[index]
    
    this.createDeathParticles(box.position)
    
    const xpGems = Math.floor(box.value / 5)
    for (let i = 0; i < xpGems; i++) {
      const angle = (Math.PI * 2 * i) / xpGems + Math.random() * 0.3
      const distance = 15 + Math.random() * 15
      this.loot.push({
        id: `xp_${Date.now()}_${i}`,
        position: {
          x: box.position.x + Math.cos(angle) * distance,
          y: box.position.y + Math.sin(angle) * distance,
        },
        type: 'xp',
        value: Math.floor(box.value / xpGems),
      })
    }

    if (Math.random() < 0.3) {
      const itemType = Math.random() < 0.5 ? 'weapon' : 'armor'
      const rarity = this.rollRarity()
      
      this.loot.push({
        id: `item_${Date.now()}`,
        position: { ...box.position },
        type: itemType,
        value: 0,
        rarity,
        item: itemType === 'weapon' ? this.generateWeapon(rarity) : this.generateArmor(rarity),
      })
    }

    this.loot.splice(index, 1)
  }

  dropLoot(enemy: Enemy) {
    const xpGems = enemy.type === 'grunt' ? 2 : enemy.type === 'fast' ? 3 : enemy.type === 'tank' ? 5 : 10

    for (let i = 0; i < xpGems; i++) {
      const angle = (Math.PI * 2 * i) / xpGems
      const distance = 20
      this.loot.push({
        id: `xp_${Date.now()}_${i}`,
        position: {
          x: enemy.position.x + Math.cos(angle) * distance,
          y: enemy.position.y + Math.sin(angle) * distance,
        },
        type: 'xp',
        value: Math.floor(enemy.xpValue / xpGems),
      })
    }

    if (Math.random() < 0.1) {
      const itemType = Math.random() < 0.5 ? 'weapon' : 'armor'
      const rarity = this.rollRarity()
      
      this.loot.push({
        id: `item_${Date.now()}`,
        position: { ...enemy.position },
        type: itemType,
        value: 0,
        rarity,
        item: itemType === 'weapon' ? this.generateWeapon(rarity) : this.generateArmor(rarity),
      })
    }
  }

  rollRarity(): Rarity {
    const rand = Math.random()
    if (rand < 0.55) return 'common'
    if (rand < 0.80) return 'rare'
    if (rand < 0.95) return 'epic'
    return 'legendary'
  }

  generateWeapon(rarity: Rarity): Weapon {
    const multipliers = { common: 1, rare: 1.5, epic: 2.5, legendary: 4 }
    const names = {
      common: ['Rusty Blade', 'Wooden Staff', 'Dull Axe'],
      rare: ['Steel Sword', 'Battle Axe', 'War Mace'],
      epic: ['Flamebringer', 'Frostbite', 'Thunderfury'],
      legendary: ['Ashbringer', 'Frostmourne', 'Gorehowl'],
    }

    return {
      name: names[rarity][Math.floor(Math.random() * names[rarity].length)],
      damage: Math.floor(10 * multipliers[rarity]),
      fireRate: Math.max(100, 300 - multipliers[rarity] * 30),
      rarity,
    }
  }

  generateArmor(rarity: Rarity): Armor {
    const multipliers = { common: 1, rare: 1.5, epic: 2.5, legendary: 4 }
    const names = {
      common: ['Cloth Armor', 'Leather Vest', 'Padded Tunic'],
      rare: ['Chainmail', 'Plate Armor', 'Studded Leather'],
      epic: ['Dragon Scale', 'Titansteel Plate', 'Enchanted Mail'],
      legendary: ['Tier 3 Set', 'Judgment Armor', 'Dreadnaught'],
    }

    return {
      name: names[rarity][Math.floor(Math.random() * names[rarity].length)],
      health: Math.floor(50 * multipliers[rarity]),
      rarity,
    }
  }

  collectLoot(item: Loot) {
    if (item.type === 'xp') {
      this.player.xp += item.value
      
      if (this.player.xp >= this.player.xpToNextLevel) {
        return 'levelup'
      }
    } else if (item.type === 'weapon' && item.item) {
      const weapon = item.item as Weapon
      if (!this.player.weapon || this.getRarityValue(weapon.rarity) > this.getRarityValue(this.player.weapon.rarity)) {
        this.player.weapon = weapon
        this.player.damage = this.player.damage + weapon.damage
        this.player.fireRate = weapon.fireRate
        this.createLootParticles(item.position, this.getRarityColor(weapon.rarity))
        return 'item'
      }
    } else if (item.type === 'armor' && item.item) {
      const armor = item.item as Armor
      if (!this.player.armor || this.getRarityValue(armor.rarity) > this.getRarityValue(this.player.armor.rarity)) {
        this.player.armor = armor
        this.player.maxHealth += armor.health
        this.player.health = Math.min(this.player.health + armor.health, this.player.maxHealth)
        this.createLootParticles(item.position, this.getRarityColor(armor.rarity))
        return 'item'
      }
    }
  }

  getRarityValue(rarity: Rarity): number {
    return { common: 1, rare: 2, epic: 3, legendary: 4 }[rarity]
  }

  getRarityColor(rarity: Rarity): string {
    return {
      common: '#9d9d9d',
      rare: '#0070dd',
      epic: '#a335ee',
      legendary: '#ff8000',
    }[rarity]
  }

  levelUp() {
    this.player.level++
    this.player.xp = this.player.xp - this.player.xpToNextLevel
    this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5)
    this.createLevelUpParticles()
  }

  allocateStat(stat: 'health' | 'damage' | 'speed' | 'fireRate') {
    switch (stat) {
      case 'health':
        this.player.maxHealth += 20
        this.player.health += 20
        break
      case 'damage':
        this.player.damage += 5
        break
      case 'speed':
        this.player.speed += 10
        break
      case 'fireRate':
        this.player.fireRate = Math.max(50, this.player.fireRate - 20)
        break
    }
  }

  cleanupEntities() {
    this.projectiles = this.projectiles.filter(
      p => p.position.x > -50 && p.position.x < 850 && p.position.y > -50 && p.position.y < 650
    )

    this.enemies = this.enemies.filter(
      e => this.getDistance(e.position, this.player.position) < 1000
    )

    if (this.loot.length > 100) {
      this.loot.splice(0, this.loot.length - 100)
    }

    this.particles = this.particles.filter(p => p.life > 0)
  }

  getDistance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  createHitParticles(position: Vector2, color: string) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 50
      this.particles.push({
        position: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.3,
        maxLife: 0.3,
        alpha: 1,
        color,
        size: 3,
      })
    }
  }

  createDeathParticles(position: Vector2) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 120
      this.particles.push({
        position: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.6,
        maxLife: 0.6,
        alpha: 1,
        color: '#ff8800',
        size: 4,
      })
    }
  }

  createLootParticles(position: Vector2, color: string) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 60 + Math.random() * 80
      this.particles.push({
        position: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        color,
        size: 3,
      })
    }
  }

  createLevelUpParticles() {
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30
      const speed = 100 + Math.random() * 50
      this.particles.push({
        position: { ...this.player.position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.8,
        maxLife: 0.8,
        alpha: 1,
        color: '#bb88ff',
        size: 5,
      })
    }
  }
}

interface Particle {
  position: Vector2
  velocity: Vector2
  life: number
  maxLife: number
  alpha: number
  color: string
  size: number
}
