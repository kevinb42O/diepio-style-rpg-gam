import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ChevronRight, X, Zap, Shield, Target, Users, Eye, Swords, Gauge, Sparkles, Lock, ArrowRight, TrendingUp, Info, RotateCcw, Wind, Flame, ShieldPlus, HeartPulse, CircleDot, MoveRight, Radar, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TANK_CONFIGS } from '@/lib/tankConfigs'
import type { TankConfig, BarrelConfig } from '@/lib/tankConfigs'
import { getSynergyStatsForClass, getSynergyDescription } from '@/lib/synergyMeta'
import type { StatType } from '@/lib/upgradeSystem'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TankWikiProps {
  onClose: () => void
}

type FilterType = 'all' | 'barrel' | 'drone' | 'smasher' | 'trapper' | 'auto'

const TIER_COLORS = {
  0: 'from-gray-400 to-gray-500',
  1: 'from-green-400 to-green-500',
  2: 'from-blue-400 to-blue-500',
  3: 'from-purple-400 to-purple-500',
  4: 'from-pink-400 to-pink-500',
  5: 'from-orange-400 to-orange-500',
  6: 'from-red-500 to-rose-600',
}

const TIER_NAMES = {
  0: 'Starter',
  1: 'Basic',
  2: 'Advanced',
  3: 'Elite',
  4: 'Evolution',
  5: 'Mythic',
  6: 'Ascended',
}

