import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TANK_CONFIGS, type TankConfig } from '../src/lib/tankConfigs'

type TankEntry = TankConfig & { key: string }

const tierBreakpoints: Array<{ tier: number; level: number; label: string }> = [
  { tier: 0, level: 1, label: 'Initiate' },
  { tier: 1, level: 15, label: 'Archetype' },
  { tier: 2, level: 30, label: 'Specialist' },
  { tier: 3, level: 45, label: 'Signature Mastery' },
  { tier: 4, level: 60, label: 'Evolution' },
  { tier: 5, level: 75, label: 'Mythic' },
  { tier: 6, level: 90, label: 'Ascended' }
]

const tanks: TankEntry[] = Object.entries(TANK_CONFIGS).map(([key, config]) => ({
  key,
  ...config
}))

const tankByKey = new Map<string, TankEntry>(tanks.map((tank) => [tank.key, tank]))
const maxTier = Math.max(...tanks.map((tank) => tank.tier))
const tierLevelMap = new Map(tierBreakpoints.map((bp) => [bp.tier, bp.level]))

const childrenByParent = new Map<string, TankEntry[]>()
for (const tank of tanks) {
  for (const parent of tank.upgradesFrom ?? []) {
    if (!childrenByParent.has(parent)) {
      childrenByParent.set(parent, [])
    }
    childrenByParent.get(parent)!.push(tank)
  }
}

function formatList(items: string[], limit = 8): string {
  if (items.length === 0) return '—'
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')} +${items.length - limit} more`
}

function getTierTotals(): Array<{ tier: number; level: number; classes: TankEntry[] }> {
  const tiers = Array.from(new Set(tanks.map((tank) => tank.tier))).sort((a, b) => a - b)
  return tiers.map((tier) => ({
    tier,
    level: tierLevelMap.get(tier) ?? Math.min(...tanks.filter((tank) => tank.tier === tier).map((tank) => tank.unlocksAt)),
    classes: tanks
      .filter((tank) => tank.tier === tier)
      .sort((a, b) => a.name.localeCompare(b.name))
  }))
}

function buildLevelUnlockSummary() {
  const summaries: string[] = []
  const levelBreaks = tierBreakpoints.filter((bp) => bp.tier > 0)

  for (const { level, tier, label } of levelBreaks) {
    const parentTier = tier - 1
    const parentPool = tanks.filter((tank) => tank.tier === parentTier)
    const unlocking = tanks.filter((tank) => tank.tier === tier && tank.unlocksAt === level)

    const servedParents = new Set<string>()
    const offTierLinks: Array<{ parent: TankEntry; child: TankEntry }> = []

    for (const child of unlocking) {
      for (const parentKey of child.upgradesFrom ?? []) {
        const parent = tankByKey.get(parentKey)
        if (!parent) continue
        if (parent.tier === parentTier) {
          servedParents.add(parentKey)
        } else {
          offTierLinks.push({ parent, child })
        }
      }
    }

    const missingParents = parentPool.filter((parent) => !servedParents.has(parent.key))
    const coverage = parentPool.length === 0 ? 1 : servedParents.size / parentPool.length

    summaries.push(`### Level ${level} -> Tier ${tier} (${label})`)
    summaries.push(`- New classes (${unlocking.length}): ${formatList(unlocking.map((tank) => formatUnlock(tank)))}`)
    summaries.push(`- Tier ${parentTier} parents served: ${servedParents.size}/${parentPool.length} (${Math.round(coverage * 100)}%)`)

    if (missingParents.length > 0) {
      summaries.push(
        `- Missing Tier ${tier} upgrades (${missingParents.length}): ${formatList(missingParents.map((tank) => tank.name), 12)}`
      )
    } else {
      summaries.push(`- Missing Tier ${tier} upgrades: none`)
    }

    if (offTierLinks.length > 0) {
      const offTierSummary = offTierLinks
        .map(({ parent, child }) => `${parent.name} (Tier ${parent.tier}) -> ${child.name} (Tier ${child.tier})`)
        .sort()
      summaries.push(`- Off-tier upgrade links: ${formatList(offTierSummary, 8)}`)
    }

    summaries.push('')
  }

  return summaries
}

