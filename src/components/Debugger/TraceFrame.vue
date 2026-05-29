<template>
    <div class="trace-frame" :class="{ 'is-errored': hasError }">
        <div class="frame-row" @click="toggleExpanded">
            <button
                type="button"
                class="chevron"
                :class="{ 'is-empty': !hasChildren }"
                @click.stop="toggleExpanded"
                :aria-label="expanded ? 'Collapse' : 'Expand'"
            >
                <b-icon
                    v-if="hasChildren"
                    :icon="expanded ? 'chevron-down' : 'chevron-right'"
                    size="is-small"
                ></b-icon>
            </button>

            <span class="type-chip" :class="typeClass">{{ frame.type }}</span>

            <span v-if="gasLabel" class="gas-label">{{ gasLabel }}</span>

            <span class="call-text">
                <template v-if="decoded">
                    <span class="contract-name">{{ decoded.contract.name }}</span><span class="dot">.</span><span class="fn-name">{{ decoded.fnName }}</span>(<span class="args-inline">{{ inputsInline }}</span>)<template v-if="returnInline">
                        <span class="arrow"> =&gt; </span><span class="output-inline">{{ returnInline }}</span>
                    </template>
                </template>
                <template v-else-if="frame.to">
                    <span class="contract-name">{{ targetName || shortAddr(frame.to) }}</span><template v-if="rawSelector">.<span class="fn-name is-raw">{{ rawSelector }}</span></template>
                </template>
                <template v-else>
                    <span class="contract-name">(contract creation)</span>
                </template>
            </span>


            <span
                v-if="frame.to"
                class="frame-addr"
                :title="frame.to + ' — click to copy'"
                @click.stop.prevent="copyAddress($event)"
                @mousedown.stop
                @mouseup.stop
            >
                <code class="is-family-monospace addr-text">{{ shortAddr(frame.to) }}</code>
                <b-icon icon="copy" size="is-small" custom-class="copy-icon"></b-icon>
            </span>

            <span v-if="valueLabel" class="value-label">{{ valueLabel }}</span>

            <span v-if="hasError" class="error-tag">{{ frame.error || 'reverted' }}</span>
        </div>

        <div v-if="expanded && (showInputDetail || showOutputDetail || frame.revertReason)" class="frame-extras">
            <div v-if="showInputDetail" class="extra-row">
                <span class="extra-key">input</span>
                <code class="extra-val is-family-monospace">{{ truncated(frame.input) }}</code>
            </div>
            <div v-if="showOutputDetail" class="extra-row">
                <span class="extra-key">output</span>
                <code class="extra-val is-family-monospace">{{ truncated(frame.output) }}</code>
            </div>
            <div v-if="frame.revertReason" class="extra-row is-revert">
                <span class="extra-key">revert</span>
                <code class="extra-val is-family-monospace">{{ frame.revertReason }}</code>
            </div>
        </div>

        <div v-if="expanded && hasChildren" class="frame-children">
            <TraceFrame
                v-for="(child, i) in frame.calls"
                :key="i"
                :frame="child"
                :contracts="contracts"
                :extra-signatures="extraSignatures"
                :depth="depth + 1"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Entities } from '../../database'
import {
    findContractByAddress,
    decodeFrameCall,
    decodeCalldataWithAbiItem,
    DecodedFrameCall,
    DecodedCall
} from '../../utils/abi-registry'
import { TraceCallFrame } from '../../services/debug-service'

interface ExtraSig { item: any; source: 'b32' | 'openchain' }

@Component({ name: 'TraceFrame' })
export default class TraceFrame extends Vue {
    @Prop({ type: Object, required: true }) frame!: TraceCallFrame
    @Prop({ type: Array, required: true }) contracts!: Entities.Contract[]
    @Prop({ type: Object, default: () => ({}) }) extraSignatures!: Record<string, ExtraSig>
    @Prop({ type: Number, default: 0 }) depth!: number

