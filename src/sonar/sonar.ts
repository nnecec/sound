import { Emitter, EventType } from "./emitter"
import { Track } from "./track"
import type { Tracks, TrackConfigs } from "./type"

export class Sonar<T extends Record<EventType, unknown>> extends Emitter<T> {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext?: AudioContext
  gainNode?: GainNode
  rate = 1
  duration = 0
  #volume = 1

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
  set volume(volume: number) {
    this.#volume = volume
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    }
  }
  get volume() {
    return this.#volume
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
      gainNode.gain.value = this.#volume
      await this.setup({ audioContext, gainNode })
      gainNode.connect(audioContext.destination)
    }
    this.audioContext.resume()
  }

  pause() {
    if (this.audioContext) {
      this.audioContext.suspend()
    }
  }

  stop() {
    this.audioContext?.close()
    this.#clear()
  }

  #clear() {
    this.audioContext = undefined
    this.duration = 0
  }
}
