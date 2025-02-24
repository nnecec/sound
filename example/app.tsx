'use client'

import { useInterval } from '@reactuses/core'
import { useEffect, useState } from 'react'
import { Sound } from '../src'
import { tracks } from './data'

const sound = new Sound(tracks)
function App() {
  const [interval, setInterval] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

  useInterval(() => {
    // console.log(sound.currentTime , sound.duration);

    setProgress(sound.currentTime / sound.duration)
  }, interval)

  useEffect(() => {
    const onPlay = () => {
      setInterval(1000)
    }
    const onPause = () => {
      setInterval(null)
    }
    const onEnd = () => {
      setInterval(null)
      setProgress(0)
    }
    const onStop = () => {
      setInterval(null)
      setProgress(0)
    }

    sound.on('play', onPlay)
    sound.on('pause', onPause)
    sound.on('stop', onStop)
    sound.on('end', onEnd)
    return () => {
      sound.off('play', onPlay)
      sound.off('pause', onPause)
      sound.off('stop', onStop)
      sound.off('end', onEnd)
    }
  }, [sound])

  const isPlaying = !!interval

  return (
    <div className="container py-10 mx-auto ">
      <div className="flex gap-3">
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (isPlaying) {
              sound.pause()
            } else {
              sound.play()
            }
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            sound.stop()
          }}
        >
          Stop
        </button>
      </div>

      <div>
        <label className="label w-full" htmlFor="volume">
          音量
        </label>
        <input
          id="volume"
          type="range"
          min={0}
          max={100}
          step={1}
          className="range w-full"
          onChange={(e) => {
            sound.volume = Number(e.target.value) / 100
          }}
          defaultValue={sound.volume * 100}
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      <div>
        <label className="label w-full" htmlFor="rate">
          速度
        </label>
        <input
          id="rate"
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          className="range w-full"
          defaultValue={1}
          onMouseUp={(e) => {
            sound.rate = Number(e.target.value)
          }}
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>0.5</span>
          <span>2</span>
        </div>
      </div>

      <div>
        <label className="label w-full" htmlFor="progress">
          进度
        </label>
        <input
          id="progress"
          type="range"
          min={0}
          max={100}
          step={0.1}
          className="range w-full"
          value={progress * 100}
          onChange={(e) => {
            setProgress(Number(e.target.value) / 100)
          }}
          onMouseUp={async (e) => {
            sound.seek((Number(e.currentTarget.value) / 100) * sound.duration) // 切到多少秒
          }}
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>0</span>
          <span>{sound.duration}</span>
        </div>
      </div>
    </div>
  )
}

export default App
