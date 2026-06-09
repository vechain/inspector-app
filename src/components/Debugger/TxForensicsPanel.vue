<template>
    <div class="forensics">
        <div v-if="loading" class="state-row">
            <b-icon icon="circle-notch" custom-class="fa-spin"></b-icon>
            <span>Fetching transaction…</span>
        </div>

        <div v-else-if="error" class="error-state">
            <b-icon icon="exclamation-triangle" custom-class="has-text-warning"></b-icon>
            <span>{{ error }}</span>
        </div>

        <template v-else-if="tx && receipt">
            <!-- Header -->
            <div class="card-block">
                <div class="block-head">
                    <div class="head-left">
                        <span class="head-title">Transaction</span>
                        <span
                            class="status-pill"
                            :class="receipt.reverted ? 'is-reverted' : 'is-success'"
                        >
                            <span class="status-dot"></span>
                            {{ receipt.reverted ? 'Reverted' : 'Success' }}
                        </span>
                    </div>
                    <a :href="$explorerTx(tx.id)" target="_blank" rel="noopener" class="external-link">
                        View on explorer
                        <b-icon icon="external-link-alt" size="is-small"></b-icon>
                    </a>
                </div>

                <div class="kv-grid">
                    <div class="kv-row">
                        <span class="kv-key">Tx ID</span>
                        <code class="kv-val is-family-monospace">{{ tx.id }}</code>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Block</span>
                        <span class="kv-val">
                            #{{ tx.meta && tx.meta.blockNumber }}
                            <span class="kv-aux">· {{ formatTimestamp(tx.meta && tx.meta.blockTimestamp) }}</span>
                        </span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Origin</span>
                        <code class="kv-val is-family-monospace">{{ tx.origin }}</code>
                    </div>
                    <div v-if="tx.delegator" class="kv-row">
                        <span class="kv-key">Delegator</span>
                        <code class="kv-val is-family-monospace">{{ tx.delegator }}</code>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Gas payer</span>
                        <code class="kv-val is-family-monospace">{{ receipt.gasPayer }}</code>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Gas</span>
                        <span class="kv-val">
                            {{ receipt.gasUsed.toLocaleString() }} used
                            <span class="kv-aux">/ {{ tx.gas.toLocaleString() }} limit</span>
                        </span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Paid</span>
                        <span class="kv-val">{{ formatVtho(receipt.paid) }} VTHO</span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Clauses</span>
                        <span class="kv-val">{{ tx.clauses.length }}</span>
                    </div>
                </div>
            </div>

            <!-- Revert reason (only shown for failed txs; placed right after the header
                 so the "why did this fail" answer is the first thing after the summary) -->
            <div v-if="receipt.reverted" class="card-block">
                <div class="block-head">
                    <span class="head-title">Revert reason</span>
                    <span v-if="revertClauseIndex !== null" class="head-aux">
                        from clause #{{ revertClauseIndex }}
                    </span>
                </div>

                <div v-if="revertLoading" class="state-row">
                    <b-icon icon="circle-notch" custom-class="fa-spin"></b-icon>
                    <span>Resolving revert reason…</span>
                </div>

                <div v-else-if="revertError" class="error-state inline">
                    <b-icon icon="exclamation-triangle" custom-class="has-text-warning"></b-icon>
                    <span>{{ revertError }}</span>
                </div>

                <template v-else-if="revert">
                    <div v-if="revert.kind === 'string'" class="revert-block is-string">
                        <span class="revert-label">Error(string)</span>
                        <code class="revert-message">{{ revert.message }}</code>
                    </div>

                    <div v-else-if="revert.kind === 'panic'" class="revert-block is-panic">
                        <span class="revert-label">Panic({{ revert.code }})</span>
                        <code class="revert-message">{{ revert.description }}</code>
                    </div>

                    <div v-else-if="revert.kind === 'custom'" class="revert-block is-custom">
                        <div class="revert-head">
                            <span class="revert-label">Custom error</span>
                            <code class="revert-name">{{ revert.canonicalName }}</code>
                            <span class="revert-contract">defined in {{ revert.contract.name }}</span>
                        </div>
                        <ul v-if="revert.args.length" class="arg-list">
                            <li v-for="(a, j) in revert.args" :key="j" class="arg-row">
                                <span class="arg-type">{{ a.type }}</span>
                                <span class="arg-name">{{ a.name }}</span>
                                <code class="arg-value is-family-monospace">{{ formatArg(a.value) }}</code>
                            </li>
                        </ul>
                    </div>

                    <div v-else-if="revert.kind === 'vm-error'" class="revert-block is-vm-error">
                        <div class="revert-head">
                            <span class="revert-label">EVM halt</span>
                            <code class="revert-name">{{ revert.error }}</code>
                        </div>
                        <p class="revert-aux">
                            The EVM stopped execution without returning revert data — typically out-of-gas, invalid opcode, or stack/storage overflow inside a sub-call.
                            <template v-if="revert.at && revert.at.to">
                                Surfaced in a <code>{{ revert.at.type }}</code> to <code class="is-family-monospace">{{ revert.at.to }}</code>.
                            </template>
                            See the Internal trace card below for the full call path.
                        </p>
                    </div>

                    <div v-else-if="revert.kind === 'empty'" class="revert-block is-raw">
                        <span class="revert-label">No revert data</span>
                        <span class="revert-aux">
                            The tx reverted without returning data (likely <code>require()</code> with no message, or an <code>assert</code>).
                        </span>
                    </div>

                    <div v-else-if="revert.kind === 'raw'" class="revert-block is-raw">
                        <span class="revert-label">Unknown revert data</span>
                        <span class="revert-aux">
                            Selector didn't match Error/Panic or any imported custom error. Import the contract that defines this error to decode it.
                        </span>
                        <code class="revert-raw is-family-monospace">{{ revert.data }}</code>
                    </div>

                    <p v-if="revertSource === 'trace'" class="revert-source-note">
                        <b-icon icon="check-circle" size="is-small" custom-class="source-icon-trace"></b-icon>
                        Decoded from <code>/debug/tracers</code> — reflects the actual on-chain state at the failing block.
                    </p>
                    <p v-else-if="revertSource === 'simulation'" class="revert-caveat">
                        Re-simulated at <code>blockNumber - 1</code> (tracer endpoint disabled on this node). Intra-block state effects from earlier transactions in the same block are not reproduced — the original revert may differ if your tx depended on them.
                    </p>
                </template>
            </div>

            <!-- Clauses -->
            <div class="card-block">
                <div class="block-head">
                    <span class="head-title">Clauses</span>
                </div>
                <div
                    v-for="(c, i) in tx.clauses"
                    :key="i"
                    class="clause-row"
                    :class="{ 'is-reverted': isClauseReverted(i) }"
                >
                    <div class="clause-head">
                        <span class="clause-index">#{{ i }}</span>
                        <span class="clause-chip" :class="clauseChipClass(c)">{{ clauseChipLabel(c) }}</span>

                        <span class="clause-call">
                            <template v-if="c.to === null">
                                <span class="contract-name">contract creation</span>
                                <template v-if="receipt.outputs[i] && receipt.outputs[i].contractAddress">
                                    <span class="dim-arrow">→</span>
                                    <span class="contract-name">{{ shortAddr(receipt.outputs[i].contractAddress) }}</span>
                                </template>
                            </template>
                            <template v-else-if="decodedCalls[i].decoded">
                                <template v-if="!decodedCalls[i].fromB32">
                                    <span class="contract-name">{{ decodedCalls[i].decoded.contract.name }}</span><span class="dim-dot">.</span><span class="fn-name">{{ decodedCalls[i].decoded.fnName }}</span>
                                </template>
                                <template v-else>
                                    <span v-if="targetName(c.to)" class="contract-name">{{ targetName(c.to) }}</span><span v-else class="contract-name is-unknown">unknown</span><span class="dim-dot">.</span><span class="fn-name">{{ decodedCalls[i].decoded.fnName }}</span>
                                </template>
                            </template>
                            <template v-else>
                                <span class="contract-name" :class="{ 'is-unknown': !targetName(c.to) }">{{ targetName(c.to) || 'unknown' }}</span>
                                <template v-if="rawSelectorFor(c.data)">
                                    <span class="dim-dot">.</span>
                                    <span class="fn-name is-raw">{{ rawSelectorFor(c.data) }}</span>
                                </template>
                            </template>
                        </span>

                        <span v-if="hasValue(c.value)" class="clause-value">
                            {{ formatVet(c.value) }} VET
                        </span>

                        <span v-if="isClauseReverted(i)" class="reverted-tag">reverted</span>

                        <span
                            v-if="c.to"
                            class="clause-addr"
                            :title="c.to + ' — click to copy'"
                            @click.stop.prevent="copyText(c.to, $event)"
                            @mousedown.stop
                            @mouseup.stop
                        >
                            <code class="is-family-monospace addr-text">{{ shortAddr(c.to) }}</code>
                            <b-icon icon="copy" size="is-small" custom-class="copy-icon"></b-icon>
                        </span>
                    </div>

                    <ul v-if="decodedCalls[i].decoded && decodedCalls[i].decoded.args.length" class="arg-list">
                        <li v-for="(a, j) in decodedCalls[i].decoded.args" :key="j" class="arg-row">
                            <span class="arg-type">{{ a.type }}</span>
                            <span class="arg-name">{{ a.name }}</span>
                            <code class="arg-value is-family-monospace">{{ formatArg(a.value) }}</code>
                        </li>
                    </ul>
                    <div
                        v-else-if="!decodedCalls[i].decoded && c.data && c.data !== '0x'"
                        class="raw-call"
                    >
                        <div class="raw-label">Raw calldata (no matching ABI)</div>
                        <code class="raw-data is-family-monospace">{{ c.data }}</code>
                    </div>
                </div>
            </div>

            <!-- Events -->
            <div class="card-block">
                <div class="block-head">
                    <span class="head-title">
                        Events
                        <span class="head-count">{{ totalEvents }}</span>
                    </span>
                </div>
                <div v-if="totalEvents === 0" class="empty-mini">No events emitted.</div>
                <template v-else>
                    <div v-for="(group, gi) in eventGroups" :key="gi" class="event-row">
                        <div class="event-head">
                            <span class="event-clause-tag">clause #{{ group.clauseIndex }}</span>
                            <template v-if="group.decoded">
                                <code class="event-name">{{ group.decoded.eventName }}</code>
                                <span class="event-contract">on {{ eventEmitterLabel(group) }}</span>
                            </template>
                            <template v-else>
                                <span class="event-name-unknown">Unknown event</span>
                                <code class="event-topic is-family-monospace">topic0 {{ group.raw.topics[0] }}</code>
                            </template>
                            <code class="event-address is-family-monospace">{{ group.raw.address }}</code>
                        </div>
                        <ul v-if="group.decoded" class="arg-list">
                            <li v-for="(a, j) in group.decoded.args" :key="j" class="arg-row">
                                <span v-if="a.indexed" class="indexed-badge">indexed</span>
                                <span class="arg-type">{{ a.type }}</span>
                                <span class="arg-name">{{ a.name }}</span>
                                <code class="arg-value is-family-monospace">{{ formatArg(a.value) }}</code>
                            </li>
                        </ul>
                        <div v-else class="raw-call">
                            <div class="raw-label">topics</div>
                            <code v-for="(t, j) in group.raw.topics" :key="j" class="raw-topic is-family-monospace">{{ t }}</code>
                            <div class="raw-label">data</div>
                            <code class="raw-data is-family-monospace">{{ group.raw.data || '0x' }}</code>
                        </div>
                    </div>
                </template>
            </div>

            <InternalTraceSection
                :tx="tx"
                :receipt="receipt"
                :contracts="contracts"
                @contracts-updated="onTraceContractsUpdated"
            />
        </template>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { Entities } from '../../database'
