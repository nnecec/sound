import type { TrackConfig } from "./type"
import { buildMediaElementFromUrl } from "./utils"

export class Track {
  audioContext: AudioContext
  audioBuffer?: AudioBuffer
  audio?: HTMLAudioElement
  startTime: number
  duration?: number
  endTime?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume: number

  constructor(audioContext: AudioContext, track: TrackConfig) {
    this.audioContext = audioContext
    this.startTime = track.startTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.audio = buildMediaElementFromUrl(track.src)
    this.volume = track.volume ?? 1
  }

  async prepare() {
    // if (audioBuffer) {
    //   const source = audioContext.createBufferSource()
    //   source.buffer = audioBuffer
    //   source.connect(audioContext.destination)
    //   source.start(startTime)
    // }
    if (this.audio !== undefined) {
      this.audio.currentTime = 0
      this.audio.volume = this.volume
      const source = this.audioContext.createMediaElementSource(this.audio)
      if (this.fadeInDuration) {
        const gainNode = this.audioContext.createGain()

        gainNode.gain.setValueAtTime(0, this.startTime)
        gainNode.gain.linearRampToValueAtTime(
          this.volume,
          this.startTime + this.fadeInDuration,
        )
        // TODO: fadeOut
        // gainNode.gain.linearRampToValueAtTime(
        //   0,
        //   this.startTime + this.fadeOutDuration,
        // )

        source.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
      } else {
        source.connect(this.audioContext.destination)
      }
      const delay = Math.max(0, this.startTime - this.audioContext.currentTime)
      const timer = setTimeout(() => {
        this.audio.play()
      }, delay * 1000)
      this.clear = () => {
        clearTimeout(timer)
        this.clear = undefined
      }
    }
  }

  clear?: () => void
}
