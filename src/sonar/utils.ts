import type { Tracks } from "./type"

export async function buildAudioBufferFromUrl(
  src: string,
): Promise<AudioBuffer> {
  const audioContext = new AudioContext()
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to load track: ${src}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return await audioContext.decodeAudioData(arrayBuffer)
}

export function buildMediaElementFromUrl(src: string): HTMLMediaElement {
  const audio = new Audio(src)
  return audio
}

/**
 * TODO
 *
 * @param stream
 * @returns
 */
export async function buildMediaStreamSourceFromStream(
  stream: MediaStream,
): Promise<MediaStreamAudioSourceNode> {
  const audioContext = new AudioContext()
  const mediaStreamSource = audioContext.createMediaStreamSource(stream)
  return mediaStreamSource
}

export async function buildFadeInNode(
  audioContext: AudioContext,
  {
    startTime,
    duration,
    startValue,
    endValue,
  }: {
    startTime: number
    duration: number
    startValue: number
    endValue: number
  },
) {
  const gainNode = audioContext.createGain()
  gainNode.gain.setValueAtTime(startValue, startTime)
  gainNode.gain.linearRampToValueAtTime(endValue, startTime + duration)
  return gainNode
}

export async function prepare(mixed: Tracks) {
  for (const track of mixed) {
    await track.prepare()
  }
}

export function clear(mixed: Tracks) {
  for (const track of mixed) {
    track.clear?.()
  }
}
