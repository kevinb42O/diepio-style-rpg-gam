/**
 * Bot Name Generator
 * Generates realistic player-like names for bots
 */

const PREFIXES = [
  'Pro', 'Mega', 'Super', 'Ultra', 'Epic', 'Dark', 'Shadow', 'Ghost', 'Ninja', 'Sniper',
  'Tank', 'Master', 'Lord', 'King', 'Ace', 'Legend', 'Elite', 'Omega', 'Alpha', 'Beta',
  'Delta', 'Sigma', 'Crazy', 'Wild', 'Mad', 'Hyper', 'Turbo', 'Neo', 'Cyber', 'Blaze',
  'Storm', 'Thunder', 'Lightning', 'Fire', 'Ice', 'Frost', 'Steel', 'Iron', 'Golden', 'Silver'
]

const SUFFIXES = [
  'Killer', 'Hunter', 'Slayer', 'Warrior', 'Fighter', 'Sniper', 'Tank', 'Boss', 'God', 'King',
  'Lord', 'Master', 'Pro', 'Legend', 'Destroyer', 'Crusher', 'Smasher', 'Breaker', 'Striker', 'Ranger',
  'Scout', 'Ninja', 'Shadow', 'Ghost', 'Phantom', 'Reaper', 'Beast', 'Monster', 'Dragon', 'Phoenix',
  'Wolf', 'Bear', 'Tiger', 'Lion', 'Eagle', 'Hawk', 'Falcon', 'Viper', 'Cobra', 'Shark'
]

const SIMPLE_NAMES = [
  'Player', 'User', 'Gamer', 'Noob', 'Newbie', 'Rookie', 'Veteran', 'Champion', 'Hero', 'Tank',
  'Bob', 'Joe', 'Mike', 'Steve', 'Alex', 'John', 'Dave', 'Tom', 'Sam', 'Max',
  'Jake', 'Luke', 'Mark', 'Nick', 'Dan', 'Ben', 'Chris', 'Ryan', 'Matt', 'Josh'
]

const LEETSPEAK_REPLACEMENTS: Record<string, string> = {
  'a': '4',
  'e': '3',
  'i': '1',
  'o': '0',
  's': '5',
  't': '7',
  'l': '1'
}

export class BotNameGenerator {
  private usedNames: Set<string> = new Set()

  /**
   * Generate a random bot name
   */
  generateName(): string {
    let name = ''
    const style = Math.random()

    if (style < 0.3) {
      // Prefix + Suffix style (ProKiller)
      const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
      const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]
      name = prefix + suffix
    } else if (style < 0.5) {
      // Simple name + number (Player123)
      const simple = SIMPLE_NAMES[Math.floor(Math.random() * SIMPLE_NAMES.length)]
      const num = Math.floor(Math.random() * 9999)
      name = simple + num
    } else if (style < 0.7) {
      // Leetspeak variant
      const base = Math.random() < 0.5 
        ? PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
        : SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]
      name = this.toLeetSpeak(base)
    } else if (style < 0.85) {
      // Underscore separated (Dark_Hunter)
      const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
      const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]
      name = prefix + '_' + suffix
    } else {
      // Just one word
      name = Math.random() < 0.5
        ? PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
        : SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]
    }

    // Add random variation (x, XX, XD, etc.) sometimes
    if (Math.random() < 0.2) {
      const variations = ['x', 'xx', 'xX', 'XD', 'gg', 'YT', 'TTV', '420', '69']
      name += variations[Math.floor(Math.random() * variations.length)]
    }

    // If name already used, add number
    if (this.usedNames.has(name)) {
      name += Math.floor(Math.random() * 999)
    }

    this.usedNames.add(name)
    return name
  }

  /**
   * Convert text to leetspeak
   */
  private toLeetSpeak(text: string): string {
    let result = text.toLowerCase()
    
    // Only replace some letters randomly
    for (const [letter, replacement] of Object.entries(LEETSPEAK_REPLACEMENTS)) {
      if (Math.random() < 0.5) {
        result = result.replace(new RegExp(letter, 'g'), replacement)
      }
    }
    
    return result
  }

  /**
   * Reset used names
   */
  reset() {
    this.usedNames.clear()
  }
}
