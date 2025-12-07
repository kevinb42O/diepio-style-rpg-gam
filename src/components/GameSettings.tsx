import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  X, 
  Volume2, 
  VolumeOff, 
  Monitor, 
  Gamepad2, 
  Keyboard, 
  Mouse, 
  Zap, 
  Target, 
  Shield,
  Sword,
  Trophy,
  Medal,
  Battery,
  HardDrive,
  Cpu,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface GameSettingsProps {
  isOpen: boolean
  onToggle: () => void
  settings: {
    masterVolume: number
    sfxVolume: number
    musicVolume: number
    showFPS: boolean
    showMinimap: boolean
    showParticles: boolean
    autoFire: boolean
    quickUpgrade: boolean
    lowPower: boolean
  }
  onSettingChange: (key: string, value: number | boolean) => void
  systemInfo?: {
    fps: number
    memory: number
    ping: number
    connected: boolean
  }
}

export function GameSettings({ 
  isOpen, 
  onToggle, 
  settings, 
  onSettingChange,
  systemInfo = { fps: 60, memory: 45, ping: 32, connected: true }
}: GameSettingsProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'graphics' | 'controls' | 'system'>('audio')

  const tabs = [
    { id: 'audio' as const, label: 'Audio', icon: Volume2 },
    { id: 'graphics' as const, label: 'Graphics', icon: Monitor },
    { id: 'controls' as const, label: 'Controls', icon: Gamepad2 },
    { id: 'system' as const, label: 'System', icon: Cpu }
  ]

  const SettingRow = ({ 
    icon: Icon, 
    title, 
    description, 
    children 
  }: { 
    icon: React.ElementType
    title: string
    description?: string
    children: React.ReactNode 
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <Icon size={16} className="text-white/70" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{title}</div>
          {description && (
            <div className="text-xs text-white/50 mt-0.5">{description}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  )

  const VolumeSlider = ({ 
    value, 
    onChange, 
    icon: Icon, 
    label 
  }: { 
    value: number
    onChange: (value: number) => void
    icon: React.ElementType
    label: string 
  }) => (
    <SettingRow
      icon={Icon}
      title={label}
      description={`${value}%`}
    >
      <div className="w-24 flex items-center gap-2">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-white/60 w-8 text-right tabular-nums">{value}</span>
      </div>
    </SettingRow>
  )

  const renderAudioSettings = () => (
    <div className="space-y-3">
      <VolumeSlider
        value={settings.masterVolume}
        onChange={(value) => onSettingChange('masterVolume', value)}
        icon={settings.masterVolume === 0 ? VolumeOff : Volume2}
        label="Master Volume"
      />
      <VolumeSlider
        value={settings.sfxVolume}
        onChange={(value) => onSettingChange('sfxVolume', value)}
        icon={Zap}
        label="Sound Effects"
      />
      <VolumeSlider
        value={settings.musicVolume}
        onChange={(value) => onSettingChange('musicVolume', value)}
        icon={Trophy}
        label="Background Music"
      />
    </div>
  )

  const renderGraphicsSettings = () => (
    <div className="space-y-3">
      <SettingRow
        icon={Target}
        title="Show FPS Counter"
        description="Display frame rate in corner"
      >
        <Switch
          checked={settings.showFPS}
          onCheckedChange={(checked) => onSettingChange('showFPS', checked)}
        />
      </SettingRow>
      
      <SettingRow
        icon={Monitor}
        title="Show Minimap"
        description="Display world overview"
      >
        <Switch
          checked={settings.showMinimap}
          onCheckedChange={(checked) => onSettingChange('showMinimap', checked)}
        />
      </SettingRow>
      
      <SettingRow
        icon={Zap}
        title="Particle Effects"
        description="Visual explosions and effects"
      >
        <Switch
          checked={settings.showParticles}
          onCheckedChange={(checked) => onSettingChange('showParticles', checked)}
        />
      </SettingRow>

      <SettingRow
        icon={Battery}
        title="Low Power Mode"
        description="Reduce graphics for better performance"
      >
        <Switch
          checked={settings.lowPower}
          onCheckedChange={(checked) => onSettingChange('lowPower', checked)}
        />
      </SettingRow>
    </div>
  )

  const renderControlsSettings = () => (
    <div className="space-y-3">
      <SettingRow
        icon={Target}
        title="Auto Fire"
        description="Automatically shoot when aiming at targets"
      >
        <Switch
          checked={settings.autoFire}
          onCheckedChange={(checked) => onSettingChange('autoFire', checked)}
        />
      </SettingRow>
      
      <SettingRow
        icon={Sword}
        title="Quick Upgrade"
        description="One-click stat upgrades"
      >
        <Switch
          checked={settings.quickUpgrade}
          onCheckedChange={(checked) => onSettingChange('quickUpgrade', checked)}
        />
      </SettingRow>

      <div className="p-3 rounded-lg bg-white/5">
        <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Keyboard size={16} className="text-blue-400" />
          Controls
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
          <div>WASD - Move</div>
          <div>Mouse - Aim</div>
          <div>Click - Shoot</div>
          <div>1-8 - Upgrade Stats</div>
          <div>E - Auto Fire</div>
          <div>Q/R - Abilities</div>
        </div>
      </div>
    </div>
  )

  const renderSystemSettings = () => (
    <div className="space-y-3">
      {/* System Performance */}
      <div className="p-3 rounded-lg bg-white/5">
        <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Cpu size={16} className="text-green-400" />
          Performance
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-white tabular-nums">{systemInfo.fps}</div>
            <div className="text-xs text-white/50">FPS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white tabular-nums">{systemInfo.memory}%</div>
            <div className="text-xs text-white/50">Memory</div>
          </div>
          <div className="text-center flex flex-col items-center">
            <div className="text-lg font-bold text-white tabular-nums flex items-center gap-1">
              {systemInfo.connected ? (
                <Wifi size={16} className="text-green-400" />
              ) : (
                <WifiOff size={16} className="text-red-400" />
              )}
              {systemInfo.ping}ms
            </div>
            <div className="text-xs text-white/50">Ping</div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="p-3 rounded-lg bg-white/5">
        <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <HardDrive size={16} className="text-purple-400" />
          System Status
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Game Version</span>
            <Badge variant="secondary" className="text-xs">v1.2.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Engine</span>
            <Badge variant="secondary" className="text-xs">Canvas 2D</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Connection</span>
            <Badge 
              variant={systemInfo.connected ? "default" : "destructive"} 
              className="text-xs"
            >
              {systemInfo.connected ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Game Stats */}
      <div className="p-3 rounded-lg bg-white/5">
        <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Medal size={16} className="text-amber-400" />
          Session Stats
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
          <div>Playtime: 15:42</div>
          <div>High Score: 12,450</div>
          <div>Total Kills: 127</div>
          <div>Best Level: 42</div>
        </div>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onToggle}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-gray-900/95 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings size={20} className="text-blue-400" />
                  Game Settings
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X size={16} />
                </Button>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-6 max-h-[60vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'audio' && renderAudioSettings()}
                  {activeTab === 'graphics' && renderGraphicsSettings()}
                  {activeTab === 'controls' && renderControlsSettings()}
                  {activeTab === 'system' && renderSystemSettings()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}