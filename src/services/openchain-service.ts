// OpenChain signature lookup.
//
// OpenChain (api.openchain.xyz) hosts a massive cross-chain signature DB
// scraped from Ethereum and other EVM chains. We use it as a fallback for
// VeChain contracts that don't have b32 entries — common for forks of
// Ethereum protocols (Uniswap-style DEXes, Aave-style lending, etc.) where
// the selectors/topics match Ethereum but b32 hasn't catalogued the fork.
//
// OpenChain returns canonical signatures only (e.g. `transfer(address,uint256)`),
// not full ABI items. We parse the signature back into an ABI item so the
// existing decoders work — for events we have to guess the indexed pattern
// since canonical sigs don't carry that info.

import DB, { Entities } from '../database'

const OPENCHAIN_URL = 'https://api.openchain.xyz/signature-database/v1/lookup'

const inflight = new Map<string, Promise<Entities.OpenChainSignature | null>>()

function cacheKey(kind: 'function' | 'event', hash: string): string {
    return `${kind}:${hash.toLowerCase()}`
}

interface OpenChainResponse {
    ok?: boolean
    result?: {
        function?: Record<string, Array<{ name: string; filtered?: boolean }> | null>
        event?: Record<string, Array<{ name: string; filtered?: boolean }> | null>
    }
}

// Picks the best canonical signature from OpenChain's response. Multiple
// matches are common (selector collisions); we drop entries flagged
// `filtered` (auto-generated names like `func_a1b2c3d4()`) and take the
// first remaining hit — OpenChain returns them in popularity-ish order.
function pickBestSignature(entries: Array<{ name: string; filtered?: boolean }> | null | undefined): string | null {
    if (!entries || entries.length === 0) return null
    const usable = entries.filter((e) => !e.filtered)
    const list = usable.length > 0 ? usable : entries
    return list[0].name
}

async function fetchFromOpenChain(
    kind: 'function' | 'event',
    hash: string
): Promise<string | null> {
    const params = new URLSearchParams()
    params.set(kind, hash)
    const url = `${OPENCHAIN_URL}?${params.toString()}&filter=true`
    let res: Response
    try {
        res = await fetch(url)
    } catch {
        return null
    }
    if (!res.ok) return null
    let data: OpenChainResponse
    try {
        data = await res.json()
    } catch {
        return null
    }
    if (!data || !data.ok || !data.result) return null
    const bucket = kind === 'function' ? data.result.function : data.result.event
    if (!bucket) return null
    return pickBestSignature(bucket[hash.toLowerCase()])
}

