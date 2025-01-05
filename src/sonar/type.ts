import type { Track } from "./track"

export type SonarConfig = {
  playbackRate?: number
}

export type TrackConfigs = Track[]

export type Mixed = {
  nodes: AudioBuffer[]
}

export type Tracks = Track[]

export type Events = {
  progress: number
  volume: number
  play: undefined
  pause: undefined
  stop: undefined
  end: undefined
  destroy: undefined
  loaded: undefined
  loading: undefined
  rate: number
}
