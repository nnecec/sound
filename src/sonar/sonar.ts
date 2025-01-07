import { Emitter } from "./emitter"
import { Track } from "./track"
import type { Tracks, TrackConfigs, Events, SonarConfig } from "./type"
import { createCache } from "./utils"

export class Sonar extends Emitter<Events> {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state: "unmounted" | "mounted" = "unmounted"
  preload = true
  #volume = 1
  #rate = 1
  cache = createCache()
  lastTrack: Track | null = null
  originTime = 0
  duration = 0
  offset = 0

  constructor(trackConfigs: TrackConfigs, sonarConfig?: SonarConfig) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
    this.gainNode = this.audioContext.createGain()
    this.initialize(sonarConfig)
  }

  validateTrackConfigs(trackConfigs: TrackConfigs) {
    for (const track of trackConfigs) {
      if (!track.src) {
        throw new Error(
          `Something is wrong in ${JSON.stringify(track)}: src is required`,
        )
      }
    }
  }

  initialize(sonarConfig?: SonarConfig) {
    this.tracks = this.trackConfigs.map((track) => {
      return new Track(track, this)
    })
    this.#volume = sonarConfig?.volume ?? this.#volume
    this.gainNode.gain.value = this.#volume
    this.rate = sonarConfig?.rate ?? this.#rate
    this.on("end", () => {
      this.audioContext.suspend()
      this.#reset()
    })
  }

  async setup(offset = 0) {
    this.originTime = this.audioContext.currentTime
    await Promise.all(this.tracks.map((track) => track.setup(offset)))
  }

  set volume(volume: number) {
    this.#volume = volume
    this.gainNode.gain.value = volume
    this.emit("volume", volume)
  }

  get volume() {
    return this.#volume
  }

  set rate(rate: number) {
    this.#rate = rate
    for (const track of this.tracks) {
      track.rate = rate
    }
    this.emit("rate", rate)
  }

  get rate() {
    return this.#rate
  }

  async play() {
    if (this.state === "unmounted") {
      await this.setup(this.offset)
      this.state = "mounted"
      this.gainNode.connect(this.audioContext.destination)
    }
    this.emit("play")
    this.audioContext.resume()
  }

  pause() {
    if (this.audioContext) {
      this.audioContext.suspend()
      this.emit("pause")
    }
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.suspend()
      this.emit("stop")
      this.#reset()
    }
  }

  async seek(time: number) {
    if (this.audioContext) {
      let needResume = false
      if (this.audioContext.state === "running") {
        this.audioContext.suspend()
        needResume = true
      }
      this.#reset()
      this.setup(time)
      if (needResume) this.audioContext.resume()
      this.offset = time
    }
  }

  #reset() {
    for (const track of this.tracks) {
      track.clear()
    }
    this.state = "unmounted"
    this.offset = 0
  }

  get currentTime() {
    return this.audioContext.currentTime - this.originTime + this.offset
  }

  destroy() {
    this.#reset()
    this.all = new Map()
    this.duration = 0
    this.audioContext.close()
    this.emit("destroy")
  }
}