import {
    loadAllContracts,
    ensureAbisForAddresses,
    findContractByAddress,
    decodeCalldata,
    decodeCalldataWithAbiItem,
    decodeLog,
    decodeLogWithAbiItem,
    decodeRevertData,
    DecodedCall,
    DecodedLog,
    DecodedRevert
} from '../../utils/abi-registry'
import { fetchSignature } from '../../services/b32-service'
import {
    fetchSignatures as fetchOpenChainSignatures,
    signatureToFunctionItem,
    signatureToEventItem
} from '../../services/openchain-service'
import {
    simulateClauses,
    isTracerAvailable,
    traceClauseCall,
    getBlock
} from '../../services/debug-service'
import InternalTraceSection from './InternalTraceSection.vue'

interface EventGroup {
    clauseIndex: number
    raw: Connex.VM.Event
    decoded: DecodedLog | null
    fromB32?: boolean
}

interface DecodedCallEntry {
    decoded: DecodedCall | null
    fromB32?: boolean
}

@Component({
    name: 'TxForensicsPanel',
    components: { InternalTraceSection }
})
export default class TxForensicsPanel extends Vue {
    @Prop({ required: true })
    private value!: string

    private loading: boolean = false
    private error: string = ''
    private tx: Connex.Thor.Transaction | null = null
    private receipt: Connex.Thor.Transaction.Receipt | null = null
    private contracts: Entities.Contract[] = []
    private revert: DecodedRevert | null = null
    private revertClauseIndex: number | null = null
    private revertLoading: boolean = false
    private revertError: string = ''
    private revertSource: 'trace' | 'simulation' | null = null
    // Lazy-fetched b32 keccak DB lookups for events/functions our local
    // registry can't decode. Keyed by lowercase hex hash.
    private b32EventSigs: Record<string, any> = {}
    private b32FunctionSigs: Record<string, any> = {}

