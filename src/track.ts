import type { Sound } from './sound'
import { Priority, State } from './type'

export class Track {
  #rate = 1
  #sound: Sound
  #audioBuffer?: AudioBuffer
  startTime: number
  endTime: number
  fadeInDuration?: number
  fadeOutDuration?: number
  volume = 1
  src: string
  #sourceNode?: AudioBufferSourceNode
  #gainNode?: GainNode
  priority = Priority.Normal
  loop?: boolean
  loading = false

  get duration() {
    return this.endTime - this.startTime
  }

  get loaded() {
    return this.#audioBuffer !== undefined
  }

  get rate() {
    return this.#rate
  }
  set rate(rate: number) {
    this.#rate = rate

    if (this.#sourceNode) {
      this.#sourceNode.playbackRate.value = rate
    }
  }
  get mounted() {
    return this.loaded && !!this.#sourceNode
  }

  get setupted() {
    return !!this.#sourceNode
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
    this.loop = track.loop
  }

  async load() {
    if (this.loaded) {
      return
    }
    this.loading = true
    const response = await fetch(this.src)
    const arrayBuffer = await response.arrayBuffer()
    this.#audioBuffer =
      await this.#sound.audioContext.decodeAudioData(arrayBuffer)
  }

  setup() {
    if (
      this.#audioBuffer &&
      this.loaded &&
      this.#sound.state === State.playing &&
      !this.mounted
    ) {
      const {
        audioContext,
        gainNode: soundGainNode,
        offsetTime,
        originTime,
        lastTrack,
      } = this.#sound

      if (offsetTime >= this.endTime) return

      const source = audioContext.createBufferSource()
      this.#sourceNode = source
      source.buffer = this.#audioBuffer
      source.playbackRate.value = this.#rate
      if (this.loop) {
        source.loop = true
        source.loopStart = this.startTime ?? 0
        source.loopEnd = this.endTime ?? this.duration
        source.start()
      } else {
        if (this.startTime > offsetTime && originTime + this.startTime > 0) {
          source.start((originTime + this.startTime) / this.rate, 0)
        } else {
          if (originTime >= 0) {
            source.start(0, offsetTime - this.startTime)
          } else {
            source.start(0, offsetTime - this.startTime - originTime)
          }
        }
        if (this === lastTrack && this.loaded) {
          source.addEventListener('ended', this.onEnd)
        }
      }
      // gainNode
      const gainNode = audioContext.createGain()
      this.#gainNode = gainNode

      if (this.fadeInDuration || this.fadeOutDuration) {
        // if (this.fadeInDuration) {
        //   gainNode.gain.setValueAtTime(0, startTime)
        //   gainNode.gain.linearRampToValueAtTime(
        //     this.volume,
        //     startTime + this.fadeInDuration,
        //   )
        // }
        // if (this.fadeOutDuration) {
        //   const fadeOutEndTime = startTime + this.duration
        //   gainNode.gain.linearRampToValueAtTime(
        //     this.volume,
        //     fadeOutEndTime - this.fadeOutDuration,
        //   )
        //   gainNode.gain.linearRampToValueAtTime(0, fadeOutEndTime)
        // }
        source.connect(gainNode)
        gainNode.connect(soundGainNode)
      } else {
        source.connect(soundGainNode)
      }
    }
  }

  onEnd = () => {
    if (this.#sound.state === State.playing) {
      this.#sound.emit('end')
      this.clear()
    }
  }

  clear() {
    this.#sourceNode?.disconnect()
    this.#gainNode?.disconnect()
    this.#sourceNode?.removeEventListener('ended', this.onEnd)
    this.#sourceNode = undefined
    this.#gainNode = undefined
  }

  stop() {
    this.#sourceNode?.stop?.()
    this.clear()
  }
}
