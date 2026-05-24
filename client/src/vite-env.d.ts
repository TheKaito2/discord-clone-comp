/// <reference types="vite/client" />

declare module 'simple-peer' {
  // Minimal surface used in this app — we only need the constructor + events.
  export interface SignalData {
    type?: string
    sdp?: string
    candidate?: unknown
    [k: string]: unknown
  }

  export interface Instance {
    on(event: 'signal', cb: (signal: SignalData) => void): this
    on(event: 'stream', cb: (stream: MediaStream) => void): this
    on(event: 'track', cb: (track: MediaStreamTrack, stream: MediaStream) => void): this
    on(event: 'error', cb: (e: { message?: string }) => void): this
    on(event: 'close', cb: () => void): this
    on(event: string, cb: (...args: unknown[]) => void): this
    signal(s: SignalData): void
    destroy(): void
  }

  export interface Options {
    initiator?: boolean
    trickle?: boolean
    stream?: MediaStream
  }

  const SimplePeer: {
    new (opts?: Options): Instance
  }
  export default SimplePeer
}
