# Class System Roadmap

## Current Snapshot (Level 45 Cap)
- **Tier 0 (Lv1-14)**: Basic Tank – single balanced barrel, funnels players into first upgrade.
- **Tier 1 (Lv15+)**: Twin, Sniper, Machine Gun, Flank Guard, Smasher. Only Smasher meaningfully scales body damage; the rest lean on bullet patterns.
- **Tier 2 (Lv30+)**: Tripleshot, Quad Tank, Assassin, Overseer, Destroyer, Tri-Angle, Hunter, Twin Flank, Gunner, Trapper, Auto 3. Mix of spread, drone, and recoil builds but most share similar stat priorities (reload + bullet damage).
- **Tier 3 (Lv45)**: Pentashot, Octo Tank, Ranger, Overlord, Annihilator, Booster, Triplet, Spread Shot, Stalker, Predator, Streamliner, Necromancer, Manager, Factory, Battleship, Fighter, Hybrid, Skimmer, Rocketeer, Spike, Landmine, Auto Smasher, Auto 5, Auto Gunner, Sprayer, Triple Twin, Mega Trapper, Overtrapper, Gunner Trapper. These deliver breadth, yet their gameplay loops often blur together (stacked barrels, drone swarms, or trap variants).

### Observed Pain Points
- **No true ordnance archetype**: Nothing fires a singular gigantic projectile (think Diep Destroyer → Skimmer extremes). Players asking for “1000 damage cannonball” style impact.
- **Body-damage lineage is tiny**: Smasher → Spike/Landmine/Auto Smasher is the sole branch; bruiser fantasies end early.
- **Progression stops at 45**: Builds plateau quickly and stat decisions after mid-game feel detached from final class fantasy.
- **Stats feel siloed**: Players can max loot range or reload with little relation to their chosen class; early decisions do not foreshadow later specializations.

## Design Pillars Going Forward
1. **Silhouette clarity**: Each tier jump must change the outline (barrel layout, hull shape, drone orbit) so opponents instantly read the role.
2. **Feel-first abilities**: Tie at least one tactile mechanic (recoil dash, charge-up beam, orbiting shields) to every advanced class.
3. **Stat synergy**: Classes expose multipliers or caps that make certain stats irresistible (e.g., Siege hull doubles bulletDamage scaling, Vanguard converts bodyDamage into ramming force).
4. **Meaningful long-term picks**: Reaching level 100 should feel like curating a build path, not just unlocking “more of the same.”

## Extended Progression Outline (Target Level 100)
| Tier | Levels | Theme | Example Outcome |
| --- | --- | --- | --- |
| T0 | 1-14 | Initiate | Basic Tank foundation |
| T1 | 15-29 | Archetype | Twin/Sniper/Machine Gun/Flank Guard/Smasher |
| T2 | 30-44 | Specialist | Tripleshot/Hunter/etc. introduce unique mechanics |
| T3 | 45-59 | Signature Mastery | Current tier-3 classes, tuned as “master” forms |
| T4 | 60-74 | **Evolution** | New branch per archetype; adds ultimates (e.g., Destroyer → Siegebreaker) |
| T5 | 75-89 | **Mythic** | Hybridization nodes merging two lineages (e.g., Sniper + Trapper) |
| T6 | 90-100 | **Ascended** | Singular capstone per branch with game-changing mechanics |

Unlock pacing: maintain XP curve to 45, then introduce smoother increments (~125k XP per level) while awarding micro-upgrades (e.g., passive stat conversions or ability augments) between big class unlocks to keep engagement high.

