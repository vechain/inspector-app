// vechain/b32 signature lookup.
//
// b32 maintains a per-keccak ABI item directory at
// `/ABIs/keccak/0x<hash>.json` — keyed by:
//   * 4-byte function selectors (function items)
//   * 32-byte event topic0s    (event items)
//
// We use this as a fallback when our local registry (user-imported + built-in
// b32 contract ABIs + Sourcify) can't decode a selector / topic0. Even when
// we don't have the parent contract, b32 usually has the canonical signature,
// which is enough to render a useful "this is `transfer(address,uint256)`"
// answer and to decode arguments.
//
// Persistent cache in DB.b32Signatures, with negative caching for 404s so we
// don't retry every panel mount.

import DB, { Entities } from '../database'

const B32_BASE = 'https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/keccak'

const inflight = new Map<string, Promise<Entities.B32Signature | null>>()

function normalizeHash(hash: string): string {
    return hash.toLowerCase()
}

async function fetchFromB32(hash: string): Promise<any | null> {
    const url = `${B32_BASE}/${hash}.json`
    let res: Response
    try {
        res = await fetch(url)
    } catch {
        return null
    }
    if (!res.ok) return null
    try {
        return await res.json()
    } catch {
        return null
    }
}

// Returns the cached or freshly-fetched B32Signature row for the given hash.
// Returns null if b32 has no entry (after caching the miss).
export async function fetchSignature(hash: string): Promise<Entities.B32Signature | null> {
    const key = normalizeHash(hash)
    const pending = inflight.get(key)
    if (pending) return pending

    const promise = (async () => {
        const existing = await DB.b32Signatures.where('hash').equals(key).first()
        if (existing) {
            // Negative cache hit — treat as no match.
            if (existing.miss) return null
            return existing
        }

        const item = await fetchFromB32(key)

        if (!item) {
            // Persist the miss so repeat lookups are instant.
            const missEntry: Entities.B32Signature = {
                hash: key,
                item: null,
                miss: true,
                fetchedTime: Date.now()
            }
            try {
                await DB.b32Signatures.add(missEntry)
            } catch {
                // Concurrent insert race — ignore.
            }
            return null
        }

        const entry: Entities.B32Signature = {
            hash: key,
            item,
            fetchedTime: Date.now()
        }
        try {
            const id = await DB.b32Signatures.add(entry)
            entry.id = typeof id === 'number' ? id : undefined
        } catch {
            const fresh = await DB.b32Signatures.where('hash').equals(key).first()
            if (fresh && !fresh.miss) return fresh
        }
        return entry
    })()

    inflight.set(key, promise)
    try {
        return await promise
    } finally {
        const resolved = await promise.catch(() => null)
        if (!resolved) inflight.delete(key)
    }
}

// Convenience: builds a canonical signature like "transfer(address,uint256)"
// from a b32 ABI item.
export function canonicalSignature(item: any): string {
    if (!item || !item.name) return ''
    const inputs = Array.isArray(item.inputs) ? item.inputs : []
    const types = inputs.map((i: any) => i.type || '').join(',')
    return `${item.name}(${types})`
}
