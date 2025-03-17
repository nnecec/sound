import type { Sound } from './sound'
import { Priority, State } from './type'

export class Track {
  #rate = 1
  #sound: Sound
  audioBuffer?: AudioBuffer
  startTime: number
  endTime: number
  fadeInDuration?: number
  fadeOutDuration?: number
  volume = 1
  src: string
  sourceNode?: AudioBufferSourceNode
  gainNode?: GainNode
  priority = Priority.Normal
  loop = false

  get duration() {
    return this.endTime - this.startTime
  }

  get rate() {
    return this.#rate
  }
  set rate(rate: number) {
    this.#rate = rate

    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = rate
    }
  }

  get loaded() {
    if (this.audioBuffer) {
      return true
    }
    return false
  }

  get mounted() {
    if (this.audioBuffer && this.sourceNode) {
      return true
    }
    return false
  }

  constructor(track: Track, sound: Sound) {
    this.src = track.src
    this.startTime = track.startTime
    this.endTime = track.endTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? this.volume
    this.#sound = sound
    this.rate = sound.rate
    this.loop = track.loop ?? this.loop
  }

  async load() {
    if (this.loaded) {
      return
    }
    const response = await fetch(this.src)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer =
      await this.#sound.audioContext.decodeAudioData(arrayBuffer)
  }

  setup() {
    if (this.loaded && !this.mounted && this.audioBuffer) {
      const {
        audioContext,
        gainNode: soundGainNode,
        originTime,
        currentTime,
        lastTrack,
      } = this.#sound
      const source = audioContext.createBufferSource()
      this.sourceNode = source
      source.buffer = this.audioBuffer
      source.playbackRate.value = this.#rate
      if (this.loop) {
        source.loop = this.loop
        source.loopStart = this.startTime ? originTime + this.startTime : 0
        source.loopEnd = this.endTime
          ? originTime + this.endTime
          : this.#sound.duration
        source.start()
        source.connect(soundGainNode)
      } else {
        const startTime = originTime + this.startTime

        if (this.startTime > currentTime) {
          source.start((startTime - currentTime) / this.rate, 0)
        } else {
          source.start(0, currentTime - this.startTime)
        }

        if (this === lastTrack) {
          source.addEventListener('ended', this.onEnd)
        }

        // gainNode
        const gainNode = audioContext.createGain()
        this.gainNode = gainNode

        if (this.fadeInDuration || this.fadeOutDuration) {
          this.#fade(gainNode, startTime)
          source.connect(gainNode)
          gainNode.connect(soundGainNode)
        } else {
          source.connect(soundGainNode)
        }
      }
    }
  }

  onEnd = () => {
    if (this.#sound.state === State.Play) {
      this.#sound.emit('state', State.End)
      this.clear()
    }
  }

  clear() {
    this.sourceNode?.disconnect()
    this.gainNode?.disconnect()
    this.sourceNode?.removeEventListener('ended', this.onEnd.bind(this))
    this.sourceNode = undefined
    this.gainNode = undefined
  }

  stop() {
    this.sourceNode?.stop?.(0)
    this.clear()
  }

  #fade(gainNode: GainNode, startTime: number) {
    if (this.fadeInDuration) {
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(
        this.volume,
        startTime + this.fadeInDuration,
      )
    }
    if (this.fadeOutDuration && this.duration) {
      const fadeOutEndTime = startTime + this.duration
      gainNode.gain.linearRampToValueAtTime(
        this.volume,
        fadeOutEndTime - this.fadeOutDuration,
      )
      gainNode.gain.linearRampToValueAtTime(0, fadeOutEndTime)
    }
  }
}
