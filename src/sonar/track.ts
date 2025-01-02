import type { Sonar } from "./sonar"
import type { TrackConfig } from "./type"

export class Track {
  buffer?: ArrayBuffer
  startTime: number
  endTime: number = Number.MAX_SAFE_INTEGER
  duration?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume = 1
  src: string
  rate?: number = 1
  sonar: Sonar

  constructor(track: TrackConfig, sonar: Sonar) {
    this.src = track.src
    this.startTime = track.startTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? this.volume
    this.sonar = sonar
  }

  async setup({
    audioContext,
    gainNode: mainGainNode,
  }: { audioContext: AudioContext; gainNode: GainNode }) {
    const response = await fetch(this.src)
    this.buffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(this.buffer)
    this.sonar.duration = Math.max(
      this.sonar.duration ?? 0,
      this.startTime + audioBuffer.duration,
    )
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.start(this.startTime)

    if (this.fadeInDuration || this.fadeOutDuration) {
      const gainNode = audioContext.createGain()

      if (this.fadeInDuration) {
        gainNode.gain.setValueAtTime(0, this.startTime)
        gainNode.gain.linearRampToValueAtTime(
          this.volume,
          this.startTime + this.fadeInDuration,
        )
      }
      if (this.fadeOutDuration) {
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioBuffer.duration - this.fadeOutDuration,
        )
      }
      source.connect(gainNode)
      gainNode.connect(mainGainNode)
    } else {
      source.connect(mainGainNode)
    }
  }
}
