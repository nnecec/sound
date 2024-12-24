import { Track } from "./track"
import type { Tracks, TrackConfigs } from "./type"
import { prepare, clear } from "./utils"

export class Sonar {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext = new AudioContext()

  static async create(trackConfigs: TrackConfigs) {
    const sonar = new Sonar(trackConfigs)
    await sonar.buildMixedTracks()
    return sonar
  }

  constructor(trackConfigs: TrackConfigs) {
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

  async buildMixedTracks() {
    for (const i in this.trackConfigs) {
      this.tracks[i] = new Track(this.audioContext, this.trackConfigs[i])
    }
  }

  async prepare() {
    prepare(this.tracks)
  }

  async play() {
    await this.prepare()
    this.audioContext.resume()
  }

  stop() {
    this.audioContext.close()
    this.clear()
  }

  clear() {
    clear(this.tracks)
  }

  pause() {
    this.audioContext.suspend()
  }

  onEnded?: () => void
}