    private expanded: boolean = this.shouldDefaultExpand()

    get decoded(): DecodedFrameCall | null {
        if (!this.frame.input || this.frame.input === '0x') return null
        const local = decodeFrameCall(this.contracts, this.frame.to || null, this.frame.input, this.frame.output)
        if (local) return local

        // Fall back to b32 / OpenChain signature DBs. We get input args but no
        // output type info — render outputs as raw bytes via the existing
        // showOutputDetail path.
        const selector = this.frame.input.slice(0, 10).toLowerCase()
        const extra = this.extraSignatures[selector]
        if (!extra) return null
        const decodedCall: DecodedCall | null = decodeCalldataWithAbiItem(this.frame.input, extra.item)
        if (!decodedCall) return null
        // Reshape DecodedCall into DecodedFrameCall — same fields plus an
        // empty outputs array (we don't have typed return data from sig DBs).
        return {
            fnName: decodedCall.fnName,
            canonicalName: decodedCall.canonicalName,
            contract: {
                name: this.frameContractLabel(),
                address: this.frame.to || ''
            },
            inputs: decodedCall.args,
            outputs: null
        }
    }

    get decodedSource(): 'registry' | 'b32' | 'openchain' {
        if (!this.frame.input || this.frame.input === '0x') return 'registry'
        // If decodeFrameCall returns something against the registry, it
        // matched locally — show no pill.
        const local = decodeFrameCall(this.contracts, this.frame.to || null, this.frame.input)
        if (local) return 'registry'
        const selector = this.frame.input.slice(0, 10).toLowerCase()
        const extra = this.extraSignatures[selector]
        return extra ? extra.source : 'registry'
    }

    private frameContractLabel(): string {
        if (!this.frame.to) return ''
        const c = findContractByAddress(this.contracts, this.frame.to)
        if (c && c.name) return c.name
        return this.shortAddr(this.frame.to)
    }

    get hasChildren(): boolean {
        return !!(this.frame.calls && this.frame.calls.length)
    }

    get hasError(): boolean {
        return !!(this.frame.error || this.frame.revertReason)
    }

    get typeClass(): string {
        const t = (this.frame.type || '').toUpperCase()
        if (t === 'DELEGATECALL') return 'is-delegate'
        if (t === 'STATICCALL') return 'is-static'
        if (t === 'CREATE' || t === 'CREATE2') return 'is-create'
        if (t === 'SELFDESTRUCT') return 'is-destruct'
        if (this.hasError) return 'is-error'
        return 'is-call'
    }

    get gasLabel(): string {
        if (!this.frame.gasUsed) return ''
        const n = this.parseHex(this.frame.gasUsed)
        if (!n) return ''
        return n.toLocaleString()
    }

    get valueLabel(): string {
        // VET amounts can be > 2^53, so JS number overflows into scientific
        // notation. Format via BigNumber and convert wei → VET.
        if (!this.frame.value) return ''
        try {
            const bn = BN(this.frame.value)
            if (bn.isZero()) return ''
            return bn.dividedBy(1e18).toFormat(4) + ' VET'
        } catch {
            return ''
        }
    }

    get targetName(): string {
        if (!this.frame.to) return ''
        const c = findContractByAddress(this.contracts, this.frame.to)
        return c ? (c.name || '') : ''
    }

    get rawSelector(): string {
        if (!this.frame.input || this.frame.input.length < 10) return ''
        return this.frame.input.slice(0, 10)
    }

    get inputsInline(): string {
        if (!this.decoded) return ''
        return this.decoded.inputs
            .map((a) => `${a.name} = ${this.formatVal(a.value)}`)
            .join(', ')
    }

    get returnInline(): string {
        if (!this.decoded || !this.decoded.outputs || this.decoded.outputs.length === 0) return ''
        if (this.decoded.outputs.length === 1) {
            return this.formatVal(this.decoded.outputs[0].value)
        }
        return '(' + this.decoded.outputs.map((o) => this.formatVal(o.value)).join(', ') + ')'
    }

