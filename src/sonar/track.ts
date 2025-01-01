import { Sonar } from "./sonar"
import type { TrackConfig } from "./type"
import { buildMediaElementFromUrl } from "./utils"

export class Track {
  audioBuffer?: AudioBuffer
  audio: HTMLAudioElement
  startTime: number
  endTime: number = Number.MAX_SAFE_INTEGER
  duration?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume: number
  src: string
  rate?: number = 1
  sonar: Sonar

  constructor(track: TrackConfig, sonar: Sonar) {
    this.src = track.src
    this.startTime = track.startTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? 1
    this.sonar = sonar
    this.audio = new Audio()
    this.audio.src = this.src
    this.audio.volume = this.volume * this.sonar.volume
    this.audio.addEventListener("canplaythrough", this.onload)
  }

  onload = () => {
    this.setup()
    this.audio.removeEventListener("canplaythrough", this.onload)
  }

  async setup() {
    this.audio.load()
    const audio = buildMediaElementFromUrl(this.src)
    audio.currentTime = 0
    audio.volume = this.volume

    const source = this.sonar.audioContext.createMediaElementSource(audio)
    if (this.fadeInDuration || this.fadeOutDuration) {
      const gainNode = this.sonar.audioContext.createGain()

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
      gainNode.connect(this.sonar.audioContext.destination)
    } else {
      source.connect(this.sonar.audioContext.destination)
    }
    const delay = Math.max(
      0,
      this.startTime - this.sonar.audioContext.currentTime,
    )
    this.play = () => {
      const timer = setTimeout(() => {
        audio.play()
      }, delay * 1000)

      this.clear = () => {
        clearTimeout(timer)
        this.clear = undefined
      }
    }
  }

  play?: () => void

  clear?: () => void
}
