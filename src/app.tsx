"use client"

import { Sonar } from "./sonar"
import { useEffect, useState } from "react"
import { useInterval } from "@reactuses/core"
import { tracks } from "./utils/data"

const sonar = new Sonar(tracks)
function App() {
  const [interval, setInterval] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [duration, setDuration] = useState(0)

  useInterval(() => {
    setCount(count + 1)
  }, interval)

  useEffect(() => {
    const onPlay = () => {
      console.log("play")
      setInterval(1000)
      setDuration(sonar.duration)
    }
    const onPause = () => {
      setInterval(null)
    }
    const onEnd = () => {
      setInterval(null)
      setCount(0)
    }
    const onStop = () => {
      setInterval(null)
      setCount(0)
    }

    const onProgress = (progress: number) => {
      console.log("progress", progress)
    }

    sonar.on("play", onPlay)
    sonar.on("pause", onPause)
    sonar.on("stop", onStop)
    sonar.on("end", onEnd)
    sonar.on("progress", onProgress)
    return () => {
      sonar.off("play", onPlay)
      sonar.off("pause", onPause)
      sonar.off("stop", onStop)
      sonar.off("end", onEnd)
      sonar.off("progress", onProgress)
    }
  }, [sonar])

  const isPlaying = !!interval

  return (
    <div className="container py-10 mx-auto ">
      <div className="flex gap-3">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if (isPlaying) {
              await sonar.pause()
            } else {
              await sonar.play()
            }
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await sonar.stop()
          }}
        >
          Stop
        </button>
      </div>
      <div>计时: {count} 秒</div>

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
            sonar.volume = Number(e.target.value) / 100
          }}
          defaultValue={sonar.volume * 100}
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
            sonar.rate = Number(e.target.value)
          }}
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>0.5</span>
          <span>2</span>
        </div>
      </div>

      <div>
        <label className="label w-full" htmlFor="progress">
          进度(TODO)
        </label>
        <input
          id="progress"
          type="range"
          min={0}
          max={100}
          step={0.1}
          className="range w-full"
          onMouseUp={async (e) => {
            await sonar.seek((Number(e.currentTarget.value) / 100) * duration) // 切到多少秒
          }}
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>0</span>
          <span>{duration}</span>
        </div>
      </div>
    </div>
  )
}

export default App