## Proposed New Archetypes (Inspirations from Diep.io + WoW-style specs)
- **Siegebreaker (Destroyer line, T4)**: Fires a single 1000-damage cannonball with splash knockback; reload determined by both reload stat and bodyDamage (heavier chassis stabilizes recoil). Unlocks charged shot UI element.
- **Aegis Vanguard (Smasher line, T4)**: Deployable rotating shield wedges; converts a portion of movementSpeed into collision damage and grants brief invulnerability after a kill.
- **Obelisk (Sniper/Trapper fusion, T5)**: Places prism pylons that link into laser walls; bulletPenetration extends beam length while lootRange repurposes into pylon remote placement distance.
- **Tempest (Twin/Machine Gun hybrid, T5)**: Alternates firing arcs between clockwise and counter-clockwise vortex sprays; reload upgrades boost spin-up while bulletSpeed governs vortex radius.
- **Riftwalker (Overseer/Droner, T6)**: Teleports to a selected drone every few seconds, leaving behind a slowing anomaly; healthRegen investment reduces ability cooldown.
- **Catalyst (Tri-Angle/Booster line, T6)**: Builds combo stacks while moving; unleashes a shockwave projectile whose size scales off stored movementSpeed and bodyDamage contributions.
- **Mirage (Stalker stealth line, T4)**: Projects a decoy controlled by the mouse while the true tank stalks invisibly; firing breaks invisibility for three seconds before fading again.

## Stat Investment Philosophy
- **Soft Caps per Branch**: Each class tier introduces unique diminishing returns so players pre-plan builds (e.g., Siegebreaker caps reload effectiveness but doubles bulletDamage gains; Vanguard tabs bodyDamage but extends collision radius).
- **Conversion Nodes**: Upon choosing a class, grant passive conversions (Sniper tree turns surplus lootRange into mini-scout drones; Smasher converts bulletSpeed into dash distance) to keep “non-core” stats relevant.
- **Loot Range Rebalance Tie-in**: With the new cap at the former 8-point power curve, players must pair loot builds with class choices that explicitly reward utility investment (e.g., support drones). This prevents universal vacuum builds while preserving niche utility specs.

## Implementation Status (In-Progress)
- **Tier 2 Bruiser**: `Crusher` now bridges Smasher to the tier-3 bruisers at level 30, keeping body-damage builds active every tier.
- **Extended XP Curve**: Level progression now continues to 100 using a 125k XP/level slope past 45 to support new tiers.
- **Tier 4-6 Scaffolding**: Added configs + upgrade metadata for Siegebreaker, Aegis Vanguard, Obelisk, Tempest, Riftwalker, and Catalyst so future ability systems can latch on. Unlocks staged at 60/75/90 respectively.
- **Mirage Prototype**: First Evolution-tier stealth class implemented with the requested decoy mechanic (mouse steers decoy while the real tank moves via keyboard), honoring the 3s reveal window after firing.
- **Tier 4 Ability Pass**: Siegebreaker now charges a 1k-damage cannonball, Aegis Vanguard orbits projectile-blocking shields, and Riftwalker teleports to drones leaving slowing anomalies.
- **Debug Fast-Forward**: Admin tools and global debug commands (`window.codexSetLevel(level)`) can now jump directly to tiers 15/30/45/60/75/90/100 for rapid balancing.
- **World Scaling**: Nexus zone spawns tier 4-6 bots and shapes up to level 100 to keep late-game populated while we script abilities.

## Implementation Phases
1. **Foundational Balance** (now): finalize stat caps (loot range), audit damage formulas, document current behaviors.
2. **Tier 4 Skeleton**: add level 60 unlock infrastructure, placeholder configs, and ensure XP curve supports 60+.
3. **Ability Systems**: implement cannonball, shields, teleport hooks as reusable modules (charge shots, damage-over-time fields, etc.).
4. **Hybrid Unlock Logic**: design branching UI/UX for multi-lineage picks (T5+), with safeguards to prevent impossible combinations.
5. **Ascended Polish**: add unique FX/audio cues so late-game silhouettes feel legendary; ensure stat investments remain visible (bigger recoil, brighter drones).
6. **Live Balance Loop**: telemetry hooks for kill source, damage distribution, and stat usage to iterate quickly once the level-100 framework ships.

Deliverable owned here will evolve as new classes leave concept phase; treat this document as the north star for designing beyond level 45 without overwhelming players.

