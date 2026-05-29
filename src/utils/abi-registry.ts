import { abi } from 'thor-devkit'
import DB, { Entities } from '../database'
import { BuiltInContractsService } from '../services/builtin-contracts-service'
import { fetchAbiForAddress, loadSourcedAbis } from '../services/sourcify-service'

export interface ContractRef {
    name: string
    address: string
}

export interface EventHit {
    kind: 'event'
    topic0: string
    canonicalName: string
    definition: abi.Event.Definition
    contract: ContractRef
}

export interface FunctionHit {
    kind: 'function'
    selector: string
    canonicalName: string
    definition: abi.Function.Definition
    contract: ContractRef
}

export type RegistryHit = EventHit | FunctionHit

interface AbiItem {
    type?: string
    name?: string
    inputs?: any[]
    outputs?: any[]
    anonymous?: boolean
    stateMutability?: string
    constant?: boolean
    payable?: boolean
}

// Loads imported contracts for the given network (matches Contracts.vue's filter:
// `item.network === genesisId || item.network === undefined`).
export async function loadNetworkContracts(genesisId: string): Promise<Entities.Contract[]> {
    return DB.contracts
        .filter((item) => item.network === genesisId || item.network === undefined)
        .toArray()
}

// Cache built-in resolution per genesis ID so we don't refetch ~30 ABIs on
// every panel mount. ABIs themselves are also cached inside BuiltInContractsService.
const builtinCache = new Map<string, Promise<Entities.Contract[]>>()

async function loadBuiltinContracts(genesisId: string): Promise<Entities.Contract[]> {
    let p = builtinCache.get(genesisId)
    if (!p) {
        p = (async () => {
            const results = await BuiltInContractsService.getBuiltInContracts(genesisId)
            return results
                .filter((r) => r.success && r.contract)
                .map((r) => ({
                    name: r.contract!.name,
                    address: r.contract!.address || '',
                    abi: r.contract!.abi,
                    network: genesisId
                }))
        })()
        builtinCache.set(genesisId, p)
    }
    return p
}

function sourcedAsContract(s: Entities.SourcedAbi): Entities.Contract {
    return {
        name: s.contractName || `Sourcify (${s.address.slice(0, 10)}…)`,
        address: s.address,
        abi: s.abi,
        network: s.genesisId
    }
}

// Loads imported contracts + built-in / curated contract ABIs + previously
// Sourcify-fetched ABIs for the given network. Use this for any decode /
// lookup work in the Debugger so users see hits against well-known contracts
// even before they import anything.
export async function loadAllContracts(genesisId: string): Promise<Entities.Contract[]> {
    const [imported, builtins, sourced] = await Promise.all([
        loadNetworkContracts(genesisId),
        loadBuiltinContracts(genesisId),
        loadSourcedAbis(genesisId)
    ])
    // Imported first so user-named contracts win on duplicate-address matches.
    return [...imported, ...builtins, ...sourced.map(sourcedAsContract)]
}

// Attempts to fetch ABIs from Sourcify for any address not already covered
// by the local registry. When nodeUrl is provided, EIP-1967 proxy addresses
// are resolved to their implementation before querying Sourcify (essential
// for OZ-upgradeable contracts like all of VeBetterDAO's). Successes are
// persisted to DB. Returns a refreshed contracts list.
export async function ensureAbisForAddresses(
    genesisId: string,
    addresses: Array<string | null | undefined>,
    nodeUrl?: string
): Promise<Entities.Contract[]> {
    const current = await loadAllContracts(genesisId)
    const have = new Set(
        current
            .map((c) => (c.address || '').toLowerCase())
            .filter((a) => a)
    )

    const targets = Array.from(
        new Set(
            addresses
                .filter((a): a is string => !!a && a !== '0x' && /^0x[0-9a-fA-F]{40}$/.test(a))
                .map((a) => a.toLowerCase())
                .filter((a) => !have.has(a))
        )
    )
    if (targets.length === 0) return current

    let fetchedAny = false
    await Promise.all(
        targets.map(async (addr) => {
            const hit = await fetchAbiForAddress(genesisId, addr, { nodeUrl })
            if (hit) fetchedAny = true
        })
    )
    if (!fetchedAny) return current
    return loadAllContracts(genesisId)
}

function asArray(maybeAbi: object | any[] | undefined): AbiItem[] {
    if (!maybeAbi) return []
    if (Array.isArray(maybeAbi)) return maybeAbi as AbiItem[]
    return []
}

