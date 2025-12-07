import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard,
  Mouse,
  Gamepad2,
  Target,
  Zap,
  Shield,
  Heart,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MousePointer,
  Hand,
  Eye,
  HelpCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface GameControlsHelpProps {
  isVisible: boolean
  onToggle: () => void
}

type ControlType = 'movement' | 'combat' | 'abilities' | 'interface'

interface ControlItem {
  key: string
  action: string
  icon: React.ElementType
  description?: string
  type: ControlType
}

const controls: ControlItem[] = [
  // Movement
  { key: 'W', action: 'Move Up', icon: ArrowUp, type: 'movement' },
  { key: 'A', action: 'Move Left', icon: ArrowLeft, type: 'movement' },
  { key: 'S', action: 'Move Down', icon: ArrowDown, type: 'movement' },
  { key: 'D', action: 'Move Right', icon: ArrowRight, type: 'movement' },

  // Combat
  { key: 'Mouse', action: 'Aim & Shoot', icon: MousePointer, description: 'Point and click to shoot', type: 'combat' },
  { key: 'E', action: 'Auto Fire', icon: Target, description: 'Toggle automatic shooting', type: 'combat' },
  { key: 'Hold', action: 'Continuous Fire', icon: Zap, description: 'Hold mouse for rapid fire', type: 'combat' },

  // Abilities
  { key: 'Q', action: 'Ability 1', icon: Shield, description: 'Class-specific ability', type: 'abilities' },
  { key: 'R', action: 'Ability 2', icon: Heart, description: 'Secondary ability', type: 'abilities' },
  { key: 'F', action: 'Ultimate', icon: Star, description: 'Ultimate ability (when available)', type: 'abilities' },

  // Interface
  { key: '1-8', action: 'Upgrade Stats', icon: Star, description: 'Spend stat points', type: 'interface' },
  { key: 'Tab', action: 'Show Stats', icon: Eye, description: 'View detailed stats panel', type: 'interface' },
  { key: 'F3', action: 'Toggle FPS', icon: Eye, description: 'Show/hide performance info', type: 'interface' },
]

const typeColors: Record<ControlType, string> = {
  movement: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  combat: 'bg-red-500/20 text-red-300 border-red-500/30',
  abilities: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  interface: 'bg-green-500/20 text-green-300 border-green-500/30',
}

const typeIcons: Record<ControlType, React.ElementType> = {
  movement: ArrowUp,
  combat: Target,
  abilities: Shield,
  interface: Eye,
}

export function GameControlsHelp({ isVisible, onToggle }: GameControlsHelpProps) {
  const [activeFilter, setActiveFilter] = useState<ControlType | 'all'>('all')

  const filteredControls = activeFilter === 'all' ? controls : controls.filter((control) => control.type === activeFilter)

  const ControlKey = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`
        inline-flex items-center justify-center
        min-w-[24px] h-6 px-2
        bg-white/10 border border-white/20
        rounded text-xs font-mono font-bold
        text-white
        ${className}
      `}
    >
      {children}
    </div>
  )

  const FilterButton = ({
    type,
    label,
    icon: Icon,
  }: {
    type: ControlType | 'all'
    label: string
    icon: React.ElementType
  }) => (
    <button
      onClick={() => setActiveFilter(type)}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${
          activeFilter === type
            ? 'bg-white/20 text-white border border-white/30'
            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      <Icon size={14} />
      {label}
    </button>
  )

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        size="sm"
        variant="secondary"
        className="fixed bottom-4 right-4 z-40 bg-black/60 hover:bg-black/80 border-white/10 text-white"
      >
        <HelpCircle size={16} className="mr-1" />
        Controls
      </Button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onToggle}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Keyboard size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Game Controls</h2>
                <p className="text-sm text-white/60">Master the battlefield with these controls</p>
              </div>
            </div>
            <Button onClick={onToggle} variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
              <X size={20} />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <FilterButton type="all" label="All" icon={HelpCircle} />
            <FilterButton type="movement" label="Movement" icon={typeIcons.movement} />
            <FilterButton type="combat" label="Combat" icon={typeIcons.combat} />
            <FilterButton type="abilities" label="Abilities" icon={typeIcons.abilities} />
            <FilterButton type="interface" label="Interface" icon={typeIcons.interface} />
          </div>

          {/* Controls Grid */}
          <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-2">
            {filteredControls.map((control, index) => (
              <motion.div
                key={control.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <control.icon size={16} className="text-white/70" />
                </div>

                {/* Key */}
                <div className="flex-shrink-0">
                  {control.key === 'Mouse' ? (
                    <div className="flex items-center gap-1">
                      <Mouse size={16} className="text-white/60" />
                      <span className="text-xs text-white/60">Mouse</span>
                    </div>
                  ) : control.key === 'Hold' ? (
                    <div className="flex items-center gap-1">
                      <Hand size={16} className="text-white/60" />
                      <span className="text-xs text-white/60">Hold</span>
                    </div>
                  ) : (
                    <ControlKey>{control.key}</ControlKey>
                  )}
                </div>

                {/* Action & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{control.action}</span>
                    <Badge variant="secondary" className={`text-xs ${typeColors[control.type]}`}>
                      {control.type}
                    </Badge>
                  </div>
                  {control.description && <p className="text-xs text-white/50 mt-1">{control.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer tip */}
          <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-300">
              <Gamepad2 size={16} />
              <span className="text-sm font-medium">Pro Tip:</span>
            </div>
            <p className="text-sm text-blue-200/80 mt-1">Practice these controls in the training area to master your tank movements and abilities!</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
