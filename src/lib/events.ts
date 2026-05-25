import { EventEmitter } from 'events'

// Use a global singleton so the emitter persists across hot reloads in dev
const globalAny = global as any

if (!globalAny.__prowiderEmitter) {
  globalAny.__prowiderEmitter = new EventEmitter()
  globalAny.__prowiderEmitter.setMaxListeners(200)
}

export const emitter: EventEmitter = globalAny.__prowiderEmitter

export function broadcastLeadUpdate(data: object) {
  emitter.emit('lead-update', data)
}