// Decode an event log using a raw event ABI item that isn't attached to any
// contract in our registry — e.g. one fetched directly from the b32 keccak DB.
// Returns null on malformed or unmatched data.
export function decodeLogWithAbiItem(
    log: { address: string; topics: string[]; data: string },
    item: any
): DecodedLog | null {
    if (!item || item.type !== 'event' || item.anonymous) return null
    try {
        const ev = new abi.Event(item as abi.Event.Definition)
        if (ev.signature.toLowerCase() !== (log.topics[0] || '').toLowerCase()) return null
        const decoded = ev.decode(log.data, log.topics)
        const args = (item.inputs || []).map((inp: any, i: number) => ({
            name: inp.name || `arg${i}`,
            type: inp.type,
            indexed: !!inp.indexed,
            value: decoded[i]
        }))
        return {
            canonicalName: ev.canonicalName,
            eventName: item.name,
            args,
            contract: { name: 'b32 signature', address: log.address }
        }
    } catch {
        return null
    }
}

// Decode calldata using a raw function ABI item — same idea as above but for
// function selectors matched in the b32 keccak DB without a parent contract.
export function decodeCalldataWithAbiItem(
    calldata: string,
    item: any
): DecodedCall | null {
    if (!item || item.type !== 'function') return null
    if (!calldata || calldata.length < 10) return null
    try {
        const fn = new abi.Function(item as abi.Function.Definition)
        if (fn.signature.toLowerCase() !== calldata.slice(0, 10).toLowerCase()) return null
        const argsHex = '0x' + calldata.slice(10)
        const inputs = item.inputs || []
        const decoded = inputs.length ? abi.decodeParameters(inputs, argsHex) : ({} as any)
        const args = inputs.map((inp: any, i: number) => ({
            name: inp.name || `arg${i}`,
            type: inp.type,
            value: decoded[i]
        }))
        return {
            canonicalName: fn.canonicalName,
            fnName: item.name,
            args,
            contract: { name: 'b32 signature', address: '' }
        }
    } catch {
        return null
    }
}

export function lookupByTopic0(
    contracts: Entities.Contract[],
    topic0: string
): EventHit[] {
    const needle = topic0.toLowerCase()
    const hits: EventHit[] = []
    for (const c of contracts) {
        const items = asArray(c.abi)
        for (const item of items) {
            if (item.type !== 'event' || item.anonymous) continue
            try {
                const ev = new abi.Event(item as abi.Event.Definition)
                if (ev.signature.toLowerCase() === needle) {
                    hits.push({
                        kind: 'event',
                        topic0: ev.signature.toLowerCase(),
                        canonicalName: ev.canonicalName,
                        definition: item as abi.Event.Definition,
                        contract: { name: c.name || '(unnamed)', address: c.address }
                    })
                }
            } catch {
                // Malformed event in this ABI — skip.
            }
        }
    }
    return hits
}

export interface DecodedCall {
    canonicalName: string
    fnName: string
    args: Array<{ name: string; type: string; value: any }>
    contract: ContractRef
}

export interface DecodedLog {
    canonicalName: string
    eventName: string
    args: Array<{ name: string; type: string; indexed: boolean; value: any }>
    contract: ContractRef
}

export function findContractByAddress(
    contracts: Entities.Contract[],
    address: string
): Entities.Contract | null {
    const needle = address.toLowerCase()
    return contracts.find((c) => (c.address || '').toLowerCase() === needle) || null
}

export function decodeCalldata(
    contracts: Entities.Contract[],
    targetAddress: string | null | undefined,
    calldata: string
): DecodedCall | null {
    if (!calldata || calldata.length < 10) return null
    const selector = calldata.slice(0, 10).toLowerCase()

    // Prefer the function defined on the target contract; fall back to any
    // contract that has a matching selector (handy for proxies/diamonds).
    let chosen: { item: AbiItem; fn: abi.Function; contract: Entities.Contract } | null = null

    const target = targetAddress
        ? findContractByAddress(contracts, targetAddress)
        : null

    const search = (c: Entities.Contract) => {
        const items = asArray(c.abi)
        for (const item of items) {
            if (item.type !== 'function') continue
            try {
                const fn = new abi.Function(item as abi.Function.Definition)
                if (fn.signature.toLowerCase() === selector) {
                    chosen = { item, fn, contract: c }
                    return true
                }
            } catch {
                // skip
            }
        }
        return false
    }

    if (target) {
        search(target)
    }
    if (!chosen) {
        for (const c of contracts) {
            if (search(c)) break
        }
    }
    if (!chosen) return null

    const def = (chosen as any).item as abi.Function.Definition
    const fnObj = (chosen as any).fn as abi.Function
    const contractEntry = (chosen as any).contract as Entities.Contract

    try {
        const argsHex = '0x' + calldata.slice(10)
        const decoded = abi.decodeParameters(def.inputs as any[], argsHex)
        const args = (def.inputs || []).map((inp, i) => ({
            name: inp.name || `arg${i}`,
            type: inp.type,
            value: decoded[i]
        }))
        return {
            canonicalName: fnObj.canonicalName,
            fnName: def.name,
            args,
            contract: {
                name: contractEntry.name || '(unnamed)',
                address: contractEntry.address
            }
        }
    } catch {
        return null
    }
}

