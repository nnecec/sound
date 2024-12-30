import type { TrackConfig } from "./type"
import { buildMediaElementFromUrl } from "./utils"

export class Track {
  audioBuffer?: AudioBuffer
  audio?: HTMLAudioElement
  startTime: number
  endTime: number = Number.MAX_SAFE_INTEGER
  duration?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume: number
  src?: string

  constructor(track: TrackConfig) {
    this.src = track.src
    this.startTime = track.startTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? 1
  }

  async prepare(audioContext: AudioContext) {
    if (this.src !== undefined) {
      const audio = buildMediaElementFromUrl(this.src)
      audio.currentTime = 0
      audio.volume = this.volume

      const source = audioContext.createMediaElementSource(audio)
      if (this.fadeInDuration || this.fadeOutDuration) {
        const gainNode = audioContext.createGain()

        if (this.fadeInDuration) {
          gainNode.gain.setValueAtTime(0, this.startTime)
          gainNode.gain.linearRampToValueAtTime(
            this.volume,
            this.startTime + this.fadeInDuration,
          )
        }
        // if (this.fadeOutDuration) {
        //   gainNode.gain.linearRampToValueAtTime(
        //     0,
        //     this.endTime - this.fadeOutDuration,
        //   )
        //   gainNode.gain.setValueAtTime(0, this.endTime)
        // }
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)
      } else {
        source.connect(audioContext.destination)
      }
      const delay = Math.max(0, this.startTime - audioContext.currentTime)
      const timer = setTimeout(() => {
        audio.play()
      }, delay * 1000)

      this.clear = () => {
        clearTimeout(timer)
        this.clear = undefined
      }
    }
  }

  clear?: () => void
}
