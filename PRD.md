# Planning Guide

A top-down action RPG where players control a hero battling monsters in an ever-dangerous world, collecting loot to grow stronger until inevitable death resets all progress.

**Experience Qualities**: 
1. **Visceral** - Combat feels immediate and satisfying with impactful hit feedback and smooth movement
2. **Tense** - The constant threat of permadeath creates meaningful stakes for every encounter
3. **Rewarding** - Loot drops and level-ups provide continuous dopamine hits that drive engagement

**Complexity Level**: Light Application (multiple features with basic state)
  - Core gameplay loop of combat, looting, and progression with persistent high score tracking but session-based character state

## Essential Features

### Player Movement & Combat
- **Functionality**: WASD movement, mouse aim, click/space to shoot projectiles
- **Purpose**: Provides the core moment-to-moment gameplay interaction
- **Trigger**: Keyboard and mouse input
- **Progression**: Press W/A/S/D → Player moves in 8 directions → Mouse position determines aim → Click/Space fires projectile → Projectile travels and hits enemy
- **Success criteria**: Smooth 60fps movement, accurate mouse-based aiming, visible projectiles with hit detection

### Enemy AI & Spawning
- **Functionality**: Enemies spawn at increasing difficulty, move toward player, deal contact damage
- **Purpose**: Creates challenge and provides loot sources
- **Trigger**: Time-based spawning system
- **Progression**: Timer triggers spawn → Enemy appears at map edge → AI pathfinds toward player → Enemy takes damage or damages player on contact → Enemy dies and drops loot
- **Success criteria**: Enemies consistently spawn, pursue intelligently, and scale in difficulty

### Loot System (diep.io style)
- **Functionality**: Enemies drop XP gems and equipment on death, player collects by proximity
- **Purpose**: Core progression mechanic that drives engagement
- **Trigger**: Enemy death
- **Progression**: Enemy defeated → Gems/items drop at death location → Player moves near loot → Automatic collection → XP bar fills or equipment upgrades → Level up triggers stat increase
- **Success criteria**: Visible loot drops, smooth pickup animation, clear XP progression feedback

### Level & Stat Progression
- **Functionality**: Gaining XP levels up character, each level offers stat point to allocate
- **Purpose**: Provides RPG depth and player agency in build customization
- **Trigger**: XP threshold reached
- **Progression**: Kill enemies → Collect XP gems → Reach level threshold → Level up modal appears → Player allocates stat point (Health/Damage/Speed/Fire Rate) → Stats immediately update
- **Success criteria**: Clear XP bar, satisfying level-up moment, visible stat changes

### Equipment System
- **Functionality**: Find weapons, armor, accessories with rarity tiers (Common/Rare/Epic/Legendary)
- **Purpose**: Provides exciting moments of discovery and power spikes
- **Trigger**: Enemy drops or chest spawns
- **Progression**: Loot drops → Player sees rarity color → Pickup → Equipment auto-equips if better → Stats update → Visual appearance changes
- **Success criteria**: Clear rarity indication, immediate power feedback, visible character changes

### Permadeath & High Score
- **Functionality**: Death resets character but tracks best survival time and level reached
- **Purpose**: Creates meaningful stakes and replayability through competition with self
- **Trigger**: Health reaches zero
- **Progression**: Take fatal damage → Death animation plays → Stats screen shows (time survived, level reached, enemies killed) → Compare to previous best → Restart button returns to level 1
- **Success criteria**: Death feels fair, stats are preserved, motivation to try again

## Edge Case Handling

- **Off-screen enemies**: Despawn enemies too far from player to prevent memory issues
- **Loot overflow**: Cap maximum loot items on ground, oldest despawn first
- **Rapid level-ups**: Queue level-up screens if multiple thresholds crossed simultaneously
- **Zero damage builds**: Ensure minimum damage even with no stat investment
- **Movement stuck**: Collision detection prevents wall-clipping, enemies push apart to prevent stacking

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
  - Sword (Attack stat)
  - Heart (Health stat) 
  - Lightning (Fire Rate)
  - Wind/Sneaker (Speed)
  - Shield (Armor/Defense)
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
