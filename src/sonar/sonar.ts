import { Emitter } from "./emitter"
import { Track } from "./track"
import type { Tracks, TrackConfigs, Events } from "./type"
import { createCache } from "./utils"

export class Sonar extends Emitter<Events> {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state: "unloaded" | "loading" | "loaded" = "unloaded"
  preload = true
  #volume = 1
  rate = 1
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
  }

  async setup() {
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

  async play() {
    if (this.state === "unloaded") {
      await this.setup()
      this.state = "loaded"
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
    this.emit("stop")
    this.#clear()
  }

  #clear() {
    this.duration = 0
    this.all = new Map()
    this.playlist = new Map()
    this.state = "unloaded"
  }

  destroy() {
    this.audioContext.close()
    this.pause()
    this.#clear()
  }
}
