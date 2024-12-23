import { mergeTracks } from "./merge"

export type Track = {
  src: string
  startPosition?: number
  fadeInEnd?: number
  fadeOutStart?: number
}
// 加载所有音轨到 AudioBuffer 中
export async function createArrayBuffer(src: string): Promise<ArrayBuffer> {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to load track: ${src}`)
  }
  return await response.arrayBuffer()
}

export async function createAudioBuffer(
  audioContext: AudioContext,
  arrayBuffers: ArrayBuffer[],
) {
  // 获取最长的音频长度，以确定 OfflineAudioContext 的长度
  let maxLength = 0
  const buffers = await Promise.all(
    arrayBuffers.map((arrayBuffer) =>
      audioContext.decodeAudioData(arrayBuffer),
    ),
  )
  for (const buffer of buffers) {
    maxLength = Math.max(maxLength, buffer.duration)
  }

  return
}

export function preview({
  audioContext,
  audioBuffer,
}: { audioContext: AudioContext; audioBuffer: AudioBuffer }) {
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.destination)
  return source
}
