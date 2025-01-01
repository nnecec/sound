import { Track } from "./track"
import type { Tracks, TrackConfigs } from "./type"

export class Sonar {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext: AudioContext
  rate = 1
  volume = 1

  constructor(trackConfigs: TrackConfigs) {
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
    this.audioContext = new AudioContext()
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

  setup() {
    for (const i in this.trackConfigs) {
      this.tracks[i] = new Track(this.trackConfigs[i], this)
    }
  }

  async play() {
    if (this.audioContext.state === "closed") {
      this.audioContext = new AudioContext()
    }
    this.audioContext.resume()
  }

  pause() {
    this.audioContext.suspend()
  }

  stop() {
    this.audioContext.close()
    this.#clear()
  }

  #clear() {
    for (const track of this.tracks) {
      track.clear?.()
    }
  }
}
