# Planning Guide

An exploration-focused action RPG where players control a hero destroying loot boxes across a vast world, collecting experience to grow stronger until inevitable death resets all progress.

**Experience Qualities**: 
1. **Expansive** - A large open world rewards exploration with valuable loot scattered across the map
2. **Satisfying** - Destroying boxes and collecting XP provides continuous dopamine hits that drive engagement
3. **Progressive** - Level-ups provide meaningful character advancement through stat allocation

**Complexity Level**: Light Application (multiple features with basic state)
  - Core gameplay loop of exploration, destruction, and progression with persistent high score tracking but session-based character state

## Essential Features

### Player Movement & Combat
- **Functionality**: WASD movement, mouse aim, click/space to shoot projectiles
- **Purpose**: Provides the core moment-to-moment gameplay interaction
- **Trigger**: Keyboard and mouse input (desktop) or virtual joystick controls (mobile)
- **Progression**: Press W/A/S/D → Player moves smoothly → Mouse position determines aim → Click/Space fires projectile → Projectile travels and hits loot box
- **Success criteria**: Smooth 60fps movement with camera following player, accurate mouse-based aiming, visible projectiles with hit detection

### Large World Exploration
- **Functionality**: 4000x4000 pixel world with camera following player, smooth scrolling
- **Purpose**: Encourages exploration and discovery of valuable loot
- **Trigger**: Player movement
- **Progression**: Player moves → Camera smoothly follows → World boundaries visible → Loot boxes discovered across map
- **Success criteria**: No performance issues with large world, smooth camera movement, clear boundaries

### Loot Box System (diep.io style distribution)
- **Functionality**: Loot boxes scattered across world in clusters, varying sizes and rewards, must be destroyed to collect XP
- **Purpose**: Core progression mechanic through exploration and destruction
- **Trigger**: World generation and periodic spawning
- **Progression**: Boxes spawn in clusters → Player finds and shoots boxes → Boxes take damage and show health bars → Box breaks → XP gems scatter → Player collects gems → Level up
- **Success criteria**: Diep.io-style distribution with 25+ clusters across map, denser in some areas, larger/more valuable boxes toward edges

### Level & Stat Progression (diep.io system)
- **Functionality**: Gaining XP levels up character (max level 45), skill points awarded to allocate across 8 stats with strategic cap of 33 total points
- **Purpose**: Provides RPG depth with meaningful trade-offs forcing build specialization (can only max ~4 of 8 stats)
- **Trigger**: XP threshold reached using exponential curve
- **Progression**: Destroy boxes → Collect XP gems → Reach level threshold → Level up modal appears → Player allocates skill point across 8 stats (each capped at 7) → Stats immediately update with diminishing returns formulas
- **Success criteria**: Clear XP bar showing progress within current level, satisfying level-up moment, visible stat changes, skill point distribution matches diep.io (1 point per level 2-28, then every 2-3 levels, totaling 33 points at level 45)

### 8 Core Stats System
- **Health Regen**: Exponential growth formula (base × 1.35^points) - faster healing after avoiding damage for 1 second
- **Max Health**: Linear scaling (base + 25 per point) - increases HP pool
- **Body Damage**: Multiplicative (base × 1.15^points) - ramming damage against boxes and damage mitigation from box contact
- **Bullet Speed**: Multiplicative (base × 1.08^points) - projectile velocity
- **Bullet Penetration**: Multiplicative (base × 1.2^points) - projectile durability (future: multi-hit capability)
- **Bullet Damage**: Multiplicative (base × 1.15^points) - projectile damage output
- **Reload**: Exponential reduction (base × 0.93^points) - faster fire rate with diminishing returns
- **Movement Speed**: Multiplicative (base × 1.07^points) - tank movement velocity

### Tank Class Evolution (Future Feature)
- **Tier 0 (Level 1)**: Basic Tank - single barrel foundation
- **Tier 1 (Level 15)**: Twin, Sniper, Machine Gun, Flank Guard - first specialization branch
- **Tier 2 (Level 30)**: Triple Shot, Quad Tank, Assassin, Overseer, Destroyer, Tri-Angle - advanced specializations
- **Tier 3 (Level 45)**: Penta Shot, Octo Tank, Ranger, Overlord, Annihilator, Booster - ultimate class evolutions
- Each upgrade changes barrel configuration and firing pattern while maintaining allocated stat points

### Equipment System
- **Functionality**: Find weapons and armor with rarity tiers (Common/Rare/Epic/Legendary)
- **Purpose**: Provides exciting moments of discovery and power spikes
- **Trigger**: Box destruction (30% drop chance)
- **Progression**: Box destroyed → Equipment drops → Player collects → Equipment auto-equips if better → Stats update
- **Success criteria**: Clear rarity indication, immediate power feedback

### Mobile Touch Controls
- **Functionality**: Virtual joystick for movement (left), tap button for shooting (right)
- **Purpose**: Enables full gameplay on mobile devices
- **Trigger**: Touch input detection
- **Progression**: Touch joystick → Character moves in direction → Release returns to neutral → Touch shoot button → Continuous fire while held
- **Success criteria**: No page scrolling/zooming, joystick shows visual feedback, no sudden direction changes when releasing

### Permadeath & High Score
- **Functionality**: Death resets character but tracks best survival time and level reached
- **Purpose**: Creates meaningful stakes and replayability through competition with self
- **Trigger**: Health reaches zero from box contact damage
- **Progression**: Take fatal damage → Death animation plays → Stats screen shows (time survived, level reached, boxes destroyed) → Compare to previous best → Restart button returns to level 1
- **Success criteria**: Death feels fair, stats are preserved, motivation to try again

