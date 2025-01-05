import type { Sonar } from "./sonar"

export class Track {
  audioBuffer?: AudioBuffer
  startTime: number
  endTime: number = Number.MAX_SAFE_INTEGER
  duration?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  timer?: number
  volume = 1
  src: string
  #rate = 1
  sonar: Sonar
  preload: boolean | "metadata" = true
  nodes?: Array<AudioBufferSourceNode | GainNode | null>

  constructor(track: Track, sonar: Sonar) {
    this.src = track.src
    this.startTime = track.startTime
    this.fadeInDuration = track.fadeInDuration
    this.fadeOutDuration = track.fadeOutDuration
    this.volume = track.volume ?? this.volume
    this.sonar = sonar
    this.preload = track.preload ?? sonar.preload
    if (this.preload === true) {
      this.load()
    }
  }

  async load() {
    if (this.sonar.cache.has(this.src)) {
      this.audioBuffer = this.sonar.cache.get(this.src)
      return
    }
    this.sonar.playlist.set(this.src, true)
    const response = await fetch(this.src)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer =
      await this.sonar.audioContext.decodeAudioData(arrayBuffer)
    this.sonar.cache.set(this.src, this.audioBuffer)
  }

  async setup() {
    if (!this.audioBuffer) {
      await this.load()
    }

    if (this.audioBuffer) {
      this.sonar.duration = Math.max(
        this.sonar.duration ?? 0,
        this.startTime + this.audioBuffer.duration,
      )
      const source = this.sonar.audioContext.createBufferSource()
      this.nodes = [source]
      source.buffer = this.audioBuffer
      source.playbackRate.value = this.#rate
      const startTime = this.sonar.audioContext.currentTime + this.startTime
      source.start(startTime, 0, this.audioBuffer.duration)

      const gainNode = this.sonar.audioContext.createGain()
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
        gainNode.connect(this.sonar.gainNode)
      } else {
        source.connect(this.sonar.gainNode)
      }

      const onEnded = () => {
        this.sonar.playlist.delete(this.src)
        source.removeEventListener("ended", onEnded)
        source.disconnect()
        gainNode.disconnect()
        if (this.sonar.playlist.size === 0) {
          this.sonar.emit("end")
        }
      }
      source.addEventListener("ended", onEnded)
    }
  }
  async clear() {
    if (this.nodes) {
      for (let n of this.nodes) {
        n?.disconnect()
        n = null
      }
      this.nodes = []
    }
  }
  set rate(rate: number) {
    this.#rate = rate
    if (this.nodes) {
      for (const n of this.nodes) {
        if (n instanceof AudioBufferSourceNode) {
          n.playbackRate.value = rate
        }
      }
    }
  }
  get rate() {
    return this.#rate
  }
}
