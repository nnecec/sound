import { use } from 'react'

const track1Promise = fetch('/assets/relaxing-guitar-loop-v5-245859.mp3').then(
  response => response.blob(),
)
const effect1Promise = fetch('/assets/level-up-191997.mp3').then(response =>
  response.blob(),
)

function App() {
  const track1 = use(track1Promise)
  const effect1 = use(effect1Promise)

  return (
    <div>
      <h1 className='text-3xl font-bold underline'>Hello World</h1>
      <button type='button' className='btn'>
        Play
      </button>

      <audio src={URL.createObjectURL(track1)} controls />
      <audio src={URL.createObjectURL(effect1)} controls />
    </div>
  )
}

export default App