    get showInputDetail(): boolean {
        // Show raw input only when we didn't decode it (otherwise inline args are enough).
        return !this.decoded && !!this.frame.input && this.frame.input !== '0x'
    }

    get showOutputDetail(): boolean {
        // Show raw output when there's data and we don't have a decoded form for it.
        if (!this.frame.output || this.frame.output === '0x') return false
        if (this.decoded && this.decoded.outputs && this.decoded.outputs.length) return false
        return true
    }

    private shouldDefaultExpand(): boolean {
        // Top two levels open by default; deeper frames collapsed to keep the
        // initial view readable. Errored frames always start expanded so the
        // user can see the failure path.
        if (this.frame && (this.frame.error || this.frame.revertReason)) return true
        return (this.depth ?? 0) < 2
    }

    private toggleExpanded() {
        if (!this.hasChildren && !this.showInputDetail && !this.showOutputDetail && !this.frame.revertReason) return
        this.expanded = !this.expanded
    }

    private parseHex(v: string): number {
        if (!v) return 0
        if (v.startsWith('0x')) return parseInt(v, 16)
        return Number(v) || 0
    }

    private shortAddr(addr: string): string {
        if (!addr) return ''
        if (addr.length <= 12) return addr
        return addr.slice(0, 8) + '…' + addr.slice(-4)
    }

    private formatVal(v: any): string {
        if (v === null || v === undefined) return ''
        if (typeof v === 'string') {
            // Heuristic: looks like an address?
            if (/^0x[0-9a-fA-F]{40}$/.test(v)) {
                const c = findContractByAddress(this.contracts, v)
                if (c && c.name) return c.name
                return this.shortAddr(v)
            }
            // Long hex blobs get truncated.
            if (/^0x[0-9a-fA-F]{12,}$/.test(v) && v.length > 18) {
                return v.slice(0, 10) + '…' + v.slice(-4)
            }
            return v
        }
        if (typeof v === 'number' || typeof v === 'boolean') return String(v)
        if (typeof v === 'bigint') return v.toString()
        if (Array.isArray(v)) {
            const parts = v.slice(0, 4).map((x) => this.formatVal(x))
            const more = v.length > 4 ? `, …+${v.length - 4}` : ''
            return '[' + parts.join(', ') + more + ']'
        }
        if (v && typeof v.toString === 'function') return v.toString()
        return JSON.stringify(v)
    }

    private async copyAddress(event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }
        if (!this.frame.to) return
        try {
            await navigator.clipboard.writeText(this.frame.to)
            ;(this as any).$buefy.toast.open({
                message: 'Address copied',
                type: 'is-success',
                position: 'is-bottom',
                duration: 1500
            })
        } catch {
            // Clipboard API unavailable (e.g. non-secure context) — fall back
            // to the legacy execCommand trick so this still works.
            try {
                const ta = document.createElement('textarea')
                ta.value = this.frame.to
                ta.setAttribute('readonly', '')
                ta.style.position = 'absolute'
                ta.style.left = '-9999px'
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
                ;(this as any).$buefy.toast.open({
                    message: 'Address copied',
                    type: 'is-success',
                    position: 'is-bottom',
                    duration: 1500
                })
            } catch {
                // give up silently
            }
        }
    }

    private truncated(s: string | undefined): string {
        if (!s) return ''
        if (s.length <= 130) return s
        return s.slice(0, 66) + ' … ' + s.slice(-16) + ` (${(s.length - 2) / 2} bytes)`
    }
}
</script>

<style lang="scss" scoped>
.trace-frame {
    border-left: 2px solid transparent;
    padding-left: 0.5rem;
    margin-top: 0.2rem;
}
.trace-frame:first-child {
    margin-top: 0;
}
.trace-frame.is-errored {
    border-left-color: rgba(255, 56, 96, 0.45);
}

