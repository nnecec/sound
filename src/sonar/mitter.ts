type EventType = string | symbol | "*"

// An event handler can take an optional event argument
// and should not return a value
type Handler<T = unknown> = (event: T) => void
type WildcardHandler<T = Record<string, unknown>> = (
  type: keyof T,
  event: T[keyof T],
) => void

// An array of all currently registered event handlers for a type
type EventHandlerList<T = unknown> = Array<Handler<T>>
type WildCardEventHandlerList<T = Record<string, unknown>> = Array<
  WildcardHandler<T>
>

// A map of event types and their corresponding event handlers.
type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
  keyof Events,
  EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>

export class Mitter<Events extends Record<EventType, unknown>> {
  // A Map of event names to registered handler functions.
  public all: EventHandlerMap<Events>

  constructor(all?: EventHandlerMap<Events>) {
    this.all = all || new Map()
  }

  /**
   * Register an event handler for the given type.
   * @param type Type of event to listen for, or `'*'` for all events
   * @param handler Function to call in response to given event
   */
  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void
  on(type: "*", handler: WildcardHandler<Events>): void
  on(
    type: keyof Events,
    handler: Handler<Events[keyof Events]> | WildcardHandler<Events>,
  ): void {
    const handlers:
      | Array<Handler<Events[keyof Events]> | WildcardHandler<Events>>
      | undefined = this.all.get(type)
    if (handlers) {
      handlers.push(handler)
    } else {
      this.all.set(type, [handler] as EventHandlerList<Events[keyof Events]>)
    }
  }

  /**
   * Remove an event handler for the given type.
   * If `handler` is omitted, all handlers of the given type are removed.
   * @param type Type of event to unregister `handler` from (`'*'` to remove a wildcard handler)
   * @param handler Handler function to remove
   */
  off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void
  off(type: "*", handler: WildcardHandler<Events>): void
  off(
    type: keyof Events,
    handler?: Handler<Events[keyof Events]> | WildcardHandler<Events>,
  ): void {
    const handlers:
      | Array<Handler<Events[keyof Events]> | WildcardHandler<Events>>
      | undefined = this.all.get(type)
    if (handlers) {
      if (handler) {
        handlers.splice(handlers.indexOf(handler) >>> 0, 1)
      } else {
        this.all.set(type, [])
      }
    }
  }

  /**
   * Invoke all handlers for the given type.
   * If present, `'*'` handlers are invoked after type-matched handlers.
   *
   * Note: Manually firing '*' handlers is not supported.
   *
   * @param type The event type to invoke
   * @param evt Any value (object is recommended and powerful), passed to each handler
   */
  emit<Key extends keyof Events>(type: Key, evt: Events[Key]): void
  emit<Key extends keyof Events>(
    type: undefined extends Events[Key] ? Key : never,
  ): void
  emit<Key extends keyof Events>(type: Key, evt?: Events[Key]): void {
    let handlers = this.all.get(type)
    if (handlers) {
      for (const handler of handlers as EventHandlerList<
        Events[keyof Events]
      >) {
        handler(evt!)
      }
    }

    handlers = this.all.get("*")
    if (handlers) {
      for (const handler of handlers as WildCardEventHandlerList<Events>) {
        handler(type, evt!)
      }
    }
  }

  /**
   * Register an event handler for the given type that will be invoked only once.
   * @param type Type of event to listen for, or `'*'` for all events
   * @param handler Function to call in response to given event
   */
  once<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void
  once(type: "*", handler: WildcardHandler<Events>): void
  once<Key extends keyof Events>(
    type: keyof Events,
    handler: Handler<Events[keyof Events]> | WildcardHandler<Events>,
  ): void {
    const wrapper = (...args: [Events[keyof Events]] | [Key, Events[Key]]) => {
      if (type === "*") {
        ;(handler as WildcardHandler<Events>)(
          args[0] as Key,
          args[1] as Events[Key],
        )
      } else {
        ;(handler as Handler<Events[Key]>)(args[0] as Events[Key])
      }

      this.off(type, wrapper)
    }

    this.on(type, wrapper)
  }
}