    get decodedCalls(): DecodedCallEntry[] {
        if (!this.tx) return []
        return this.tx.clauses.map((c) => {
            const local = decodeCalldata(this.contracts, c.to, c.data)
            if (local) return { decoded: local }
            if (c.data && c.data.length >= 10) {
                const selector = c.data.slice(0, 10).toLowerCase()
                const item = this.b32FunctionSigs[selector]
                if (item) {
                    const fromB32 = decodeCalldataWithAbiItem(c.data, item)
                    if (fromB32) return { decoded: fromB32, fromB32: true }
                }
            }
            return { decoded: null }
        })
    }

    get eventGroups(): EventGroup[] {
        if (!this.receipt) return []
        const groups: EventGroup[] = []
        this.receipt.outputs.forEach((out, idx) => {
            (out.events || []).forEach((ev) => {
                let decoded = decodeLog(this.contracts, ev)
                let fromB32 = false
                if (!decoded && ev.topics && ev.topics[0]) {
                    const item = this.b32EventSigs[ev.topics[0].toLowerCase()]
                    if (item) {
                        const b32Decoded = decodeLogWithAbiItem(ev, item)
                        if (b32Decoded) {
                            decoded = b32Decoded
                            fromB32 = true
                        }
                    }
                }
                groups.push({ clauseIndex: idx, raw: ev, decoded, fromB32 })
            })
        })
        return groups
    }