export async function fetchSignature(
    kind: 'function' | 'event',
    hash: string
): Promise<Entities.OpenChainSignature | null> {
    const key = cacheKey(kind, hash)
    const pending = inflight.get(key)
    if (pending) return pending

    const promise = (async () => {
        const normalized = hash.toLowerCase()
        const existing = await DB.openchainSignatures
            .where('[hash+kind]')
            .equals([normalized, kind])
            .first()
        if (existing) {
            return existing.miss ? null : existing
        }

        const sig = await fetchFromOpenChain(kind, normalized)

        if (!sig) {
            try {
                await DB.openchainSignatures.add({
                    hash: normalized,
                    kind,
                    canonicalSignature: null,
                    miss: true,
                    fetchedTime: Date.now()
                })
            } catch { /* race — ignore */ }
            return null
        }

        const entry: Entities.OpenChainSignature = {
            hash: normalized,
            kind,
            canonicalSignature: sig,
            fetchedTime: Date.now()
        }
        try {
            const id = await DB.openchainSignatures.add(entry)
            entry.id = typeof id === 'number' ? id : undefined
        } catch {
            const fresh = await DB.openchainSignatures
                .where('[hash+kind]')
                .equals([normalized, kind])
                .first()
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

// Batched lookup. Significantly faster than calling fetchSignature in a loop:
// one HTTP request can resolve up to ~50 hashes at once. Cached entries (hits
// and misses) are returned without hitting the network.
export async function fetchSignatures(
    kind: 'function' | 'event',
    hashes: string[]
): Promise<Map<string, Entities.OpenChainSignature>> {
    const out = new Map<string, Entities.OpenChainSignature>()
    if (hashes.length === 0) return out

    const normalized = Array.from(new Set(hashes.map((h) => h.toLowerCase())))
    const uncached: string[] = []

    // First pass: read the cache for everything we already know.
    await Promise.all(
        normalized.map(async (hash) => {
            const existing = await DB.openchainSignatures
                .where('[hash+kind]')
                .equals([hash, kind])
                .first()
            if (existing) {
                if (!existing.miss) out.set(hash, existing)
            } else {
                uncached.push(hash)
            }
        })
    )

    if (uncached.length === 0) return out

    // Chunk to keep URL length sane and respect any per-request limit. 50
    // function selectors (10 chars each + commas) ≈ 560 chars of query
    // string, well under the safe ~2KB limit.
    const CHUNK = 50
    const chunks: string[][] = []
    for (let i = 0; i < uncached.length; i += CHUNK) {
        chunks.push(uncached.slice(i, i + CHUNK))
    }

    const now = Date.now()

    await Promise.all(
        chunks.map(async (chunk) => {
            const params = new URLSearchParams()
            params.set(kind, chunk.join(','))
            params.set('filter', 'true')
            const url = `${OPENCHAIN_URL}?${params.toString()}`
            let res: Response
            try {
                res = await fetch(url)
            } catch {
                return
            }
            if (!res.ok) return
            let data: OpenChainResponse
            try {
                data = await res.json()
            } catch {
                return
            }
            if (!data || !data.ok || !data.result) return
            const bucket = kind === 'function' ? data.result.function : data.result.event
            if (!bucket) return

            // Persist hits and misses individually so each becomes a cached
            // future lookup. We add() instead of put() so concurrent inserts
            // are ignored (compound unique index prevents duplicates).
            for (const hash of chunk) {
                const sig = pickBestSignature(bucket[hash])
                if (sig) {
                    const entry: Entities.OpenChainSignature = {
                        hash,
                        kind,
                        canonicalSignature: sig,
                        fetchedTime: now
                    }
                    try {
                        const id = await DB.openchainSignatures.add(entry)
                        entry.id = typeof id === 'number' ? id : undefined
                    } catch { /* race — ignore */ }
                    out.set(hash, entry)
                } else {
                    try {
                        await DB.openchainSignatures.add({
                            hash,
                            kind,
                            canonicalSignature: null,
                            miss: true,
                            fetchedTime: now
                        })
                    } catch { /* race — ignore */ }
                }
            }
        })
    )

    return out
}

// Splits a comma-separated arg list at the top level (respecting nested
// tuples). `address,(uint256,uint256)[],bytes` → ['address', '(uint256,uint256)[]', 'bytes']
function splitTopLevelCommas(s: string): string[] {
    const out: string[] = []
    let depth = 0
    let cur = ''
    for (const ch of s) {
        if (ch === '(' || ch === '[') depth++
        else if (ch === ')' || ch === ']') depth--
        if (ch === ',' && depth === 0) {
            const trimmed = cur.trim()
            if (trimmed) out.push(trimmed)
            cur = ''
        } else {
            cur += ch
        }
    }
    const tail = cur.trim()
    if (tail) out.push(tail)
    return out
}

// Parses a canonical signature like `transfer(address,uint256)` into a name
// and arg-type list.
export function parseSignature(sig: string): { name: string; types: string[] } | null {
    const m = sig.match(/^([^\s(]+)\((.*)\)$/)
    if (!m) return null
    const name = m[1]
    const argsStr = m[2]
    if (!argsStr) return { name, types: [] }
    return { name, types: splitTopLevelCommas(argsStr) }
}

// Builds a function ABI item from a canonical signature.
export function signatureToFunctionItem(sig: string): any | null {
    const parsed = parseSignature(sig)
    if (!parsed) return null
    return {
        type: 'function',
        name: parsed.name,
        stateMutability: 'nonpayable',
        inputs: parsed.types.map((t, i) => ({ name: `arg${i}`, type: t })),
        outputs: []
    }
}

// Builds an event ABI item from a canonical signature with a best-guess
// indexed pattern. `numIndexed` should match `log.topics.length - 1`. By
// convention indexed params come first (OZ standard), which is what we
// emit here. Caller should also try the reverse pattern if decode fails.
export function signatureToEventItem(sig: string, numIndexed: number, indexedFromEnd = false): any | null {
    const parsed = parseSignature(sig)
    if (!parsed) return null
    const n = parsed.types.length
    if (numIndexed > n) return null
    const indexedAt = new Set<number>()
    if (indexedFromEnd) {
        for (let i = n - numIndexed; i < n; i++) indexedAt.add(i)
    } else {
        for (let i = 0; i < numIndexed; i++) indexedAt.add(i)
    }
    return {
        type: 'event',
        name: parsed.name,
        anonymous: false,
        inputs: parsed.types.map((t, i) => ({
            name: `arg${i}`,
            type: t,
            indexed: indexedAt.has(i)
        }))
    }
}
