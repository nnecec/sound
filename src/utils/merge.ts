import { createArrayBuffer, Track } from "."

export const mergeTracks = async (trackConfig: Track[]) => {
  const audioContext = new AudioContext()

  const audioBuffers = await Promise.all(
    trackConfig.map(async (track) => {
      const arrayBuffer = await createArrayBuffer(track.src)
      return audioContext.decodeAudioData(arrayBuffer)
    }),
  )
  let numberOfChannels = 2
  let maxLength = 0
  for (const buffer of audioBuffers) {
    maxLength = Math.max(maxLength, buffer.duration)
    numberOfChannels = Math.max(numberOfChannels, buffer.numberOfChannels)
  }
  const maxDuration = Math.max(
    ...audioBuffers.map((audioBuffer) => audioBuffer.duration),
  )
  // 最大通道数
  const maxChannelNumber = Math.max(
    ...audioBuffers.map((audioBuffer) => audioBuffer.numberOfChannels),
  )
  const sources: AudioBufferSourceNode[] = []

  const offlineContext = new OfflineAudioContext({
    numberOfChannels: maxChannelNumber,
    length: Math.ceil(maxDuration * audioContext.sampleRate),
    sampleRate: audioContext.sampleRate,
  })

  // Schedule each track to play at its specified start position
  audioBuffers.forEach((buffer, index) => {
    const source = offlineContext.createBufferSource()
    source.buffer = buffer
    const startPosition = trackConfig[index].startPosition || 0
    source.start(startPosition)
    source.connect(offlineContext.destination)
    sources.push(source)
  })

  // Render the offline context to a buffer
  const renderedBuffer = await offlineContext.startRendering()

  // Create a blob and return a URL for it
  const wavBlob = await new Promise<Blob>((resolve) => {
    offlineContext.oncomplete = (event) => {
      resolve(new Blob([event.renderedBuffer], { type: "audio/wav" }))
    }
  })

  return URL.createObjectURL(wavBlob)
}
