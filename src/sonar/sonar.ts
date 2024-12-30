import { Track } from "./track"
import type { Tracks, TrackConfigs, State } from "./type"

export class Sonar extends EventTarget {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  #state: State = "pending"
  #audioContext?: AudioContext
  playbackRate = 1

  static async create(trackConfigs: TrackConfigs) {
    const sonar = new Sonar(trackConfigs)
    sonar.buildMixedTracks()
    return sonar
  }

  constructor(trackConfigs: TrackConfigs) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
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

  buildMixedTracks() {
    for (const i in this.trackConfigs) {
      this.tracks[i] = new Track(this.trackConfigs[i])
    }
  }

  async prepare(audioContext: AudioContext) {
    for (const track of this.tracks) {
      await track.prepare(audioContext)
    }
  }

  async play() {
    if (this.#state === "pending" || this.#state === "ended") {
      this.#audioContext = new AudioContext()
      await this.prepare(this.#audioContext)
    }
    this.#state = "playing"
    this.#audioContext?.resume()
  }

  pause() {
    this.#state = "paused"
    this.#audioContext?.suspend()
  }

  stop() {
    this.#state = "ended"
    this.#audioContext?.close()
    this.#audioContext = undefined
    this.dispatchEvent(
      new CustomEvent("statechange", {
        detail: {
          state: "ended",
        },
      }),
    )
    this.#clear()
  }

  #clear() {
    for (const track of this.tracks) {
      track.clear?.()
    }
  }

  control(type: "playbackRate", value: number) {
    if (type === "playbackRate") {
      for (const track of this.tracks) {
        track.audio.playbackRate = value
      }
    }
  }
}
