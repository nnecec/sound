import { Track } from "./track"
import type { Tracks, TrackConfigs } from "./type"

export class Sonar extends EventTarget {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  #state: AudioContext["state"] = "closed"
  #audioContext?: AudioContext
  playbackRate = 1
  volume = 1

  constructor(trackConfigs: TrackConfigs) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
    this.buildMixedTracks()
    this.#audioContext = new AudioContext()
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
    if (this.#state === "closed") {
      this.#audioContext = new AudioContext()
      this.#state = this.#audioContext.state
      await this.prepare(this.#audioContext)
    }
    this.#audioContext?.resume()
  }

  pause() {
    this.#audioContext?.suspend()
  }

  stop() {
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
