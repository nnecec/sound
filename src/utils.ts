import type { Track } from './track'
import { Priority } from './type'

/** 0 ===== track.startTime ======= offsetTime ======= offsetTime+preloadBefore ======== track.endTime ====== offsetTime+pendingAfter ====== */

export function getPriority(
  track: Track,
  offsetTime: number,
  { preloadBefore, pendingAfter },
): Priority {
  pendingAfter = pendingAfter > preloadBefore ? pendingAfter : preloadBefore

  if (offsetTime >= track.startTime && offsetTime <= track.endTime) {
    return Priority.High
  }

  if (
    offsetTime + preloadBefore > track.startTime &&
    track.startTime <= offsetTime + pendingAfter
  ) {
    return Priority.Normal
  }

  if (offsetTime + pendingAfter < track.startTime) {
    return Priority.Pending
  }

  if (offsetTime < track.startTime) {
    return Priority.None
  }

  return Priority.Low
}
