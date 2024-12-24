'use client'

import { Sonar } from './sonar'
import { useRef, useState } from 'react'
import { useInterval } from '@reactuses/core'
import { tracks } from './utils/data'

function App() {
  const [interval, setInterval] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const sonarRef = useRef<Sonar | null>(null)

  useInterval(() => {
    setCount(count + 1)
  }, interval)

  return (
    <div className='container py-10 mx-auto '>
      <div className='flex gap-3'>
        <button
          type='button'
          className='btn'
          disabled={!!interval}
          onClick={async () => {
            const sonar = await Sonar.create(tracks)

            await sonar.play()

            sonarRef.current = sonar
            setInterval(1000)

            // sonar.onEnded = () => {
            //   console.log('ended')

            //   setInterval(null)
            //   setCount(0)
            // }
          }}
        >
          {interval ? 'Playing' : 'Play'}
        </button>
        <button
          type='button'
          disabled={!interval}
          className='btn'
          onClick={() => {
            sonarRef.current?.stop()
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