const STAT_DISPLAY_META: Record<StatType, { label: string; description: string; icon: LucideIcon; gradient: string }> = {
  reload: {
    label: 'Reload',
    description: 'Controls fire cadence and ability charge loops.',
    icon: RotateCcw,
    gradient: 'from-cyan-500/20 to-blue-500/20',
  },
  bulletSpeed: {
    label: 'Bullet Speed',
    description: 'Extends projectile reach and travel speed.',
    icon: Wind,
    gradient: 'from-blue-500/20 to-sky-500/20',
  },
  bulletDamage: {
    label: 'Bullet Damage',
    description: 'Raises projectile impact and siege output.',
    icon: Flame,
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
  bulletPenetration: {
    label: 'Bullet Penetration',
    description: 'Adds pierce, refraction, or trap durability.',
    icon: Layers,
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  movementSpeed: {
    label: 'Movement Speed',
    description: 'Improves dashes, orbit speed, and strafes.',
    icon: MoveRight,
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  maxHealth: {
    label: 'Max Health',
    description: 'Feeds shield plating and overshield layers.',
    icon: ShieldPlus,
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
  healthRegen: {
    label: 'Health Regen',
    description: 'Drives anchors, husk conversion, and sustain.',
    icon: HeartPulse,
    gradient: 'from-rose-500/20 to-pink-500/20',
  },
  bodyDamage: {
    label: 'Body Damage',
    description: 'Boosts rams, retaliatory slams, and shockwaves.',
    icon: Zap,
    gradient: 'from-fuchsia-500/20 to-purple-500/20',
  },
  lootRange: {
    label: 'Loot Radius',
    description: 'Expands collection zones and satellite spacing.',
    icon: Radar,
    gradient: 'from-lime-500/20 to-emerald-500/20',
  },
}

type AbilityMeta = {
  title: string
  flavor: string
  bullets: string[]
}

const SPECIAL_ABILITIES: Record<string, AbilityMeta> = {
  siegebreaker: {
    title: 'Apex Siege Cannon',
    flavor: 'A spoolable macro-shell that cracks bases wide open.',
    bullets: [
      'Hold fire to charge; bulletDamage investment multiplies the kinetic shell instead of just bumping DPS.',
      'BodyDamage feeds the reload-to-charge conversion, trimming the recovery window between max-charge volleys.',
      'Impacts rock the camera and splash anything hugging the target, making sieges feel thunderous.',
    ],
  },
  aegisvanguard: {
    title: 'Ward Halo',
    flavor: 'Four shield wedges orbit the hull and swat away spam.',
    bullets: [
      'Movement Speed directly increases orbit RPM, so investing into mobility lets you reposition the halo against focus fire.',
      'BodyDamage empowers every slam: shield collisions chunk drones and melee tanks instead of nudging them.',
      'Projectiles that touch the halo are deleted, giving Aegis a mobile bunker identity in lane fights.',
    ],
  },
  mirage: {
    title: 'Spectral Decoy Suite',
    flavor: 'Perfect your cloak and a mirrored phantom starts playing the field for you.',
    bullets: [
      'Reload reduces the re-cloak downtime, so Mirage can fire, fade, and re-engage before the enemy even reacquires target lock.',
      'Movement Speed feeds the decoy AI, letting the ghost strafe targets, orbit the cursor, and feint dives in sync with your thrusters.',
      'Firing forces both hulls to shimmer for a heartbeat before they vanish again, rewarding disciplined burst windows.',
    ],
  },
  starfallarsenal: {
    title: 'Staggered Salvo Crescents',
    flavor: 'Three-phase volleys that paint the sky with arcing crescents.',
    bullets: [
      'Each trigger queues a triple volley; reload shortens the stagger so the crescents blend into a continuous laser show.',
      'Bullet penetration grants pierce charges, letting crescents tunnel through shields and still reach backline targets.',
      'Recoil kicks the chassis backwards, creating self-peel spacing after every barrage.',
    ],
  },
  orbitalarray: {
    title: 'Satellite Kill Net',
    flavor: 'Eight autonomous satellites orbit the core tank and fire in sync.',
    bullets: [
      'Loot Range stretching increases orbital spacing, so investments literally widen the kill net around you.',
      'Reload synchronizes rotational volleys, guaranteeing that the satellite ring fires together instead of out of phase.',
      'Auto-turrets plus orbital fire give the Array 360° coverage for defending objectives.',
    ],
  },
  phasesentinel: {
    title: 'Phasing Rail Reticle',
    flavor: 'Charge a ghostly reticle and cut lanes with overextended rails.',
    bullets: [
      'Bullet Speed extends the rail distance, turning Phase Sentinel into a map-wide beam sniper.',
      'Reload governs charge rate: maxing it lets the reticle hit full power every other shot for bonus damage and size.',
      'Fully charged rails gain a phased modifier that flashes the screen and punishes clustered enemies.',
    ],
  },
  gravemindregent: {
    title: 'Husk Dominion',
    flavor: 'Convert fallen loot into obedient husk drones and overclock the swarm.',
    bullets: [
      'Health Regen investments increase the odds each loot shard becomes a permanent husk thrall.',
      'Bullet Damage fortifies every thrall, raising both drone damage and health through the synergy modifier.',
      'The regimented square swarm floods lanes, making Gravemind a macro pressure monster.',
    ],
  },
  armadacolossus: {
    title: 'Carrier Battlegroup',
    flavor: 'Turrets, spawners, and a hangar of intercept drones.',
    bullets: [
      'Bullet Damage empowers the carrier cannons, so the hull itself becomes a credible artillery piece.',
      'Loot Range widens drone patrol paths, allowing Colossus to project control over enormous areas.',
      'Multiple spawners plus auto turrets mean you always have a screen of interceptors for objectives.',
    ],
  },
  citadelshaper: {
    title: 'Living Fortress Lattice',
    flavor: 'Rapid-fire trap walls that braid into labyrinths.',
    bullets: [
      'Bullet Penetration reinforces deployed walls, drastically increasing trap health and lifetime.',
      'Reload dictates lattice weaving speed, letting seasoned Shapers script entire arenas on demand.',
      'Trap geometry scales with investment, turning choke points into permanent kill zones.',
    ],
  },
  cyclonebulwark: {
    title: 'Cyclone Pulse Engine',
    flavor: 'Spins up spiral barrages that chew through dense formations.',
    bullets: [
      'Reload shortens the interval between each radial pulse, creating near constant knockback.',
      'Bullet Speed stretches wind shear arcs, giving the pulses reach instead of being point-blank only.',
      'Auto-turret support keeps pressure on targets while the cyclone charges.',
    ],
  },
  fusionhydra: {
    title: 'Fusion Lance & Recoil Rockets',
    flavor: 'A destroyer barrel backed by drone thrusters and rocket salvos.',
    bullets: [
      'BodyDamage converts directly into tail rockets, so brawlers get rewarded with brutal rear explosions.',
      'Bullet Damage amplifies the forward lance, letting the primary barrel delete tanks before drones arrive.',
      'Hybrid spawners keep the pressure while you reposition for another lance-rocket combo.',
    ],
  },
  velocityreaver: {
    title: 'Velocity Dash Protocol',
    flavor: 'Cutting dashes and crit-based melee finishers.',
    bullets: [
      'Movement Speed lowers dash cooldowns, enabling constant reposition bursts.',
      'BodyDamage raises both crit chance and crit multiplier, so slice combos scale with bruiser builds.',
      'Speed-line visuals and thruster offsets telegraph your angle, reinforcing the high-skill duelist role.',
    ],
  },
  tempest: {
    title: 'Vortex Spin Control',
    flavor: 'Spin up tri-directional streams to generate a shredding aura.',
    bullets: [
      'Reload directly feeds spin acceleration, so maxing it turns Tempest into a permanent blender.',
      'Bullet Speed expands the orbital radius, giving the aura breathing room to tag kiting enemies.',
      'Once spinning, Tempest inflicts pulse damage to anything inside the storm radius.',
    ],
  },
  bulwarkprime: {
    title: 'Imperial Plating',
    flavor: 'Aegis halos evolve into layered plating and retaliation bursts.',
    bullets: [
      'Max Health converts into thicker shields, so tank builds translate into tangible plating.',
      'BodyDamage supercharges retaliatory slams, making every block an opportunity to punish.',
      'Shield wedges retain orbit control, now with added pulse damage for melee denials.',
    ],
  },
  cataclysmengine: {
    title: 'Siege Cataclysm',
    flavor: 'Siegebreaker tech upgraded with incendiary aftershock fields.',
    bullets: [
      'Reload increases charge rate, letting Cataclysm reach max detonation faster despite massive shells.',
      'Bullet Damage amplifies the shockwave and the lingering lava fields spawned on impact.',
      'Aftershocks chain outward, carpeting the battlefield in damage zones that force rotations.',
    ],
  },
  astralregent: {
    title: 'Warp Anchors',
    flavor: 'Mobile anchor points that spawn drones and heal allies.',
    bullets: [
      'Health Regen lowers anchor cooldowns, letting Astral seed multiple warp points simultaneously.',
      'Bullet Speed accelerates redeployment, so drones pour back into the fight after every warp.',
      'Standing near an anchor grants passive healing, anchoring Astral as a sustain carrier.',
    ],
  },
  ionvanguard: {
    title: 'Ion Lance & Trails',
    flavor: 'Dash fighter that leaves ion wake hazards.',
    bullets: [
      'Movement Speed raises ion trail density, so high-mobility builds literally paint the map with DOT zones.',
      'Bullet Damage increases lance detonation radius, delivering burst nukes on impact.',
      'Each lance tags enemies with delayed explosions, rewarding precise pierce shots.',
    ],
  },
  obelisk: {
    title: 'Pylon Beam Mesh',
    flavor: 'Deploy pylons that connect into lethal light walls.',
    bullets: [
      'Bullet Penetration extends beam reach, enabling cross-map slicing setups.',
      'Loot Range increases placement radius, letting Obelisk triangulate nests without overextending.',
      'Refraction pings bounce between pylons, melting anything trapped inside the mesh.',
    ],
  },
  riftwalker: {
    title: 'Rift Step',
    flavor: 'Short-cooldown teleports that leave gravity anomalies behind.',
    bullets: [
      'Health Regen shortens the blink cooldown, so sustain builds double as teleport spammers.',
      'Bullet Speed accelerates drone re-materialization after each warp, keeping the escort intact.',
      'Every teleport leaves a slowing anomaly that damages enemies lingering inside.',
    ],
  },
  catalyst: {
    title: 'Combo Shockwave',
    flavor: 'Stack up momentum through movement and unleash body-damage shockwaves.',
    bullets: [
      'Movement Speed stacks combo counters faster, rewarding aggressive kiting.',
      'BodyDamage determines the supercharge shockwave once five stacks are released.',
      'The blast hits in a large radius, letting Catalyst punish anyone diving too close.',
    ],
  },
  bastioneternal: {
    title: 'Rotating Bastion Core',
    flavor: 'Bulwark plating evolved into layered overshields with pulse retaliation.',
    bullets: [
      'Max Health converts straight into overshield layers, making health stacking mandatory for full value.',
      'Movement Speed accelerates shield rotation, so the wall keeps up with threats while orbiting.',
      'Each block emits retaliation pulses, ensuring attackers get zapped for focusing the Bastion.',
    ],
  },
  doomsdayharbinger: {
    title: 'Apocalypse Battery',
    flavor: 'Ultimate siege cannon with rupture chains and apocalypse cadence.',
    bullets: [
      'Reload tightens apocalypse cadence, letting Harbinger string together gigantic shells.',
      'Bullet Penetration expands rupture radius so explosions engulf entire squads.',
      'Aftershocks spawn multiple cataclysm fields that keep burning long after the shell lands.',
    ],
  },
  prismarchon: {
    title: 'Beam Wall Refraction',
    flavor: 'Obelisk pylons upgraded with refracting prism beams.',
    bullets: [
      'Bullet Penetration increases refraction distance, creating additional kill beams off every wall.',
      'Loot Range widens the pylon network radius, empowering zoning playstyles.',
      'Refractions inherit beam damage, so each added prism branch stacks lethal DPS.',
    ],
  },
  maelstromsovereign: {
    title: 'Royal Maelstrom',
    flavor: 'Tempest\'s storm amplified into a continental cyclone.',
    bullets: [
      'Reload controls wave frequency, letting Sovereign flip spin direction almost instantly.',
      'Bullet Speed stretches the maelstrom radius, giving the aura near-screen-wide reach.',
      'Auto-turret pylons add even more projectiles inside the expanding storm.',
    ],
  },
}

// === NEW TANK ABILITY ENTRIES (v2.0) ===

const TANK_ABILITIES_V2: Record<string, AbilityMeta> = {
  factory: {
    title: 'Autonomous Minion Swarm',
    flavor: 'Deploy armed minions that fire their own mini-cannon shots.',
    bullets: [
      'Factory drones spawn from a central pad and respect per-owner limits, ensuring controlled swarm density.',
      'Each minion carries a mini-cannon and autonomously targets enemies within range, multiplying your firepower.',
      'Drones retain facing data on spawn, so they fan outward naturally from the Factory hull.',
    ],
  },
  battleship: {
    title: 'Diagonal Swarm Batteries',
    flavor: 'Four diagonal spawners flood the field with micro-drones.',
    bullets: [
      'Drones spawn from themed diagonal pads (45°, 135°, 225°, 315°), creating a distinctive X-pattern swarm.',
      'High spawn rate keeps drone count topped off even during heavy combat attrition.',
      'Swarm drones auto-attack nearby enemies, ideal for area denial and pressure plays.',
    ],
  },
  predator: {
    title: 'Scoped Precision Mode',
    flavor: 'Right-click to toggle a sniper scope that extends your vision.',
    bullets: [
      'Right-click toggles scope mode; the camera pans ahead toward your cursor for extended sightlines.',
      'HUD overlays a translucent lens reticle with crosshairs, making long-range shots intuitive.',
      'Synergy-aware aim blending keeps the scope aligned even when switching between normal and scoped aiming.',
    ],
  },
  sprayer: {
    title: 'Stochastic Burst Fire',
    flavor: 'Unleash wide, randomized bullet spreads that saturate your cone.',
    bullets: [
      'Each shot sprays bullets in a stochastic fan pattern, trading precision for sheer coverage.',
      'Ideal for crowd control: the spread ensures you land hits even against evasive targets.',
      'Fire rate synergizes with bullet damage to maximize sustained DPS in chaotic fights.',
    ],
  },
  streamliner: {
    title: 'Continuous Beam Stream',
    flavor: 'Five-barrel array fires segmented projectiles that form a visual laser.',
    bullets: [
      'Projectiles render as elongated beam segments with glowing trails for a continuous beam aesthetic.',
      'High fire rate creates overlapping segments, delivering sustained damage at range.',
      'Bullet speed stretches the effective beam length, rewarding sniper-style stat investment.',
    ],
  },
  destroyer: {
    title: 'Heavy Shell Artillery',
    flavor: 'Massive shells with muzzle flash, knockback, and metallic sheen.',
    bullets: [
      'Heavy projectiles feature enhanced visuals: metallic gradients, dark outlines, and outer glow.',
      'Firing generates a powerful muzzle flash and self-knockback, telegraphing the gun\'s weight.',
      'Shells deal devastating single-target damage, ideal for bursting down high-health enemies.',
    ],
  },
  annihilator: {
    title: 'Mega-Shell Devastation',
    flavor: 'The largest shells in the game, trading fire rate for one-shot power.',
    bullets: [
      'Inherits Destroyer visuals at an even larger scale; shells glow with heavy projectile shading.',
      'Extreme knockback on both the target and the shooter; position carefully before firing.',
      'Body damage investment amplifies reload-to-power conversion for siege-like burst windows.',
    ],
  },
  spike: {
    title: 'Impact Spark Bursts',
    flavor: 'Collisions trigger spark explosions, punishing anyone who rams you.',
    bullets: [
      'Body collisions with shapes or bots spawn golden spark bursts via spawnSpikeImpactEffects.',
      'Screen shake and particle feedback make every ram feel impactful.',
      'Body damage investment directly increases collision DPS and spark intensity.',
    ],
  },
  landmine: {
    title: 'Burrowing Ambush',
    flavor: 'Turn invisible and sink into the terrain to ambush unsuspecting foes.',
    bullets: [
      'When cloaked, a burrow overlay (elliptical dirt ring) renders beneath the hull.',
      'Enemies see only a faint mound; perfect for chokepoint ambushes and objective defense.',
      'Breaking cloak to attack reveals you; coordinate burst damage for maximum surprise impact.',
    ],
  },
  auto3: {
    title: 'Triple Auto Battery',
    flavor: 'Three autonomous turrets that track and fire independently.',
    bullets: [
      'Auto-turret shots are flagged with a dedicated tracer pass plus muzzle flash cues for instant readability.',
      'The wiki preview mirrors the in-game orbit struts and firing streaks so you can visualize the battery upgrades.',
      'Reload, lootRange, bulletSpeed, bulletDamage, and movementSpeed all tune turret cadence, detection rings, tracer reach, and orbit spin.',
    ],
  },
  auto5: {
    title: 'Penta Auto Array',
    flavor: 'Five turrets provide near-360° autonomous fire coverage.',
    bullets: [
      'Each turret fires on its own staggered timer, layering suppressive arcs all around the hull.',
      'Orbiting platforms in the wiki preview showcase the same tracer sweep you see in combat.',
      'Reload, lootRange, bulletSpeed, bulletDamage, and movementSpeed directly translate into faster salvos, wider detection, longer tracers, and tighter orbit control.',
    ],
  },
  trapper: {
    title: 'Zone Denial Deployables',
    flavor: 'Launch pentagonal and hexagonal traps to wall off objectives.',
    bullets: [
      'Traps now render as 5-sided (pent) or 6-sided (hex) shapes depending on stationary flag.',
      'Health bar appears on damaged traps, showing remaining durability.',
      'Trap duration and health scale with bullet penetration for longer-lasting fortifications.',
    ],
  },
  megatrapper: {
    title: 'Mega Zone Fortress',
    flavor: 'Larger traps with significantly higher health and duration.',
    bullets: [
      'Mega traps visually dominate the field; bigger hex shapes with glowing team colors.',
      'Extended 45-second duration lets you build layered defenses for objective control.',
      'Bullet penetration investment reinforces trap walls against sustained fire.',
    ],
  },
  overseer: {
    title: 'Drone Command',
    flavor: 'Control a swarm of triangular drones with mouse clicks.',
    bullets: [
      'Left-click sends drones toward cursor; right-click repels them outward.',
      'Drones auto-attack nearby enemies when idle, prioritizing low-health targets.',
      'Bullet stats affect drone speed, damage, and durability for meaningful build diversity.',
    ],
  },
  overlord: {
    title: 'Quad Spawner Array',
    flavor: 'Four spawners keep your drone army at maximum strength.',
    bullets: [
      'Each spawner independently replenishes drones, maximizing recovery from attrition.',
      'Drones respect per-owner limits for consistent swarm behavior.',
      'Extended attack range lets drones pursue targets further from your hull.',
    ],
  },
  manager: {
    title: 'Invisible Drone Commander',
    flavor: 'Turn invisible while your drones hunt autonomously.',
    bullets: [
      'Cloak engages after brief downtime; firing reveals you temporarily.',
      'Drones continue attacking while you reposition unseen.',
      'Single spawner balances power with stealth-oriented gameplay.',
    ],
  },
  hybrid: {
    title: 'Destroyer-Drone Hybrid',
    flavor: 'Heavy cannon backed by escort drones for versatile combat.',
    bullets: [
      'Destroyer barrel fires heavy projectiles with knockback and metallic visuals.',
      'Rear spawners deploy triangle drones that auto-engage enemies.',
      'Dual playstyle: burst damage from the cannon, sustained pressure from the swarm.',
    ],
  },
  hunter: {
    title: 'Layered Shot Sniper',
    flavor: 'Two overlapping barrels fire bullets of different sizes.',
    bullets: [
      'Dual-layer shots create depth in damage timing against moving targets.',
      'Sniper lineage: extended range and bullet speed bonuses.',
      'Ideal for picking off enemies before they reach your position.',
    ],
  },
  skimmer: {
    title: 'Missile-Spawn Launcher',
    flavor: 'Heavy shells that spawn mini-bullets mid-flight.',
    bullets: [
      'Main projectile renders as an elongated missile with outer glow.',
      'Mini-bullets spawn from the missile while it travels, extending area coverage.',
      'Destroyer damage combined with distributed fire for hybrid AoE.',
    ],
  },
  rocketeer: {
    title: 'Homing Missile Battery',
    flavor: 'Launch guided missiles with flame trails that home to targets.',
    bullets: [
      'Missiles render with flickering flame trails behind the body.',
      'Homing logic steers projectiles toward nearby enemies.',
      'Fins and pointed nose distinguish Rocketeer missiles from standard shells.',
    ],
  },
  autogunner: {
    title: 'Gunner + Auto Turret',
    flavor: 'Four-barrel gunner with a rear-mounted autonomous turret.',
    bullets: [
      'Main barrels fire rapid-fire streams while turret covers your blind spot.',
      'Turret projectiles use autoturret tracer visuals for clear distinction.',
      'Stat investment affects both barrel fire rate and turret cadence.',
    ],
  },
  overtrapper: {
    title: 'Trap-Drone Hybrid',
    flavor: 'Deploy traps while escort drones protect your flanks.',
    bullets: [
      'Front barrel launches traps; rear spawners deploy triangle drones.',
      'Traps render as pent/hex deployables with health indicators.',
      'Defensive zone control combined with mobile drone offense.',
    ],
  },
  gunnertrapper: {
    title: 'Gunner-Trap Hybrid',
    flavor: 'Rapid-fire front barrels with a rear trap launcher.',
    bullets: [
      'Gunner barrels provide suppressive fire while traps cover retreats.',
      'Trap launcher faces backward for defensive deployments.',
      'Versatile kit: offense, defense, and area denial in one package.',
    ],
  },
}

// Merge new abilities into SPECIAL_ABILITIES
Object.assign(SPECIAL_ABILITIES, TANK_ABILITIES_V2)

const SIEGE_CLASS_KEYS = new Set(['siegebreaker', 'cataclysmengine', 'doomsdayharbinger'])
const CARRIER_CLASS_KEYS = new Set(['armadacolossus', 'astralregent', 'riftwalker'])
const STEALTH_CLASS_KEYS = new Set(['mirage', 'stalker', 'obelisk', 'landmine'])
const ORBITAL_PREVIEW_CLASSES = new Set(['orbitalarray', 'tempest', 'maelstromsovereign'])
const PHASE_PREVIEW_CLASSES = new Set(['phasesentinel'])
const CYCLONE_PREVIEW_CLASSES = new Set(['cyclonebulwark', 'tempest', 'maelstromsovereign'])
const SNIPER_CLASS_KEYS = new Set(['sniper', 'assassin', 'ranger', 'hunter', 'predator', 'stalker', 'streamliner', 'phasesentinel'])
const HEAVY_ARTILLERY_KEYS = new Set(['destroyer', 'annihilator', 'hybrid', 'skimmer', 'rocketeer'])
const MINION_DRONE_KEYS = new Set(['factory', 'battleship', 'armadacolossus'])
const BEAM_STREAM_KEYS = new Set(['streamliner', 'phasesentinel'])

function getTankTags(config: TankConfig, tankKey: string): string[] {
  const tags = new Set<string>()
  if (config.isDroneClass) tags.add('Drone Commander')
  if (config.isTrapper) tags.add('Zone Control')
  if (config.hasSpeedLines) tags.add('Skirmisher')
  if (config.hasDecoy || config.invisibility || STEALTH_CLASS_KEYS.has(tankKey)) tags.add('Stealth Operative')
  if (SIEGE_CLASS_KEYS.has(tankKey)) tags.add('Siege Artillery')
  if (!config.barrels.length && (config.bodyShape === 'hexagon' || config.bodyShape === 'spikyHexagon')) tags.add('Ram Chassis')
  if (config.autoTurrets) tags.add('Auto Battery')
  if (config.barrels.length >= 6 && !config.isDroneClass) tags.add('Volley Specialist')
  if (CARRIER_CLASS_KEYS.has(tankKey) || (config.droneCount ?? 0) > 20) tags.add('Carrier')
  if (SNIPER_CLASS_KEYS.has(tankKey)) tags.add('Precision Sniper')
  if (HEAVY_ARTILLERY_KEYS.has(tankKey)) tags.add('Heavy Artillery')
  if (MINION_DRONE_KEYS.has(tankKey)) tags.add('Minion Factory')
  if (BEAM_STREAM_KEYS.has(tankKey)) tags.add('Beam Weapons')
  if (SPECIAL_ABILITIES[tankKey]) tags.add('Signature Ultimate')
  return Array.from(tags)
}

function buildTankSummary(tankKey: string, config: TankConfig, tags: string[], abilityMeta?: AbilityMeta) {
  const tierName = TIER_NAMES[config.tier as keyof typeof TIER_NAMES]
  const primaryTag = tags[0] ?? 'versatile combatant'
  const parents = config.upgradesFrom
    ?.map(parentKey => TANK_CONFIGS[parentKey]?.name ?? parentKey)
    .filter(Boolean)
    .slice(0, 3)
  const segments: string[] = []
  segments.push(
    `${config.name} is a ${tierName.toLowerCase()} tier ${primaryTag.toLowerCase()} unlocked at level ${config.unlocksAt}.`
  )
  if (parents && parents.length) {
    segments.push(`It evolves from ${parents.join(', ')}.`)
  } else {
    segments.push('It can be selected without a parent class.')
  }
  if (abilityMeta?.flavor) {
    segments.push(abilityMeta.flavor)
  } else if (config.synergyNote) {
    segments.push(config.synergyNote)
  }
  return segments.join(' ')
}

function getPreviewMetrics(config: TankConfig) {

  const metrics: Array<{ label: string; value: string }> = []

  const barrelCount = config.barrels?.length ?? 0

  metrics.push({ label: 'Barrels', value: barrelCount > 0 ? `${barrelCount}` : '?' })

  if (config.isDroneClass && config.droneCount) {

    metrics.push({ label: 'Drones', value: `${config.droneCount}` })

  }

  if (config.isTrapper && config.trapConfig) {

    metrics.push({ label: 'Trap Size', value: `${config.trapConfig.size}` })

  }

  if (config.autoTurrets) {

    metrics.push({ label: 'Turrets', value: `${config.autoTurrets}` })

  }

  if (config.hasDecoy) {

    metrics.push({ label: 'Decoy', value: 'Active' })

  }

  return metrics.slice(0, 3)

}



function describeBarrelPattern(config: TankConfig): string {

  const barrelCount = config.barrels?.length ?? 0

  if (barrelCount === 0) {

    if (config.bodyShape === 'hexagon' || config.bodyShape === 'spikyHexagon') {

      return 'Unarmed hull focuses on body damage, collisions, and rotating shield plating.'

    }

    return 'Relies on drones, traps, or autonomous turrets instead of a direct cannon.'

  }

  if (barrelCount === 1) return 'Single forward cannon for precision poke and kiting.'

  if (barrelCount === 2) return 'Dual barrels keep steady DPS while you strafe or chase.'

  if (barrelCount <= 4) return 'Multi-directional barrels cover flanks without turning the hull.'

  if (barrelCount <= 6) return 'Volley layout saturates lanes with overlapping fire.'

  return 'Omni-directional barrage blankets the arena with continuous fire.'

}



function deriveAbilityDetails(tankKey: string, config: TankConfig) {

  const bullets: string[] = []

  bullets.push(describeBarrelPattern(config))



  if (config.isDroneClass && config.droneCount) {

    const droneType = config.droneType ?? 'triangle'

    const spawners = config.spawnerCount ? ` via ${config.spawnerCount} spawner${config.spawnerCount > 1 ? 's' : ''}` : ''

    bullets.push(

      `Maintains up to ${config.droneCount} ${droneType} drones${spawners}; drone speed, orbit radius, and damage scale with your bullet stats.`

    )

  }

  if (config.isTrapper && config.trapConfig) {

    bullets.push(

      `Launches traps (size ${config.trapConfig.size}) that persist ${(config.trapConfig.duration / 1000).toFixed(0)}s with ${config.trapConfig.health} health to wall off objectives.`

    )

  }

  if (config.autoTurrets) {

    bullets.push(`Fields ${config.autoTurrets} autonomous turret${config.autoTurrets > 1 ? 's' : ''} that fire independently of your aim.`)

  }

  if (config.invisibility) {

    bullets.push(

      `Turns invisible after ${config.invisibility.delay}s of downtime; cloak strength caps at ${(config.invisibility.maxAlpha * 100).toFixed(0)}% opacity.`

    )

  }

  if (config.hasDecoy) {

    bullets.push('Deploys a mirage decoy that mirrors your cursor path once fully cloaked, soaking bullets meant for the real hull.')

  }

  if (config.hasSpeedLines) {

    bullets.push('Boost thrusters leave speed trails, underscoring its mobility-focused playstyle.')

  }

  if ((config.bodyShape === 'hexagon' || config.bodyShape === 'spikyHexagon') && (config.barrels?.length ?? 0) === 0) {

    bullets.push('Ram chassis converts body damage into crushing collision hits and shield slams.')

  }

  if (SIEGE_CLASS_KEYS.has(tankKey)) {

    bullets.push('Charge mechanics modify cannon recoil, splash radius, and lingering cataclysm fields on impact.')

  }

  if (CARRIER_CLASS_KEYS.has(tankKey)) {

    bullets.push('Carrier protocols keep drones patrolling wide rings and allow warp/teleport hooks to reposition the swarm instantly.')

  }

  if (STEALTH_CLASS_KEYS.has(tankKey) && !config.hasDecoy && !config.invisibility) {

    bullets.push('Permanent shimmer makes the hull hard to track until it fires.')

  }

  if (config.synergyNote) {

    bullets.push(config.synergyNote)

  }



  const headlineTraits: string[] = []

  if (config.isDroneClass) headlineTraits.push('Drone commander')

  if (config.isTrapper) headlineTraits.push('Trap engineer')

  if (config.autoTurrets) headlineTraits.push('Auto battery')

  if ((config.bodyShape === 'hexagon' || config.bodyShape === 'spikyHexagon') && (config.barrels?.length ?? 0) === 0) headlineTraits.push('Ram hull')

  if (config.hasDecoy || config.invisibility || STEALTH_CLASS_KEYS.has(tankKey)) headlineTraits.push('Stealth ops')



  const headline =

    headlineTraits.join(' ? ') ||

    (config.isDroneClass ? 'Support carrier' : config.barrels?.length ? 'Direct-fire gunner' : 'Utility chassis')



  return { headline, bullets: Array.from(new Set(bullets)) }

}



// Helper function to calculate the required viewBox size for a tank
function calculateTankBounds(config: TankConfig, tankKey: string): number {
  let maxExtent = 30 // Minimum base radius
  
  // Calculate max barrel extent
  if (config.barrels && config.barrels.length > 0) {
    for (const barrel of config.barrels) {
      const barrelLength = barrel.length || 30
      const offsetX = Math.abs(barrel.offsetX || 0)
      const offsetY = Math.abs(barrel.offsetY || 0)
      const angleRad = (barrel.angle || 0) * Math.PI / 180
      
      // Calculate the farthest point of this barrel from center
      const endX = Math.cos(angleRad) * barrelLength + offsetX
      const endY = Math.sin(angleRad) * barrelLength + offsetY
      const extent = Math.sqrt(endX * endX + endY * endY)
      maxExtent = Math.max(maxExtent, extent)
    }
  }
  
  // Add space for body shape
  if (config.bodyShape === 'spikyHexagon' && config.bodySpikes) {
    maxExtent = Math.max(maxExtent, 30 * 1.5) // Spiky hexagon needs extra space
  }
  
  // Add space for drones
  if (config.isDroneClass && config.droneCount) {
    const droneOrbitRadius = 50 // Drones orbit at this radius
    maxExtent = Math.max(maxExtent, droneOrbitRadius + 15) // drone size
  }
  
  // Add space for auto turrets
  if (config.autoTurrets) {
    const turretOrbitRadius = config.autoTurrets > 3 ? 50 : 40
    maxExtent = Math.max(maxExtent, turretOrbitRadius + 20)
  }
  
  // Add space for special class features
  if (ORBITAL_PREVIEW_CLASSES.has(tankKey)) {
    maxExtent = Math.max(maxExtent, 80) // Orbital array satellites
  }
  if (CYCLONE_PREVIEW_CLASSES.has(tankKey)) {
    maxExtent = Math.max(maxExtent, 70) // Cyclone swirls
  }
  if (PHASE_PREVIEW_CLASSES.has(tankKey)) {
    maxExtent = Math.max(maxExtent, 75) // Phase reticle
  }
  if (config.hasDecoy) {
    maxExtent = Math.max(maxExtent, 45) // Decoy echo ring
  }
  
  // Add padding
  return maxExtent * 1.15
}

// Mini tank renderer component with live-fire animation
const TankPreview: React.FC<{ tankKey: string; size?: number; animated?: boolean }> = ({
  tankKey,
  size = 60,
  animated = false,
}) => {
  const config = TANK_CONFIGS[tankKey]
  if (!config) return null

  // Calculate the actual bounds needed for this tank
  const tankBounds = calculateTankBounds(config, tankKey)
  
  // The viewBox will be centered at 0,0 and extend to tankBounds in each direction
  const viewBoxSize = tankBounds * 2
  
  // Scale factor: how many viewBox units fit in one "size" pixel
  // We want the tank to fit comfortably in the preview
  const baseBodyRadius = 20 // Standard body radius in viewBox units
  
  // Determine attack type for animation
  const isDrone = config.isDroneClass
  const isTrapper = config.isTrapper
  const hasBullets = config.barrels && config.barrels.length > 0 && !isDrone && !isTrapper
  const hasMinions = config.droneType === 'minion'

  const renderBarrel = (barrel: BarrelConfig, index: number) => {
    const barrelLength = barrel.length || 30
    const barrelWidth = barrel.width || 8
    const offsetX = barrel.offsetX || 0
    const offsetY = barrel.offsetY || 0
    
    if (barrel.isTrapezoid) {
      // Trapezoid barrel (spawner style)
      const points = [
        `${offsetX},${offsetY - barrelWidth / 2}`,
        `${offsetX + barrelLength},${offsetY - barrelWidth / 1.3}`,
        `${offsetX + barrelLength},${offsetY + barrelWidth / 1.3}`,
        `${offsetX},${offsetY + barrelWidth / 2}`,
      ].join(' ')
      
      return (
        <g key={index} transform={`rotate(${barrel.angle || 0})`}>
          <polygon
            points={points}
            fill="#8b9196"
            stroke="#5a5f66"
            strokeWidth="1.5"
          />
        </g>
      )
    }
    
    return (
      <g key={index} transform={`rotate(${barrel.angle || 0})`}>
        <rect
          x={offsetX}
          y={offsetY - barrelWidth / 2}
          width={barrelLength}
          height={barrelWidth}
          fill="#8b9196"
          stroke="#5a5f66"
          strokeWidth="1.5"
          rx="1"
        />
      </g>
    )
  }

  const renderBody = () => {
    const bodyRadius = baseBodyRadius
    
    switch (config.bodyShape) {
      case 'square':
        return (
          <rect
            x={-bodyRadius}
            y={-bodyRadius}
            width={bodyRadius * 2}
            height={bodyRadius * 2}
            fill="#00b2e1"
            stroke="#0088b3"
            strokeWidth="2"
          />
        )
      case 'hexagon':
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 6
          return `${Math.cos(angle) * bodyRadius},${Math.sin(angle) * bodyRadius}`
        }).join(' ')
        return (
          <polygon
            points={hexPoints}
            fill="#00b2e1"
            stroke="#0088b3"
            strokeWidth="2"
          />
        )
      case 'spikyHexagon':
        const spikes = config.bodySpikes || 6
        const spikyBaseRadius = bodyRadius * 0.7
        const spikeLength = bodyRadius * 0.5
        let spikyPath = ''
        for (let i = 0; i < spikes; i++) {
          const angle1 = (Math.PI * 2 * i) / spikes - Math.PI / 2
          const angle2 = (Math.PI * 2 * (i + 0.5)) / spikes - Math.PI / 2
          const x1 = Math.cos(angle1) * spikyBaseRadius
          const y1 = Math.sin(angle1) * spikyBaseRadius
          const x2 = Math.cos(angle2) * (spikyBaseRadius + spikeLength)
          const y2 = Math.sin(angle2) * (spikyBaseRadius + spikeLength)
          if (i === 0) {
            spikyPath = `M ${x1} ${y1}`
          } else {
            spikyPath += ` L ${x1} ${y1}`
          }
          spikyPath += ` L ${x2} ${y2}`
        }
        spikyPath += ' Z'
        return (
          <path
            d={spikyPath}
            fill="#00b2e1"
            stroke="#0088b3"
            strokeWidth="2"
          />
        )
      default:
        return (
          <circle
            cx="0"
            cy="0"
            r={bodyRadius}
            fill="#00b2e1"
            stroke="#0088b3"
            strokeWidth="2"
          />
        )
    }
  }

  const renderDrones = () => {
    if (!config.isDroneClass || !config.droneCount) return null
    
    // Show more drones for tanks with larger counts, up to 8
    const displayCount = Math.min(config.droneCount, config.droneCount > 20 ? 8 : config.droneCount > 10 ? 6 : 4)
    const droneSize = config.droneType === 'minion' ? 10 : config.droneType === 'square' ? 8 : 7
    const orbitRadius = 45
    const createDroneShape = () => {
      if (config.droneType === 'square') {
        return (
          <rect
            x={-droneSize / 2}
            y={-droneSize / 2}
            width={droneSize}
            height={droneSize}
            fill="#ffe066"
            stroke="#e6b800"
            strokeWidth="1"
          />
        )
      }
      if (config.droneType === 'minion') {
        return (
          <>
            <circle cx={0} cy={0} r={droneSize * 0.6} fill="#f14e54" stroke="#d63940" strokeWidth="1" />
            <rect
              x={droneSize * 0.3}
              y={-droneSize * 0.25}
              width={droneSize * 0.8}
              height={droneSize * 0.5}
              fill="#8b9196"
              stroke="#5a5f66"
              strokeWidth="0.5"
            />
          </>
        )
      }
      return (
        <polygon
          points={`0,-${droneSize} ${droneSize * 0.7},${droneSize * 0.7} -${droneSize * 0.7},${droneSize * 0.7}`}
          fill="#f14e54"
          stroke="#d63940"
          strokeWidth="1"
        />
      )
    }
    
    return (
      <g>
        {/* Drone orbit ring */}
        <circle
          cx={0}
          cy={0}
          r={orbitRadius}
          fill="none"
          stroke="#00D8FF"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={0.3}
        />
        {Array.from({ length: displayCount }, (_, i) => {
          const startAngle = (Math.PI * 2 / displayCount) * i
          const x = Math.cos(startAngle) * orbitRadius
          const y = Math.sin(startAngle) * orbitRadius
          
          if (animated) {
            const drift = config.droneType === 'minion' ? 1.15 : config.droneType === 'square' ? 1.2 : 1.3
            return (
              <motion.g
                key={`drone-${i}`}
                animate={{
                  x: [x, x * drift, x],
                  y: [y, y * drift, y],
                }}
                transition={{
                  duration: 2 + i * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.15,
                }}
              >
                {createDroneShape()}
              </motion.g>
            )
          }
          
          return (
            <g key={`drone-${i}`} transform={`translate(${x} ${y})`}>
              {createDroneShape()}
            </g>
          )
        })}
      </g>
    )
  }

  const renderBullets = () => {
    if (!hasBullets || !animated) return null
    
    // Only show bullets from forward-facing barrels to reduce clutter
    const forwardBarrels = config.barrels.filter(b => Math.abs(b.angle || 0) < 90)
    if (forwardBarrels.length === 0) return null
    
    const bulletSize = 5
    
    return (
      <g>
        {forwardBarrels.slice(0, 3).map((barrel, i) => {
          const angle = (barrel.angle || 0) * Math.PI / 180
          const barrelLength = barrel.length || 30
          const startX = Math.cos(angle) * (barrelLength + 5)
          const startY = Math.sin(angle) * (barrelLength + 5)
          const endX = Math.cos(angle) * (tankBounds * 0.9)
          const endY = Math.sin(angle) * (tankBounds * 0.9)
          
          return (
            <motion.circle
              key={`bullet-${i}`}
              cx={startX}
              cy={startY}
              r={bulletSize}
              fill="#00b2e1"
              stroke="#0088b3"
              strokeWidth="1"
              animate={{
                cx: [startX, endX],
                cy: [startY, endY],
                opacity: [1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.2,
                repeatDelay: 0.8,
              }}
            />
          )
        })}
      </g>
    )
  }

  const renderTraps = () => {
    if (!animated || !isTrapper || !config.barrels.length) return null
    
    const trapSize = config.trapConfig?.size ? Math.min(config.trapConfig.size, 18) : 12
    
    return (
      <g>
        {config.barrels.slice(0, 2).map((barrel, i) => {
          const angle = (barrel.angle || 0) * Math.PI / 180
          const barrelLength = barrel.length || 30
          const startX = Math.cos(angle) * (barrelLength + 8)
          const startY = Math.sin(angle) * (barrelLength + 8)
          const endX = Math.cos(angle) * (tankBounds * 0.7)
          const endY = Math.sin(angle) * (tankBounds * 0.7)
          
          // Render as pentagon/hexagon for traps
          const trapPoints = Array.from({ length: 6 }, (_, j) => {
            const a = (Math.PI * 2 * j) / 6 - Math.PI / 2
            return `${Math.cos(a) * trapSize * 0.5},${Math.sin(a) * trapSize * 0.5}`
          }).join(' ')
          
          return (
            <motion.g
              key={`trap-${i}`}
              animate={{
                x: [startX, endX],
                y: [startY, endY],
                opacity: [1, 0.8],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 0.4,
                repeatDelay: 1.5,
              }}
            >
              <polygon
                points={trapPoints}
                fill="#f7b731"
                stroke="#d68910"
                strokeWidth="1.5"
              />
            </motion.g>
          )
        })}
      </g>
    )
  }

  const renderAutoTurrets = () => {
    if (!config.autoTurrets) return null

    const turretCount = config.autoTurrets
    const orbitRadius = turretCount > 3 ? 45 : 35
    const baseDuration = turretCount > 3 ? 16 : 13
    const turretBaseRadius = 7
    const barrelLength = 18
    const barrelWidth = 6
    const tracerDuration = turretCount > 3 ? 0.7 : 0.95
    const turretBalls = Array.from({ length: turretCount }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / turretCount
      const x = Math.cos(angle) * orbitRadius
      const y = Math.sin(angle) * orbitRadius
      return { angle, x, y, index: i }
    })

    if (!animated) {
      return (
        <g>
          {turretBalls.map(({ angle, x, y, index }) => (
            <g key={`preview-turret-${index}`}>
              <line x1={0} y1={0} x2={x} y2={y} stroke="#4c5561" strokeWidth={2} opacity={0.6} />
              <g transform={`translate(${x} ${y}) rotate(${(angle * 180) / Math.PI})`}>
                <circle cx={0} cy={0} r={turretBaseRadius} fill="#1f2933" stroke="#64748b" strokeWidth={1} />
                <rect
                  x={0}
                  y={-barrelWidth / 2}
                  width={barrelLength}
                  height={barrelWidth}
                  fill="#9db4cc"
                  stroke="#5a5f66"
                  strokeWidth={1}
                  rx={1}
                />
              </g>
            </g>
          ))}
        </g>
      )
    }

    return (
      <motion.g animate={{ rotate: 360 }} transition={{ duration: baseDuration, repeat: Infinity, ease: 'linear' }}>
        {turretBalls.map(({ angle, x, y, index }) => (
          <g key={`preview-turret-${index}`}>
            <line x1={0} y1={0} x2={x} y2={y} stroke="#4c5561" strokeWidth={2} opacity={0.6} />
            <g transform={`translate(${x} ${y}) rotate(${(angle * 180) / Math.PI})`}>
              <circle cx={0} cy={0} r={turretBaseRadius} fill="#1f2933" stroke="#64748b" strokeWidth={1} />
              <rect
                x={0}
                y={-barrelWidth / 2}
                width={barrelLength}
                height={barrelWidth}
                fill="#9db4cc"
                stroke="#5a5f66"
                strokeWidth={1}
                rx={1}
              />
              <motion.line
                x1={barrelLength}
                y1={0}
                x2={barrelLength + 32}
                y2={0}
                stroke="#7dd3fc"
                strokeWidth={2}
                strokeLinecap="round"
                animate={{
                  x1: [barrelLength, barrelLength + 18],
                  x2: [barrelLength + 28, barrelLength + 56],
                  opacity: [0.95, 0],
                }}
                transition={{
                  duration: tracerDuration,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: index * 0.12,
                }}
              />
            </g>
          </g>
        ))}
      </motion.g>
    )
  }

  const renderDecoyEcho = () => {
    if (!config.hasDecoy) return null
    if (!animated) {
      return (
        <circle cx={0} cy={0} r={35} stroke="#7dd3fc" strokeWidth={1.5} strokeDasharray="6 8" fill="none" opacity={0.35} />
      )
    }
    return (
      <motion.circle
        cx={0}
        cy={0}
        r={35}
        stroke="#7dd3fc"
        strokeWidth={1.5}
        strokeDasharray="6 8"
        fill="none"
        opacity={0.45}
        animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.2, 0.45] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    )
  }

  const renderOrbitals = () => {
    if (!ORBITAL_PREVIEW_CLASSES.has(tankKey)) return null
    const orbitRadius = tankKey === 'orbitalarray' ? 65 : 55
    const satelliteCount = tankKey === 'orbitalarray' ? 8 : 6
    if (!animated) {
      return (
        <g>
          {Array.from({ length: satelliteCount }).map((_, index) => {
            const angle = (index / satelliteCount) * Math.PI * 2
            const x = Math.cos(angle) * orbitRadius
            const y = Math.sin(angle) * orbitRadius
            return <circle key={`orbital-${index}`} cx={x} cy={y} r={7} fill="none" stroke="#9ad9ff" strokeWidth={1.5} opacity={0.6} />
          })}
        </g>
      )
    }
    return (
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        {Array.from({ length: satelliteCount }).map((_, index) => {
          const angle = (index / satelliteCount) * Math.PI * 2
          const x = Math.cos(angle) * orbitRadius
          const y = Math.sin(angle) * orbitRadius
          return (
            <motion.circle
              key={`orbital-${index}`}
              cx={x}
              cy={y}
              r={7}
              fill="none"
              stroke="#9ad9ff"
              strokeWidth={1.5}
              opacity={0.6}
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 2 + index * 0.1, repeat: Infinity }}
            />
          )
        })}
      </motion.g>
    )
  }

  const renderPhaseReticle = () => {
    if (!PHASE_PREVIEW_CLASSES.has(tankKey)) return null
    const reticleRadius = 60
    if (!animated) {
      return (
        <g>
          <circle cx={0} cy={0} r={reticleRadius} stroke="#c7d2fe" strokeWidth={1} strokeDasharray="12 12" fill="none" opacity={0.4} />
          <line x1={-reticleRadius} y1={0} x2={reticleRadius} y2={0} stroke="#c7d2fe" strokeWidth={1} opacity={0.4} />
          <line x1={0} y1={-reticleRadius} x2={0} y2={reticleRadius} stroke="#c7d2fe" strokeWidth={1} opacity={0.4} />
        </g>
      )
    }
    return (
      <motion.g
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        <circle
          cx={0}
          cy={0}
          r={reticleRadius}
          stroke="#c7d2fe"
          strokeWidth={1}
          strokeDasharray="12 12"
          fill="none"
          opacity={0.4}
        />
        <line x1={-reticleRadius} y1={0} x2={reticleRadius} y2={0} stroke="#c7d2fe" strokeWidth={1} opacity={0.4} />
        <line x1={0} y1={-reticleRadius} x2={0} y2={reticleRadius} stroke="#c7d2fe" strokeWidth={1} opacity={0.4} />
      </motion.g>
    )
  }

  const renderCycloneSwirls = () => {
    if (!CYCLONE_PREVIEW_CLASSES.has(tankKey)) return null
    const baseRadius = 45
    if (!animated) {
      return (
        <g>
          {[0, 1].map(index => (
            <circle
              key={`cyclone-${index}`}
              cx={0}
              cy={0}
              r={baseRadius + index * 10}
              stroke="#bae6fd"
              strokeWidth={index === 0 ? 1.5 : 1}
              strokeDasharray="10 14"
              fill="none"
              opacity={0.4 - index * 0.12}
            />
          ))}
        </g>
      )
    }
    return (
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 1].map(index => (
          <motion.circle
            key={`cyclone-${index}`}
            cx={0}
            cy={0}
            r={baseRadius + index * 10}
            stroke="#bae6fd"
            strokeWidth={index === 0 ? 1.5 : 1}
            strokeDasharray="10 14"
            fill="none"
            opacity={0.4 - index * 0.12}
            animate={{ strokeDashoffset: [0, 80] }}
            transition={{ duration: 6 + index * 1.5, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </motion.g>
    )
  }

  // Render invisibility shimmer effect
  const renderInvisibilityEffect = () => {
    if (!config.invisibility) return null
    if (!animated) {
      return (
        <circle
          cx={0}
          cy={0}
          r={baseBodyRadius + 5}
          stroke="#a0aec0"
          strokeWidth={2}
          strokeDasharray="3 5"
          fill="none"
          opacity={0.25}
        />
      )
    }
    return (
      <motion.circle
        cx={0}
        cy={0}
        r={baseBodyRadius + 5}
        stroke="#a0aec0"
        strokeWidth={2}
        strokeDasharray="3 5"
        fill="none"
        opacity={0.3}
        animate={{ opacity: [0.3, 0.1, 0.3], strokeDashoffset: [0, 20] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )
  }
  
  // Render speed lines for fast tanks
  const renderSpeedLines = () => {
    if (!config.hasSpeedLines) return null
    return (
      <g>
        {[0, 1, 2, 3, 4].map(i =>
          animated ? (
            <motion.line
              key={`speed-${i}`}
              x1={-30 - i * 10}
              y1={-8 + i * 4}
              x2={-45 - i * 10}
              y2={-8 + i * 4}
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.3}
              animate={{ opacity: [0.3, 0.1, 0.3], x1: [-30 - i * 10, -35 - i * 10, -30 - i * 10] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
            />
          ) : (
            <line
              key={`speed-${i}`}
              x1={-30 - i * 10}
              y1={-8 + i * 4}
              x2={-45 - i * 10}
              y2={-8 + i * 4}
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.25}
            />
          )
        )}
      </g>
    )
  }
  
  // Render Aegis shield wedges
  const renderAegisShields = () => {
    if (tankKey !== 'aegisvanguard' && tankKey !== 'bulwarkprime' && tankKey !== 'bastioneternal') return null
    const shieldCount = tankKey === 'bastioneternal' ? 6 : tankKey === 'bulwarkprime' ? 5 : 4
    const shieldRadius = 35
    if (!animated) {
      return (
        <g>
          {Array.from({ length: shieldCount }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / shieldCount
            const x = Math.cos(angle) * shieldRadius
            const y = Math.sin(angle) * shieldRadius
            return <circle key={`shield-${i}`} cx={x} cy={y} r={8} fill="rgba(100, 255, 255, 0.4)" stroke="#66f7ff" strokeWidth={1.5} />
          })}
        </g>
      )
    }
    return (
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>
        {Array.from({ length: shieldCount }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / shieldCount
          const x = Math.cos(angle) * shieldRadius
          const y = Math.sin(angle) * shieldRadius
          return (
            <motion.circle
              key={`shield-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="rgba(100, 255, 255, 0.5)"
              stroke="#66f7ff"
              strokeWidth={1.5}
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.4, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          )
        })}
      </motion.g>
    )
  }
  
  // Render Tempest aura
  const renderTempestAura = () => {
    if (tankKey !== 'tempest' && tankKey !== 'maelstromsovereign') return null
    const auraRadius = tankKey === 'maelstromsovereign' ? 55 : 45
    if (!animated) {
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (Math.PI * 2 * i) / 6
            return (
              <path
                key={`aura-${i}`}
                d={`M ${Math.cos(angle) * (auraRadius - 10)} ${Math.sin(angle) * (auraRadius - 10)} Q ${Math.cos(angle + 0.3) * auraRadius} ${Math.sin(angle + 0.3) * auraRadius} ${Math.cos(angle + 0.5) * (auraRadius - 5)} ${Math.sin(angle + 0.5) * (auraRadius - 5)}`}
                stroke="rgba(123, 224, 255, 0.4)"
                strokeWidth={2}
                fill="none"
              />
            )
          })}
        </g>
      )
    }
    return (
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
        {[0, 1, 2, 3, 4, 5].map(i => {
          const angle = (Math.PI * 2 * i) / 6
          return (
            <motion.path
              key={`aura-${i}`}
              d={`M ${Math.cos(angle) * (auraRadius - 10)} ${Math.sin(angle) * (auraRadius - 10)} Q ${Math.cos(angle + 0.3) * auraRadius} ${Math.sin(angle + 0.3) * auraRadius} ${Math.cos(angle + 0.5) * (auraRadius - 5)} ${Math.sin(angle + 0.5) * (auraRadius - 5)}`}
              stroke="rgba(123, 224, 255, 0.6)"
              strokeWidth={2}
              fill="none"
              animate={{ opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 1 + i * 0.1, repeat: Infinity }}
            />
          )
        })}
      </motion.g>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-${viewBoxSize / 2} -${viewBoxSize / 2} ${viewBoxSize} ${viewBoxSize}`}
      style={{ overflow: 'visible' }}
    >
      <g>
        {/* Render special effects (background layer) */}
        {renderSpeedLines()}
        {renderDrones()}
        {renderBullets()}
        {renderTraps()}
        {renderOrbitals()}
        {renderCycloneSwirls()}
        {renderPhaseReticle()}
        {renderTempestAura()}
        
        {/* Render barrels */}
        {config.barrels && config.barrels.length > 0 && (
          <g>
            {config.barrels.map((barrel, i) => renderBarrel(barrel, i))}
          </g>
        )}
        
        {/* Render body */}
        {renderBody()}
        {renderDecoyEcho()}
        {renderInvisibilityEffect()}
        {renderAegisShields()}
        
        {/* Render auto turret ring */}
        {renderAutoTurrets()}
        
        {/* Render body spikes - only for spikyHexagon shape */}
        {config.bodyShape === 'spikyHexagon' && config.bodySpikes && config.bodySpikes > 0 && (
          <g>
            {Array.from({ length: config.bodySpikes }, (_, i) => {
              const angle = ((Math.PI * 2) / config.bodySpikes!) * i
              const spikyBaseRadius = baseBodyRadius * 0.7
              const spikeLength = baseBodyRadius * 0.5
              return animated ? (
                <motion.line
                  key={i}
                  x1={Math.cos(angle) * spikyBaseRadius}
                  y1={Math.sin(angle) * spikyBaseRadius}
                  x2={Math.cos(angle) * (spikyBaseRadius + spikeLength + 5)}
                  y2={Math.sin(angle) * (spikyBaseRadius + spikeLength + 5)}
                  stroke="#0088b3"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  animate={{
                    strokeWidth: [2.5, 3.5, 2.5],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ) : (
                <line
                  key={i}
                  x1={Math.cos(angle) * spikyBaseRadius}
                  y1={Math.sin(angle) * spikyBaseRadius}
                  x2={Math.cos(angle) * (spikyBaseRadius + spikeLength + 5)}
                  y2={Math.sin(angle) * (spikyBaseRadius + spikeLength + 5)}
                  stroke="#0088b3"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              )
            })}
          </g>
        )}
        
        {/* Muzzle flash effect for shooting tanks */}
        {animated && hasBullets && config.barrels.filter(b => Math.abs(b.angle || 0) < 90).slice(0, 3).map((barrel, i) => {
          const angle = (barrel.angle || 0) * Math.PI / 180
          const barrelLength = barrel.length || 30
          const flashX = Math.cos(angle) * barrelLength
          const flashY = Math.sin(angle) * barrelLength
          
          return (
            <motion.circle
              key={`flash-${i}`}
              cx={flashX}
              cy={flashY}
              r={6}
              fill="#ffd700"
              opacity="0"
              animate={{ 
                r: [4, 10],
                opacity: [0.8, 0] 
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 0.2,
                repeatDelay: 1.7,
              }}
            />
          )
        })}
      </g>
    </svg>
  )
}

export const TankWiki: React.FC<TankWikiProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTank, setSelectedTank] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedTier, setSelectedTier] = useState<number | null>(null)

  const allTanks = useMemo(() => {
    return Object.entries(TANK_CONFIGS).map(([key, config]) => ({
      key,
      ...config,
    }))
  }, [])

  const filteredTanks = useMemo(() => {
    return allTanks.filter(tank => {
      // Search filter
      const matchesSearch = tank.name.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false

      // Tier filter
      if (selectedTier !== null && tank.tier !== selectedTier) return false

      // Type filter
      if (filterType === 'all') return true
      if (filterType === 'drone' && tank.isDroneClass) return true
      if (filterType === 'smasher' && (tank.bodyShape === 'hexagon' || tank.bodyShape === 'spikyHexagon') && tank.barrels.length === 0) return true
      if (filterType === 'trapper' && tank.isTrapper) return true
      if (filterType === 'auto' && tank.autoTurrets) return true
      if (filterType === 'barrel' && tank.barrels.length > 0 && !tank.isDroneClass && !tank.isTrapper) return true

      return false
    }).sort((a, b) => a.tier - b.tier) // Sort by tier to ensure proper grouping
  }, [allTanks, searchTerm, filterType, selectedTier])

  const selectedTankData = useMemo(
    () => (selectedTank ? TANK_CONFIGS[selectedTank] ?? null : null),
    [selectedTank]
  )
  const selectedTankTags = useMemo(
    () => (selectedTankData && selectedTank ? getTankTags(selectedTankData, selectedTank) : []),
    [selectedTankData, selectedTank]
  )
  const abilityMeta = selectedTank ? SPECIAL_ABILITIES[selectedTank] : undefined
  const tankSummary = useMemo(
    () =>
      selectedTankData && selectedTank
        ? buildTankSummary(selectedTank, selectedTankData, selectedTankTags, abilityMeta)
        : '',
    [selectedTank, selectedTankData, selectedTankTags, abilityMeta]
  )
  const synergyEntries = useMemo(() => {
    if (!selectedTank) return []
    const stats = getSynergyStatsForClass(selectedTank)
    return stats.map(stat => ({
      stat,
      ...STAT_DISPLAY_META[stat],
      description: getSynergyDescription(selectedTank, stat) ?? STAT_DISPLAY_META[stat].description,
    }))
  }, [selectedTank])
  const previewMetrics = selectedTankData ? getPreviewMetrics(selectedTankData) : []
  const lineageNames =
    selectedTankData?.upgradesFrom
      ?.map(parentKey => TANK_CONFIGS[parentKey]?.name ?? parentKey)
      .filter(Boolean) ?? []
  const abilityDetails = selectedTankData && selectedTank ? deriveAbilityDetails(selectedTank, selectedTankData) : null

  const getUpgradeTree = (tankKey: string): string[] => {
    const upgrades: string[] = []
    for (const [key, config] of Object.entries(TANK_CONFIGS)) {
      if (config.upgradesFrom?.includes(tankKey)) {
        upgrades.push(key)
      }
    }
    return upgrades
  }

  useEffect(() => {
    if (!filteredTanks.length) {
      setSelectedTank(null)
      return
    }
    if (!selectedTank || !filteredTanks.find(tank => tank.key === selectedTank)) {
      setSelectedTank(filteredTanks[0].key)
    }
  }, [filteredTanks, selectedTank])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]"
    >
      {/* Animated background with particles */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, 0.4) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
            animation: 'float 20s linear infinite'
          }}></div>
        </div>
        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative h-full w-full flex flex-col">
        {/* Glassmorphic Header */}
        <div className="relative backdrop-blur-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-b border-cyan-500/20 p-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5"></div>
          <div className="relative max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <Target className="w-10 h-10 text-cyan-400" />
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl"></div>
              </motion.div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  TANK ARSENAL
                </h1>
                <p className="text-sm text-gray-400 font-mono">Complete Combat Database</p>
              </div>
              <Badge variant="outline" className="ml-2 text-cyan-400 border-cyan-400/50 bg-cyan-500/10 backdrop-blur-sm px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                {allTanks.length} Units
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10 hover:rotate-90 transition-all duration-300 rounded-full w-12 h-12"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Tank List */}
          <div className="w-96 border-r border-cyan-500/20 backdrop-blur-xl bg-black/30 flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 space-y-3 border-b border-cyan-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70 group-focus-within:text-cyan-400 transition-colors" />
                <Input
                  placeholder="Search arsenal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/40 border-cyan-500/30 hover:border-cyan-500/50 focus:border-cyan-500 text-white placeholder:text-gray-500 rounded-lg backdrop-blur-sm transition-all"
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
              </div>

              {/* Tier Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedTier === null ? 'default' : 'outline'}
                  onClick={() => setSelectedTier(null)}
                  className={`text-xs transition-all ${selectedTier === null ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30' : 'hover:bg-white/5'}`}
                >
                  All
                </Button>
                {[0, 1, 2, 3, 4, 5, 6].map(tier => (
                  <Button
                    key={tier}
                    size="sm"
                    variant={selectedTier === tier ? 'default' : 'outline'}
                    onClick={() => setSelectedTier(tier)}
                    className={`text-xs transition-all ${selectedTier === tier ? `bg-gradient-to-r ${TIER_COLORS[tier as keyof typeof TIER_COLORS]} shadow-lg border-0` : 'hover:bg-white/5 border-gray-600'}`}
                  >
                    T{tier}
                  </Button>
                ))}
              </div>

              {/* Type Filter */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'all', label: 'All', icon: Filter, color: 'cyan' },
                  { value: 'barrel', label: 'Barrel', icon: Swords, color: 'blue' },
                  { value: 'drone', label: 'Drone', icon: Users, color: 'purple' },
                  { value: 'smasher', label: 'Smasher', icon: Shield, color: 'orange' },
                  { value: 'trapper', label: 'Trapper', icon: Lock, color: 'yellow' },
                  { value: 'auto', label: 'Auto', icon: Target, color: 'pink' },
                ].map(({ value, label, icon: Icon, color }) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filterType === value ? 'default' : 'outline'}
                    onClick={() => setFilterType(value as FilterType)}
                    className={`text-xs transition-all ${
                      filterType === value 
                        ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-300 shadow-lg shadow-${color}-500/20` 
                        : 'hover:bg-white/5 border-gray-600'
                    }`}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tank List - Custom styled scrollbar */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: linear-gradient(180deg, #06b6d4, #3b82f6);
                  border-radius: 4px;
                  transition: all 0.3s;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: linear-gradient(180deg, #0891b2, #2563eb);
                  box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
                }
              `}</style>
              <div className="space-y-1 p-2">
                {filteredTanks.reduce((acc: { elements: React.JSX.Element[], renderedTiers: Set<number> }, tank, idx, arr) => {
                  // Check if we need to add a tier header
                  const prevTank = arr[idx - 1];
                  const showTierHeader = !prevTank || prevTank.tier !== tank.tier;

                  if (showTierHeader && !acc.renderedTiers.has(tank.tier)) {
                    acc.renderedTiers.add(tank.tier);
                    acc.elements.push(
                      <motion.div
                        key={`tier-header-${tank.tier}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`sticky top-0 z-10 px-3 py-1.5 mb-1 mt-3 first:mt-0 rounded-md bg-black/40 backdrop-blur-sm border border-gray-600/30`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${TIER_COLORS[tank.tier as keyof typeof TIER_COLORS]}`}></div>
                            <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">
                              Tier {tank.tier} - {TIER_NAMES[tank.tier as keyof typeof TIER_NAMES]}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-black/30 text-gray-400 border-gray-600/50 text-xs">
                            {arr.filter(t => t.tier === tank.tier).length} tanks
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  }

                  acc.elements.push(
                    <motion.button
                      key={tank.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      onClick={() => setSelectedTank(tank.key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative overflow-hidden ${
                        selectedTank === tank.key
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                          : 'bg-black/30 border border-gray-700/50 hover:bg-gray-800/40 hover:border-cyan-500/30'
                      }`}
                    >
                    {/* Hover shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '200%' }}
                      transition={{ duration: 0.6 }}
                    />
                    
                    <div className="relative flex-shrink-0">
                      <TankPreview tankKey={tank.key} size={40} animated={false} />
                      {selectedTank === tank.key && (
                        <motion.div
                          layoutId="activeTank"
                          className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse"
                        />
                      )}
                    </div>
                    
                    <div className="relative flex-1 text-left min-w-0">
                      <div className="font-bold text-white truncate group-hover:text-cyan-300 transition-colors">{tank.name}</div>
                      <div className="flex items-center gap-1.5 text-xs mt-1">
                        <Badge
                          variant="outline"
                          className={`bg-gradient-to-r ${TIER_COLORS[tank.tier as keyof typeof TIER_COLORS]} border-0 text-white text-[10px] px-1.5 py-0`}
                        >
                          T{tank.tier}
                        </Badge>
                        {tank.isDroneClass && (
                          <Badge variant="outline" className="text-purple-300 border-purple-400/50 bg-purple-500/10 text-[10px] px-1.5 py-0">
                            Drone
                          </Badge>
                        )}
                        {tank.isTrapper && (
                          <Badge variant="outline" className="text-yellow-300 border-yellow-400/50 bg-yellow-500/10 text-[10px] px-1.5 py-0">
                            Trap
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all ${selectedTank === tank.key ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1'}`} />
                    </motion.button>
                  );

                  return acc;
                }, { elements: [], renderedTiers: new Set<number>() }).elements}
              </div>
            </div>
          </div>

          {/* Main Content - Tank Details */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-black/20 via-transparent to-black/20 backdrop-blur-sm custom-scrollbar">
            <AnimatePresence mode="wait">
              {selectedTankData && selectedTank ? (
                <motion.div
                  key={selectedTank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-4xl mx-auto p-8 space-y-6"
                >
                  {/* Tank Header */}
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 border border-cyan-500/20 backdrop-blur-xl p-6">
                      <motion.div
                        className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
                        animate={{ x: ['-120%', '220%'] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="relative grid gap-8 lg:grid-cols-[minmax(240px,320px)_1fr] items-center">
                        <div className="relative bg-black/30 border border-cyan-500/20 rounded-2xl p-6 pb-16 overflow-hidden">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            className="flex items-center justify-center"
                          >
                            <TankPreview tankKey={selectedTank} size={170} animated />
                          </motion.div>
                          {previewMetrics.length > 0 && (
                            <div className="absolute bottom-4 inset-x-4 grid grid-cols-2 gap-3">
                              {previewMetrics.map(metric => (
                                <div key={`${metric.label}-${metric.value}`} className="bg-black/60 border border-white/10 rounded-xl px-3 py-2">
                                  <div className="text-[10px] uppercase tracking-wide text-cyan-200/70 font-mono">
                                    {metric.label}
                                  </div>
                                  <div className="text-white font-semibold text-lg">{metric.value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 text-left">
                          <div className="flex flex-wrap gap-3">
                            <Badge
                              className={`bg-gradient-to-r ${TIER_COLORS[selectedTankData.tier as keyof typeof TIER_COLORS]} text-white border-0 text-base px-4 py-2 shadow-lg`}
                            >
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Tier {selectedTankData.tier} · {TIER_NAMES[selectedTankData.tier as keyof typeof TIER_NAMES]}
                            </Badge>
                            <Badge variant="outline" className="text-cyan-200 border-cyan-400/40 bg-cyan-500/10 text-base px-4 py-2">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Unlocks at Level {selectedTankData.unlocksAt}
                            </Badge>
                          </div>
                          <h2 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
                            {selectedTankData.name}
                          </h2>
                          {tankSummary && (
                            <p className="text-gray-200 leading-relaxed">{tankSummary}</p>
                          )}
                          {selectedTankTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {selectedTankTags.map(tag => (
                                <Badge key={tag} variant="outline" className="border-cyan-400/30 text-cyan-100 bg-cyan-500/5">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="grid gap-4 sm:grid-cols-2">
                            {[
                              { label: 'Role', value: selectedTankTags[0] ?? 'Generalist' },
                              { label: 'Tier', value: `T${selectedTankData.tier}` },
                              { label: 'Lineage', value: lineageNames.length ? lineageNames.join(', ') : 'Origin' },
                              {
                                label: 'Class Type',
                                value: selectedTankData.isDroneClass ? 'Drone' : selectedTankData.isTrapper ? 'Trapper' : 'Barrel',
                              },
                            ].map(item => (
                              <div key={item.label} className="p-4 rounded-xl border border-white/10 bg-white/5">
                                <div className="text-xs uppercase tracking-wide text-gray-400">{item.label}</div>
                                <div className="text-white font-semibold text-lg">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                      {abilityDetails && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                          <Card className="h-full bg-gradient-to-br from-slate-900/40 via-blue-900/20 to-slate-900/40 border border-slate-400/20 backdrop-blur-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-lg bg-slate-500/20">
                                <Info className="w-5 h-5 text-slate-100" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-white">Operational Profile</h3>
                                <p className="text-sm text-slate-200/80">Practical behavior pulled straight from the game systems.</p>
                              </div>
                            </div>
                            <p className="text-slate-100/90 font-medium mb-3">{abilityDetails.headline}</p>
                            <ul className="space-y-2">
                              {abilityDetails.bullets.map((bullet, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-slate-100/80">
                                  <ChevronRight className="w-4 h-4 text-cyan-200 mt-0.5" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        </motion.div>
                      )}

                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <Card className="h-full bg-gradient-to-br from-purple-900/30 via-pink-900/15 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl p-6 relative overflow-hidden">
                          <motion.div
                            className="absolute inset-0 opacity-20 bg-gradient-to-br from-transparent via-purple-500/20 to-transparent"
                            animate={{ rotate: [0, 6, -6, 0] }}
                            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <div className="relative space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-purple-500/20">
                                <Sparkles className="w-5 h-5 text-purple-200" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-white">Signature Systems</h3>
                                <p className="text-sm text-purple-100/70">Unique mechanics unlocked at this tier.</p>
                              </div>
                            </div>
                            {abilityMeta ? (
                              <div className="space-y-3">
                                <h4 className="text-lg font-bold text-purple-100">{abilityMeta.title}</h4>
                                <p className="text-gray-100/80">{abilityMeta.flavor}</p>
                                <ul className="space-y-2">
                                  {abilityMeta.bullets.map((bullet, idx) => (
                                    <li key={idx} className="flex gap-2 text-sm text-purple-50/90">
                                      <CircleDot className="w-4 h-4 text-purple-200 mt-0.5" />
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-gray-100/80">
                                This tank relies on fundamental stat investments rather than a bespoke ultimate. Stack its highlighted synergies to unlock more impact.
                              </p>
                            )}
                            {selectedTankData.synergyNote && (
                              <p className="text-xs text-purple-100/70 border-t border-purple-200/10 pt-3">
                                {selectedTankData.synergyNote}
                              </p>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    </div>

                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                      <Card className="h-full bg-gradient-to-br from-blue-900/20 via-cyan-900/20 to-blue-900/20 border border-cyan-500/20 backdrop-blur-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-cyan-500/20">
                            <Gauge className="w-5 h-5 text-cyan-200" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">Synergy Matrix</h3>
                            <p className="text-sm text-cyan-100/70">Stat investments that unlock extra tech.</p>
                          </div>
                        </div>
                        {synergyEntries.length > 0 ? (
                          <div className="grid gap-3">
                            {synergyEntries.map(entry => {
                              const StatIcon = entry.icon
                              return (
                                <motion.div
                                  key={entry.stat}
                                  whileHover={{ scale: 1.02 }}
                                  className={`p-4 rounded-xl border border-white/5 bg-gradient-to-br ${entry.gradient}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-black/30 rounded-lg">
                                      <StatIcon className="w-4 h-4 text-white/80" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-white">{entry.label}</p>
                                      <p className="text-xs text-white/80 mt-1">{entry.description}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-cyan-100/80">
                            No bespoke stat hooks recorded yet. Spend points evenly or follow archetype instincts until future directives land.
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  </div>
                  {/* Tank Stats - Futuristic Cards */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="bg-gradient-to-br from-black/60 via-blue-900/20 to-black/60 border-cyan-500/30 backdrop-blur-xl p-6 shadow-2xl">
                      <h3 className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-6 flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                          <Gauge className="w-6 h-6 text-cyan-400" />
                        </div>
                        Combat Specifications
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="space-y-2 p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20"
                        >
                          <div className="text-cyan-400/70 text-xs font-mono uppercase tracking-wider">Barrels</div>
                          <div className="text-white font-bold text-2xl">{selectedTankData.barrels.length || 'None'}</div>
                        </motion.div>
                        {selectedTankData.isDroneClass && (
                          <>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="space-y-2 p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20"
                            >
                              <div className="text-green-400/70 text-xs font-mono uppercase tracking-wider">Drones</div>
                              <div className="text-white font-bold text-2xl">{selectedTankData.droneCount}</div>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="space-y-2 p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-lg border border-teal-500/20"
                            >
                              <div className="text-teal-400/70 text-xs font-mono uppercase tracking-wider">Type</div>
                              <div className="text-white font-bold text-xl capitalize">{selectedTankData.droneType}</div>
                            </motion.div>
                          </>
                        )}
                        {selectedTankData.autoTurrets && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="space-y-2 p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-lg border border-amber-500/20"
                          >
                            <div className="text-amber-400/70 text-xs font-mono uppercase tracking-wider">Turrets</div>
                            <div className="text-white font-bold text-2xl">{selectedTankData.autoTurrets}</div>
                          </motion.div>
                        )}
                        {selectedTankData.isTrapper && selectedTankData.trapConfig && (
                          <>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="space-y-2 p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/20"
                            >
                              <div className="text-yellow-400/70 text-xs font-mono uppercase tracking-wider">Size</div>
                              <div className="text-white font-bold text-2xl">{selectedTankData.trapConfig.size}</div>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="space-y-2 p-4 bg-gradient-to-br from-green-500/10 to-lime-500/10 rounded-lg border border-green-500/20"
                            >
                              <div className="text-green-400/70 text-xs font-mono uppercase tracking-wider">Health</div>
                              <div className="text-white font-bold text-2xl">{selectedTankData.trapConfig.health}</div>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="space-y-2 p-4 bg-gradient-to-br from-lime-500/10 to-emerald-500/10 rounded-lg border border-lime-500/20"
                            >
                              <div className="text-lime-400/70 text-xs font-mono uppercase tracking-wider">Duration</div>
                              <div className="text-white font-bold text-2xl">{(selectedTankData.trapConfig.duration / 1000).toFixed(1)}<span className="text-sm text-gray-400">s</span></div>
                            </motion.div>
                          </>
                        )}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="space-y-2 p-4 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-lg border border-indigo-500/20"
                        >
                          <div className="text-indigo-400/70 text-xs font-mono uppercase tracking-wider">Shape</div>
                          <div className="text-white font-bold text-xl capitalize">{selectedTankData.bodyShape || 'Circle'}</div>
                        </motion.div>
                        {selectedTankData.invisibility && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="space-y-2 p-4 bg-gradient-to-br from-slate-500/10 to-gray-500/10 rounded-lg border border-slate-500/20"
                          >
                            <div className="text-slate-400/70 text-xs font-mono uppercase tracking-wider flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Stealth
                            </div>
                            <div className="text-white font-bold text-xl">{selectedTankData.invisibility.delay}<span className="text-sm text-gray-400">s</span></div>
                          </motion.div>
                        )}
                        {selectedTankData.hasSpeedLines && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="space-y-2 p-4 bg-gradient-to-br from-sky-500/10 to-blue-500/10 rounded-lg border border-sky-500/20"
                          >
                            <div className="text-sky-400/70 text-xs font-mono uppercase tracking-wider flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Mobility
                            </div>
                            <div className="text-white font-bold text-xl">High</div>
                          </motion.div>
                        )}
                      </div>
                    </Card>
                  </motion.div>

                  {/* Upgrade Paths - Sleek Tabs */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Tabs defaultValue="from" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-black/60 via-cyan-900/20 to-black/60 backdrop-blur-xl border border-cyan-500/20 p-1">
                        <TabsTrigger
                          value="from"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/40 data-[state=active]:to-blue-500/40 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                          Evolves From
                        </TabsTrigger>
                        <TabsTrigger
                          value="to"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/40 data-[state=active]:to-purple-500/40 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                          Evolves To
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="from" className="space-y-4 mt-6">
                        {selectedTankData.upgradesFrom && selectedTankData.upgradesFrom.length > 0 ? (
                          <div className="grid grid-cols-3 gap-4">
                            {selectedTankData.upgradesFrom.map((parentKey, idx) => {
                              const parentConfig = TANK_CONFIGS[parentKey]
                              return (
                                <motion.button
                                  key={parentKey}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: idx * 0.05 }}
                                  whileHover={{ scale: 1.08, y: -4 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setSelectedTank(parentKey)}
                                  className="relative p-5 bg-gradient-to-br from-black/70 via-cyan-900/10 to-black/70 border border-cyan-500/30 rounded-xl hover:border-cyan-400/70 transition-all backdrop-blur-xl group shadow-xl overflow-hidden"
                                >
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                  />
                                  <div className="relative z-10 flex flex-col items-center space-y-3">
                                    <div className="relative">
                                      <TankPreview tankKey={parentKey} size={64} animated={false} />
                                      <motion.div
                                        className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl"
                                        animate={{ scale: [1, 1.4, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                      />
                                    </div>
                                    <div className="text-white text-sm font-bold group-hover:text-cyan-300 transition-colors">{parentConfig.name}</div>
                                    <Badge
                                      className={`bg-gradient-to-r ${TIER_COLORS[parentConfig.tier as keyof typeof TIER_COLORS]} border-0 text-white text-xs px-3 py-1 shadow-lg`}
                                    >
                                      Tier {parentConfig.tier}
                                    </Badge>
                                  </div>
                                </motion.button>
                              )
                            })}
                          </div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16 bg-gradient-to-br from-gray-900/40 to-gray-800/40 rounded-xl border border-gray-700/50"
                          >
                            <Lock className="w-20 h-20 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400 text-lg font-semibold">Origin Tank</p>
                            <p className="text-gray-500 text-sm mt-2">No previous evolution required</p>
                          </motion.div>
                        )}
                      </TabsContent>
                      <TabsContent value="to" className="space-y-4 mt-6">
                        {(() => {
                          const upgrades = getUpgradeTree(selectedTank)
                          return upgrades.length > 0 ? (
                            <div className="grid grid-cols-3 gap-4">
                              {upgrades.map((upgradeKey, idx) => {
                                const upgradeConfig = TANK_CONFIGS[upgradeKey]
                                return (
                                  <motion.button
                                    key={upgradeKey}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ scale: 1.08, y: -4 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedTank(upgradeKey)}
                                    className="relative p-5 bg-gradient-to-br from-black/70 via-purple-900/10 to-black/70 border border-purple-500/30 rounded-xl hover:border-purple-400/70 transition-all backdrop-blur-xl group shadow-xl overflow-hidden"
                                  >
                                    <motion.div
                                      className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent"
                                      animate={{ x: ['-100%', '200%'] }}
                                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                    />
                                    <div className="relative z-10 flex flex-col items-center space-y-3">
                                      <div className="relative">
                                        <TankPreview tankKey={upgradeKey} size={64} animated={false} />
                                        <motion.div
                                          className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl"
                                          animate={{ scale: [1, 1.4, 1] }}
                                          transition={{ duration: 2, repeat: Infinity }}
                                        />
                                      </div>
                                      <div className="text-white text-sm font-bold group-hover:text-purple-300 transition-colors">{upgradeConfig.name}</div>
                                      <Badge
                                        className={`bg-gradient-to-r ${TIER_COLORS[upgradeConfig.tier as keyof typeof TIER_COLORS]} border-0 text-white text-xs px-3 py-1 shadow-lg`}
                                      >
                                        Tier {upgradeConfig.tier}
                                      </Badge>
                                    </div>
                                  </motion.button>
                                )
                              })}
                            </div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-16 bg-gradient-to-br from-gray-900/40 to-gray-800/40 rounded-xl border border-gray-700/50"
                            >
                              <Sparkles className="w-20 h-20 mx-auto mb-4 text-amber-600" />
                              <p className="text-amber-400 text-lg font-semibold">Final Form</p>
                              <p className="text-gray-500 text-sm mt-2">This tank has reached its ultimate evolution</p>
                            </motion.div>
                          )
                        })()}
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex items-center justify-center"
                >
                  <div className="text-center space-y-6 p-12 bg-gradient-to-br from-gray-900/40 to-gray-800/40 rounded-2xl border border-gray-700/50">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    >
                      <Target className="w-24 h-24 text-cyan-600/50 mx-auto" />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-2">
                        Select a Tank
                      </h3>
                      <p className="text-gray-400">
                        Choose from <span className="text-cyan-400 font-bold">{filteredTanks.length}</span> available tanks
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
