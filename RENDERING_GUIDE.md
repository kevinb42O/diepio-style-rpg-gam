# Diep.io Clone - Rendering & UI System Guide

This guide explains how to use the RenderEngine, UIManager, and tank configuration system to create the diep.io visual aesthetic.

## Architecture Overview

The rendering system is split into three main components:

1. **RenderEngine** (`src/lib/renderEngine.ts`) - Handles all canvas drawing for game entities
2. **UIManager** (`src/lib/uiManager.ts`) - Manages the stat upgrade UI overlay
3. **Tank Configs** (`src/lib/tankConfigs.ts`) - Defines barrel configurations for all tank classes

## Tank Rendering System

### Basic Concept

Tanks in diep.io consist of:
- A **circular body** (center)
- One or more **rectangular barrels** (attached to body)
- **Thick black outlines** on all shapes

The key rendering rule: **Barrels are drawn BEFORE the body** so they appear underneath.

### Tank Configuration Format

```typescript
interface BarrelConfig {
  angle: number          // Rotation in degrees (0 = right, 90 = down, etc.)
  length: number         // How long the barrel extends
  width: number          // How thick the barrel is
  offsetX?: number       // Barrel position offset from center (optional)
  offsetY?: number       // Barrel position offset from center (optional)
  isTrapezoid?: boolean  // True for Machine Gun style (wider at end)
}
```

### Example Tank Configurations

#### Basic Tank (Single Forward Barrel)
```typescript
basic: {
  name: 'Basic',
  barrels: [
    { angle: 0, length: 40, width: 14 }
  ],
  tier: 0,
  unlocksAt: 1
}
```

#### Twin Tank (Two Offset Barrels)
```typescript
twin: {
  name: 'Twin',
  barrels: [
    { angle: -15, length: 40, width: 12, offsetY: -6 },
    { angle: 15, length: 40, width: 12, offsetY: 6 }
  ],
  tier: 1,
  unlocksAt: 15
}
```

#### Octo Tank (8 Directional Barrels)
```typescript
octotank: {
  name: 'Octo Tank',
  barrels: [
    { angle: 0, length: 38, width: 13 },
    { angle: 45, length: 38, width: 13 },
    { angle: 90, length: 38, width: 13 },
    { angle: 135, length: 38, width: 13 },
    { angle: 180, length: 38, width: 13 },
    { angle: 225, length: 38, width: 13 },
    { angle: 270, length: 38, width: 13 },
    { angle: 315, length: 38, width: 13 }
  ],
  tier: 3,
  unlocksAt: 45
}
```

## Drawing Polygons (XP Sources)

The game uses geometric shapes instead of "loot boxes" to match diep.io's aesthetic:

### Polygon Types

| Shape | Sides | Color | HP | XP Value |
|-------|-------|-------|-----|----------|
| Square | 4 | Yellow `#FFE869` | Low | 15-20 |
| Triangle | 3 | Red `#FC7677` | Medium | 40-50 |
| Pentagon | 5 | Purple `#768DFC` | High | 80-100 |
| Hexagon | 6 | Orange `#FFA500` | Very High | 150-300 |

### Rendering Details

All polygons:
- Have **thick black borders** (3px lineWidth)
- **Slowly rotate** over time for visual interest
- Show **health bars** when damaged
- Are drawn with flat fill colors (no gradients)

## Stat Upgrade UI

The stat UI is a **persistent overlay** in the bottom-left corner of the screen.

### Visual Design

- **8 horizontal bars** stacked vertically
- Each bar is divided into **7 segments** (max stat level)
- Bars fill from left to right as points are allocated
- Each stat has a **unique color** for instant recognition
- **Hover effect** highlights upgradeable stats
- **Hotkeys 1-8** correspond to each stat bar

### Stat Bar Configuration

