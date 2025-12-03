import type { Player, Projectile, Loot, Vector2, Rarity, Weapon, Armor } from './types'
import { UpgradeManager, type StatType } from './upgradeSystem'

export class GameEngine {
  upgradeManager: UpgradeManager
  player: Player
  projectiles: Projectile[] = []
  loot: Loot[] = []
  mousePosition: Vector2 = { x: 0, y: 0 }
  keys: Set<string> = new Set()
  isShooting = false
  lastBoxSpawnTime = 0
  boxSpawnInterval = 3000
  gameTime = 0
  particles: Particle[] = []
  mobileInput: Vector2 = { x: 0, y: 0 }
  mobileShootDirection: Vector2 = { x: 0, y: 0 }
  worldSize = 4000
  camera: Vector2 = { x: 0, y: 0 }
  viewportWidth = 800
  viewportHeight = 600

  constructor() {
    this.upgradeManager = new UpgradeManager()
    this.player = this.createPlayer()
  }

  createPlayer(): Player {
    return {
      id: 'player',
      position: { x: this.worldSize / 2, y: this.worldSize / 2 },
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
      bulletSpeed: 400,
      bulletPenetration: 5,
      bodyDamage: 10,
      healthRegen: 1,
      lastRegenTime: 0,
      tankClass: 'basic',
    }
  }

  reset() {
    this.upgradeManager.reset()
    this.player = this.createPlayer()
    this.projectiles = []
    this.loot = []
    this.particles = []
    this.gameTime = 0
    this.lastBoxSpawnTime = 0
    
    this.generateWorldLoot()
  }

  generateWorldLoot() {
    const clusters = 25
    
    for (let c = 0; c < clusters; c++) {
      const clusterX = Math.random() * this.worldSize
      const clusterY = Math.random() * this.worldSize
      const clusterRadius = 200 + Math.random() * 300
      const boxCount = 15 + Math.floor(Math.random() * 20)
      
      for (let i = 0; i < boxCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * clusterRadius
        const x = clusterX + Math.cos(angle) * distance
        const y = clusterY + Math.sin(angle) * distance
        
        if (x < 100 || x > this.worldSize - 100 || y < 100 || y > this.worldSize - 100) continue
        
        const distFromCenter = Math.sqrt(
          Math.pow(x - this.worldSize / 2, 2) + Math.pow(y - this.worldSize / 2, 2)
        )
        const normalizedDist = distFromCenter / (this.worldSize / 2)
        
        const size = Math.random() + normalizedDist * 0.5
        let radius: number, health: number, contactDamage: number, xpValue: number
        
        if (size < 0.6) {
          radius = 15
          health = 20
          contactDamage = 5
          xpValue = 15
        } else if (size < 1.2) {
          radius = 25
          health = 50
          contactDamage = 15
          xpValue = 40
        } else if (size < 1.8) {
          radius = 35
          health = 100
          contactDamage = 30
          xpValue = 80
        } else {
          radius = 50
          health = 200
          contactDamage = 50
          xpValue = 150
        }
        
        this.loot.push({
          id: `box_initial_${c}_${i}`,
          position: { x, y },
          type: 'box',
          value: xpValue,
          health,
          maxHealth: health,
          radius,
          contactDamage,
        })
      }
    }
    
    const edgeBoxCount = 50
    for (let i = 0; i < edgeBoxCount; i++) {
      const side = Math.floor(Math.random() * 4)
      let x, y
      
      switch (side) {
        case 0: x = Math.random() * this.worldSize; y = 100 + Math.random() * 200; break
        case 1: x = Math.random() * this.worldSize; y = this.worldSize - 300 + Math.random() * 200; break
        case 2: x = 100 + Math.random() * 200; y = Math.random() * this.worldSize; break
        default: x = this.worldSize - 300 + Math.random() * 200; y = Math.random() * this.worldSize; break
      }
      
      const size = Math.random()
      let radius: number, health: number, contactDamage: number, xpValue: number
      
      if (size < 0.3) {
        radius = 35
        health = 100
        contactDamage = 30
        xpValue = 80
      } else if (size < 0.7) {
        radius = 50
        health = 200
        contactDamage = 50
        xpValue = 150
      } else {
        radius = 70
        health = 400
        contactDamage = 80
        xpValue = 300
      }
      
      this.loot.push({
        id: `box_edge_${i}`,
        position: { x, y },
        type: 'box',
        value: xpValue,
        health,
        maxHealth: health,
        radius,
        contactDamage,
      })
    }
  }

  update(deltaTime: number) {
    this.gameTime += deltaTime * 1000

    this.updatePlayer(deltaTime)
    this.updateProjectiles(deltaTime)
    this.updateLoot(deltaTime)
    this.updateParticles(deltaTime)
    this.updateCamera()
    this.spawnLootBoxes()
    this.checkCollisions()
    this.cleanupEntities()
  }

  updateCamera() {
    this.camera.x = this.player.position.x - this.viewportWidth / 2
    this.camera.y = this.player.position.y - this.viewportHeight / 2
    
    this.camera.x = Math.max(0, Math.min(this.worldSize - this.viewportWidth, this.camera.x))
    this.camera.y = Math.max(0, Math.min(this.worldSize - this.viewportHeight, this.camera.y))
  }

