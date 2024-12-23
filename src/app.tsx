"use client"

import { preview, Track } from "./utils"
import { mergeTracks } from "./utils/merge"
import { useRef, useState } from "react"
import { useInterval } from "@reactuses/core"

const trackConfig: Track[] = [
  {
    src: "/assets/relaxing-guitar-loop-v5-245859.mp3",
    fadeInEnd: 4, // 渐入结束时间
    fadeOutStart: -4, // 渐出开始时间
    startPosition: 2,
  },
  {
    src: "/assets/typing-keyboard-sound-254462.mp3",
  },
  {
    src: "/assets/level-up-191997.mp3",
    startPosition: 10, // 插入到第10秒播放
  },
]

function App() {
  const [interval, setInterval] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  useInterval(() => {
    setCount(count + 1)
  }, interval)

  return (
    <div className="container py-10 mx-auto ">
      <div className="flex gap-3">
        <button
          type="button"
          className="btn"
          disabled={!!interval}
          onClick={() => {
            const audioContext = new AudioContext()

            mergeTracks(trackConfig).then((audioBuffer) => {
              const source = preview({ audioContext, audioBuffer })
              sourceRef.current = source
              source.start()
              setInterval(1000)

              source.onended = () => {
                setInterval(null)
                setCount(0)
              }
            })
          }}
        >
          {interval ? "Playing" : "Play"}
        </button>
        <button
          type="button"
          disabled={!interval}
          className="btn"
          onClick={() => {
            sourceRef.current?.stop()
            setInterval(null)
            setCount(0)
          }}
        >
          Stop
        </button>
      </div>
      <div>计时: {count} 秒</div>
    </div>
  )
}

export default App
