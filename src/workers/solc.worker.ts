/*
 * In-browser Solidity compiler.
 *
 * Loads `soljson-vX.X.X.js` from binaries.soliditylang.org on first compile and
 * caches the script body in Cache Storage so subsequent page loads start
 * without a network round trip. Since the main thread pre-resolves every
 * import (see services/import-resolver.ts), we don't need to register an
 * emscripten import callback — solc's standard-JSON `sources` map is fully
 * populated up-front.
 *
 * NOTE: this is a *classic* worker (no `type: 'module'`) so that `importScripts`
 * is available. The soljson script defines a top-level `Module` variable; only
 * importScripts (or direct <script>-style evaluation) lets it land on the
 * worker's global scope.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare function importScripts(...urls: string[]): void
declare const Module: any

interface LoadMessage {
  id: number
  type: 'load'
  version: string // e.g. "v0.8.20+commit.a1b79de6"
}

interface CompileMessage {
  id: number
  type: 'compile'
  input: any // solc standard JSON input
}

type WorkerMessage = LoadMessage | CompileMessage

const CACHE_NAME = 'inspector-solc-cache-v1'
let compile: ((input: string) => string) | null = null
let loadedVersion: string | null = null

/** Fetch soljson via Cache Storage and load it into the worker as a blob URL. */
async function loadSolc(version: string): Promise<void> {
  if (loadedVersion === version && compile) return
  const url = `https://binaries.soliditylang.org/bin/soljson-${version}.js`
  const cache = await (self as any).caches.open(CACHE_NAME)
  let response: Response | undefined = await cache.match(url)
  if (!response) {
    response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Failed to fetch soljson (${response.status})`)
    }
    await cache.put(url, response.clone())
  }
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  try {
    importScripts(blobUrl)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
  // After importScripts, soljson has installed `Module` on the global scope.
  // solidity_compile(input, callback, context) — callback=0 means "no import callback".
  const cwrap = (Module as any).cwrap.bind(Module)
  const raw = cwrap('solidity_compile', 'string', ['string', 'number', 'number'])
  compile = (input: string) => raw(input, 0, 0)
  loadedVersion = version
}

self.addEventListener('message', async (ev: MessageEvent<WorkerMessage>) => {
  const msg = ev.data
  try {
    if (msg.type === 'load') {
      await loadSolc(msg.version)
      ;(self as any).postMessage({ id: msg.id, ok: true })
      return
    }
    if (msg.type === 'compile') {
      if (!compile) throw new Error('Compiler not loaded')
      const out = compile(JSON.stringify(msg.input))
      ;(self as any).postMessage({ id: msg.id, ok: true, output: JSON.parse(out) })
      return
    }
  } catch (err: any) {
    ;(self as any).postMessage({
      id: msg.id,
      ok: false,
      error: err.message || String(err),
    })
  }
})

// Make this file a module so the `Module` global declaration above is scoped.
export {}
