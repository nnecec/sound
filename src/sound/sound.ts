import { Emitter } from 'mittss'
import Queue from 'p-queue'
import { Track } from './track'
import {
  type Events,
  Lifecycle,
  Priority,
  type SonarConfig,
  type TrackConfigs,
  type Tracks,
} from './type'

export class Sound extends Emitter<Events> {
  tracks: Tracks = []
  audioContext: AudioContext = new AudioContext()
  gainNode: GainNode
  state = Lifecycle.unloaded
  #volume = 1
  #rate = 1
  lastTrack: Track | null = null
  originTime = 0
  offset = 0
  #queue: Queue = new Queue({ concurrency: 5, autoStart: true })

  constructor(trackConfigs: TrackConfigs, sonarConfig?: SonarConfig) {
    super()
    this.validateTrackConfigs(trackConfigs)
    this.tracks = trackConfigs.map((track) => new Track(track, this))
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
    this.#volume = sonarConfig?.volume ?? this.#volume
    this.gainNode.gain.value = this.#volume
    this.gainNode.connect(this.audioContext.destination)
    this.rate = sonarConfig?.rate ?? this.#rate

    this.on('end', () => {
      this.stop()
      this.#clear()
    })
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
    this.originTime = this.audioContext.currentTime
    if (this.state === Lifecycle.unloaded) {
      this.schedule()
      return
    }
    this.emit('play')

    for (const track of this.tracks) {
      track.setup()
    }
  }

  pause() {
    this.emit('pause')
    this.offset = this.currentTime
    for (const track of this.tracks) {
      track.stop()
    }
  }

  stop() {
    this.emit('stop')
    for (const track of this.tracks) {
      track.stop()
    }
    this.#clear()
  }

  seek(time: number) {
    this.#clear()
    this.pause()
    this.offset = time
    this.play()
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

  get duration() {
    const last = this.tracks.toSorted((a, b) => b.endTime - a.endTime)[0]
    this.lastTrack = last
    return last.endTime
  }

  destroy() {
    this.#clear()
    this.state = Lifecycle.unloaded
    this.all = new Map()
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
    const currentTime = this.originTime + this.offset

    function appendBatch(item: Track, priority: Priority) {
      if (!batch.priority) batch.priority = priority

      if (batch.priority === priority) {
        batch.items.push(item)
      }
    }

    for (const track of this.tracks) {
      if (track.state !== Lifecycle.unloaded) {
        continue
      }

      if (currentTime >= track.startTime && currentTime <= track.endTime) {
        track.priority = Priority.Superhigh
      } else if (currentTime + 10 >= track.startTime) {
        track.priority = Priority.High
      } else if (currentTime + 10 < track.startTime) {
        track.priority = Priority.Normal
      } else if (currentTime >= track.endTime) {
        track.priority = Priority.Low
      } else {
        track.priority = Priority.Normal
      }
      appendBatch(track, track.priority)
    }

    if (batch.priority === Priority.Superhigh) {
      this.#queue
        .addAll(
          batch.items.map((track) => async () => {
            track.state = Lifecycle.loading
            await track.load()
          }),
          { priority: batch.priority },
        )
        .then(() => {
          this.#queue.onEmpty().then(() => {
            for (const track of batch.items) {
              track.state = Lifecycle.loaded
            }
            this.state = Lifecycle.loading
            this.play()
            this.schedule()
          })
        })
    } else if (batch.priority) {
      for (const track of batch.items) {
        this.#queue.add(async () => {
          track.state = Lifecycle.loading
          await track.load()
          track.setup()
        })
      }
    } else {
      this.state = Lifecycle.loaded
    }
  }
}
