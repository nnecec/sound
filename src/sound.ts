import { Emitter } from 'mittss'
import { Track } from './track'
import {
  type Events,
  type SoundConfig,
  State,
  type Tracks,
  type TracksConfig,
} from './type'
import { shouldLoad } from './utils'

export class Sound extends Emitter<Events> {
  #volume = 1
  #rate = 1
  offsetTime = 0 // 手动偏移量
  #tracks: Tracks = []
  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state = State.stopped
  originTime = 0
  #lastTrack: Track | undefined
  #scheduleId: NodeJS.Timeout[] = []

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
  get lastTrack() {
    if (this.#lastTrack) return this.#lastTrack
    const last = this.#tracks
      .filter((track) => !track.loop)
      .toSorted((a, b) => b.endTime - a.endTime)?.[0]
    this.#lastTrack = last
    return last
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
    return this.audioContext.currentTime - this.originTime
  }
  // eslint-disable-next-line @typescript-eslint/member-ordering
  get rate() {
    return this.#rate
  }
  set rate(rate: number) {
    this.emit('rate', rate)
    const setRate = () => {
      this.#rate = rate
      for (const track of this.#tracks) track.rate = rate
    }

    if (this.state === State.playing) {
      this.pause()
      setRate()
      this.play()
    } else {
      setRate()
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
      console.log('🚀 ~ Sound ~ this.on ~ end:')
      this.stop()
      this.#clear()
    })
  }

  play() {
    this.originTime = this.audioContext.currentTime - this.offsetTime
    this.state = State.playing
    this.emit('play')
    this.#schedule()
  }

  pause() {
    this.emit('pause')
    this.state = State.paused
    this.offsetTime = this.audioContext.currentTime - this.originTime
    for (const track of this.#tracks) track.stop()
  }

  stop() {
    this.emit('stop')
    this.state = State.stopped
    for (const track of this.#tracks) track.stop()
    this.#clear()
  }

  seek(time: number) {
    if (this.state === State.playing) {
      for (const track of this.#tracks) track.stop()
      this.offsetTime = time
      this.originTime = this.audioContext.currentTime - this.offsetTime
      this.#schedule()
    } else {
      this.offsetTime = time
    }
  }

  destroy() {
    this.#clear()
    this.audioContext.close()
    this.emit('destroy')
  }

  async #schedule() {
    if (this.#tracks.every((track) => track.loading || track.loaded)) {
      for (const track of this.#tracks) {
        track.setup()
      }
    } else {
      const batch: Track[] = []
      const offsetTime = this.currentTime

      for (const track of this.#tracks) {
        if (track.loaded || track.loading) {
          continue
        }
        if (shouldLoad(track, offsetTime)) {
          batch.push(track)
        }
      }

      if (this.state === State.stopped) {
        await Promise.all(batch.map((track) => track.load())).then(() => {
          this.play()
        })
      } else {
        await Promise.all(batch.map((track) => track.load()))
      }

      for (const track of this.#tracks) {
        track.setup()
      }
      const scheduleId = setTimeout(() => {
        this.#schedule()
      }, 1000)
      this.#scheduleId.push(scheduleId)
    }
  }

  #clear() {
    for (const track of this.#tracks) {
      track.clear()
    }
    this.#scheduleId.forEach(clearTimeout)
    this.#scheduleId = []
    this.offsetTime = 0
  }

  #validateTrackConfigs(trackConfigs: TracksConfig) {
    for (const track of trackConfigs) {
      if (!track.src) {
        throw new Error(`Wrong in track ${track.src}: src is required`)
      }
      if (track.loop) continue
      if (track.startTime === undefined || track.endTime === undefined) {
        throw new Error(
          `Wrong in track ${track.src}: startTime and endTime is required`,
        )
      }
    }
  }
}
