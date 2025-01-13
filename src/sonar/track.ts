import { add, ceil } from 'mathjs'
import type { Sonar } from './sonar'

export class Track {
  audioBuffer?: AudioBuffer
  startTime: number
  endTime: number
  duration?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume = 1
  src: string
  #rate = 1
  #sonar: Sonar
  preload?: boolean | 'metadata' = true
  sourceNode?: AudioBufferSourceNode
  gainNode?: GainNode

  constructor(track: Track, sonar: Sonar) {
    this.src = track.src
    this.startTime = track.startTime
    this.endTime = track.endTime
    this.duration = track.duration
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? this.volume
    this.#sonar = sonar
    this.preload = track.preload ?? sonar.preload
    if (this.preload === true) {
      this.load()
    }
  }

  async load() {
    if (this.#sonar.cache.has(this.src)) {
      this.audioBuffer = this.#sonar.cache.get(this.src)
      return
    }

    const response = await fetch(this.src)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer =
      await this.#sonar.audioContext.decodeAudioData(arrayBuffer)
    this.#sonar.cache.set(this.src, this.audioBuffer)
    const endTime = add(this.startTime, ceil(this.audioBuffer.duration, 2))
    if (endTime > this.#sonar.duration) {
      this.#sonar.duration = endTime
      this.#sonar.lastTrack = this
    }
  }

  async setup() {
    const offset = this.#sonar.offset
    if (!this.audioBuffer) {
      await this.load()
    }

    if (this.audioBuffer) {
      const source = this.#sonar.audioContext.createBufferSource()
      this.sourceNode = source
      source.buffer = this.audioBuffer
      source.playbackRate.value = this.#rate
      const startTime = this.#sonar.originTime + this.startTime
      if (this.startTime > offset) {
        source.start(startTime - offset, 0)
      } else {
        source.start(0, offset - this.startTime)
      }
      if (this === this.#sonar.lastTrack) {
        source.addEventListener('ended', this.onEnd)
      }

      // gainNode
      const gainNode = this.#sonar.audioContext.createGain()
      this.gainNode = gainNode
      if (this.fadeInDuration || this.fadeOutDuration) {
        if (this.fadeInDuration) {
          gainNode.gain.setValueAtTime(0, startTime)
          gainNode.gain.linearRampToValueAtTime(
            this.volume,
            startTime + this.fadeInDuration,
          )
        }
        if (this.fadeOutDuration) {
          gainNode.gain.linearRampToValueAtTime(
            1,
            startTime + this.audioBuffer.duration - this.fadeOutDuration,
          )
          gainNode.gain.linearRampToValueAtTime(
            0,
            startTime + this.audioBuffer.duration,
          )
        }

        source.connect(gainNode)
        gainNode.connect(this.#sonar.gainNode)
      } else {
        source.connect(this.#sonar.gainNode)
      }
    }
  }

  onEnd = () => {
    this.#sonar.emit('end')
    this.clear()
  }

  async clear() {
    this.sourceNode?.disconnect()
    this.gainNode?.disconnect()
    this.sourceNode?.removeEventListener('ended', this.onEnd)
    this.sourceNode = undefined
    this.gainNode = undefined
  }
  set rate(rate: number) {
    this.#rate = rate

    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = rate
    }
  }
  get rate() {
    return this.#rate
  }
}
