import type { Sound } from './sound'
import { Lifecycle, Priority } from './type'

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
  #sound: Sound
  sourceNode?: AudioBufferSourceNode
  gainNode?: GainNode
  priority = Priority.Normal
  state = Lifecycle.unloaded

  constructor(track: Track, sound: Sound) {
    this.src = track.src
    this.startTime = track.startTime
    this.endTime = track.endTime
    this.duration = track.duration
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? this.volume
    this.#sound = sound
  }

  async load() {
    if (this.state === Lifecycle.loaded) {
      return
    }
    const response = await fetch(this.src)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer =
      await this.#sound.audioContext.decodeAudioData(arrayBuffer)
    this.state = Lifecycle.loaded
  }

  setup() {
    const offset = this.#sound.offset
    const originTime = this.#sound.originTime
    if (this.audioBuffer && this.state !== Lifecycle.mounted) {
      const source = this.#sound.audioContext.createBufferSource()
      this.sourceNode = source
      source.buffer = this.audioBuffer
      source.playbackRate.value = this.#rate
      const startTime = originTime + this.startTime
      if (this.startTime > offset) {
        source.start(startTime - offset, 0)
      } else {
        source.start(0, offset - this.startTime)
      }
      if (this === this.#sound.lastTrack) {
        source.addEventListener('ended', this.onEnd)
      }

      // gainNode
      const gainNode = this.#sound.audioContext.createGain()
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
        gainNode.connect(this.#sound.gainNode)
        this.state = Lifecycle.mounted
      } else {
        source.connect(this.#sound.gainNode)
      }
    }
  }

  onEnd = () => {
    this.#sound.emit('end')
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
  stop() {
    this.sourceNode?.stop?.()
    this.state = Lifecycle.unmounted
  }
}
