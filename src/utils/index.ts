// 合并音频的方法
export const mergeAudio = (arrBufferList) => {
  // 获得 AudioBuffer
  const audioBufferList = arrBufferList
  // 最大播放时长
  const maxDuration = Math.max(
    ...audioBufferList.map((audioBuffer) => audioBuffer.duration),
  )
  // 最大通道数
  const maxChannelNumber = Math.max(
    ...audioBufferList.map((audioBuffer) => audioBuffer.numberOfChannels),
  )
  // 创建一个新的 AudioBuffer
  const newAudioBuffer = audioContext.createBuffer(
    maxChannelNumber,
    audioBufferList[0].sampleRate * maxDuration,
    audioBufferList[0].sampleRate,
  )
  // 将所有的 AudioBuffer 的数据合并到新的 AudioBuffer 中
  audioBufferList.forEach((audioBuffer, index) => {
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const outputData = newAudioBuffer.getChannelData(channel)
      const bufferData = audioBuffer.getChannelData(channel)

      for (
        let i = audioBuffer.getChannelData(channel).length - 1;
        i >= 0;
        i--
      ) {
        outputData[i] += bufferData[i]
      }

      newAudioBuffer.getChannelData(channel).set(outputData)
    }
  })

  return newAudioBuffer
}
// 拼接音频的方法
export const concatAudio = (arrBufferList) => {
  // 获得 AudioBuffer
  const audioBufferList = arrBufferList
  // 最大通道数
  const maxChannelNumber = Math.max(
    ...audioBufferList.map((audioBuffer) => audioBuffer.numberOfChannels),
  )
  // 总长度
  const totalLength = audioBufferList
    .map((buffer) => buffer.length)
    .reduce((lenA, lenB) => lenA + lenB, 0)

  // 创建一个新的 AudioBuffer
  const newAudioBuffer = audioContext.createBuffer(
    maxChannelNumber,
    totalLength,
    audioBufferList[0].sampleRate,
  )
  // 将所有的 AudioBuffer 的数据拷贝到新的 AudioBuffer 中
  let offset = 0

  audioBufferList.forEach((audioBuffer, index) => {
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      newAudioBuffer
        .getChannelData(channel)
        .set(audioBuffer.getChannelData(channel), offset)
    }

    offset += audioBuffer.length
  })

  return newAudioBuffer
}

// AudioContext
const audioContext = new AudioContext()
// 基于src地址获得 AudioBuffer 的方法
const getAudioBuffer = (src) => {
  return new Promise((resolve, reject) => {
    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        audioContext.decodeAudioData(arrayBuffer).then((buffer) => {
          resolve(buffer)
        })
      })
  })
}

const audioSrc = [
  "/assets/level-up-191997.mp3",
  "/assets/mouse-click-198485.mp3",
  "/assets/relaxing-guitar-loop-v5-245859.mp3",
  "/assets/typing-keyboard-sound-254462.mp3",
]

export const arrBufferList = await Promise.all(
  audioSrc.map((src) => getAudioBuffer(src)),
)

export function bufferToWave(abuffer, len) {
  var numOfChan = abuffer.numberOfChannels,
    length = len * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [],
    i,
    sample,
    offset = 0,
    pos = 0

  // write WAVE header
  // "RIFF"
  setUint32(0x46464952)
  // file length - 8
  setUint32(length - 8)
  // "WAVE"
  setUint32(0x45564157)
  // "fmt " chunk
  setUint32(0x20746d66)
  // length = 16
  setUint32(16)
  // PCM (uncompressed)
  setUint16(1)
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  // avg. bytes/sec
  setUint32(abuffer.sampleRate * 2 * numOfChan)
  // block-align
  setUint16(numOfChan * 2)
  // 16-bit (hardcoded in this demo)
  setUint16(16)
  // "data" - chunk
  setUint32(0x61746164)
  // chunk length
  setUint32(length - pos - 4)

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i))

  while (pos < length) {
    // interleave channels
    for (i = 0; i < numOfChan; i++) {
      // clamp
      sample = Math.max(-1, Math.min(1, channels[i][offset]))
      // scale to 16-bit signed int
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      // write 16-bit sample
      view.setInt16(pos, sample, true)
      pos += 2
    }
    // next source sample
    offset++
  }

  // create Blob
  return new Blob([buffer], { type: "audio/wav" })

  function setUint16(data) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data) {
    view.setUint32(pos, data, true)
    pos += 4
  }
}
