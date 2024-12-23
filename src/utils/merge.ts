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

  // Determine the duration of the longest track plus any start positions
  const totalDuration = audioBuffers.reduce((total, buffer, index) => {
    const startPosition = trackConfig[index].startPosition || 0
    return Math.max(total, startPosition + buffer.duration)
  }, 0)

  // 2. 创建一个新的 AudioBuffer 来存储混合后的音轨
  const sampleRate = audioContext.sampleRate
  const mergedBuffer = audioContext.createBuffer(
    2,
    totalDuration * sampleRate,
    sampleRate,
  )

  // 3. 将每个音轨的数据混合到目标 AudioBuffer 中
  for (const config of trackConfig) {
    const audioBuffer = audioBuffers.shift()!

    const startPosition = config.startPosition || 0 // 默认为 0

    const fadeInEnd = config.fadeInEnd
      ? config.fadeInEnd + startPosition
      : undefined
    const fadeInDuration = config.fadeInEnd ?? 0 // 渐入持续时间

    const fadeOutStart = config.fadeOutStart
      ? config.fadeOutStart >= 0
        ? config.fadeOutStart + startPosition
        : audioBuffer.duration + config.fadeOutStart + startPosition
      : undefined
    const fadeOutDuration = config.fadeOutStart
      ? config.fadeOutStart >= 0
        ? audioBuffer.duration - config.fadeOutStart // 渐出持续时间
        : Math.abs(config.fadeOutStart)
      : 0

    const delaySamples = startPosition * sampleRate // 转换为样本数
    const fadeInEndSample = fadeInEnd ? fadeInEnd * sampleRate : undefined
    const fadeOutStartSample = fadeOutStart
      ? fadeOutStart * sampleRate
      : undefined

    // 混合音轨数据
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel)
      const targetData = mergedBuffer.getChannelData(channel)

      for (let i = 0; i < audioBuffer.length; i++) {
        const current = delaySamples + i

        if (current < targetData.length) {
          // 计算渐入效果
          let fadeInFactor = 1
          if (
            fadeInEndSample &&
            current < fadeInEndSample &&
            current > delaySamples
          ) {
            fadeInFactor =
              (current - delaySamples) / (fadeInDuration * sampleRate)
          }

          // 计算渐出效果
          let fadeOutFactor = 1
          if (fadeOutStartSample && current >= fadeOutStartSample) {
            fadeOutFactor =
              1 -
              (current - fadeOutStartSample) / (fadeOutDuration * sampleRate)
          }

          // 混合音轨并应用渐变效果
          targetData[current] += sourceData[i] * fadeInFactor * fadeOutFactor
        }
      }
    }
  }

  return mergedBuffer
}