function formatUnlock(tank: TankEntry): string {
  const parents = tank.upgradesFrom?.map((parentKey) => tankByKey.get(parentKey)?.name ?? parentKey)
  if (!parents || parents.length === 0) return tank.name
  return `${tank.name} (${parents.join(', ')})`
}

function buildDeadEndReport() {
  const lines: string[] = []
  const deadEnds = new Map<number, TankEntry[]>()

  for (const parent of tanks) {
    if (parent.tier >= maxTier) continue

    const children = childrenByParent.get(parent.key) ?? []
    if (children.length === 0) {
      if (!deadEnds.has(parent.tier)) deadEnds.set(parent.tier, [])
      deadEnds.get(parent.tier)!.push(parent)
    }
  }

  if (deadEnds.size === 0) {
    lines.push('All tiers have forward upgrade paths.')
    return lines
  }

  const tiers = Array.from(deadEnds.keys()).sort((a, b) => a - b)
  for (const tier of tiers) {
    const parents = deadEnds.get(tier)!
    lines.push(`### Tier ${tier} parents without any higher-tier upgrade (${parents.length})`)
    lines.push(formatList(parents.map((tank) => tank.name), 14))
    lines.push('')
  }

  return lines
}

function buildTierSkipReport() {
  const rows: Array<{ parent: TankEntry; nextTier: number; childNames: string[]; levelGap: number }> = []

  for (const parent of tanks) {
    if (parent.tier >= maxTier) continue
    const children = childrenByParent.get(parent.key) ?? []
    if (children.length === 0) continue

    const expectedTier = parent.tier + 1
    const directChildren = children.filter((child) => child.tier === expectedTier)
    if (directChildren.length > 0) continue

    const minTier = Math.min(...children.map((child) => child.tier))
    const minLevel = Math.min(...children.map((child) => child.unlocksAt))
    rows.push({
      parent,
      nextTier: minTier,
      childNames: children.map((child) => `${child.name} (Tier ${child.tier})`),
      levelGap: Math.max(0, minLevel - parent.unlocksAt)
    })
  }

  if (rows.length === 0) {
    return ['No tier skips detected.']
  }

  const header = '| Parent Class | Current Tier | Next Available Tier | Level Gap | Upgrade Targets |'
  const divider = '| --- | --- | --- | --- | --- |'
  const table = rows
    .sort((a, b) => a.parent.tier - b.parent.tier || a.nextTier - b.nextTier)
    .map(
      ({ parent, nextTier, childNames, levelGap }) =>
        `| ${parent.name} | ${parent.tier} | ${nextTier} | +${levelGap} levels | ${formatList(childNames, 6)} |`
    )

  return [header, divider, ...table]
}

function buildReport() {
  const lines: string[] = []
  lines.push('# Tier Upgrade Audit')
  lines.push('')
  lines.push(`_Generated ${new Date().toISOString()}_`)
  lines.push('')

  lines.push('## Tier Inventory')
  lines.push('')
  lines.push('| Tier | Unlock Level | Class Count | Sample Classes |')
  lines.push('| --- | --- | --- | --- |')
  for (const { tier, level, classes } of getTierTotals()) {
    lines.push(
      `| ${tier} | ${level} | ${classes.length} | ${formatList(classes.map((tank) => tank.name), 10)} |`
    )
  }
  lines.push('')

  lines.push('## Level Unlock Windows')
  lines.push('')
  lines.push(...buildLevelUnlockSummary())

  lines.push('## Missing Next-Tier Upgrades')
  lines.push('')
  lines.push(...buildDeadEndReport())
  lines.push('')

  lines.push('## Tier Skips & Level Gap Alerts')
  lines.push('')
  lines.push(...buildTierSkipReport())
  lines.push('')

  return lines.join('\n')
}

function writeReport() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const repoRoot = path.resolve(__dirname, '..')
  const reportPath = path.join(repoRoot, 'docs', 'tier-audit-report.md')
  writeFileSync(reportPath, buildReport(), 'utf8')
  // eslint-disable-next-line no-console
  console.log(`Tier audit report written to ${path.relative(repoRoot, reportPath)}`)
}

writeReport()
