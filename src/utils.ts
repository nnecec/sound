import type { Track } from './track'

export function shouldLoad(
  track: Track,
  offsetTime: number,
  nearbyTime = 15,
): boolean {
  if (offsetTime >= track.startTime && offsetTime < track.endTime) {
    return true
  }
  if (
    offsetTime < track.startTime &&
    offsetTime + nearbyTime >= track.startTime
  ) {
    return true
  }

  return false
}
