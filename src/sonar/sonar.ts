import { Emitter } from 'mittss'
import Queue from 'p-queue'
import { Track } from './track'
import {
  type Events,
  Priority,
  type SonarConfig,
  type TrackConfigs,
  type Tracks,
} from './type'
import { createCache } from './utils'

export class Sonar extends Emitter<Events> {
  trackConfigs: TrackConfigs
  tracks: Tracks = []
  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state: 'unmounted' | 'mounted' = 'unmounted'
  preload = true
  #volume = 1
  #rate = 1
  lastTrack: Track | null = null
  originTime = 0
  duration = 0
  offset = 0
  cache = createCache()
  #queue: Queue = new Queue({ concurrency: 5 })

  constructor(trackConfigs: TrackConfigs, sonarConfig?: SonarConfig) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.trackConfigs = trackConfigs
    this.gainNode = this.audioContext.createGain()
    this.initialize(sonarConfig)
  }

  validateTrackConfigs(trackConfigs: TrackConfigs) {
    for (const track of trackConfigs) {
      if (!track.src) {
        throw new Error(`Wrong in ${JSON.stringify(track)}: src is required`)
      }
    }
  }

  initialize(sonarConfig?: SonarConfig) {
    this.tracks = this.trackConfigs.map((track) => new Track(track, this))
    this.#volume = sonarConfig?.volume ?? this.#volume
    this.gainNode.gain.value = this.#volume
    this.rate = sonarConfig?.rate ?? this.#rate
    this.on('end', () => {
      this.audioContext.suspend()
      this.state = 'unmounted'
      this.#clear()
    })
    this.on('load', () => {
      this.setup()
    })
  }

  async setup() {
    this.originTime = this.audioContext.currentTime
    this.schedule()
    this.state = 'mounted'
  }

  set volume(volume: number) {
    this.#volume = volume
    this.gainNode.gain.value = volume
    this.emit('volume', volume)
  }

  get volume() {
    return this.#volume
  }

  set rate(rate: number) {
    this.#rate = rate
    for (const track of this.tracks) {
      track.rate = rate
    }
    this.emit('rate', rate)
  }

  get rate() {
    return this.#rate
  }

  play() {
    if (this.state === 'unmounted') {
      this.emit('load')
      return
    }
    this.emit('play')
    this.audioContext.resume()
  }

  pause() {
    if (this.audioContext) {
      this.emit('pause')
      this.audioContext.suspend()
    }
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.suspend()
      this.emit('stop')
      this.state = 'unmounted'
      this.#clear()
    }
  }

  seek(time: number) {
    if (this.audioContext) {
      let needResume = false
      if (this.audioContext.state === 'running') {
        this.audioContext.suspend()
        needResume = true
      }
      this.#clear()
      this.offset = time
      this.setup()
      if (needResume) {
        this.audioContext.resume()
      }
    }
  }

  #clear() {
    for (const track of this.tracks) {
      track.clear()
    }
    this.offset = 0
  }

  get currentTime() {
    return this.audioContext.currentTime - this.originTime + this.offset
  }

  destroy() {
    this.#clear()
    this.state = 'unmounted'
    this.all = new Map()
    this.duration = 0
    this.audioContext.close()
    this.emit('destroy')
  }

  schedule() {
    const batch: {
      priority?: Priority
      items: Track[]
    } = {
      priority: undefined,
      items: [],
    }

    function appendBatch(item: Track, priority: Priority) {
      console.log('🚀 ~ Sonar ~ appendBatch ~ batch:', batch)
      if (!batch.priority) batch.priority === priority
      if (batch.priority === priority) {
        batch.items.push(item)
      }
    }

    for (const track of this.tracks) {
      if (track.priority === Priority.Done) continue
      if (
        this.currentTime >= track.startTime &&
        this.currentTime <= track.endTime
      ) {
        track.priority = Priority.Superhigh
      } else if (this.currentTime + 10 >= track.startTime) {
        track.priority = Priority.High
      } else if (this.currentTime + 10 < track.startTime) {
        track.priority = Priority.Normal
      } else if (this.currentTime >= track.endTime) {
        track.priority = Priority.Low
      } else {
        track.priority = Priority.Normal
      }

      appendBatch(track, track.priority)
    }

    console.log('🚀 ~ Sonar ~ schedule ~ batch:', batch)

    this.#queue.addAll(
      batch.items.map((track) => () => track.setup()),
      { priority: batch.priority },
    )
    this.#queue.onEmpty().then(() => {
      if (this.audioContext.state === 'suspended') {
        this.gainNode.connect(this.audioContext.destination)
        this.play()
      }
      // if (batch.priority !== Priority.Low) this.schedule()
    })
  }
}