// Solidity built-in revert selectors.
const SELECTOR_ERROR_STRING = '0x08c379a0' // Error(string)
const SELECTOR_PANIC = '0x4e487b71'        // Panic(uint256)

const PANIC_CODES: Record<string, string> = {
    '0x00': 'generic compiler-inserted panic',
    '0x01': 'assert failed',
    '0x11': 'arithmetic overflow or underflow',
    '0x12': 'division or modulo by zero',
    '0x21': 'invalid enum conversion',
    '0x22': 'incorrectly encoded storage byte array',
    '0x31': '.pop() on empty array',
    '0x32': 'array index out of bounds',
    '0x41': 'out of memory (oversized allocation)',
    '0x51': 'invalid internal function call'
}

export type DecodedRevert =
    | { kind: 'none' }
    | { kind: 'empty' }
    | { kind: 'string'; message: string }
    | { kind: 'panic'; code: string; description: string }
    | {
          kind: 'custom'
          name: string
          canonicalName: string
          args: Array<{ name: string; type: string; value: any }>
          contract: ContractRef
      }
    | { kind: 'raw'; data: string }
    // EVM-level halt (out of gas, invalid opcode, stack overflow, …) that
    // surfaces in the call tracer as `error` with no decodable revert data.
    | { kind: 'vm-error'; error: string; at?: { type: string; to?: string } }

export function decodeRevertData(
    contracts: Entities.Contract[],
    targetAddress: string | null | undefined,
    data: string
): DecodedRevert {
    if (!data || data === '0x') return { kind: 'empty' }
    if (data.length < 10) return { kind: 'raw', data }

    const selector = data.slice(0, 10).toLowerCase()
    const argsHex = '0x' + data.slice(10)

    if (selector === SELECTOR_ERROR_STRING) {
        try {
            const decoded = abi.decodeParameter('string', argsHex)
            return { kind: 'string', message: String(decoded) }
        } catch {
            return { kind: 'raw', data }
        }
    }

    if (selector === SELECTOR_PANIC) {
        try {
            const decoded = abi.decodeParameter('uint256', argsHex)
            const codeNum = typeof decoded === 'string' ? parseInt(decoded, 10) : Number(decoded)
            const codeHex = '0x' + codeNum.toString(16).padStart(2, '0')
            return {
                kind: 'panic',
                code: codeHex,
                description: PANIC_CODES[codeHex] || 'unknown panic code'
            }
        } catch {
            return { kind: 'raw', data }
        }
    }

    // Custom error — search ABI items where type==='error', preferring the
    // target contract.
    const target = targetAddress ? findContractByAddress(contracts, targetAddress) : null

    let match: { item: AbiItem; contract: Entities.Contract } | null = null

    const search = (c: Entities.Contract): boolean => {
        const items = asArray(c.abi)
        for (const item of items) {
            if (item.type !== 'error') continue
            try {
                const fakeFn = new abi.Function({
                    type: 'function',
                    name: item.name || '',
                    stateMutability: 'nonpayable',
                    inputs: (item.inputs as any) || [],
                    outputs: []
                })
                if (fakeFn.signature.toLowerCase() === selector) {
                    match = { item, contract: c }
                    return true
                }
            } catch {
                // skip malformed
            }
        }
        return false
    }

    if (target) search(target)
    if (!match) {
        for (const c of contracts) {
            if (search(c)) break
        }
    }

    if (!match) return { kind: 'raw', data }

    const matchedItem = (match as any).item as AbiItem
    const matchedContract = (match as any).contract as Entities.Contract

    try {
        const inputs = (matchedItem.inputs || []) as any[]
        const decoded = inputs.length ? abi.decodeParameters(inputs, argsHex) : ({} as any)
        const args = inputs.map((inp, i) => ({
            name: inp.name || `arg${i}`,
            type: inp.type,
            value: decoded[i]
        }))
        const types = inputs.map((i) => i.type).join(',')
        return {
            kind: 'custom',
            name: matchedItem.name || '(unnamed error)',
            canonicalName: `${matchedItem.name || ''}(${types})`,
            args,
            contract: {
                name: matchedContract.name || '(unnamed)',
                address: matchedContract.address
            }
        }
    } catch {
        return { kind: 'raw', data }
    }
}

export interface DecodedFrameCall {
    fnName: string
    canonicalName: string
    contract: ContractRef
    inputs: Array<{ name: string; type: string; value: any }>
    outputs: Array<{ name: string; type: string; value: any }> | null
}