    get totalEvents(): number {
        return this.eventGroups.length
    }

    private isClauseReverted(i: number): boolean {
        if (!this.receipt || !this.receipt.reverted) return false
        // Thor reverts the whole tx; mark only the last executed clause to avoid noise.
        return i === this.receipt.outputs.length - 1
    }

    private targetName(addr: string): string {
        const c = findContractByAddress(this.contracts, addr)
        return c ? (c.name || '') : ''
    }

    private shortAddr(addr: string | null | undefined): string {
        if (!addr) return ''
        if (addr.length <= 12) return addr
        return addr.slice(0, 8) + '…' + addr.slice(-4)
    }

    // For events decoded via b32 we don't know the parent contract name. Try
    // to fall back to a registry lookup on the emitter address, otherwise
    // surface the short address.
    private eventEmitterLabel(group: EventGroup): string {
        if (!group.decoded) return ''
        if (!group.fromB32) return group.decoded.contract.name
        const name = this.targetName(group.raw.address)
        if (name) return name
        return this.shortAddr(group.raw.address)
    }

    private rawSelectorFor(data: string | undefined): string {
        if (!data || data.length < 10) return ''
        return data.slice(0, 10)
    }

    private clauseChipLabel(c: { to: string | null; value: string; data: string }): string {
        if (c.to === null) return 'CREATE'
        if (!c.data || c.data === '0x') return 'TRANSFER'
        return 'CALL'
    }

    private clauseChipClass(c: { to: string | null; value: string; data: string }): string {
        if (c.to === null) return 'is-create'
        if (!c.data || c.data === '0x') return 'is-transfer'
        return 'is-call'
    }

