import type { TrackConfig } from "./type"
import { buildFadeInNode, buildMediaElementFromUrl } from "./utils"

export class Track {
  audioContext: AudioContext
  audioBuffer?: AudioBuffer
  audio?: HTMLAudioElement
  startTime: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number

  constructor(audioContext: AudioContext, track: TrackConfig) {
    this.audioContext = audioContext
    this.startTime = track.startTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.audio = buildMediaElementFromUrl(track.src)
  }

  async prepare() {
    // if (audioBuffer) {
    //   const source = audioContext.createBufferSource()
    //   source.buffer = audioBuffer
    //   source.connect(audioContext.destination)
    //   source.start(startTime)
    // }
    if (this.audio !== undefined) {
      const source = this.audioContext.createMediaElementSource(this.audio)
      if (this.fadeInDuration) {
        const gainNode = await buildFadeInNode(this.audioContext, {
          startTime: this.startTime,
          duration: this.fadeInDuration,
          startValue: 0,
          endValue: 1,
        })
        source.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
      } else {
        source.connect(this.audioContext.destination)
      }
      this.audio.currentTime = 0
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
