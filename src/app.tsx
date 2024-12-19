import { use } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'

const track1Promise = fetch('/assets/relaxing-guitar-loop-v5-245859.mp3').then(
  response => response.blob(),
)
const effect1Promise = fetch('/assets/level-up-191997.mp3').then(response =>
  response.blob(),
)

function App() {
  const track1 = use(track1Promise)
  const effect1 = use(effect1Promise)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()
  const onSubmit: SubmitHandler<Inputs> = data => console.log(data)

  return (
    <div className='container py-10 mx-auto '>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='max-w-md flex flex-col gap-4 mx-auto'
      >
        <input
          {...register('startPosition', { required: true })}
          type='number'
          placeholder='startPosition' // 相对于句首的开始时间
          className='input w-full'
        />

        <button type='submit' className='btn'>
          Submit
        </button>
      </form>

      <audio src={URL.createObjectURL(track1)} controls />
      <audio src={URL.createObjectURL(effect1)} controls />
    </div>
  )
}

export default App