    private async copyText(text: string, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            try {
                const ta = document.createElement('textarea')
                ta.value = text
                ta.setAttribute('readonly', '')
                ta.style.position = 'absolute'
                ta.style.left = '-9999px'
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
            } catch { return }
        }
        ;(this as any).$buefy.toast.open({
            message: 'Address copied',
            type: 'is-success',
            position: 'is-bottom',
            duration: 1500
        })
    }

    private hasValue(v: string): boolean {
        if (!v) return false
        const n = v.startsWith('0x') ? parseInt(v, 16) : Number(v)
        return n > 0
    }

    private formatVet(wei: string): string {
        try {
            const bn = BN(wei || '0')
            return bn.dividedBy(1e18).toFormat()
        } catch {
            return wei
        }
    }

    private formatVtho(wei: string): string {
        return this.formatVet(wei)
    }

    private formatTimestamp(ts: number | undefined): string {
        if (!ts) return ''
        const d = new Date(ts * 1000)
        return d.toLocaleString()
    }

    private formatArg(v: any): string {
        if (v === null || v === undefined) return ''
        if (typeof v === 'string') return v
        if (typeof v === 'number' || typeof v === 'boolean') return String(v)
        if (typeof v === 'bigint') return v.toString()
        if (Array.isArray(v)) return '[' + v.map((x) => this.formatArg(x)).join(', ') + ']'
        if (v && typeof v.toString === 'function') return v.toString()
        return JSON.stringify(v)
    }

    private async load() {
        this.loading = true
        this.error = ''
        this.tx = null
        this.receipt = null
        this.revert = null
        this.revertClauseIndex = null
        this.revertError = ''
        try {
            const [tx, receipt, contracts] = await Promise.all([
                this.$connex.thor.transaction(this.value).get(),
                this.$connex.thor.transaction(this.value).getReceipt(),
                loadAllContracts(this.$connex.thor.genesis.id)
            ])
            this.contracts = contracts
            if (!tx) {
                this.error = 'Transaction not found on the current network.'
                return
            }
            this.tx = tx
            if (!receipt) {
                this.error = 'Transaction found but no receipt yet (still pending?).'
                return
            }
            this.receipt = receipt

            // Try filling registry gaps from Sourcify for every address
            // touched by this tx (clause targets + event emitters). This is
            // best-effort and silent.
            const addresses: Array<string | null | undefined> = []
            tx.clauses.forEach((c) => addresses.push(c.to))
            receipt.outputs.forEach((out) => {
                ;(out.events || []).forEach((ev) => addresses.push(ev.address))
                if (out.contractAddress) addresses.push(out.contractAddress)
            })
            ensureAbisForAddresses(this.$connex.thor.genesis.id, addresses, this.$nodeUrl)
                .then((refreshed) => {
                    this.contracts = refreshed
                    // Sourcify may have backfilled some ABIs — run b32 only for
                    // the leftovers afterwards.
                    this.enrichFromB32()
                })
                .catch(() => {
                    // Sourcify failed; still try b32.
                    this.enrichFromB32()
                })

            if (receipt.reverted) {
                this.resolveRevertReason()
            }
        } catch (e: any) {
            this.error = e && e.message ? e.message : 'Failed to load transaction.'
        } finally {
            this.loading = false
        }
    }

    // When the internal trace finishes loading it Sourcify-enriches every
    // address it found in the call tree (impls inside delegatecall chains,
    // helper contracts, etc.) and emits the refreshed contracts list. We
    // merge it in and re-run b32 enrichment in case the new ABIs cover
    // previously-unknown event topics or selectors.
    private async onTraceContractsUpdated(refreshed: Entities.Contract[]) {
        this.contracts = refreshed
        await this.enrichFromB32()
    }

    // For every event topic0 + clause selector that our local registry can't
    // decode, query b32 first, then OpenChain. Results land in reactive maps
    // and the eventGroups / decodedCalls getters pick them up automatically.
    // The b32* maps hold ABI items keyed by hash regardless of source.
    private async enrichFromB32() {
        if (!this.tx || !this.receipt) return

        const unknownTopics = new Map<string, Connex.VM.Event>()
        this.receipt.outputs.forEach((out) => {
            (out.events || []).forEach((ev) => {
                if (!ev.topics || !ev.topics[0]) return
                if (decodeLog(this.contracts, ev)) return
                unknownTopics.set(ev.topics[0].toLowerCase(), ev)
            })
        })

        const unknownSelectors = new Set<string>()
        this.tx.clauses.forEach((c) => {
            if (!c.data || c.data.length < 10) return
            if (decodeCalldata(this.contracts, c.to, c.data)) return
            unknownSelectors.add(c.data.slice(0, 10).toLowerCase())
        })

        // Step 1: b32 keccak DB (returns full ABI items including indexed
        // flags for events). Local cache means second-look is instant.
        const stillUnknownTopics = new Map(unknownTopics)
        const stillUnknownSelectors = new Set(unknownSelectors)
        const b32FnPending: Record<string, any> = {}
        const b32EvPending: Record<string, any> = {}

        await Promise.all(
            [...unknownTopics.keys(), ...unknownSelectors].map(async (hash) => {
                const sig = await fetchSignature(hash)
                if (!sig || !sig.item) return
                const item = sig.item
                if (item.type === 'event' && unknownTopics.has(hash)) {
                    b32EvPending[hash] = item
                    stillUnknownTopics.delete(hash)
                } else if (item.type === 'function' && unknownSelectors.has(hash)) {
                    b32FnPending[hash] = item
                    stillUnknownSelectors.delete(hash)
                }
            })
        )

        // Step 2: OpenChain batched lookups for the leftovers — one HTTP
        // request per kind instead of N. Function decode works from canonical
        // signature alone. Events need a best-guess at which params are
        // indexed, which we derive from each live log's topic count.
        const [ocFnMap, ocEvMap] = await Promise.all([
            stillUnknownSelectors.size > 0
                ? fetchOpenChainSignatures('function', Array.from(stillUnknownSelectors))
                : Promise.resolve(new Map()),
            stillUnknownTopics.size > 0
                ? fetchOpenChainSignatures('event', Array.from(stillUnknownTopics.keys()))
                : Promise.resolve(new Map())
        ])

        const ocFnPending: Record<string, any> = {}
        const ocEvPending: Record<string, any> = {}

        for (const [hash, sig] of ocFnMap.entries()) {
            if (!sig.canonicalSignature) continue
            const item = signatureToFunctionItem(sig.canonicalSignature)
            if (item) ocFnPending[hash] = item
        }

        for (const [hash, sig] of ocEvMap.entries()) {
            if (!sig.canonicalSignature) continue
            const ev = stillUnknownTopics.get(hash)
            if (!ev) continue
            const numIndexed = Math.max(0, (ev.topics || []).length - 1)
            let item = signatureToEventItem(sig.canonicalSignature, numIndexed, false)
            if (item && !decodeLogWithAbiItem(ev, item)) {
                item = signatureToEventItem(sig.canonicalSignature, numIndexed, true)
                if (item && !decodeLogWithAbiItem(ev, item)) item = null
            }
            if (item) ocEvPending[hash] = item
        }

        // Single reactive commit per map — all decoded rows update together.
        const mergedFn = { ...this.b32FunctionSigs, ...b32FnPending, ...ocFnPending }
        const mergedEv = { ...this.b32EventSigs, ...b32EvPending, ...ocEvPending }
        if (Object.keys(mergedFn).length !== Object.keys(this.b32FunctionSigs).length) {
            this.b32FunctionSigs = mergedFn
        }
        if (Object.keys(mergedEv).length !== Object.keys(this.b32EventSigs).length) {
            this.b32EventSigs = mergedEv
        }
    }

    private async resolveRevertReason() {
        if (!this.tx || !this.receipt) return
        this.revertLoading = true
        this.revertError = ''
        this.revertSource = null
        try {
            // 1) Prefer the call tracer — it runs against the real on-chain
            // state at the failing block, so it sidesteps the intra-block
            // dependency problem that hits re-simulation.
            const traced = await this.tryResolveViaTracer()
            if (traced) {
                this.revert = traced
                this.revertSource = 'trace'
                return
            }

            // 2) Fall back to re-simulation at blockNumber - 1. Less accurate
            // when the failing tx depended on state changes from earlier txs
            // in the same block, but works on every node.
            const blockNumber = this.tx.meta.blockNumber
            const revision = blockNumber > 0 ? blockNumber - 1 : 0
            const outputs = await simulateClauses(
                this.$nodeUrl,
                this.tx.clauses.map((c) => ({ to: c.to, value: c.value, data: c.data })),
                {
                    caller: this.tx.origin,
                    gas: this.tx.gas,
                    gasPayer: this.receipt.gasPayer
                },
                revision
            )

            const idx = outputs.findIndex((o) => o.reverted)
            if (idx === -1) {
                this.revertError =
                    'Simulation succeeded — could not reproduce the on-chain revert (possibly an intra-block state dependency). The node\'s tracer endpoint is disabled, so we can\'t replay the actual on-chain execution either.'
                return
            }
            this.revertClauseIndex = idx
            const target = this.tx.clauses[idx] ? this.tx.clauses[idx].to : null

            const refreshed = await ensureAbisForAddresses(
                this.$connex.thor.genesis.id,
                [target],
                this.$nodeUrl
            )
            this.contracts = refreshed
            this.revert = decodeRevertData(refreshed, target, outputs[idx].data)
            this.revertSource = 'simulation'
        } catch (e: any) {
            this.revertError = e && e.message ? e.message : 'Failed to determine the revert reason.'
        } finally {
            this.revertLoading = false
        }
    }

    private async tryResolveViaTracer(): Promise<DecodedRevert | null> {
        if (!this.tx || !this.receipt) return null

        // A 400 from /debug/tracers with a bogus target means "endpoint up,
        // bad input" — which is what isTracerAvailable looks for.
        const probeTarget = `${this.receipt.meta.blockID}/0/0`
        const available = await isTracerAvailable(this.$nodeUrl, probeTarget)
        if (!available) return null

        const block = await getBlock(this.$nodeUrl, this.receipt.meta.blockID).catch(() => null)
        if (!block) return null
        const txIndex = block.transactions.findIndex(
            (id) => id.toLowerCase() === this.tx!.id.toLowerCase()
        )
        if (txIndex === -1) return null

        // Walk the clauses and find the one that the tracer reports as
        // reverted. We stop at the first reverted clause — that's the failing
        // one (the receipt's reverted flag is set on the whole tx).
        for (let i = 0; i < this.tx.clauses.length; i++) {
            let frame
            try {
                frame = await traceClauseCall(
                    this.$nodeUrl,
                    this.receipt.meta.blockID,
                    txIndex,
                    i
                )
            } catch {
                continue
            }
            if (!frame) continue
            if (!frame.error && !frame.revertReason && !this.frameTreeHasError(frame)) continue

            this.revertClauseIndex = i
            const target = this.tx.clauses[i] ? this.tx.clauses[i].to : null

            const refreshed = await ensureAbisForAddresses(
                this.$connex.thor.genesis.id,
                [target],
                this.$nodeUrl
            )
            this.contracts = refreshed

            // The outermost frame's `output` is usually the propagated revert
            // data — but only when the failure was a Solidity revert. EVM-level
            // halts (out-of-gas, invalid opcode, etc.) leave the outer output
            // empty and only show as `error` on the deepest reverting frame.
            // So: if top-level output decodes to something useful, use it;
            // otherwise drill down to the deepest erroring frame.
            if (frame.output && frame.output !== '0x') {
                const decoded = decodeRevertData(refreshed, target, frame.output)
                if (decoded.kind !== 'raw' && decoded.kind !== 'empty') {
                    return decoded
                }
            }

            const deepest = this.findDeepestErrorFrame(frame)
            if (deepest && deepest !== frame) {
                if (deepest.output && deepest.output !== '0x') {
                    const innerTarget = deepest.to || target
                    return decodeRevertData(refreshed, innerTarget, deepest.output)
                }
                if (deepest.revertReason) {
                    return { kind: 'string', message: deepest.revertReason }
                }
                if (deepest.error) {
                    return {
                        kind: 'vm-error',
                        error: deepest.error,
                        at: { type: deepest.type, to: deepest.to }
                    }
                }
            }

            if (frame.revertReason) {
                return { kind: 'string', message: frame.revertReason }
            }
            if (frame.error) {
                return {
                    kind: 'vm-error',
                    error: frame.error,
                    at: { type: frame.type, to: frame.to }
                }
            }
            return { kind: 'empty' }
        }
        return null
    }

    private frameTreeHasError(frame: any): boolean {
        if (frame.error || frame.revertReason) return true
        if (frame.calls && frame.calls.length) {
            return frame.calls.some((c: any) => this.frameTreeHasError(c))
        }
        return false
    }

    // Returns the deepest frame in the call tree that has an `error` or
    // non-empty `output`. Deepest = the originating cause for nested
    // failures like an inner DELEGATECALL that ran out of gas.
    private findDeepestErrorFrame(frame: any): any | null {
        let deepest: any | null = null
        const walk = (f: any) => {
            const hasInfo =
                !!f.error ||
                !!f.revertReason ||
                (typeof f.output === 'string' && f.output !== '0x')
            if (hasInfo) {
                deepest = f
            }
            if (f.calls && f.calls.length) {
                for (const child of f.calls) walk(child)
            }
        }
        walk(frame)
        return deepest
    }

    @Watch('value', { immediate: true })
    private onValueChange() {
        this.load()
    }
}
</script>

