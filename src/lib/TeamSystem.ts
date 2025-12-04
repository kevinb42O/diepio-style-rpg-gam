/**
 * Team System
 * Manages team assignments and team-based rules
 */

import type { Team } from './types'

export class TeamSystem {
  private playerTeam: Team = 'blue'

  /**
   * Initialize team system and assign player to a team
   */
  constructor() {
    // Randomly assign player to blue or red team
    this.playerTeam = Math.random() < 0.5 ? 'blue' : 'red'
  }

  /**
   * Get the player's team
   */
  getPlayerTeam(): Team {
    return this.playerTeam
  }

  /**
   * Get the opposite team
   */
  getOppositeTeam(team: Team): Team {
    if (team === 'blue') return 'red'
    if (team === 'red') return 'blue'
    return 'neutral'
  }

  /**
   * Check if two teams are allies
   */
  areAllies(team1: Team, team2: Team): boolean {
    if (team1 === 'neutral' || team2 === 'neutral') return false
    return team1 === team2
  }

  /**
   * Check if two teams are enemies
   */
  areEnemies(team1: Team, team2: Team): boolean {
    if (team1 === 'neutral' || team2 === 'neutral') return false
    return team1 !== team2
  }

  /**
   * Get team color for rendering
   */
  getTeamColor(team: Team): string {
    switch (team) {
      case 'blue':
        return '#00B2E1'
      case 'red':
        return '#FF4444'
      case 'neutral':
        return '#888888'
      default:
        return '#888888'
    }
  }

  /**
   * Get team name
   */
  getTeamName(team: Team): string {
    switch (team) {
      case 'blue':
        return 'Blue Team'
      case 'red':
        return 'Red Team'
      case 'neutral':
        return 'Neutral'
      default:
        return 'Unknown'
    }
  }

  /**
   * Assign a random team for a new bot, balanced distribution
   */
  assignBotTeam(currentBlueBots: number, currentRedBots: number): Team {
    // Try to balance teams
    const diff = currentBlueBots - currentRedBots
    
    if (diff > 2) {
      // Too many blue bots, spawn red
      return 'red'
    } else if (diff < -2) {
      // Too many red bots, spawn blue
      return 'blue'
    } else {
      // Balanced, random assignment
      return Math.random() < 0.5 ? 'blue' : 'red'
    }
  }

  /**
   * Reset team system (for new game)
   */
  reset() {
    this.playerTeam = Math.random() < 0.5 ? 'blue' : 'red'
  }

  /**
   * Set player team (for testing or player choice)
   */
  setPlayerTeam(team: Team) {
    if (team === 'blue' || team === 'red') {
      this.playerTeam = team
    }
  }
}
