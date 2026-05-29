<template>
    <div class="card-block">
        <div class="block-head">
            <span class="head-title">
                Internal trace
                <button class="help-btn" @click="helpOpen = true" title="How do I read this?">
                    <b-icon icon="question-circle" size="is-small"></b-icon>
                </button>
            </span>
            <button
                v-if="!loading && !loaded && !unavailable"
                type="button"
                class="button is-small"
                @click="load"
            >
                Load trace
            </button>
            <button
                v-else-if="loaded && !unavailable"
                type="button"
                class="button is-small is-light"
                @click="load"
            >
                Reload
            </button>
        </div>

        <div v-if="loading" class="state-row">
            <b-icon icon="circle-notch" custom-class="fa-spin"></b-icon>
            <span>Tracing clauses…</span>
        </div>

        <div v-else-if="unavailable" class="warning-box">
            <b-icon icon="info-circle" custom-class="has-text-warning"></b-icon>
            <div>
                <strong>Tracer endpoint unavailable on this node.</strong>
                <div class="warning-aux">
                    Internal call traces come from <code>POST /debug/tracers</code>, which most public nodes leave disabled.
                    Run a self-hosted Thor instance with <code>--api-allowed-tracers all</code> (or your network's equivalent) to enable it.
                </div>
            </div>
        </div>

        <div v-else-if="error" class="warning-box">
            <b-icon icon="exclamation-triangle" custom-class="has-text-warning"></b-icon>
            <span>{{ error }}</span>
        </div>

        <div v-else-if="loaded">
            <div v-if="!frames.length" class="empty-mini">No trace data returned.</div>
            <div v-for="(entry, i) in frames" :key="i" class="trace-clause">
                <div class="trace-clause-head">
                    <span class="clause-tag">clause #{{ entry.clauseIndex }}</span>
                    <span v-if="entry.error" class="clause-err">{{ entry.error }}</span>
                </div>

                <TraceFrame
                    v-if="entry.frame"
                    :frame="entry.frame"
                    :contracts="contracts"
                    :extra-signatures="extraSignatures"
                    :depth="0"
                />
                <div v-else class="empty-mini">No frame available for this clause.</div>
            </div>
        </div>

        <div v-else class="hint">
            Trace is loaded on demand. Tap "Load trace" — large transactions may take a moment.
        </div>

        <b-modal :active.sync="helpOpen" has-modal-card trap-focus>
            <div class="modal-card help-modal">
                <header class="modal-card-head">
                    <p class="modal-card-title">How to read the internal trace</p>
                    <button type="button" class="delete" @click="helpOpen = false" aria-label="Close"></button>
                </header>
                <section class="modal-card-body">
                    <div class="help-body">
                        <p>
                            The trace is the actual EVM call tree from the failing transaction, fetched via
                            <code>POST /debug/tracers</code> on the connected node. Each row is one EVM frame —
                            a call, delegatecall, staticcall, or contract creation.
                        </p>

                        <p><strong>Row anatomy</strong></p>
                        <pre class="help-pre">▼ [CALL]  90,257  Contract.method(arg = value) =&gt; result  0xabc…123</pre>
                        <ul>
                            <li><strong>▼ / ▶</strong> — expand or collapse this frame's children. Click anywhere on the row to toggle.</li>
                            <li><strong>Type chip</strong> — colour-coded EVM operation:
                                <ul>
                                    <li><span class="legend is-call">CALL</span> regular external call</li>
                                    <li><span class="legend is-static">STATICCALL</span> read-only call (no state changes allowed)</li>
                                    <li><span class="legend is-delegate">DELEGATECALL</span> proxy-style call that executes target's code in the caller's storage context</li>
                                    <li><span class="legend is-create">CREATE</span> / <span class="legend is-create">CREATE2</span> contract deployment</li>
                                </ul>
                            </li>
                            <li><strong>Gas</strong> — gas consumed by this frame (right-aligned column).</li>
                            <li><strong>Decoded call</strong> — <code>Contract.method(arg = value)</code> when we have an ABI for the target, otherwise the raw 4-byte selector. Return value follows <code>=&gt;</code> when the function has typed outputs we can decode. Addresses inside args resolve to contract names if known.</li>
                            <li><strong>Address chip</strong> at the end — the target address of this frame. For DELEGATECALL chains this is the impl address; the storage context stays with the outer caller.</li>
                            <li><strong>Red frames</strong> — this call failed. The right edge shows the specific error (<code>execution reverted</code>, <code>out of gas</code>, …). The red left border traces the failure path up the tree.</li>
                        </ul>

                        <p><strong>Reading a revert</strong></p>
                        <p>
                            For a Solidity <code>require()</code> / <code>revert(CustomError)</code>, the revert data
                            propagates from the failing frame up to the top — the outer frame's output decodes to the
                            same revert. The Revert reason card above this one already shows that decoded version.
                        </p>
                        <p>
                            For EVM-level halts (<code>out of gas</code>, invalid opcode), only the failing frame
                            shows the cause — outer frames just see "call returned 0". Walk down the red border to
                            find the originating frame.
                        </p>

                        <p><strong>Tip</strong></p>
                        <p>
                            Frames are collapsed past depth 2 by default to keep the initial view readable. Errored
                            frames always start expanded so the failure path is visible.
                        </p>
                    </div>
                </section>
                <footer class="modal-card-foot">
                    <button type="button" class="button" @click="helpOpen = false">Close</button>
                </footer>
            </div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Entities } from '../../database'
