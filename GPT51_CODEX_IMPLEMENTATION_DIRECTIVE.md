# GPT 5.1 CODEX IMPLEMENTATION DIRECTIVE
## Diep.io Style RPG - Class System Completion & Enhancement

---

## CURRENT STATUS ANALYSIS

Based on the tier audit report (generated 2025-12-06), the class system structure is **COMPLETE** with:
- ✅ **71 tanks** implemented across 7 tiers (0-6)  
- ✅ **No missing upgrade paths** detected
- ✅ **100% parent class coverage** at all tiers
- ✅ **Balanced tier distribution** (1→5→12→29→12→6→6 tanks per tier)

## IMPLEMENTATION PRIORITIES

### 🔥 CRITICAL: STAT SYNERGY SYSTEM

The audit shows all tanks exist, but the **stat synergy mechanics** are only partially implemented. Focus on these areas:

#### 1. LOWER TIER SYNERGY IMPLEMENTATION
**Current**: Only Tier 4+ tanks have `synergyNote` fields describing stat interactions
**Missing**: Tier 1-3 tanks lack meaningful stat synergies

**IMPLEMENT**:
```typescript
// Add synergy mechanics to game engine for Tier 1-3 tanks
// Example: In gameEngine.ts or relevant combat system

// Tier 1 Synergies
if (player.tankClass === 'twin') {
  // Reload affects barrel synchronization
  barrelSyncBonus = Math.min(player.reload * 0.1, 2.0);
}

if (player.tankClass === 'sniper') {
  // BulletSpeed extends effective range
  rangeMultiplier = 1 + (player.bulletSpeed * 0.05);
}

if (player.tankClass === 'machinegun') {
  // Reload controls heat dissipation/spin-up
  heatDissipation = player.reload * 0.15;
}

if (player.tankClass === 'flankguard') {
  // MovementSpeed affects rotation responsiveness  
  rotationSpeed = baseRotation * (1 + player.movementSpeed * 0.08);
}

if (player.tankClass === 'smasher') {
  // BodyDamage multiplies collision force
  collisionDamage = baseDamage * (1 + player.bodyDamage * 0.2);
}
```

#### 2. DRONE SPEED SYNERGY COMPLETION
**Existing**: Some drone classes have synergy notes mentioning bulletSpeed affects drone movement
**IMPLEMENT**: Ensure this is actually coded in the drone system

```typescript
// In droneSystem.ts or similar
if (owner.tankClass.includes('overseer') || owner.tankClass.includes('necromancer')) {
  drone.speed = baseDroneSpeed * (1 + owner.bulletSpeed * 0.1);
}
```

#### 3. ABILITY SYSTEM HOOKS
**Current**: Tier 4+ tanks have special abilities mentioned in synergyNote
**Missing**: Actual implementation of these abilities

**IMPLEMENT FOR**:
- **Siegebreaker**: Chargeable 1000-damage cannonball (bodyDamage affects charge speed)
- **Aegis Vanguard**: Rotating shield wedges (movementSpeed affects orbit speed)  
- **Mirage**: Decoy system (reload affects re-cloak time)
- **Phase Sentinel**: Extended range mechanics (bulletSpeed increases rail length)

### 🎯 SECONDARY: UI/UX IMPROVEMENTS

#### 1. SYNERGY VISUALIZATION IN UPGRADE MODAL
Add visual indicators showing which stats have synergies for each tank class:

```typescript
// In upgrade modal component
const synergyStats = {
  'twin': ['reload'], 
  'sniper': ['bulletSpeed', 'bulletDamage'],
  'overseer': ['bulletSpeed'], // for drone speed
  'smasher': ['bodyDamage', 'movementSpeed'],
  // ... etc for all classes
};

// Show star/highlight next to synergy stats
```

#### 2. STAT TOOLTIPS WITH SYNERGY INFO
```typescript
const getStatTooltip = (stat: string, tankClass: string) => {
  const synergies = {
    'twin': { 'reload': 'Improves barrel synchronization timing' },
    'overseer': { 'bulletSpeed': 'Increases drone movement speed' },
    // ... etc
  };
  return synergies[tankClass]?.[stat] || standardTooltips[stat];
}
```

### 🔧 TERTIARY: BALANCE & POLISH

#### 1. STAT CAP IMPLEMENTATION
Ensure diminishing returns are implemented:

```typescript
// Stat effectiveness calculation with soft caps
function getStatEffectiveness(rawPoints: number, statType: string): number {
  const softCap = 30;
  const hardCap = 40;
  
  if (rawPoints <= softCap) {
    return rawPoints; // Linear growth
  } else if (rawPoints <= hardCap) {
    return softCap + (rawPoints - softCap) * 0.5; // 50% effectiveness
  } else {
    return softCap + (hardCap - softCap) * 0.5; // Hard cap
  }
}
```

#### 2. VISUAL FEEDBACK FOR SYNERGIES
Add particle effects or visual cues when synergies are active:
- Synchronized barrels glow when reload synergy is high
- Drones move with speed trails when bulletSpeed is maxed
- Smashers get collision aura when bodyDamage is high

---

## IMPLEMENTATION ORDER

### PHASE 1: CORE SYNERGY MECHANICS (HIGH PRIORITY)
1. ✅ Implement Tier 1-3 stat synergies in combat system
2. ✅ Fix drone speed scaling with bulletSpeed
3. ✅ Add collision damage scaling for smasher line
4. ✅ Implement range/accuracy bonuses for sniper line

### PHASE 2: ABILITY SYSTEM (MEDIUM PRIORITY)  
1. ⭐ Siegebreaker charge cannon ability
2. ⭐ Aegis Vanguard shield orbit system
3. ⭐ Mirage decoy/stealth mechanics
4. ⭐ Phase Sentinel extended range system

### PHASE 3: UI/UX POLISH (LOW PRIORITY)
1. 🎨 Synergy indicators in upgrade modal
2. 🎨 Enhanced stat tooltips with synergy explanations
3. 🎨 Visual effects for active synergies
4. 🎨 Balance testing tools for stat distributions

---

## TESTING & VALIDATION

### Debug Commands to Implement
```typescript
// Add to window object for testing
window.debugTank = {
  setStats: (stats: number[]) => {}, // Set specific stat distribution
  testSynergy: (tankClass: string) => {}, // Test synergy mechanics
  showEffectiveness: () => {}, // Display current stat effectiveness
  rapidUpgrade: (targetClass: string) => {} // Quick upgrade to test builds
};
```

### Validation Checklist
- [ ] All Tier 1-3 tanks have at least 1 meaningful stat synergy
- [ ] Drone speed scales visibly with bulletSpeed investment  
- [ ] Smasher collision damage scales with bodyDamage
- [ ] Stat tooltips show synergy information
- [ ] Tier 4+ abilities are implemented and functional
- [ ] Diminishing returns prevent overpowered stat stacking

---

## SUCCESS CRITERIA

✅ **COMPLETE** when:
1. Every tank class (71 total) has meaningful stat synergies implemented
2. All special abilities mentioned in `synergyNote` fields are functional
3. UI clearly communicates which stats have synergies for current class
4. Balance testing confirms no overpowered combinations
5. Visual feedback makes synergies feel impactful to players

**Focus on making stat point allocation feel meaningful and tied to the chosen tank's identity rather than generic min-maxing.**