.frame-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.4rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.82rem;
    line-height: 1.35;
    flex-wrap: wrap;
}
.frame-row:hover {
    background: var(--hover-bg);
}

.chevron {
    background: transparent;
    border: none;
    color: var(--text-color-light);
    cursor: pointer;
    width: 16px;
    height: 16px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.chevron.is-empty {
    cursor: default;
    visibility: hidden;
}

.type-chip {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.5rem;
    border-radius: 3px;
    background: var(--code-bg);
    color: var(--text-color);
    flex-shrink: 0;
    min-width: 4.5rem;
    text-align: center;
}
.type-chip.is-call     { background: rgba(50, 115, 220, 0.18); color: var(--primary-color); }
.type-chip.is-static   { background: rgba(50, 175, 50, 0.18); color: #228822; }
.type-chip.is-delegate { background: rgba(255, 165, 32, 0.18); color: #b88010; }
.type-chip.is-create   { background: rgba(127, 86, 217, 0.22); color: #7f56d9; }
.type-chip.is-destruct { background: rgba(216, 41, 77, 0.18); color: #d8294d; }
.type-chip.is-error    { background: rgba(216, 41, 77, 0.18); color: #d8294d; }

.gas-label {
    font-size: 0.7rem;
    color: var(--text-color-light);
    background: var(--code-bg);
    padding: 0.08rem 0.4rem;
    border-radius: 3px;
    flex-shrink: 0;
    min-width: 3.5rem;
    text-align: right;
}

.call-text {
    font-family: monospace;
    font-size: 0.82rem;
    color: var(--text-color);
    word-break: break-word;
    flex: 1;
    min-width: 0;
}

.contract-name {
    color: var(--primary-color);
    font-weight: 600;
}
.dot {
    color: var(--text-color-light);
}
.fn-name {
    color: var(--text-color);
    font-weight: 600;
}
.fn-name.is-raw {
    color: var(--text-color-light);
}
.args-inline {
    color: var(--text-color-light);
}
.arrow {
    color: var(--text-color-light);
}
.output-inline {
    color: var(--text-color);
}

.value-label {
    font-size: 0.7rem;
    color: var(--text-color-light);
    flex-shrink: 0;
}

.frame-addr {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    color: var(--text-color-light);
    background: var(--code-bg);
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
.frame-row:hover .frame-addr {
    opacity: 1;
}
.frame-addr .addr-text {
    color: inherit;
    font-size: inherit;
    background: transparent;
    padding: 0;
}
::v-deep .frame-addr .copy-icon {
    font-size: 0.7rem;
    opacity: 0.7;
}
.frame-addr:hover {
    color: var(--primary-color);
}
.frame-addr:hover ::v-deep .copy-icon {
    opacity: 1;
}

.error-tag {
    font-size: 0.7rem;
    color: #d8294d;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
    background: rgba(216, 41, 77, 0.12);
    flex-shrink: 0;
}


.frame-extras {
    margin: 0.25rem 0 0.25rem 2.6rem;
    padding: 0.4rem 0.55rem;
    background: var(--code-bg);
    border-radius: 4px;
    border: 1px dashed var(--border-color);
}
.extra-row {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    font-size: 0.75rem;
}
.extra-row + .extra-row {
    margin-top: 0.2rem;
}
.extra-row.is-revert {
    color: #d8294d;
}
.extra-key {
    color: var(--text-color-light);
    text-transform: uppercase;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    width: 50px;
}
.extra-val {
    color: var(--text-color);
    word-break: break-all;
    flex: 1;
    font-size: 0.78rem;
}

.frame-children {
    margin-left: 0.85rem;
    margin-top: 0.1rem;
    border-left: 1px solid var(--border-color);
    padding-left: 0.25rem;
}
</style>
