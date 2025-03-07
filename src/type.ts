import type { Track } from './track'

export type SoundConfig = {
  rate?: number
  volume?: number
}

export type TracksConfig = Track[]

export type Mixed = {
  nodes: AudioBuffer[]
}

export type Tracks = Track[]

export type Events = {
  volume: number
  state: State
  rate: number
  play: undefined
  pause: undefined
  stop: undefined
}

export enum Priority {
  None = 0, // 不用加载
  Pending = 1, // 等待加载
  Low = 2, // 低优先级
  Normal = 3,
  High = 4, // 立即加载
}

export enum State {
  stop = 0,
  loading = 1,
  play = 2,
  pause = 3,
  end = 4,
  destroy = 5,
}