<style lang="scss" scoped>
.forensics {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.state-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-light);
    padding: 1.5rem;
    justify-content: center;
}

.error-state {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 165, 32, 0.1);
    border: 1px solid rgba(255, 165, 32, 0.3);
    border-radius: 6px;
    color: var(--text-color);
    font-size: 0.9rem;
}

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
.head-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}
.head-title {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--text-color);
}
.head-count {
    margin-left: 0.4rem;
    font-size: 0.7rem;
    background: var(--code-bg);
    padding: 0.1rem 0.45rem;
    border-radius: 10px;
    color: var(--text-color-light);
    font-weight: 600;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.status-pill.is-success {
    background: rgba(50, 175, 50, 0.12);
    color: #228822;
}
.status-pill.is-reverted {
    background: rgba(255, 56, 96, 0.12);
    color: #d8294d;
}
.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
}

.external-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--primary-color);
    text-decoration: none;
    font-size: 0.8rem;
}
.external-link:hover {
    text-decoration: underline;
}

.kv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 1.5rem;
}
.kv-row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    font-size: 0.85rem;
    min-width: 0;
}
.kv-key {
    color: var(--text-color-light);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    width: 95px;
}
.kv-val {
    color: var(--text-color);
    word-break: break-all;
    min-width: 0;
}
.kv-aux {
    color: var(--text-color-light);
    font-size: 0.78rem;
}

