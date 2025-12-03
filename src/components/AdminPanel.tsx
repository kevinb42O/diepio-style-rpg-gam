import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gear, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface AdminPanelProps {
  onSetLevel: (level: number) => void
  onAddStatPoints: (amount: number) => void
  currentLevel: number
  isOwner: boolean
}

export function AdminPanel({ onSetLevel, onAddStatPoints, currentLevel, isOwner }: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [levelInput, setLevelInput] = useState(currentLevel.toString())
  const [statPointsInput, setStatPointsInput] = useState('5')

  useEffect(() => {
    setLevelInput(currentLevel.toString())
  }, [currentLevel])

  if (!isOwner) return null

  const handleSetLevel = () => {
    const level = parseInt(levelInput)
    if (!isNaN(level) && level >= 1 && level <= 45) {
      onSetLevel(level)
    }
  }

  const handleAddStatPoints = () => {
    const amount = parseInt(statPointsInput)
    if (!isNaN(amount) && amount > 0) {
      onAddStatPoints(amount)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        variant="secondary"
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full shadow-lg"
      >
        <Gear weight="fill" size={20} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20, y: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20, y: -20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed top-16 right-4 z-50"
          >
            <Card className="w-80 shadow-2xl border-2 border-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Admin Panel</CardTitle>
                  <Button
                    onClick={() => setIsOpen(false)}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="level-input">Set Level (1-45)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="level-input"
                      type="number"
                      min="1"
                      max="45"
                      value={levelInput}
                      onChange={(e) => setLevelInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSetLevel} size="sm">
                      Set
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: Level {currentLevel}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stat-points-input">Add Levels (Stat Points)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stat-points-input"
                      type="number"
                      min="1"
                      value={statPointsInput}
                      onChange={(e) => setStatPointsInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddStatPoints} size="sm">
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Increases level to grant stat points
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Admin controls only visible to owner
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
