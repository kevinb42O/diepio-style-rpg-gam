/**
 * AudioManager - Ready for future sound implementation
 * Provides a complete audio system architecture without requiring actual audio files
 * Spark-compatible - no external dependencies
 */

export type AudioEvent = 
  | 'shoot'
  | 'hit'
  | 'kill'
  | 'levelUp'
  | 'upgrade'
  | 'polygonDeath'
  | 'playerDamage'
  | 'xpCollect'
  | 'itemCollect'
  | 'respawn'
  | 'classUpgrade'

interface AudioConfig {
  volume: number
  loop: boolean
  poolSize?: number
}

const DEFAULT_AUDIO_CONFIGS: Record<AudioEvent, AudioConfig> = {
  shoot: { volume: 0.3, loop: false, poolSize: 10 },
  hit: { volume: 0.4, loop: false, poolSize: 5 },
  kill: { volume: 0.5, loop: false },
  levelUp: { volume: 0.7, loop: false },
  upgrade: { volume: 0.6, loop: false },
  polygonDeath: { volume: 0.4, loop: false, poolSize: 5 },
  playerDamage: { volume: 0.5, loop: false },
  xpCollect: { volume: 0.2, loop: false, poolSize: 10 },
  itemCollect: { volume: 0.6, loop: false },
  respawn: { volume: 0.5, loop: false },
  classUpgrade: { volume: 0.8, loop: false },
}

export class AudioManager {
  private enabled: boolean = true
  private masterVolume: number = 1.0
  private audioContext: AudioContext | null = null
  private sounds: Map<AudioEvent, AudioConfig> = new Map()
  private lastPlayTime: Map<AudioEvent, number> = new Map()
  private minPlayInterval: number = 50 // Minimum ms between same sound plays

  constructor() {
    // Initialize with default configs
    for (const [event, config] of Object.entries(DEFAULT_AUDIO_CONFIGS)) {
      this.sounds.set(event as AudioEvent, config)
    }
  }

  /**
   * Initialize the audio context (call on first user interaction)
   */
  initialize(): void {
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      console.warn('Web Audio API not supported')
      return
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e)
    }
  }

  /**
   * Play a sound effect
   */
  play(event: AudioEvent, volumeMultiplier: number = 1.0): void {
    if (!this.enabled) return

    // Throttle rapid repeated sounds
    const now = Date.now()
    const lastPlay = this.lastPlayTime.get(event) || 0
    if (now - lastPlay < this.minPlayInterval) {
      return
    }
    this.lastPlayTime.set(event, now)

    const config = this.sounds.get(event)
    if (!config) return

    // When actual audio files are added, play them here
    // For now, this is a hook point ready for implementation
    this.triggerAudioEvent(event, config, volumeMultiplier)
  }

  /**
   * Internal method to trigger audio - ready for actual sound implementation
   */
  private triggerAudioEvent(event: AudioEvent, config: AudioConfig, volumeMultiplier: number): void {
    // This is where actual audio playback would be implemented
    // Example with Web Audio API:
    // if (this.audioContext && audioBuffer) {
    //   const source = this.audioContext.createBufferSource()
    //   const gainNode = this.audioContext.createGain()
    //   source.buffer = audioBuffer
    //   gainNode.gain.value = config.volume * volumeMultiplier * this.masterVolume
    //   source.connect(gainNode)
    //   gainNode.connect(this.audioContext.destination)
    //   source.start(0)
    // }

    // For debugging, can log when sounds would play
    if (process.env.NODE_ENV === 'development') {
      // console.log(`[Audio] ${event} - volume: ${config.volume * volumeMultiplier * this.masterVolume}`)
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Enable/disable all audio
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume
  }

  /**
   * Set volume for specific sound
   */
  setSoundVolume(event: AudioEvent, volume: number): void {
    const config = this.sounds.get(event)
    if (config) {
      config.volume = Math.max(0, Math.min(1, volume))
    }
  }

  /**
   * Resume audio context (needed for some browsers)
   */
  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager()
