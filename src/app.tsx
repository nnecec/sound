import { useEffect, useState } from 'react'
import { arrBufferList, bufferToWave, concatAudio, mergeAudio } from './utils'

function App() {
  const [concatAudioBuffer, setConcatAudioBuffer] = useState<AudioBuffer[]>()
  const [mergeAudioBuffer, setMergeAudioBuffer] = useState<AudioBuffer[]>()
  useEffect(() => {
    const bufferList = arrBufferList
    setConcatAudioBuffer(concatAudio(bufferList))
    setMergeAudioBuffer(mergeAudio(bufferList))
  }, [])

  return (
    <div>
      <h1 className='text-3xl font-bold underline'>Hello World</h1>
      <button type='button' className='btn'>
        Default
      </button>
      <audio
        src={
          concatAudioBuffer
            ? URL.createObjectURL(
                bufferToWave(concatAudioBuffer, concatAudioBuffer.length),
              )
            : undefined
        }
        controls
      />
      <audio
        src={
          mergeAudioBuffer
            ? URL.createObjectURL(
                bufferToWave(mergeAudioBuffer, mergeAudioBuffer.length),
              )
            : undefined
        }
        controls
      />
    </div>
  )
}

export default App
