"use client"

import { Sonar } from "./sonar"
import { useState } from "react"
import { useInterval } from "@reactuses/core"
import { tracks } from "./utils/data"

const sonar = new Sonar(tracks)
sonar.addEventListener("statechange", (ev) => {
  console.log(ev)
})

function App() {
  const [interval, setInterval] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [maxTime, setMaxTime] = useState(0)

  useInterval(() => {
    setCount(count + 1)
  }, interval)

  const isPlaying = !!interval

  return (
    <div className="container py-10 mx-auto ">
      <div className="flex gap-3">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if (isPlaying) {
              sonar.pause()
              setInterval(null)
            } else {
              await sonar.play()
              setInterval(1000)
              setMaxTime(sonar.duration)
            }
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            sonar.stop()
            setInterval(null)
            setCount(0)
          }}
        >
          Stop
        </button>

        <div>
          <label className="label">
            音量
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              className="range"
              onChange={(e) => {
                sonar.setVolume(Number(e.target.value) / 100)
              }}
            />
          </label>
          <div className="flex w-full justify-between px-2 text-xs">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>
      <div>计时: {count} 秒</div>
      <div>
        <label className="label">
          进度
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            className="range"
            onChange={(e) => {
              sonar.seek((Number(e.target.value) / 100) * maxTime) // 切到多少秒
            }}
          />
        </label>
        <div className="flex w-full justify-between px-2 text-xs">
          <span>0</span>
          <span>{maxTime}</span>
        </div>
      </div>
    </div>
  )
}

export default App
