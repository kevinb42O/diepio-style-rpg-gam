# 🎮 Tank Wiki - Interactive Encyclopedia

## Overview
The Tank Wiki is a fully interactive, animated encyclopedia showcasing all 71 tanks in the game. Access it from the main menu via the **"TANK WIKI"** button.

## Features

### 🔍 **Advanced Search & Filtering**
- **Text Search**: Search tanks by name in real-time
- **Tier Filtering**: Filter by tier (T0-T6) with color-coded badges
- **Type Filtering**: 
  - 🗡️ **Barrel** - Traditional shooting tanks
  - 👥 **Drone** - Drone-commanding classes
  - 🛡️ **Smasher** - Melee ramming tanks
  - 🔒 **Trapper** - Trap-deploying classes
  - 🎯 **Auto** - Auto-turret equipped tanks

### 🎨 **Visual Tank Previews**

- **Live SVG Rendering**: Every tank rendered with actual barrel configurations

- **Animated Detail Pane**: The large preview window showcases firing patterns, drones, traps, and special FX

- **Static Sidebar Snapshots**: Tier lists, upgrade cards, and search results now use still images for buttery scrolling and lower GPU use

- **Accurate Geometry**: 

  - Circle, Square, Hexagon, and Spiky Hexagon body shapes

  - Precise barrel positioning and sizes

  - Spike visualization for smasher variants


### 📊 **Comprehensive Tank Information**

#### **Statistics Display**
- Barrel count and configuration
- Drone count and type (for drone classes)
- Auto turret count (for auto classes)
- Trap specifications (size, health, duration)
- Body shape and special features
- Invisibility mechanics
- Speed line indicators

#### **Synergy System**

Every tank tier now exposes its stat synergies:

- Coverage spans Tier 1 through Tier 6 builds

- Highlights which stats interact with abilities, passives, or resource loops

- Pulls live descriptions from the synergy meta (shield spin speed, pylon radius boosts, husk odds, etc.)


#### **Upgrade Trees**
Interactive upgrade path navigation:
- **"Upgrades From"** tab - See all parent classes
- **"Upgrades To"** tab - See all upgrade options
- Click any tank to instantly navigate to it

### 🎭 **Tier System**

| Tier | Name | Color | Unlock Level | Description |
|------|------|-------|--------------|-------------|
| T0 | Starter | Gray | 1 | Basic tank |
| T1 | Basic | Green | 15 | First upgrades |
| T2 | Advanced | Blue | 30 | Specialization |
| T3 | Elite | Purple | 45 | Advanced builds |
| T4 | Evolution | Pink | 60 | Unique abilities |
| T5 | Mythic | Orange | 75 | Legendary power |
| T6 | Ascended | Red | 90 | Ultimate forms |

### 🎯 **Interactive Features**

1. **Click to View Details**
   - Click any tank in the sidebar to see full information
   - Animated transitions between tank views
   - Smooth scrolling and hover effects

2. **Upgrade Navigation**
   - Click parent/child tanks to jump directly to them
   - See the full upgrade path at a glance
   - Understand tier progression

3. **Smart Badges**
   - Tier badges with gradient colors
   - Special feature indicators (Drone, Trap, Auto)
   - Unlock level display

### 🎨 **Visual Design**



- **Glassmorphism Effects**: Modern translucent panels

- **Neon Accents**: Cyan/purple color scheme

- **Smooth Animations**: Framer Motion powers the hero preview while secondary views remain static for performance

- **Responsive Layout**: Works on all screen sizes

- **Performance-Friendly Lists**: Static snapshots keep scroll interactions crisp

- **Dark Theme**: Easy on the eyes


## Usage

### From Main Menu
1. Click the **"TANK WIKI"** button (purple gradient with book icon)
2. Browse through all 71 tanks
3. Use search and filters to find specific tanks
4. Click the **X** button to return to menu

### Navigation Tips
- Use the search bar for quick lookup
- Filter by tier to see progression options
- Filter by type to compare similar tanks
- Click upgrade paths to explore trees

## Tank Categories

### 📦 **By Type**
- **Barrel Tanks**: 35+ traditional shooting classes
- **Drone Commanders**: 16 drone-controlling classes
- **Smashers**: 7 melee ramming tanks
- **Trappers**: 9 trap-deploying classes
- **Auto Turrets**: 6 automated defense tanks

### 🎯 **By Specialization**
- **Bullet Spray** (Twin line)
- **Precision Snipers** (Sniper line)
- **Drone Swarms** (Overseer line)
- **Heavy Artillery** (Destroyer line)
- **Melee Fortress** (Smasher line)
- **High Mobility** (Triangle line)
- **Area Denial** (Trapper line)
- **Omni-directional** (Quad Tank line)

## Special Features Display

### 🔷 **Drone Classes**
Shows:
- Total drone count
- Drone type (triangle, square, minion)
- Number of spawners

### 🔷 **Trapper Classes**
Shows:
- Trap size
- Trap health
- Trap duration (in seconds)

### 🔷 **Auto Turret Classes**

Shows:

- Number of independent turrets

- Auto-targeting capability

- Orbit path preview (animated detail pane only)


### 🔷 **Invisibility Tanks**
Shows:
- Delay before invisibility activates
- Maximum alpha transparency

### 🔷 **High Mobility Tanks**

Shows:

- Speed line indicator

- Enhanced movement capability

- Ion Vanguard trails leave cyan wakes inside the animated preview


### 🌀 **Mythic Visual Cues**

- **Doomsday Harbinger**: Pulsing apocalypse aura surrounds the hull (animated preview)
- **Gravemind Regent**: Husk drones use a dedicated gravemind style plus static swarm indicators
- **Astral Regent**: Warp anchors show tether arcs back to the player when deployed
- **Catalyst**: Combo stacks render as segmented rings that fill as you secure kills


## Synergy Notes

Tier 4-6 tanks include detailed synergy descriptions:
- **Siegebreaker**: Charge mechanics with bulletDamage/reload scaling
- **Aegis Vanguard**: Shield orbit speed from movementSpeed
- **Mirage**: Re-cloak timing affected by reload
- **Phase Sentinel**: Rail length extended by bulletSpeed
- Plus new highlights for shield spin bonuses, pylon radius scaling, Gravemind husk odds, Catalyst combo rings, and more.

## Technical Details

- **Component**: `TankWiki.tsx`
- **Data Source**: `tankConfigs.ts`
- **Animation Library**: Framer Motion
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React & Phosphor Icons

## Future Enhancements

Potential additions:
- Compare mode (side-by-side tank comparison)
- Build calculator (stat point optimizer)
- Damage calculator
- DPS charts
- 3D tank viewer
- Tank history timeline

---

**Version**: 4.2.0  
**Total Tanks**: 71  
**Total Tiers**: 7  
**Last Updated**: July 2025
