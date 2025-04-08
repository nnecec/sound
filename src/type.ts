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

export enum State {
  stopped = 0,
  playing = 1,
  paused = 2,
}
