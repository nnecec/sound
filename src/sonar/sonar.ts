import { Track } from "./track"
import type { Tracks, TrackConfigs } from "./type"

export class Sonar extends EventTarget {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext = new AudioContext()

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
      this.tracks[i] = new Track(this.audioContext, this.trackConfigs[i])
    }
  }

  async prepare() {
    for (const track of this.tracks) {
      await track.prepare()
    }
  }

  async play() {
    await this.prepare()
    this.audioContext.resume()
  }

  stop() {
    this.dispatchEvent(
      new CustomEvent("statechange", {
        detail: {
          state: "ended",
        },
      }),
    )
    this.audioContext.close()
    this.clear()
  }

  clear() {
    for (const track of this.tracks) {
      track.clear?.()
    }
  }

  pause() {
    this.audioContext.suspend()
  }
}
