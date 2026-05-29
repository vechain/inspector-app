// Thin REST wrapper for Thor endpoints that Connex doesn't expose with the
// options we need (e.g. simulating clauses at an arbitrary revision, or hitting
// /debug/tracers). All callers must pass an explicit nodeUrl — typically
// Vue.prototype.$nodeUrl from main.ts.

export interface SimulateClause {
    to: string | null
    value: string
    data: string
}

export interface SimulateOptions {
    caller?: string
    gas?: number
    gasPayer?: string
}

export interface SimulateOutput {
    data: string
    events: Array<{ address: string; topics: string[]; data: string }>
    transfers: Array<{ sender: string; recipient: string; amount: string }>
    gasUsed: number
    reverted: boolean
    vmError?: string
}

function joinUrl(base: string, path: string): string {
    const b = base.endsWith('/') ? base.slice(0, -1) : base
    return b + path
}

// POST /accounts/*?revision={revision}
//
// `revision` accepts a block ID, block number, or 'best'. Simulating at
// `blockNumber - 1` of the failing tx's block gives the pre-tx state — close
// enough to reproduce most reverts, but won't catch intra-block dependencies.
export async function simulateClauses(
    nodeUrl: string,
    clauses: SimulateClause[],
    options: SimulateOptions,
    revision: string | number
): Promise<SimulateOutput[]> {
    const url = joinUrl(nodeUrl, `/accounts/*?revision=${encodeURIComponent(String(revision))}`)
    const body: any = { clauses }
    if (options.caller) body.caller = options.caller
    if (options.gas) body.gas = options.gas
    if (options.gasPayer) body.gasPayer = options.gasPayer

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Simulation failed (${res.status}): ${text || res.statusText}`)
    }
    return res.json()
}

export interface AccountInfo {
    balance: string  // VET in wei (hex string)
    energy: string   // VTHO in wei (hex string)
    hasCode: boolean
}

export async function getAccount(nodeUrl: string, address: string): Promise<AccountInfo> {
    const res = await fetch(joinUrl(nodeUrl, `/accounts/${address}`))
    if (!res.ok) {
        throw new Error(`Failed to fetch account (${res.status})`)
    }
    return res.json()
}

export async function getAccountCode(nodeUrl: string, address: string): Promise<string> {
    const res = await fetch(joinUrl(nodeUrl, `/accounts/${address}/code`))
    if (!res.ok) {
        throw new Error(`Failed to fetch code (${res.status})`)
    }
    const json = await res.json()
    return (json && json.code) || '0x'
}

export async function getStorage(nodeUrl: string, address: string, key: string): Promise<string> {
    const res = await fetch(joinUrl(nodeUrl, `/accounts/${address}/storage/${key}`))
    if (!res.ok) {
        throw new Error(`Failed to read storage (${res.status})`)
    }
    const json = await res.json()
    return (json && json.value) || '0x' + '00'.repeat(32)
}

export interface BlockSummary {
    id: string
    number: number
    timestamp: number
    transactions: string[]
}

export async function getBlock(nodeUrl: string, revision: string | number): Promise<BlockSummary | null> {
    const res = await fetch(joinUrl(nodeUrl, `/blocks/${encodeURIComponent(String(revision))}`))
    if (!res.ok) {
        if (res.status === 404) return null
        throw new Error(`Failed to fetch block (${res.status})`)
    }
    return res.json()
}

// Track tracer-endpoint availability per node URL so we don't hammer the
// endpoint when it's disabled.
const tracerAvailability = new Map<string, Promise<boolean>>()

export interface TraceCallFrame {
    type: string                  // CALL, STATICCALL, DELEGATECALL, CREATE, etc.
    from: string
    to?: string
    value?: string
    gas?: string
    gasUsed?: string
    input?: string
    output?: string
    error?: string
    revertReason?: string
    calls?: TraceCallFrame[]
}

// Probes the /debug/tracers endpoint by attempting a tiny call-trace request.
// Cached per nodeUrl for the session.
export function isTracerAvailable(nodeUrl: string, sampleTarget: string): Promise<boolean> {
    const existing = tracerAvailability.get(nodeUrl)
    if (existing) return existing
    const probe = (async () => {
        try {
            const url = joinUrl(nodeUrl, '/debug/tracers')
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'call', target: sampleTarget })
            })
            // Some nodes return 403 / 404 / 501 when /debug is disabled.
            if (res.status === 403 || res.status === 404 || res.status === 501) {
                return false
            }
            // 400 means the endpoint is up but the target string was bad —
            // which is fine, the endpoint exists.
            return true
        } catch {
            return false
        }
    })()
    tracerAvailability.set(nodeUrl, probe)
    return probe
}

export async function traceClauseCall(
    nodeUrl: string,
    blockId: string,
    txIndex: number,
    clauseIndex: number
): Promise<TraceCallFrame> {
    const url = joinUrl(nodeUrl, '/debug/tracers')
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'call',
            target: `${blockId}/${txIndex}/${clauseIndex}`
        })
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Tracer failed (${res.status}): ${text || res.statusText}`)
    }
    return res.json()
}
