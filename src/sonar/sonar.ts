import { Track } from "./track"
import type { Tracks, TrackConfigs } from "./type"

export class Sonar extends EventTarget {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext?: AudioContext
  gainNode?: GainNode
  rate = 1
  volume = 1
  duration = 0

  constructor(trackConfigs: TrackConfigs) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
    for (const i in this.trackConfigs) {
      this.tracks[i] = new Track(this.trackConfigs[i], this)
    }
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

  async setup({
    audioContext,
    gainNode,
  }: { audioContext: AudioContext; gainNode: GainNode }) {
    for (const track of this.tracks) {
      await track.setup({ audioContext, gainNode })
    }
  }

  async play() {
    if (!this.audioContext) {
      const audioContext = new AudioContext()
      this.audioContext = audioContext
      const gainNode = audioContext.createGain()
      this.gainNode = gainNode
      gainNode.gain.value = this.volume
      await this.setup({ audioContext, gainNode })
      gainNode.connect(audioContext.destination)
      audioContext.addEventListener("statechange", this.onStateChange)
    }
    this.audioContext.resume()
  }

  pause() {
    if (this.audioContext) {
      this.audioContext.suspend()
    }
  }

  stop() {
    this.removeEventListener("statechange", this.onStateChange)
    this.audioContext?.close()
    this.#clear()
  }

  onStateChange = () => {
    this.dispatchEvent(
      new CustomEvent("statechange", { detail: this.audioContext?.state }),
    )
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    }
  }

  #clear() {
    this.audioContext = undefined
    this.duration = 0
  }
}
