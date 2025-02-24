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
  Low = 2, // 低优先级
  Normal = 3,
  High = 4, // 立即加载
}

export enum State {
  stopped = 0,
  loading = 1,
  playing = 2,
  paused = 3,
}
