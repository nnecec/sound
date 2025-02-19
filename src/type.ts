import type { Track } from './track'

export type SoundConfig = {
  rate?: number
  volume?: number
  scheduleOptions?: {
    preloadBefore?: number
    pendingAfter?: number
    concurrency?: number
  }
}

export type TracksConfig = Track[]

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
  None = 0, // 不用加载
  Pending = 1, // 等待加载
  Low = 2,
  Normal = 3,
  High = 4, // 立即加载
}

export enum Lifecycle {
  unloaded = 0,
  loading = 1,
  loaded = 2,
  mounted = 3,
  unmounted = 4,
}

export enum State {
  stopped = 0,
  playing = 1,
  paused = 2,
}