// Decodes a call frame's `input` (calldata) and `output` (return data) against
// the same ABI function entry. Used by the internal-trace renderer.
export function decodeFrameCall(
    contracts: Entities.Contract[],
    targetAddress: string | null | undefined,
    calldata: string,
    outputData?: string
): DecodedFrameCall | null {
    if (!calldata || calldata.length < 10) return null
    const selector = calldata.slice(0, 10).toLowerCase()

    let chosen: { item: AbiItem; fn: abi.Function; contract: Entities.Contract } | null = null
    const target = targetAddress ? findContractByAddress(contracts, targetAddress) : null

    const search = (c: Entities.Contract): boolean => {
        const items = asArray(c.abi)
        for (const item of items) {
            if (item.type !== 'function') continue
            try {
                const fn = new abi.Function(item as abi.Function.Definition)
                if (fn.signature.toLowerCase() === selector) {
                    chosen = { item, fn, contract: c }
                    return true
                }
            } catch { /* skip */ }
        }
        return false
    }

    if (target) search(target)
    if (!chosen) {
        for (const c of contracts) {
            if (search(c)) break
        }
    }
    if (!chosen) return null

    const def = (chosen as any).item as abi.Function.Definition
    const fnObj = (chosen as any).fn as abi.Function
    const contractEntry = (chosen as any).contract as Entities.Contract

    let inputs: DecodedFrameCall['inputs'] = []
    try {
        const argsHex = '0x' + calldata.slice(10)
        const decodedInputs = abi.decodeParameters(def.inputs as any[], argsHex)
        inputs = (def.inputs || []).map((inp, i) => ({
            name: inp.name || `arg${i}`,
            type: inp.type,
            value: decodedInputs[i]
        }))
    } catch { /* leave empty */ }

    let outputs: DecodedFrameCall['outputs'] = null
    if (outputData && outputData !== '0x' && def.outputs && def.outputs.length > 0) {
        try {
            const decodedOutputs = abi.decodeParameters(def.outputs as any[], outputData)
            outputs = def.outputs.map((out, i) => ({
                name: out.name || '',
                type: out.type,
                value: decodedOutputs[i]
            }))
        } catch { /* leave null */ }
    }

    return {
        fnName: def.name,
        canonicalName: fnObj.canonicalName,
        contract: {
            name: contractEntry.name || '(unnamed)',
            address: contractEntry.address
        },
        inputs,
        outputs
    }
}

export function decodeLog(
    contracts: Entities.Contract[],
    log: { address: string; topics: string[]; data: string }
): DecodedLog | null {
    if (!log.topics || log.topics.length === 0) return null
    const topic0 = log.topics[0].toLowerCase()

    let chosen: { item: AbiItem; ev: abi.Event; contract: Entities.Contract } | null = null

    const target = findContractByAddress(contracts, log.address)

    const search = (c: Entities.Contract) => {
        const items = asArray(c.abi)
        for (const item of items) {
            if (item.type !== 'event' || item.anonymous) continue
            try {
                const ev = new abi.Event(item as abi.Event.Definition)
                if (ev.signature.toLowerCase() === topic0) {
                    chosen = { item, ev, contract: c }
                    return true
                }
            } catch {
                // skip
            }
        }
        return false
    }

    if (target && search(target)) {
        // matched on the emitting contract
    } else {
        for (const c of contracts) {
            if (search(c)) break
        }
    }
    if (!chosen) return null

    const def = (chosen as any).item as abi.Event.Definition
    const evObj = (chosen as any).ev as abi.Event
    const contractEntry = (chosen as any).contract as Entities.Contract

    try {
        const decoded = evObj.decode(log.data, log.topics)
        const args = (def.inputs || []).map((inp, i) => ({
            name: inp.name || `arg${i}`,
            type: inp.type,
            indexed: !!inp.indexed,
            value: decoded[i]
        }))
        return {
            canonicalName: evObj.canonicalName,
            eventName: def.name,
            args,
            contract: {
                name: contractEntry.name || '(unnamed)',
                address: contractEntry.address
            }
        }
    } catch {
        return null
    }
}

export function lookupBySelector(
    contracts: Entities.Contract[],
    selector: string
): FunctionHit[] {
    const needle = selector.toLowerCase()
    const hits: FunctionHit[] = []
    for (const c of contracts) {
        const items = asArray(c.abi)
        for (const item of items) {
            if (item.type !== 'function') continue
            try {
                const fn = new abi.Function(item as abi.Function.Definition)
                if (fn.signature.toLowerCase() === needle) {
                    hits.push({
                        kind: 'function',
                        selector: fn.signature.toLowerCase(),
                        canonicalName: fn.canonicalName,
                        definition: item as abi.Function.Definition,
                        contract: { name: c.name || '(unnamed)', address: c.address }
                    })
                }
            } catch {
                // Malformed function in this ABI — skip.
            }
        }
    }
    return hits
}