import { ensureAbisForAddresses, decodeCalldata } from '../../utils/abi-registry'
import {
    isTracerAvailable,
    traceClauseCall,
    getBlock,
    TraceCallFrame
} from '../../services/debug-service'
import { fetchSignature as fetchB32Signature } from '../../services/b32-service'
import {
    fetchSignatures as fetchOpenChainSignatures,
    signatureToFunctionItem
} from '../../services/openchain-service'
import TraceFrame from './TraceFrame.vue'

interface ClauseTraceEntry {
    clauseIndex: number
    frame: TraceCallFrame | null
    error: string | null
}

@Component({
    components: { TraceFrame }
})
export default class InternalTraceSection extends Vue {
    @Prop({ type: Object, required: true }) tx!: Connex.Thor.Transaction
    @Prop({ type: Object, required: true }) receipt!: Connex.Thor.Transaction.Receipt
    @Prop({ type: Array, required: true }) contracts!: Entities.Contract[]

    private loading: boolean = false
    private loaded: boolean = false
    private unavailable: boolean = false
    private error: string = ''
    private frames: ClauseTraceEntry[] = []
    private helpOpen: boolean = false
    // selector → { item: AbiItem, source: 'b32' | 'openchain' }, populated
    // for frame inputs the local registry can't decode.
    private extraSignatures: Record<string, { item: any; source: 'b32' | 'openchain' }> = {}

    private collectFrameAddresses(frame: TraceCallFrame, into: Set<string>) {
        if (frame.to && /^0x[0-9a-fA-F]{40}$/.test(frame.to)) {
            into.add(frame.to.toLowerCase())
        }
        if (frame.calls) {
            for (const child of frame.calls) {
                this.collectFrameAddresses(child, into)
            }
        }
    }

    private collectFrameSelectors(
        frame: TraceCallFrame,
        contracts: Entities.Contract[],
        into: Set<string>
    ) {
        if (frame.input && frame.input.length >= 10) {
            // Only collect selectors we can't already decode locally.
            if (!decodeCalldata(contracts, frame.to || null, frame.input)) {
                into.add(frame.input.slice(0, 10).toLowerCase())
            }
        }
        if (frame.calls) {
            for (const child of frame.calls) {
                this.collectFrameSelectors(child, contracts, into)
            }
        }
    }

