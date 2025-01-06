import { Emitter } from "./emitter"
import { Track } from "./track"
import type { Tracks, TrackConfigs, Events } from "./type"
import { createCache } from "./utils"

export class Sonar extends Emitter<Events> {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state: "unmounted" | "mounted" = "unmounted"
  preload = true
  currentTime = 0
  #volume = 1
  #rate = 1
  duration = 0
  cache = createCache()
  playlist = new Map()

  constructor(trackConfigs: TrackConfigs) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
    this.gainNode = this.audioContext.createGain()
    this.initialize()
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

  initialize() {
    this.tracks = this.trackConfigs.map((track) => {
      return new Track(track, this)
    })
    this.gainNode.gain.value = this.#volume
    this.on("end", () => {
      console.log("internal end")
      this.audioContext.suspend()
      this.#clear()
    })
  }

  async setup() {
    this.currentTime = this.audioContext.currentTime
    await Promise.all(this.tracks.map((track) => track.setup()))
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
      await this.setup()
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
      this.#clear()
    }
  }

  async seek(time: number) {
    if (this.audioContext) {
      this.audioContext.suspend()
      this.#clear()
      this.currentTime = this.audioContext.currentTime
      await Promise.all(this.tracks.map((track) => track.setup(time)))
      this.audioContext.resume()
    }
  }

  #clear() {
    for (const track of this.tracks) {
      track.clear()
    }
    this.playlist = new Map()
    this.state = "unmounted"
  }

  destroy() {
    this.#clear()
    this.all = new Map()
    this.duration = 0
    this.audioContext.close()
    this.emit("destroy")
  }
}
