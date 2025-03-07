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
import { getPriority } from './utils'

export class Sound extends Emitter<Events> {
  #volume = 1
  #rate = 1
  #currentTime = 0
  #queue: Queue
  #tracks: Tracks = []

  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state = State.stop
  lastTrack: Track | null = null
  originTime = 0

  get paused() {
    return this.state === State.pause
  }

  get playing() {
    return this.state === State.play
  }

  get stopped() {
    return this.state === State.stop
  }

  get duration() {
    const duration = this.lastTrack?.endTime ?? Number.NaN
    if (Number.isNaN(duration)) {
      console.warn('Please check your tracks config')
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
  // eslint-disable-next-line @typescript-eslint/member-ordering
  get currentTime() {
    if (this.state === State.play) {
      return this.audioContext.currentTime - this.originTime
    }
    return this.#currentTime
  }
  set currentTime(time: number) {
    this.#currentTime = time
  }
  // eslint-disable-next-line @typescript-eslint/member-ordering
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

    if (this.state === State.play) {
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
    this.state = state
    switch (state) {
      case State.play:
        this.originTime = this.audioContext.currentTime
        this.emit('state', State.play)
        for (const track of this.#tracks) {
          track.setup()
        }
        break
      case State.pause:
      case State.end:
      case State.stop:
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
    const last = this.#tracks.toSorted((a, b) => b.endTime - a.endTime)?.[0]
    this.lastTrack = last

    this.on('state', this.onStateChange.bind(this))
  }

  play() {
    setTimeout(() => {
      // 如果300ms仍不是播放中，则提供 loading 状态
      if (this.state !== State.play) this.emit('state', State.loading)
    }, 150)
    this.#schedule()
  }

  pause() {
    if (this.state === State.pause) return
    this.currentTime = this.audioContext.currentTime - this.originTime
    for (const track of this.#tracks) track.stop()
    this.emit('state', State.pause)
  }

  stop() {
    if (this.state === State.stop) return

    for (const track of this.#tracks) track.stop()
    this.#clear()
    this.emit('state', State.stop)
  }

  seek(time: number) {
    if (time < 0 || time > this.duration) return

    if (this.state === State.play) {
      this.pause()
      this.currentTime = time
      this.originTime = this.audioContext.currentTime - this.currentTime
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
    this.emit('state', State.destroy)
  }

  async #schedule() {
    const batch: Track[] = []

    for (const track of this.#tracks) {
      if (track.loaded) {
        continue
      }
      track.priority = getPriority(track, this.currentTime)

      if (track.priority > batch.priority) {
        batch.priority = track.priority
      }
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

    if (this.state === State.play) {
      for (const track of this.#tracks) {
        track.setup()
      }
    }

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
      if (track.startTime === undefined || track.endTime === undefined) {
        throw new Error(
          `Wrong in ${JSON.stringify(
            track,
          )}: startTime and endTime is required`,
        )
      }
    }
  }
}
