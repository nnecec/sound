import type { Track } from "./track"

export type TrackConfig = {
  src: string
  startTime: number
  fadeInDuration?: number
  fadeOutDuration?: number
  volume?: number
  endTime?: number
}

export type TrackConfigs = TrackConfig[]

export type Mixed = {
  nodes: AudioBuffer[]
}

export type Tracks = Track[]