    private async enrichTraceAddresses(entries: ClauseTraceEntry[]) {
        const addrs = new Set<string>()
        for (const entry of entries) {
            if (entry.frame) this.collectFrameAddresses(entry.frame, addrs)
        }

        // Step 1: Sourcify enrichment for addresses (impls in delegatecall
        // chains, helper contracts, etc.)
        let refreshed = this.contracts
        if (addrs.size > 0) {
            try {
                refreshed = await ensureAbisForAddresses(
                    this.$connex.thor.genesis.id,
                    Array.from(addrs),
                    this.$nodeUrl
                )
                if (refreshed.length !== this.contracts.length) {
                    this.$emit('contracts-updated', refreshed)
                }
            } catch {
                // silent — Sourcify is best-effort
            }
        }

        // Step 2: signature DB enrichment for selectors the refreshed registry
        // still can't decode. b32 first (per-selector files; parallel), then
        // OpenChain (one batched HTTP request for the leftovers). Results
        // are merged into a local map and committed to extraSignatures in
        // one assignment so all frames decode together rather than flickering
        // in one by one.
        const selectors = new Set<string>()
        for (const entry of entries) {
            if (entry.frame) this.collectFrameSelectors(entry.frame, refreshed, selectors)
        }
        if (selectors.size === 0) return

        const pending: Record<string, { item: any; source: 'b32' | 'openchain' }> = {}

        // b32: one file per selector (cached locally including misses), so
        // we fire them in parallel.
        const b32Results = await Promise.all(
            Array.from(selectors).map(async (sel) => {
                const b32 = await fetchB32Signature(sel)
                if (b32 && b32.item && b32.item.type === 'function') {
                    return [sel, b32.item] as [string, any]
                }
                return null
            })
        )
        const b32Hits = new Set<string>()
        for (const r of b32Results) {
            if (!r) continue
            pending[r[0]] = { item: r[1], source: 'b32' }
            b32Hits.add(r[0])
        }

        // OpenChain: batch the leftovers. One HTTP request (chunked to 50)
        // resolves them all instead of N round-trips.
        const leftover = Array.from(selectors).filter((s) => !b32Hits.has(s))
        if (leftover.length > 0) {
            const ocMap = await fetchOpenChainSignatures('function', leftover)
            for (const [sel, sig] of ocMap.entries()) {
                if (!sig.canonicalSignature) continue
                const item = signatureToFunctionItem(sig.canonicalSignature)
                if (item) pending[sel] = { item, source: 'openchain' }
            }
        }

        // Single reactive commit — replaces the whole map so Vue's reactivity
        // fires once. All frames re-decode at the same moment.
        if (Object.keys(pending).length > 0) {
            this.extraSignatures = { ...this.extraSignatures, ...pending }
        }
    }

    private async load() {
        this.loading = true
        this.error = ''
        this.frames = []
        this.unavailable = false
        try {
            // Probe availability with a deliberately invalid target — a 400
            // means "endpoint up, bad input", which is what we want.
            const sampleTarget = `${this.receipt.meta.blockID}/0/0`
            const available = await isTracerAvailable(this.$nodeUrl, sampleTarget)
            if (!available) {
                this.unavailable = true
                return
            }

            // Find this tx's index inside its block.
            const block = await getBlock(this.$nodeUrl, this.receipt.meta.blockID)
            if (!block) {
                this.error = 'Could not load the containing block.'
                return
            }
            const txIndex = block.transactions.findIndex(
                (id) => id.toLowerCase() === this.tx.id.toLowerCase()
            )
            if (txIndex === -1) {
                this.error = 'Transaction not found in its block.'
                return
            }

            // Trace each clause independently. Continue on per-clause failure
            // so partial results are still useful.
            const entries: ClauseTraceEntry[] = []
            for (let i = 0; i < this.tx.clauses.length; i++) {
                try {
                    const frame = await traceClauseCall(
                        this.$nodeUrl,
                        this.receipt.meta.blockID,
                        txIndex,
                        i
                    )
                    entries.push({ clauseIndex: i, frame, error: null })
                } catch (e: any) {
                    entries.push({
                        clauseIndex: i,
                        frame: null,
                        error: e && e.message ? e.message : 'Trace failed.'
                    })
                }
            }
            this.frames = entries
            this.loaded = true

            // Trace frames typically reach impls / helper contracts that the
            // top-level tx never touches directly. Pull their ABIs from
            // Sourcify (proxy-aware) so decoding lights up across the page.
            this.enrichTraceAddresses(entries)
        } catch (e: any) {
            this.error = e && e.message ? e.message : 'Failed to load trace.'
        } finally {
            this.loading = false
        }
    }
}
</script>

