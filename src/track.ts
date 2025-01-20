import type { Sound } from './sound'
import { Lifecycle, Priority, State } from './type'

export class Track {
  #rate = 1
  #sound: Sound
  audioBuffer?: AudioBuffer
  startTime: number
  endTime: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume = 1
  src: string
  sourceNode?: AudioBufferSourceNode
  gainNode?: GainNode
  priority = Priority.Normal
  lifecycle = Lifecycle.unloaded

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

  constructor(track: Track, sound: Sound) {
    this.src = track.src
    this.startTime = track.startTime
    this.endTime = track.endTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? this.volume
    this.#sound = sound
    this.rate = sound.rate
  }

  async load() {
    if (this.lifecycle === Lifecycle.loaded) {
      return
    }
    const response = await fetch(this.src)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer =
      await this.#sound.audioContext.decodeAudioData(arrayBuffer)
    this.lifecycle = Lifecycle.loaded
  }

  setup() {
    if (
      this.audioBuffer &&
      this.lifecycle !== Lifecycle.mounted &&
      this.#sound.state === State.playing
    ) {
      const {
        audioContext,
        gainNode: soundGainNode,
        offsetTime,
        originTime,
        lastTrack,
      } = this.#sound
      const source = audioContext.createBufferSource()
      this.sourceNode = source
      source.buffer = this.audioBuffer
      source.playbackRate.value = this.#rate
      const startTime = originTime + this.startTime
      if (this.startTime > offsetTime) {
        source.start((startTime - offsetTime) / this.rate, 0)
      } else {
        source.start(0, offsetTime - this.startTime)
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
      this.lifecycle = Lifecycle.mounted
    }
  }

  onEnd = () => {
    if (this.#sound.state === State.playing) {
      this.#sound.emit('end')
      this.clear()
    }
  }

  clear() {
    this.sourceNode?.disconnect()
    this.gainNode?.disconnect()
    this.sourceNode?.removeEventListener('ended', this.onEnd)
    this.sourceNode = undefined
    this.gainNode = undefined
    this.lifecycle = Lifecycle.unmounted
  }

  stop() {
    this.sourceNode?.stop?.()
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
    if (this.fadeOutDuration) {
      const fadeOutEndTime = startTime + this.duration
      gainNode.gain.linearRampToValueAtTime(
        this.volume,
        fadeOutEndTime - this.fadeOutDuration,
      )
      gainNode.gain.linearRampToValueAtTime(0, fadeOutEndTime)
    }
  }
}
