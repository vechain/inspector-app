import Connex from '@vechain/connex'

export interface DiscoveredRole {
    name: string
    hash: string
}

const CACHE_KEY = 'tx-builder-roles-cache-v1'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const DEFAULT_ADMIN_ROLE = '0x' + '0'.repeat(64)

interface CacheEntry {
    timestamp: number
    roles: DiscoveredRole[]
}

interface CacheShape {
    [key: string]: CacheEntry
}

function readCache(): CacheShape {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return {}
        return JSON.parse(raw) as CacheShape
    } catch {
        return {}
    }
}

function writeCache(cache: CacheShape) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {
        /* ignore quota errors */
    }
}

function cacheKey(network: string, address: string): string {
    return `${network.toLowerCase()}:${address.toLowerCase()}`
}

function isRoleGetter(item: any): boolean {
    if (!item || item.type !== 'function') return false
    if (item.inputs && item.inputs.length > 0) return false
    if (!item.outputs || item.outputs.length !== 1) return false
    if (item.outputs[0].type !== 'bytes32') return false
    const mutability = item.stateMutability || (item.constant ? 'view' : 'nonpayable')
    if (mutability !== 'view' && mutability !== 'pure') return false
    if (!item.name || !/^[A-Z][A-Z0-9_]*$/.test(item.name)) return false
    return true
}

export function isRoleParam(input: ABI.InputItem | undefined): boolean {
    if (!input) return false
    return input.type === 'bytes32' && /role/i.test(input.name || '')
}

export async function discoverContractRoles(
    connex: Connex,
    network: string,
    address: string,
    abi: any[]
): Promise<DiscoveredRole[]> {
    const key = cacheKey(network, address)
    const cache = readCache()
    const entry = cache[key]
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.roles
    }

    const getters = (abi || []).filter(isRoleGetter)
    const account = connex.thor.account(address.toLowerCase())

    const calls = getters.map(async (g: any) => {
        try {
            const method = account.method(g)
            const result = await method.call()
            if (result.reverted) return null
            const hash = result.decoded && (result.decoded['0'] as string)
            if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return null
            return { name: g.name as string, hash: hash.toLowerCase() }
        } catch {
            return null
        }
    })

    const settled = await Promise.all(calls)
    const seen = new Set<string>()
    const roles: DiscoveredRole[] = [{ name: 'DEFAULT_ADMIN_ROLE', hash: DEFAULT_ADMIN_ROLE }]
    seen.add(DEFAULT_ADMIN_ROLE)
    for (const r of settled) {
        if (!r) continue
        if (seen.has(r.hash)) continue
        seen.add(r.hash)
        roles.push(r)
    }

    roles.sort((a, b) => {
        if (a.name === 'DEFAULT_ADMIN_ROLE') return -1
        if (b.name === 'DEFAULT_ADMIN_ROLE') return 1
        return a.name.localeCompare(b.name)
    })

    cache[key] = { timestamp: Date.now(), roles }
    writeCache(cache)

    return roles
}

export function clearRoleCache(network?: string, address?: string) {
    if (!network || !address) {
        localStorage.removeItem(CACHE_KEY)
        return
    }
    const cache = readCache()
    delete cache[cacheKey(network, address)]
    writeCache(cache)
}