<style lang="scss" scoped>
.card-block {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.25rem;
}

.block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border-color);
}
.head-title {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--text-color);
}

.state-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-light);
    padding: 0.4rem 0;
    font-size: 0.9rem;
}

.warning-box {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 165, 32, 0.08);
    border: 1px solid rgba(255, 165, 32, 0.25);
    border-radius: 6px;
    color: var(--text-color);
    font-size: 0.85rem;
}
.warning-box strong {
    color: var(--text-color);
    font-weight: 600;
}
.warning-aux {
    margin-top: 0.25rem;
    font-size: 0.78rem;
    color: var(--text-color-light);
}
.warning-aux code {
    color: var(--text-color);
}

.empty-mini {
    font-size: 0.85rem;
    color: var(--text-color-light);
    padding: 0.4rem 0;
    font-style: italic;
}

.hint {
    font-size: 0.85rem;
    color: var(--text-color-light);
}

.trace-clause {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.6rem 0.7rem;
    background: var(--code-bg);
    margin-bottom: 0.5rem;
}
.trace-clause:last-child {
    margin-bottom: 0;
}
.trace-clause-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}
.clause-tag {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    padding: 0.1rem 0.45rem;
    border-radius: 10px;
    font-size: 0.7rem;
    color: var(--text-color-light);
    font-weight: 600;
}
.clause-err {
    color: #d8294d;
    font-size: 0.8rem;
}

.help-btn {
    background: transparent;
    border: none;
    color: var(--text-color-light);
    cursor: pointer;
    padding: 0 0 0 0.25rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    transition: color 0.15s ease;
}
.help-btn:hover,
.help-btn:focus {
    outline: none;
    color: var(--primary-color);
}

::v-deep .help-modal .modal-card {
    max-width: 620px;
    width: 100%;
    background: var(--card-background);
}
::v-deep .help-modal .modal-card-head,
::v-deep .help-modal .modal-card-foot {
    background: var(--card-background);
    border-color: var(--border-color);
}
::v-deep .help-modal .modal-card-title {
    color: var(--text-color);
    font-size: 1rem;
}
::v-deep .help-modal .modal-card-body {
    background: var(--card-background);
    color: var(--text-color);
}
::v-deep .help-modal .help-body {
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--text-color);
}
::v-deep .help-modal .help-body p {
    margin: 0 0 0.75rem 0;
}
::v-deep .help-modal .help-body p:last-child {
    margin-bottom: 0;
}
::v-deep .help-modal .help-body ul {
    margin: 0 0 0.85rem 1.25rem;
    padding: 0;
    color: var(--text-color-light);
}
::v-deep .help-modal .help-body ul ul {
    margin-top: 0.3rem;
    margin-bottom: 0;
}
::v-deep .help-modal .help-body li {
    margin-bottom: 0.35rem;
}
::v-deep .help-modal .help-body strong {
    color: var(--text-color);
    font-weight: 600;
}
::v-deep .help-modal .help-body code {
    font-size: 0.8rem;
    color: var(--text-color);
}
::v-deep .help-modal .help-body .help-pre {
    font-family: monospace;
    font-size: 0.78rem;
    background: var(--code-bg);
    padding: 0.5rem 0.7rem;
    border-radius: 4px;
    color: var(--text-color);
    margin: 0 0 0.85rem 0;
    overflow-x: auto;
}
::v-deep .help-modal .help-body .legend {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.08rem 0.4rem;
    border-radius: 3px;
    margin: 0 0.15rem;
    vertical-align: middle;
}
::v-deep .help-modal .help-body .legend.is-call     { background: rgba(50, 115, 220, 0.18); color: var(--primary-color); }
::v-deep .help-modal .help-body .legend.is-static   { background: rgba(50, 175, 50, 0.18); color: #228822; }
::v-deep .help-modal .help-body .legend.is-delegate { background: rgba(255, 165, 32, 0.18); color: #b88010; }
::v-deep .help-modal .help-body .legend.is-create   { background: rgba(127, 86, 217, 0.22); color: #7f56d9; }
</style>
