/*
 * Main-thread wrapper around src/workers/solc.worker.ts.
 *
 * - Pins solc 0.8.20 + evmVersion=paris (VeChain rejects PUSH0 / Shanghai).
 * - Spawns a single long-lived worker on first compile; the soljson binary
 *   stays loaded across compiles in the same session.
 * - Returns the ABI / bytecode for the contract the user asked to deploy.
 */

import { resolveAllImports, ImportResolveError } from './import-resolver'

export const SOLC_VERSION = 'v0.8.20+commit.a1b79de6'
export const SOLC_VERSION_SHORT = '0.8.20'
export const EVM_VERSION = 'paris'
export const OPTIMIZER = { enabled: true, runs: 200 }

interface SolcError {
  severity: 'error' | 'warning'
  formattedMessage?: string
  message: string
  sourceLocation?: { file: string; start: number; end: number }
  type?: string
}

export interface CompileResult {
  abi: any[]
  bytecode: string // 0x-prefixed creation bytecode
  deployedBytecode: string
  contractName: string
  warnings: SolcError[]
}

export class CompileError extends Error {
  constructor(public errors: SolcError[]) {
    super(errors.map((e) => e.formattedMessage || e.message).join('\n'))
    this.name = 'CompileError'
  }
}

let workerPromise: Promise<Worker> | null = null
let nextId = 1
const pending = new Map<number, (msg: any) => void>()

function spawn(): Promise<Worker> {
  if (workerPromise) return workerPromise
  workerPromise = (async () => {
    // Classic worker (not type: 'module') so importScripts() is available for
    // loading soljson — see comment in solc.worker.ts.
    const w = new Worker(new URL('@/workers/solc.worker.ts', import.meta.url))
    w.addEventListener('message', (ev) => {
      const { id } = ev.data
      const cb = pending.get(id)
      if (cb) {
        pending.delete(id)
        cb(ev.data)
      }
    })
    // Load soljson up-front so the first compile doesn't pay the load cost.
    await send(w, { type: 'load', version: SOLC_VERSION })
    return w
  })()
  return workerPromise
}

function send(worker: Worker, msg: any): Promise<any> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, (res) => {
      if (res.ok) resolve(res)
      else reject(new Error(res.error))
    })
    worker.postMessage({ ...msg, id })
  })
}

export async function ensureSolcReady(): Promise<void> {
  await spawn()
}

/**
 * Compile the user's files. Throws CompileError on any solc `error` severity
 * (warnings are returned in the result). The returned `contractName` is the
 * one selected by the caller via `contractName`, or — if not provided — the
 * first contract found in the entry file's output.
 */
export async function compile(opts: {
  files: Record<string, string>
  entry: string
  contractName?: string
}): Promise<CompileResult> {
  const worker = await spawn()
  const sources = await resolveAllImports(opts.entry, opts.files).catch((e) => {
    if (e instanceof ImportResolveError) {
      throw new CompileError(
        e.errors.map((er) => ({
          severity: 'error',
          message: `${er.path}: ${er.message}`,
          formattedMessage: `ParserError: ${er.message}`,
          type: 'ImportError',
        })),
      )
    }
    throw e
  })

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: EVM_VERSION,
      optimizer: OPTIMIZER,
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] },
      },
    },
  }

  const res = await send(worker, { type: 'compile', input })
  const output = res.output

  const allErrors: SolcError[] = output.errors || []
  const hardErrors = allErrors.filter((e) => e.severity === 'error')
  if (hardErrors.length) {
    throw new CompileError(hardErrors)
  }

  const compiled = output.contracts?.[opts.entry]
  if (!compiled) {
    throw new CompileError([
      {
        severity: 'error',
        message: `No contracts compiled for ${opts.entry}`,
      },
    ])
  }
  const name =
    opts.contractName && compiled[opts.contractName]
      ? opts.contractName
      : Object.keys(compiled)[0]
  if (!name || !compiled[name]) {
    throw new CompileError([
      {
        severity: 'error',
        message: opts.contractName
          ? `Contract ${opts.contractName} not found in ${opts.entry}`
          : `No contracts in ${opts.entry}`,
      },
    ])
  }
  const c = compiled[name]
  return {
    abi: c.abi,
    bytecode: '0x' + c.evm.bytecode.object,
    deployedBytecode: '0x' + c.evm.deployedBytecode.object,
    contractName: name,
    warnings: allErrors.filter((e) => e.severity === 'warning'),
  }
}

/** List every contract found in any of the compiled files (helps pick when >1). */
export async function listCompiledContracts(opts: {
  files: Record<string, string>
  entry: string
}): Promise<{ file: string; name: string }[]> {
  const worker = await spawn()
  const sources = await resolveAllImports(opts.entry, opts.files)
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: EVM_VERSION,
      optimizer: OPTIMIZER,
      outputSelection: { '*': { '*': ['abi'] } },
    },
  }
  const res = await send(worker, { type: 'compile', input })
  const out: { file: string; name: string }[] = []
  for (const file of Object.keys(res.output.contracts || {})) {
    for (const name of Object.keys(res.output.contracts[file] || {})) {
      out.push({ file, name })
    }
  }
  return out
}