```typescript
const STAT_BARS = [
  { key: 'healthRegen', label: 'Health Regen', color: '#FF69B4', hotkey: '1' },
  { key: 'maxHealth', label: 'Max Health', color: '#DC143C', hotkey: '2' },
  { key: 'bodyDamage', label: 'Body Damage', color: '#FF8C00', hotkey: '3' },
  { key: 'bulletSpeed', label: 'Bullet Speed', color: '#FFD700', hotkey: '4' },
  { key: 'bulletPenetration', label: 'Bullet Penetration', color: '#00CED1', hotkey: '5' },
  { key: 'bulletDamage', label: 'Bullet Damage', color: '#4169E1', hotkey: '6' },
  { key: 'reload', label: 'Reload', color: '#9370DB', hotkey: '7' },
  { key: 'movementSpeed', label: 'Movement Speed', color: '#32CD32', hotkey: '8' }
]
```

## Usage in Game Code

### Setting Up the Renderers

```typescript
import { RenderEngine } from '@/lib/renderEngine'
import { UIManager } from '@/lib/uiManager'

const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement
const uiCanvas = document.getElementById('ui-canvas') as HTMLCanvasElement

const renderEngine = new RenderEngine(gameCanvas)
const uiManager = new UIManager(uiCanvas)
```

### Game Loop Integration

```typescript
function gameLoop() {
  // Update game logic
  engine.update(deltaTime)
  
  // Render game entities
  renderEngine.render(engine)
  
  // Render UI overlay
  uiManager.clear()
  if (gameState === 'playing') {
    const statPoints = engine.upgradeManager.getStatPoints()
    const availablePoints = engine.upgradeManager.getAvailableSkillPoints()
    uiManager.drawStatUpgradeUI(statPoints, availablePoints, handleStatClick)
  }
  
  requestAnimationFrame(gameLoop)
}
```

### Changing Tank Class

```typescript
import { TANK_CONFIGS } from '@/lib/tankConfigs'

// Change player's tank class
engine.player.tankClass = 'twin'

// The RenderEngine automatically uses the new configuration
// on the next render call
```

## Adding New Tank Classes

To add a new tank class:

1. **Define the barrel configuration** in `src/lib/tankConfigs.ts`:

```typescript
mynewtank: {
  name: 'My New Tank',
  barrels: [
    { angle: 0, length: 45, width: 16 },
    { angle: 90, length: 35, width: 12 },
    { angle: -90, length: 35, width: 12 }
  ],
  tier: 2,
  unlocksAt: 30,
  upgradesFrom: ['basic']
}
```

2. **The rendering system automatically handles it** - no additional code needed!

## Color Palette

### Game World
- **Background**: `#CDCDCD` (light gray)
- **Grid Lines**: `#C0C0C0` (slightly darker gray)
- **World Border**: `#000000` (black, 10px thick)

### Entities
- **Player Tank**: `#00B2E1` (cyan blue)
- **Projectiles**: `#00B2E1` (matches tank)
- **Polygons**: See table above

### UI
- **Stat Bars**: See Stat Bar Configuration above
- **Text**: `#FFFFFF` (white) with black shadow for readability
- **Background**: `rgba(0, 0, 0, 0.3)` (semi-transparent black)

## Performance Considerations

- **Culling**: Only polygons within camera view + buffer are rendered
- **Rotation**: Polygon rotation uses a single shared value updated once per frame
- **Canvas Layers**: Game and UI use separate canvases to avoid redrawing static UI
- **Double Buffering**: Built into canvas API, no additional work needed

## Future Enhancements

Ideas for extending the rendering system:

1. **Barrel Recoil Animation**: Barrels slide back slightly when firing
2. **Tank Skins**: Different colors/patterns for tank bodies
3. **Particle Effects**: More elaborate destruction effects
4. **Minimap**: Top-right corner showing polygon locations
5. **Level-Up Flash**: Screen flash effect on level up
6. **Damage Numbers**: Floating damage numbers on hits

## Troubleshooting

### Barrels appear on top of body
Make sure barrels are drawn BEFORE the body in the render order.

### Polygons not rotating
Check that `polygonRotation` is being incremented in the render loop.

### UI bars not clickable
Ensure the UI canvas has `pointer-events: auto` in CSS.

### Tank not aiming correctly
Verify that `engine.mousePosition` is being updated relative to camera position:
```typescript
engine.mousePosition.x = (e.clientX - rect.left) + engine.camera.x
engine.mousePosition.y = (e.clientY - rect.top) + engine.camera.y
```