## Edge Case Handling

- **Off-screen loot**: Cull loot rendering beyond visible area, keep nearest 500 boxes in memory
- **Loot overflow**: Cap maximum loot items, remove farthest from player
- **Rapid level-ups**: Queue level-up screens if multiple thresholds crossed simultaneously
- **Mobile scrolling**: Prevent default touch behavior on control elements with touch-action: none
- **Boundary collision**: Smooth collision with world edges prevents player from leaving bounds

## Design Direction

The design should feel epic and adventurous with a darker, more grounded fantasy tone that honors Warcraft's world while maintaining diep.io's clean readability - opt for a minimal interface that lets the action breathe, with just enough visual richness to convey the fantasy theme through color, particle effects, and iconography.

## Color Selection

Triadic color scheme (Alliance blue, Horde red, neutral gold) to evoke Warcraft factions while maintaining clear visual hierarchy for gameplay elements.

- **Primary Color**: Deep Alliance Blue `oklch(0.45 0.15 250)` - Represents the player character and friendly UI elements, communicates heroism and clarity
- **Secondary Colors**: 
  - Horde Crimson `oklch(0.40 0.20 20)` for enemies and danger zones
  - Neutral Gold `oklch(0.75 0.15 85)` for loot and rewards
- **Accent Color**: Arcane Purple `oklch(0.55 0.25 290)` for magical effects, level-ups, and rare loot highlights
- **Foreground/Background Pairings**: 
  - Background (Dark Stone `oklch(0.20 0.01 250)`): Light Text `oklch(0.95 0.01 250)` - Ratio 15.2:1 ✓
  - Card (Medium Stone `oklch(0.30 0.02 250)`): Light Text `oklch(0.95 0.01 250)` - Ratio 10.8:1 ✓
  - Primary (Alliance Blue `oklch(0.45 0.15 250)`): White Text `oklch(1 0 0)` - Ratio 5.1:1 ✓
  - Secondary (Crimson `oklch(0.40 0.20 20)`): White Text `oklch(1 0 0)` - Ratio 5.5:1 ✓
  - Accent (Arcane Purple `oklch(0.55 0.25 290)`): White Text `oklch(1 0 0)` - Ratio 4.8:1 ✓
  - Muted (Dark UI `oklch(0.25 0.02 250)`): Muted Text `oklch(0.65 0.02 250)` - Ratio 4.5:1 ✓

## Font Selection

Typography should feel bold and readable at a glance during fast-paced combat, with a slight medieval flavor that doesn't sacrifice legibility - using a geometric sans-serif with strong character to bridge fantasy aesthetics and modern UI clarity.

- **Typographic Hierarchy**: 
  - H1 (Game Title): Cinzel Bold/48px/tight letter-spacing (-0.02em) - Medieval serif for dramatic title moments
  - H2 (Level Up/Death Screen): Inter Bold/32px/normal tracking - Clear hierarchy for modal headers
  - H3 (Stats/Labels): Inter SemiBold/18px/normal tracking - UI section headers
  - Body (HUD/Numbers): Inter Medium/16px/tabular numbers - Consistent numeric display
  - Small (Item descriptions): Inter Regular/14px/relaxed line-height (1.6) - Readable detail text

## Animations

Animations should punctuate key moments (level-ups, loot drops, deaths) with celebratory or dramatic flair, while combat animations remain fast and functional to preserve responsive gameplay - use motion to communicate state changes without obscuring the action.

- **Purposeful Meaning**: Particle bursts for level-ups convey achievement, screen shake on death emphasizes consequence, smooth gem collection creates satisfaction
- **Hierarchy of Movement**: Combat projectiles and enemy movement are instant/fast (60fps), loot pickups have subtle magnetic pull (200ms), level-up modals have dramatic entrance (400ms with bounce), death sequence is slower (800ms) to allow emotional processing

## Component Selection

- **Components**: 
  - Canvas element for game rendering (full viewport)
  - Card component for death/level-up modals
  - Progress bar for health and XP
  - Button (primary variant) for stat allocation and restart
  - Badge components for displaying stats and rarity tiers
  - Dialog for pause menu
  
- **Customizations**: 
  - Custom game canvas renderer with 2D context
  - Custom particle system for combat effects
  - Custom minimap component showing nearby enemies
  - Floating damage numbers component
  
- **States**: 
  - Buttons: Hover shows slight scale (1.05) and glow, active shows depression, disabled is semi-transparent
  - Progress bars: Smooth animated fills with gradient overlays, flash on threshold events
  - Health bar: Color shifts from green → yellow → red based on percentage
  
- **Icon Selection**: 
  - Heart (Health Regen & Max Health stats)
  - Sword (Bullet Damage stat)
  - Lightning (Reload/Fire Rate stat)
  - Wind (Movement Speed stat)
  - Shield (Body Damage stat)
  - Target (Bullet Penetration stat)
  - ArrowsOut (Bullet Speed stat)
  - Skull (Enemy/Death)
  - Star (Level/XP)
  - Treasure chest (Loot)
  
- **Spacing**: 
  - HUD elements: 4-unit (16px) padding from screen edges
  - Modal content: 6-unit (24px) internal padding
  - Stat buttons: 3-unit (12px) gap in grid layout
  - Floating UI: 2-unit (8px) gap for compact info density
  
- **Mobile**: 
  - Virtual joystick appears bottom-left for movement
  - Tap-to-shoot enabled anywhere on right side of screen
  - HUD elements scale down 20% and reposition to avoid thumb zones
  - Level-up modal fills more of screen for easier touch targets
  - Auto-fire toggle for accessibility
