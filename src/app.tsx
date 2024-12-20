"use client"

import { useForm } from "react-hook-form"
import { playMergedAudio, Track } from "./utils"
import { useEffect, useState } from "react"

const trackConfig: Track[] = [
  {
    src: "/assets/relaxing-guitar-loop-v5-245859.mp3",
  },
  {
    src: "/assets/typing-keyboard-sound-254462.mp3",
    startPosition: 2,
  },
]

function App() {
  const [src, setSrc] = useState("")
  console.log("🚀 ~ App ~ src:", src)
  useEffect(() => {
    playMergedAudio(trackConfig).then((src) => {
      setSrc(src)
    })
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()
  const onSubmit = (data) => console.log(data)

  return (
    <div className="container py-10 mx-auto ">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-md flex flex-col gap-4 mx-auto"
      >
        <input
          {...register("startPosition", { required: true })}
          type="number"
          placeholder="startPosition" // 相对于句首的开始时间
          className="input w-full"
        />

        <button type="submit" className="btn">
          Submit
        </button>
      </form>

      {src && <audio controls src={src} />}
    </div>
  )
}

export default App
