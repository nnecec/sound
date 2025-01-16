# sound

## Usage

```ts
// 1. create sound
const sound = new Sound(trackConfigs)
// 2. play/pause/stop
sound.play()
sound.pause()
sound.stop()
// 3. modify volume
sound.volume = 0.5
// 4. seek time
sound.seek(13.14)
// 5. get attributes
const volume = sound.volume
const rate = sound.rate
const currentTime = sound.currentTime
const duration = sound.duration
const isPlaying = sound.playing
const isStopped = sound.stopped
const isPaused = sound.paused
// 6. destroy sound
sound.destroy()
```
