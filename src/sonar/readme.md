# Usage

```ts
// 1. create sonar
const sonar = new Sonar(trackConfigs)
// 2. play/pause/stop
sonar.play()
sonar.pause()
sonar.stop()
// 3. modify volume/rate
sonar.volume = 0.5
sonar.rate = 1.5
// 4. seek time
sonar.seek(13.14)
// 5. get attributes
const volume = sonar.volume
const rate = sonar.rate
const currentTime = sonar.currentTime
const duration = sonar.duration
// 6. destroy sonar
sonar.destroy()
```