## Current vs Future Tier Snapshot
| Tier | Current Behavior | Upcoming Focus |
| --- | --- | --- |
| T0 | Basic tank with balanced stats; teaches movement and aiming. | Keep frictionless so respecs reach Tier 1 faster even when we stretch cap to 100. |
| T1 | Archetypes (Twin, Sniper, Machine Gun, Flank Guard, Smasher). Clear bullet vs body vs utility archetypes. | Sharpen silhouettes (e.g., Smasher hex body, Flank Guard cross) and bake soft stat nudges (Sniper auto-boosts bullet speed, Smasher bumps body damage). |
| T2 | Specialists (Tripleshot, Assassin, Overseer, Destroyer, Tri-Angle, Hunter, Twin Flank, Gunner, Trapper, Auto 3, Crusher). | Ensure every branch exposes a different stat obsession: Crusher doubles down on bodyDamage/movementSpeed, Overseer converts bulletSpeed into drone responsiveness, Destroyer ties reload to recoil control. |
| T3 | Signature mastery (Pentashot set pieces, Necromancer swarms, Spike bruisers). | Polish new FX and tighten differentiation so Triplet ≠ Spreadshot; bruiser line gets unique buffs tied to collisions. |
| T4 | Evolution tier (Siegebreaker, Aegis Vanguard, Mirage). | Ship tactile abilities (cannon charge meter, shield orbits, decoy swapping) with clear UI cues. |
| T5 | Mythic hybrids (Obelisk, Tempest). | Finish bespoke mechanics (pylon laser walls, vortex swaps) and highlight their dual-lineage stat synergies in the upgrade modal. |
| T6 | Ascended caps (Riftwalker, Catalyst). | Lean into build-defining buttons (drone teleport, combo shockwave) plus late-game conversion nodes that keep stat investment meaningful up to level 100. |

## Body-Damage Lineage Plan
- **Tier 1 – Smasher**: Barrel-less hex chassis that trades ammo for raw collision damage. Automatically scales bodyDamage and maxHealth but caps reload gains.
- **Tier 2 – Crusher**: Bridges Smasher into Tier 3 by adding gyrating spin speed. Unlocks at level 30 so bruisers always have a mid-game upgrade.
- **Tier 3 – Spike / Landmine / Auto Smasher**: Three fantasies from the same chassis: harder collisions (Spike), stealth burst (Landmine), or passive turret (Auto Smasher).
- **Tier 4 – Aegis Vanguard**: Evolution node that wraps the bruiser in rotating shield wedges. movementSpeed feeds orbit velocity, bodyDamage feeds slam impact.
- **Tier 5 – Future Mythic (WIP)**: Planned “Bulwark” hybrid that merges Aegis + Destroyer to fire battering-ram shells without giving up collision dominance.
- **Tier 6 – Ascended (Catalyst tie-in)**: Body damage starts converting into shockwave size so late-game bruisers still chase stat points instead of idling at the cap.

## Ability Implementation Checklist
- ✅ **Siegebreaker**: Chargeable 1000-damage cannonball with knockback + slow, bodyDamage shortens reload window.
- ✅ **Aegis Vanguard**: Rotating shield wedges block bullets, slam bots, and speed up with movementSpeed investment.
- ✅ **Mirage**: Mouse-driven decoy + keyboard-controlled invisible chassis, includes blink (`Q`) and swap (`R`) hotkeys plus HUD indicator.
- ✅ **Riftwalker**: Warps to owned drones and leaves slowing anomalies that tick damage over time.
- 🔄 **Tempest**: Vortex spray pattern scaffolded; needs alternating arc logic wired into the firing routine.
- 🔄 **Obelisk**: Pylon placement + laser linking specced; requires dedicated trap/beam system to exit placeholder state.
- 🔄 **Catalyst**: Combo-stack tracking exists conceptually; shockwave projectile still pending so bodyDamage conversions have payoff.

## Balance Hooks & Tools
- **Loot range cap**: Stat now hard caps at the former 8-point curve (`50 * 1.35^8 ≈ 552` units). Players can spend up to 30 points, but vacuum radius never exceeds the 8-point effect, preventing map-wide funnels.
- **Mirage baiting**: Decoy now intercepts hostile projectiles even without collision, consuming shots and flashing when it absorbs aggro.
- **Admin fast-forward**: `window.codexSetLevel(level)` and `window.codexAddLevels(amount)` let us hop to any tier (15/30/45/60/75/90/100) for balancing.
- **Roadmap telemetry TODO**: Next steps include wiring damage-source tracking per tier plus console toggles for new abilities so we can iterate faster as Tier 5/6 features solidify.
