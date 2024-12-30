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
