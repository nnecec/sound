import type { Track } from './track'
import { Priority } from './type'

export function getPriority(
  track: Track,
  offsetTime: number,
  nearbyTime = 15,
): Priority {
  if (offsetTime >= track.startTime && offsetTime <= track.endTime) {
    return Priority.Superhigh
  }
  if (
    offsetTime < track.startTime &&
    offsetTime + nearbyTime >= track.startTime
  ) {
    // 临近的 Tracks 具有偏高的优先级
    return Priority.High
  }
  if (offsetTime + nearbyTime < track.startTime) {
    return Priority.Normal
  }
  return Priority.Low
}
