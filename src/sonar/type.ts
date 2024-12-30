import type { Track } from "./track"

export type TrackConfig = {
  src: string
  startTime: number
  endTime?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  volume?: number
}

export type TrackConfigs = TrackConfig[]

export type Mixed = {
  nodes: AudioBuffer[]
}

export type Tracks = Track[]

export type State = "pending" | "playing" | "paused" | "ended"
