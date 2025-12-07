import { Crown, Star, Trophy, Medal } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface LeaderboardEntry {
  name: string
  level: number
  isPlayer: boolean
  team?: 'blue' | 'red' | 'neutral'
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const isMobile = useIsMobile()
  
  // Sort by level descending and take top 5
  const topEntries = [...entries]
    .sort((a, b) => b.level - a.level)
    .slice(0, 5)

  if (topEntries.length === 0) return null

  const getTeamColor = (team?: 'blue' | 'red' | 'neutral') => {
    if (team === 'blue') return 'text-blue-400'
    if (team === 'red') return 'text-red-400'
    return 'text-foreground'
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return 'text-yellow-400 font-bold'
    if (index === 1) return 'text-gray-300 font-semibold'
    if (index === 2) return 'text-amber-600 font-semibold'
    return 'text-muted-foreground'
  }

  return (
    <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} pointer-events-none`}>
      <div className={`bg-card/80 backdrop-blur-sm rounded-lg border border-border ${isMobile ? 'p-2 w-36' : 'p-3 w-48'}`}>
        <div className={`flex items-center gap-1 ${isMobile ? 'text-xs mb-1' : 'text-sm mb-2'} font-semibold text-muted-foreground`}>
          <Crown className="text-yellow-400 fill-current" size={isMobile ? 12 : 16} />
          <span>Leaderboard</span>
        </div>
        
        <div className={`flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
          {topEntries.map((entry, index) => (
            <div 
              key={`${entry.name}-${index}`}
              className={`flex items-center justify-between ${isMobile ? 'text-[10px]' : 'text-xs'} ${entry.isPlayer ? 'bg-accent/20 rounded px-1' : ''}`}
            >
              <div className="flex items-center gap-1 truncate flex-1 min-w-0">
                <span className={`${getRankStyle(index)} w-3`}>{index + 1}.</span>
                <span className={`truncate ${getTeamColor(entry.team)} ${entry.isPlayer ? 'font-bold' : ''}`}>
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-0.5 ml-1 shrink-0">
                {index === 0 ? (
                  <Trophy className="text-yellow-400 fill-current" size={isMobile ? 8 : 10} />
                ) : index === 1 ? (
                  <Medal className="text-gray-300 fill-current" size={isMobile ? 8 : 10} />
                ) : index === 2 ? (
                  <Medal className="text-amber-600 fill-current" size={isMobile ? 8 : 10} />
                ) : (
                  <Star className="text-accent fill-current" size={isMobile ? 8 : 10} />
                )}
                <span className="font-mono font-semibold">{entry.level}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
