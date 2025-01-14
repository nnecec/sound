export class Queue {
  #queue: Array<() => void> = []

  constructor() {
    this.#queue = []
  }

  add(fn: () => void) {
    this.#queue.push(fn)
  }

  run() {
    for (const fn of this.#queue) {
      fn()
    }
  }
}
