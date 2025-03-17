import { Emitter } from 'mittss'
import Queue from 'p-queue'
import { Track } from './track'
import {
  type Events,
  Priority,
  type SoundConfig,
  State,
  type Tracks,
  type TracksConfig,
} from './type'
import { getPriority, prepare } from './utils'

export class Sound extends Emitter<Events> {
  #volume = 1
  #rate = 1
  #currentTime = 0
  #scheduleOptions = {
    preloadBefore: 10,
    pendingAfter: 10,
    concurrency: 4,
  }
  #queue: Queue
  #tracks: Tracks = []

  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state = State.Stop
  lastTrack: Track | null = null
  originTime = 0

  get paused() {
    return this.state === State.Pause
  }

  get playing() {
    return this.state === State.Play
  }

  get stopped() {
    return this.state === State.Stop
  }

  get duration() {
    const duration = this.lastTrack?.endTime ?? Number.NaN
    if (Number.isNaN(duration)) {
      console.warn('duration error: Please check your tracks config')
      return 0
    }
    return duration
  }
  get volume() {
    return this.#volume
  }
  set volume(value: number) {
    const volume = Math.max(0, Math.min(1, value))
    this.#volume = volume
    this.gainNode.gain.value = volume
    this.emit('volume', volume)
  }

  /** 当前播放时间 */
  get currentTime() {
    if (this.state === State.Play) {
      return (
        (this.audioContext.currentTime - this.originTime) * this.#rate +
        this.#currentTime
      )
    }
    return this.#currentTime
  }
  set currentTime(time: number) {
    this.#currentTime = time
  }

  /** 播放速度 */
  get rate() {
    return this.#rate
  }
  set rate(value: number) {
    const rate = Math.max(0.5, Math.min(2, value)) // 限制在 0.5-2 倍速之间
    this.emit('rate', rate)
    const changeRate = () => {
      this.#rate = rate
      for (const track of this.#tracks) track.rate = rate
    }

    if (this.state === State.Play) {
      this.pause()
      changeRate()
      this.play()
    } else {
      changeRate()
    }
  }

  constructor({
    tracks,
    bgm,
    ...soundConfig
  }: { tracks: TracksConfig; bgm?: Track } & SoundConfig) {
    super()
    this.#validateTrackConfigs(tracks)
    this.#tracks = tracks.map((track) => new Track(track, this))
    this.gainNode = this.audioContext.createGain()
    this.initialize(soundConfig)
  }

  onStateChange(state: State) {
    switch (state) {
      case State.Play:
        this.originTime = this.audioContext.currentTime - this.currentTime

        this.state = State.Play
        for (const track of this.#tracks) track.setup()
        break
      case State.End:
        this.stop()
        this.#clear()
        break

      default:
        break
    }
  }

  initialize(soundConfig?: SoundConfig) {
    this.#volume = soundConfig?.volume ?? this.#volume
    this.gainNode.gain.value = this.#volume
    this.gainNode.connect(this.audioContext.destination)
    this.rate = soundConfig?.rate ?? this.#rate
    this.#queue = new Queue({
      concurrency: soundConfig?.scheduleOptions?.concurrency || 4,
      autoStart: true,
    })
    this.lastTrack = this.#tracks
      .filter((track) => !track.loop)
      .toSorted((a, b) => b.endTime - a.endTime)?.[0]
    this.on('state', this.onStateChange.bind(this))
  }

  play() {
    if (this.state === State.Play) return
    this.#schedule().then(() => {
      this.emit('state', State.Play)
    })
  }

  pause() {
    if (this.state === State.Pause) return
    this.emit('state', State.Pause)
    this.state = State.Pause
    this.currentTime =
      this.audioContext.currentTime - this.originTime + this.currentTime
    for (const track of this.#tracks) track.stop()
  }

  stop() {
    if (this.state === State.Stop) return
    this.emit('state', State.Stop)
    for (const track of this.#tracks) track.stop()
    this.#clear()
  }

  seek(time: number) {
    if (time < 0 || time > this.duration) return

    if (this.state === State.Play) {
      this.pause()
      this.currentTime = time
      this.play()
    } else {
      this.currentTime = time
    }
  }

  destroy() {
    this.#clear()
    this.#queue.clear()
    this.all.clear()
    this.audioContext.close()
    this.emit('state', State.Destroy)
  }

  async #schedule() {
    const batch: {
      priority: Priority
      items: Track[]
    } = {
      priority: Priority.None,
      items: [],
    }
    for (const track of this.#tracks) {
      if (track.loaded) {
        continue
      }
      track.priority = getPriority(
        track,
        this.currentTime,
        this.#scheduleOptions,
      )

      if (track.priority > batch.priority) {
        batch.priority = track.priority
      }
    }
    if (batch.priority === Priority.None) {
      // 没有需要加载的了
      return
    }

    for (const track of this.#tracks) {
      if (
        track.priority === batch.priority &&
        batch.priority >= Priority.Low &&
        !track.loaded
      ) {
        batch.items.push(track)
      }
    }

    await this.#queue.addAll(
      batch.items.map((track) => async () => {
        await track.load()
      }),
      { priority: batch.priority },
    )

    // 立即播放队列加载完成后开始播放
    await this.#queue.onEmpty()

    setTimeout(() => {
      this.#schedule()
    }, 1000)
  }

  #clear() {
    for (const track of this.#tracks) track.clear()
    this.currentTime = 0
  }

  #validateTrackConfigs(trackConfigs: TracksConfig) {
    for (const track of trackConfigs) {
      if (!track.src) {
        throw new Error(`Wrong in ${JSON.stringify(track)}: src is required`)
      }
      if (track.loop) continue
      if (track.startTime === undefined || track.endTime === undefined) {
        throw new Error(
          `Wrong in ${JSON.stringify(
            track,
          )}: startTime and endTime is required`,
        )
      }
      if (track.startTime > track.endTime) {
        throw new Error(
          `Wrong in ${JSON.stringify(
            track,
          )}: startTime must be less than endTime`,
        )
      }
    }
  }
}