  updatePlayer(deltaTime: number) {
    if (this.player.health < this.player.maxHealth) {
      if (this.gameTime - this.player.lastRegenTime > 1000) {
        this.player.health = Math.min(
          this.player.health + this.player.healthRegen * deltaTime,
          this.player.maxHealth
        )
      }
    }

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

    this.player.position.x = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.x))
    this.player.position.y = Math.max(this.player.radius, Math.min(this.worldSize - this.player.radius, this.player.position.y))

    if (this.isShooting && this.gameTime - this.player.lastShotTime > this.player.fireRate) {
      this.shootProjectile()
      this.player.lastShotTime = this.gameTime
    }
  }

  shootProjectile() {
    let angle: number

    if (this.mobileShootDirection.x !== 0 || this.mobileShootDirection.y !== 0) {
      angle = Math.atan2(this.mobileShootDirection.y, this.mobileShootDirection.x)
    } else {
      angle = Math.atan2(
        this.mousePosition.y - this.player.position.y,
        this.mousePosition.x - this.player.position.x
      )
    }

    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      position: { ...this.player.position },
      velocity: {
        x: Math.cos(angle) * this.player.bulletSpeed,
        y: Math.sin(angle) * this.player.bulletSpeed,
      },
      damage: this.player.damage,
      radius: 5,
      isPlayerProjectile: true,
    }

    this.projectiles.push(projectile)
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



  spawnLootBoxes() {
    if (this.gameTime - this.lastBoxSpawnTime < this.boxSpawnInterval) return

    const numBoxes = 3 + Math.floor(Math.random() * 5)

    for (let i = 0; i < numBoxes; i++) {
      const clusterNearPlayer = Math.random() < 0.3
      let x, y
      
      if (clusterNearPlayer) {
        const angle = Math.random() * Math.PI * 2
        const distance = 300 + Math.random() * 500
        x = this.player.position.x + Math.cos(angle) * distance
        y = this.player.position.y + Math.sin(angle) * distance
      } else {
        x = Math.random() * this.worldSize
        y = Math.random() * this.worldSize
      }
      
      x = Math.max(100, Math.min(this.worldSize - 100, x))
      y = Math.max(100, Math.min(this.worldSize - 100, y))
      
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
      } else if (size < 0.95) {
        radius = 35
        health = 100
        contactDamage = 30
        xpValue = 80
      } else {
        radius = 50
        health = 200
        contactDamage = 50
        xpValue = 150
      }

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
    this.boxSpawnInterval = 3000 + Math.random() * 3000
  }



  checkCollisions() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]

      if (projectile.isPlayerProjectile) {
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

    for (let i = this.loot.length - 1; i >= 0; i--) {
      const item = this.loot[i]
      const distance = this.getDistance(item.position, this.player.position)

      if (item.type === 'box' && item.radius && item.contactDamage && item.health) {
        if (distance < item.radius + this.player.radius) {
          const actualDamage = Math.max(0, item.contactDamage - this.player.bodyDamage * 0.5)
          this.player.health -= actualDamage * 0.016
          this.player.lastRegenTime = this.gameTime
          
          item.health -= this.player.bodyDamage * 0.016
          if (item.health <= 0) {
            this.breakLootBox(i)
          }
          
          if (this.player.health < 0) this.player.health = 0
        }
      } else if (distance < 20) {
        this.collectLoot(item)
        this.loot.splice(i, 1)
      }
    }
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
      const didLevelUp = this.upgradeManager.addXP(item.value)
      
      if (didLevelUp) {
        this.player.level = this.upgradeManager.getLevel()
        return 'levelup'
      }
      
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

  allocateStat(stat: StatType) {
    if (this.upgradeManager.allocateStat(stat)) {
      this.applyStatsToPlayer()
    }
  }

  applyStatsToPlayer() {
    const stats = this.upgradeManager.getStats()
    this.player.maxHealth = Math.floor(stats.maxHealth)
    this.player.damage = Math.floor(stats.bulletDamage)
    this.player.fireRate = Math.floor(stats.reload)
    this.player.speed = Math.floor(stats.movementSpeed)
    this.player.bulletSpeed = Math.floor(stats.bulletSpeed)
    this.player.bulletPenetration = Math.floor(stats.bulletPenetration)
    this.player.bodyDamage = Math.floor(stats.bodyDamage)
    this.player.healthRegen = stats.healthRegen
    this.player.health = Math.min(this.player.health, this.player.maxHealth)
  }

  cleanupEntities() {
    this.projectiles = this.projectiles.filter(
      p => p.position.x > -50 && p.position.x < this.worldSize + 50 && p.position.y > -50 && p.position.y < this.worldSize + 50
    )

    if (this.loot.length > 500) {
      this.loot.sort((a, b) => {
        const distA = this.getDistance(a.position, this.player.position)
        const distB = this.getDistance(b.position, this.player.position)
        return distB - distA
      })
      this.loot.splice(400)
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
