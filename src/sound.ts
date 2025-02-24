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
  #scheduleOptions = {
    preloadBefore: 10,
    pendingAfter: 10,
    concurrency: 4,
  }
  #queue: Queue
  #tracks: Tracks = []

  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state = State.stopped
  lastTrack: Track | null = null
  originTime = 0

  get paused() {
    return this.state === State.paused
  }

  get playing() {
    return this.state === State.playing
  }

  get stopped() {
    return this.state === State.stopped
  }

  get duration() {
    return this.lastTrack?.endTime ?? 0
  }
  get volume() {
    return this.#volume
  }
  set volume(volume: number) {
    this.#volume = volume
    this.gainNode.gain.value = volume
    this.emit('volume', volume)
  }
  // eslint-disable-next-line @typescript-eslint/member-ordering
  get currentTime() {
    if (this.state === State.playing) {
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
  // eslint-disable-next-line @typescript-eslint/member-ordering
  get rate() {
    return this.#rate
  }
  set rate(rate: number) {
    this.emit('rate', rate)
    const changeRate = () => {
      this.#rate = rate
      this.#invokeTracks((track) => {
        track.rate = rate
      })
    }

    if (this.state === State.playing) {
      this.pause()
      changeRate()
      this.play()
    } else {
      changeRate()
    }
  }

  constructor(tracksConfig: TracksConfig, soundConfig?: SoundConfig) {
    super()
    this.#validateTrackConfigs(tracksConfig)
    this.#tracks = tracksConfig.map((track) => new Track(track, this))
    this.gainNode = this.audioContext.createGain()
    this.initialize(soundConfig)
  }

  onEnd() {
    this.stop()
    this.#clear()
  }
  onPlay() {
    this.originTime = this.audioContext.currentTime
    this.state = State.playing
    this.#invokeTracks((track) => track.setup())
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

    this.on('end', this.onEnd.bind(this))
    this.on('play', this.onPlay.bind(this))
  }

  play() {
    setTimeout(() => {
      // 如果300ms仍不是播放中，则提供 loading 状态
      if (this.state !== State.playing) {
        this.state = State.loading
      }
    }, 300)
    this.#schedule().then(() => {
      this.emit('play')
    })
  }

  pause() {
    this.emit('pause')
    this.state = State.paused
    this.currentTime =
      this.audioContext.currentTime - this.originTime + this.currentTime
    this.originTime = this.audioContext.currentTime
    this.#invokeTracks((track) => track.stop())
  }

  stop() {
    this.emit('stop')
    this.state = State.stopped
    this.#invokeTracks((track) => track.stop())
    this.#clear()
  }

  seek(time: number) {
    if (this.state === State.playing) {
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
    this.emit('destroy')
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

    if (this.state === State.playing) {
      this.#invokeTracks((track) => track.setup())
    }

    setTimeout(() => {
      this.#schedule()
    }, 1000)
  }

  #clear() {
    this.#invokeTracks((track) => track.clear())
    this.currentTime = 0
  }

  #invokeTracks(callback: (track: Track) => void) {
    for (const track of this.#tracks) {
      callback(track)
    }
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
