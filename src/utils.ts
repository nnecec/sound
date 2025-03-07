import type { Track } from './track'
import { Priority } from './type'

/** 0 ===== track.startTime ======= offsetTime ======= offsetTime+preloadBefore ======== track.endTime ====== offsetTime+pendingAfter ====== */

export function getPriority(
  track: Track,
  currentTime: number,
  { preloadBefore, pendingAfter },
): Priority {
  pendingAfter = pendingAfter > preloadBefore ? pendingAfter : preloadBefore

  if (currentTime >= track.startTime && currentTime <= track.endTime) {
    return Priority.High
  }

  if (
    currentTime + preloadBefore > track.startTime &&
    track.startTime <= currentTime + pendingAfter
  ) {
    return Priority.Normal
  }

  if (currentTime + pendingAfter < track.startTime) {
    return Priority.Pending
  }

  if (currentTime < track.startTime) {
    return Priority.None
  }

  return Priority.Low
}

export function prepare(track: Track, currentTime: number) {
  if (track.loaded) {
    return false
  }
  if (currentTime >= track.startTime && currentTime <= track.endTime) {
    return true
  }
  if (track.startTime <= currentTime + 20) {
    return true
  }
  return false
}
