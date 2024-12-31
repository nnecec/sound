"use client"

import { Sonar } from "./sonar"
import { useState } from "react"
import { useInterval } from "@reactuses/core"
import { tracks } from "./utils/data"

const sonar = new Sonar(tracks)

function App() {
  const [interval, setInterval] = useState<number | null>(null)
  const [count, setCount] = useState(0)

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
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          className="range"
          onChange={(e) => {
            sonar.control("playbackRate", Number(e.target.value))
          }}
        />
      </div>
      <div>计时: {count} 秒</div>
    </div>
  )
}

export default App