.clause-row {
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--code-bg);
    margin-bottom: 0.6rem;
    transition: border-color 0.15s ease;
}
.clause-row.is-reverted {
    border-color: rgba(255, 56, 96, 0.4);
    background: rgba(255, 56, 96, 0.06);
}
.clause-row:last-child {
    margin-bottom: 0;
}
.clause-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.88rem;
    line-height: 1.35;
}
.clause-index {
    font-weight: 700;
    color: var(--text-color-light);
    font-family: monospace;
    font-size: 0.82rem;
}
.clause-chip {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.5rem;
    border-radius: 3px;
    background: var(--code-bg);
    flex-shrink: 0;
    min-width: 4.5rem;
    text-align: center;
}
.clause-chip.is-call     { background: rgba(50, 115, 220, 0.18); color: var(--primary-color); }
.clause-chip.is-transfer { background: rgba(50, 175, 50, 0.18); color: #228822; }
.clause-chip.is-create   { background: rgba(127, 86, 217, 0.22); color: #7f56d9; }

.clause-call {
    font-family: monospace;
    font-size: 0.88rem;
    color: var(--text-color);
    word-break: break-word;
    flex: 1;
    min-width: 0;
}
.clause-call .contract-name {
    color: var(--primary-color);
    font-weight: 600;
}
.clause-call .contract-name.is-unknown {
    color: var(--text-color-light);
    font-style: italic;
    font-weight: 500;
}
.clause-call .fn-name {
    color: var(--text-color);
    font-weight: 600;
}
.clause-call .fn-name.is-raw {
    color: var(--text-color-light);
    font-weight: 500;
}
.clause-call .dim-dot,
.clause-call .dim-arrow {
    color: var(--text-color-light);
    margin: 0 0.1rem;
}

.clause-value {
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.82rem;
    flex-shrink: 0;
}

.reverted-tag {
    font-size: 0.65rem;
    color: #d8294d;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
    background: rgba(216, 41, 77, 0.12);
    flex-shrink: 0;
}


.clause-addr {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    color: var(--text-color-light);
    background: var(--card-background);
    padding: 0.18rem 0.5rem;
    border-radius: 3px;
    flex-shrink: 0;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease;
    user-select: none;
    position: relative;
    z-index: 1;
}
.clause-row:hover .clause-addr {
    opacity: 1;
}
.clause-addr .addr-text {
    color: inherit;
    font-size: inherit;
    background: transparent;
    padding: 0;
}
::v-deep .clause-addr .copy-icon {
    font-size: 0.7rem;
    opacity: 0.7;
}
.clause-addr:hover {
    color: var(--primary-color);
}
.clause-addr:hover ::v-deep .copy-icon {
    opacity: 1;
}

.arg-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.clause-row > .arg-list {
    margin: 0.5rem 0 0 5.5rem;
    border-left: 1px solid var(--border-color);
    padding-left: 0.75rem;
}
.clause-row > .raw-call {
    margin: 0.5rem 0 0 5.5rem;
}
.arg-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.3rem 0;
    font-size: 0.82rem;
    border-bottom: 1px dashed var(--border-color);
    flex-wrap: wrap;
}
.arg-row:last-child {
    border-bottom: none;
}
.arg-type {
    color: var(--text-color);
    font-weight: 600;
    font-family: monospace;
    font-size: 0.78rem;
}
.arg-name {
    color: var(--text-color-light);
    font-family: monospace;
    font-size: 0.78rem;
}
.arg-value {
    color: var(--text-color);
    word-break: break-all;
    font-size: 0.8rem;
    flex: 1;
}
.arg-list-empty {
    font-size: 0.8rem;
    color: var(--text-color-light);
    font-style: italic;
}

.raw-call {
    background: var(--card-background);
    padding: 0.5rem 0.6rem;
    border-radius: 4px;
    border: 1px dashed var(--border-color);
}
.raw-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-color-light);
    margin: 0.2rem 0;
}
.raw-data,
.raw-topic {
    display: block;
    font-size: 0.78rem;
    color: var(--text-color);
    word-break: break-all;
    margin-bottom: 0.2rem;
}

