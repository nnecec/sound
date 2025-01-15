import type { Track } from './track'

export type SonarConfig = {
  rate?: number
  volume?: number
}

export type TrackConfigs = Track[]

export type Mixed = {
  nodes: AudioBuffer[]
}

export type Tracks = Track[]

export type Events = {
  volume: number
  play: undefined
  pause: undefined
  stop: undefined
  end: undefined
  destroy: undefined
  load: undefined
  loaded: undefined
  loading: undefined
  rate: number
}

export enum Priority {
  Low = 1,
  Normal = 2,
  High = 3,
  Superhigh = 4,
}

export enum Lifecycle {
  unloaded = 0,
  loading = 1,
  loaded = 2,
  mounted = 3,
  unmounted = 4,
}
