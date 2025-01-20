import { Emitter } from 'mittss'
import Queue from 'p-queue'
import { Track } from './track'
import {
  type Events,
  Lifecycle,
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
  #offsetTime = 0
  #queue: Queue = new Queue({ concurrency: 3, autoStart: true })
  #tracks: Tracks = []

  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  lifecycle = Lifecycle.unloaded
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
    const last = this.#tracks.toSorted((a, b) => b.endTime - a.endTime)?.[0]
    this.lastTrack = last
    return last.endTime ?? 0
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
  get offsetTime() {
    if (this.state === State.playing) {
      return (
        (this.audioContext.currentTime - this.originTime) * this.#rate +
        this.#offsetTime
      )
    }
    return this.#offsetTime
  }
  set offsetTime(time: number) {
    this.#offsetTime = time
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

  initialize(soundConfig?: SoundConfig) {
    this.#volume = soundConfig?.volume ?? this.#volume
    this.gainNode.gain.value = this.#volume
    this.gainNode.connect(this.audioContext.destination)
    this.rate = soundConfig?.rate ?? this.#rate

    this.on('end', () => {
      this.stop()
      this.#clear()
    })
  }

  play() {
    this.originTime = this.audioContext.currentTime
    if (this.lifecycle === Lifecycle.unloaded) {
      this.#schedule()
      return
    }
    this.emit('play')
    this.state = State.playing
    this.#invokeTracks((track) => track.setup())
  }

  pause() {
    this.emit('pause')
    this.state = State.paused
    this.offsetTime =
      this.audioContext.currentTime - this.originTime + this.offsetTime
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
      this.offsetTime = time
      this.play()
    } else {
      this.offsetTime = time
    }
  }

  destroy() {
    this.#clear()
    this.lifecycle = Lifecycle.unloaded
    this.#queue.clear()
    this.all.clear()
    this.audioContext.close()
    this.emit('destroy')
  }

  #schedule() {
    const batch: {
      priority: Priority
      items: Track[]
    } = {
      priority: Priority.None,
      items: [],
    }
    const offsetTime = this.offsetTime

    for (const track of this.#tracks) {
      if (track.lifecycle !== Lifecycle.unloaded) {
        continue
      }
      track.priority = getPriority(track, offsetTime)

      if (track.priority > batch.priority) {
        batch.priority = track.priority
      }
    }

    for (const track of this.#tracks) {
      if (track.priority === batch.priority) {
        track.lifecycle = Lifecycle.loading
        batch.items.push(track)
      }
    }
    if (batch.priority === Priority.Superhigh) {
      this.lifecycle = Lifecycle.loading
      this.#queue
        .addAll(
          batch.items.map((track) => async () => {
            await track.load()
            track.lifecycle = Lifecycle.loaded
          }),
          { priority: batch.priority },
        )
        .then(() => {
          this.#queue.onEmpty().then(() => {
            this.play()
            this.#schedule()
          })
        })
    } else if (batch.priority !== Priority.None) {
      this.lifecycle = Lifecycle.loading
      for (const track of batch.items) {
        this.#queue.add(async () => {
          await track.load()
          track.lifecycle = Lifecycle.loaded
          track.setup()
          if (this.lifecycle !== Lifecycle.loaded) {
            this.#schedule()
          }
        })
      }
    } else {
      this.lifecycle = Lifecycle.loaded
    }
  }

  #clear() {
    this.#invokeTracks((track) => track.clear())
    this.offsetTime = 0
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
          `Wrong in ${JSON.stringify(track)}: startTime and endTime is required`,
        )
      }
    }
  }
}