.event-row {
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--code-bg);
    margin-bottom: 0.5rem;
}
.event-row:last-child {
    margin-bottom: 0;
}
.event-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
}
.event-clause-tag {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    padding: 0.1rem 0.45rem;
    border-radius: 10px;
    font-size: 0.7rem;
    color: var(--text-color-light);
    font-weight: 600;
}
.event-name {
    font-weight: 700;
    color: var(--text-color);
}
.event-name-unknown {
    font-style: italic;
    color: var(--text-color-light);
}
.event-contract {
    color: var(--text-color-light);
    font-size: 0.8rem;
}
.event-address {
    margin-left: auto;
    color: var(--text-color-light);
    font-size: 0.78rem;
}
.event-topic {
    color: var(--text-color-light);
    font-size: 0.75rem;
}
.indexed-badge {
    background: rgba(50, 115, 220, 0.12);
    color: var(--primary-color);
    font-size: 0.62rem;
    font-weight: 600;
    padding: 0.05rem 0.35rem;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.empty-mini {
    font-size: 0.85rem;
    color: var(--text-color-light);
    padding: 0.4rem 0;
}

.soon-block .soon-text {
    color: var(--text-color-light);
    font-size: 0.85rem;
}

.head-aux {
    font-size: 0.72rem;
    color: var(--text-color-light);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.error-state.inline {
    margin: 0;
}

.revert-block {
    padding: 0.75rem 0.85rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--code-bg);
}
.revert-block.is-string,
.revert-block.is-panic,
.revert-block.is-custom,
.revert-block.is-vm-error {
    border-color: rgba(255, 56, 96, 0.35);
    background: rgba(255, 56, 96, 0.05);
}

.revert-label {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #d8294d;
    margin-right: 0.6rem;
}

.revert-message {
    font-size: 0.95rem;
    color: var(--text-color);
    word-break: break-word;
}

.revert-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
}
.revert-name {
    font-weight: 700;
    color: var(--text-color);
    font-size: 0.9rem;
}
.revert-contract {
    color: var(--text-color-light);
    font-size: 0.8rem;
}

.revert-aux {
    font-size: 0.85rem;
    color: var(--text-color-light);
}
.revert-raw {
    display: block;
    margin-top: 0.5rem;
    word-break: break-all;
    font-size: 0.78rem;
    color: var(--text-color);
}
.revert-caveat {
    margin-top: 0.6rem;
    font-size: 0.75rem;
    color: var(--text-color-light);
}
.revert-caveat code {
    font-size: 0.72rem;
}
.revert-source-note {
    margin-top: 0.6rem;
    font-size: 0.75rem;
    color: var(--text-color-light);
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.revert-source-note code {
    font-size: 0.72rem;
}
::v-deep .source-icon-trace {
    color: #228822;
}

::v-deep .fa-spin {
    animation: fa-spin 1.2s linear infinite;
}
@keyframes fa-spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .kv-grid {
        grid-template-columns: 1fr;
    }
}
</style>
