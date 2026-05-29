// Sourcify fallback for verified contract ABIs.
//
// When the local registry (user-imported + b32 built-ins) doesn't match a
// selector / topic0 / error selector, we try fetching the ABI from Sourcify
// by chain ID + address. Successes are cached in the sourcedAbis Dexie table
// so they persist across reloads.
//
// Network failures, 404s, and unsupported chains all fail silently — callers
// should treat null as "we tried and got nothing."

import DB, { Entities } from '../database'
import { getStorage } from './debug-service'

const SOURCIFY_SERVER = 'https://sourcify.dev/server'

// VeChain chain IDs as registered with Sourcify.
const CHAIN_IDS_BY_GENESIS: Record<string, number> = {
    '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a': 100009, // mainnet
    '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127': 100010  // testnet
}

// EIP-1967 implementation slot.
const SLOT_IMPL = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

function slotToAddress(slotValue: string): string | null {
    if (!slotValue || !slotValue.startsWith('0x')) return null
    const hex = slotValue.slice(2).padStart(64, '0')
    const addr = '0x' + hex.slice(24)
    if (/^0x0+$/.test(addr)) return null
    return addr.toLowerCase()
}

// Dedupes concurrent fetches for the same address within the session.
const inflight = new Map<string, Promise<Entities.SourcedAbi | null>>()

function cacheKey(genesisId: string, address: string): string {
    return `${genesisId}:${address.toLowerCase()}`
}

interface SourcifyFile {
    name: string
    path?: string
    content?: string
}

interface SourcifyResponse {
    status?: string
    files?: SourcifyFile[]
}

interface ContractMetadata {
    output?: {
        abi?: any[]
    }
    settings?: {
        compilationTarget?: Record<string, string>
    }
}

function extractAbiFromFiles(files: SourcifyFile[]): { abi: any[]; name?: string } | null {
    const metadataFile = files.find(
        (f) => f.name === 'metadata.json' || (f.path && f.path.endsWith('/metadata.json'))
    )
    if (!metadataFile || !metadataFile.content) return null
    try {
        const meta = JSON.parse(metadataFile.content) as ContractMetadata
        if (meta && meta.output && Array.isArray(meta.output.abi)) {
            const target = meta.settings && meta.settings.compilationTarget
            const targetName = target ? Object.values(target)[0] : undefined
            return { abi: meta.output.abi, name: targetName }
        }
    } catch {
        // malformed metadata
    }
    return null
}

async function fetchFromSourcify(
    chainId: number,
    address: string
): Promise<{ abi: any[]; name?: string } | null> {
    const url = `${SOURCIFY_SERVER}/files/any/${chainId}/${address}`
    let res: Response
    try {
        res = await fetch(url)
    } catch {
        return null
    }
    if (!res.ok) return null
    let data: SourcifyResponse
    try {
        data = await res.json()
    } catch {
        return null
    }
    if (!data || !Array.isArray(data.files)) return null
    return extractAbiFromFiles(data.files)
}

async function readImplAddress(nodeUrl: string, address: string): Promise<string | null> {
    try {
        const slot = await getStorage(nodeUrl, address, SLOT_IMPL)
        return slotToAddress(slot)
    } catch {
        return null
    }
}

export interface FetchOptions {
    // If provided, we read the EIP-1967 implementation slot first and prefer
    // the impl's ABI. This is essential for OZ TransparentUpgradeableProxy /
    // UUPS contracts (e.g. all VeBetterDAO deployments) — Sourcify has the
    // impl verified, not the proxy wrapper.
    nodeUrl?: string
}

// Returns a SourcedAbi entry for the given (genesis, address) — from the
// persistent cache if known, otherwise fetched from Sourcify and persisted.
// Returns null on miss (no record, no Sourcify entry, or chain unsupported).
export async function fetchAbiForAddress(
    genesisId: string,
    address: string,
    options: FetchOptions = {}
): Promise<Entities.SourcedAbi | null> {
    const key = cacheKey(genesisId, address)
    const pending = inflight.get(key)
    if (pending) return pending

    const promise = (async () => {
        const normalized = address.toLowerCase()
        const existing = await DB.sourcedAbis
            .where('[genesisId+address]')
            .equals([genesisId, normalized])
            .first()
        if (existing) return existing

        const chainId = CHAIN_IDS_BY_GENESIS[genesisId]
        if (!chainId) return null

        // Prefer impl ABI when this address is an EIP-1967 proxy.
        let implAddress: string | undefined
        let result: { abi: any[]; name?: string } | null = null
        if (options.nodeUrl) {
            const impl = await readImplAddress(options.nodeUrl, normalized)
            if (impl) {
                implAddress = impl
                result = await fetchFromSourcify(chainId, impl)
            }
        }

        // Either not a proxy, or impl wasn't on Sourcify — try the address itself.
        if (!result) {
            result = await fetchFromSourcify(chainId, normalized)
        }
        if (!result) return null

        const entry: Entities.SourcedAbi = {
            genesisId,
            address: normalized,
            abi: result.abi,
            source: 'sourcify',
            fetchedTime: Date.now(),
            contractName: result.name,
            implAddress
        }
        try {
            const id = await DB.sourcedAbis.add(entry)
            entry.id = typeof id === 'number' ? id : undefined
        } catch {
            // Concurrent insert race — re-read.
            const fresh = await DB.sourcedAbis
                .where('[genesisId+address]')
                .equals([genesisId, normalized])
                .first()
            if (fresh) return fresh
        }
        return entry
    })()

    inflight.set(key, promise)
    try {
        return await promise
    } finally {
        // Keep successful hits in flight cache so repeated calls within the
        // session resolve immediately; clear failures so retries are possible.
        const resolved = await promise.catch(() => null)
        if (!resolved) inflight.delete(key)
    }
}

export async function loadSourcedAbis(genesisId: string): Promise<Entities.SourcedAbi[]> {
    return DB.sourcedAbis.where('genesisId').equals(genesisId).toArray()
}
