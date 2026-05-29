<template>
    <div class="lookup-panel">
        <div class="lookup-header">
            <div class="header-label">Calldata</div>
            <div class="header-value is-family-monospace">{{ value }}</div>
            <div class="header-aux">
                <span class="aux-pill">selector <code>{{ selector }}</code></span>
                <span class="aux-pill">{{ argsByteLength }} bytes of args</span>
            </div>
        </div>

        <div v-if="loading" class="state-row">
            <b-icon icon="circle-notch" custom-class="fa-spin"></b-icon>
            <span>Searching imported / built-in contracts and the b32 keccak DB…</span>
        </div>

        <div v-else-if="!decoded && !b32Decoded" class="empty">
            <b-icon icon="search-minus" size="is-medium" custom-class="has-text-grey-light"></b-icon>
            <p class="empty-title">Couldn't decode</p>
            <p class="empty-desc">
                The leading selector <code>{{ selector }}</code> doesn't match any function in your imported contracts, the built-in registry, or the b32 keccak database.
            </p>
        </div>

        <div v-else class="results">
            <template v-if="decoded">
                <div class="canonical-row">
                    <span class="canonical-label">Function</span>
                    <code class="canonical-name">{{ decoded.canonicalName }}</code>
                    <span class="canonical-contract">on {{ decoded.contract.name }}</span>
                    <span class="source-pill is-registry">registry</span>
                </div>

                <div v-if="decoded.args.length" class="inputs-block">
                    <div class="inputs-label">Decoded arguments</div>
                    <ul class="arg-list">
                        <li v-for="(a, i) in decoded.args" :key="i" class="arg-row">
                            <span class="arg-type">{{ a.type }}</span>
                            <span class="arg-name">{{ a.name }}</span>
                            <code class="arg-value is-family-monospace">{{ formatArg(a.value) }}</code>
                        </li>
                    </ul>
                </div>
                <div v-else class="empty-mini">(no arguments)</div>
            </template>

            <template v-else-if="b32Decoded">
                <div class="canonical-row">
                    <span class="canonical-label">Function</span>
                    <code class="canonical-name">{{ b32Decoded.canonicalName }}</code>
                    <span
                        class="source-pill"
                        :class="b32Decoded.source === 'openchain' ? 'is-openchain' : 'is-b32'"
                    >{{ b32Decoded.source === 'openchain' ? 'openchain (cross-chain)' : 'b32 keccak DB' }}</span>
                </div>

                <div v-if="b32Decoded.args.length" class="inputs-block">
                    <div class="inputs-label">Decoded arguments</div>
                    <ul class="arg-list">
                        <li v-for="(a, i) in b32Decoded.args" :key="i" class="arg-row">
                            <span class="arg-type">{{ a.type }}</span>
                            <span class="arg-name">{{ a.name }}</span>
                            <code class="arg-value is-family-monospace">{{ formatArg(a.value) }}</code>
                        </li>
                    </ul>
                </div>
                <div v-else class="empty-mini">(no arguments)</div>

                <p v-if="b32Decoded.source === 'openchain'" class="aside">
                    Matched via OpenChain's cross-chain signature database (covers Ethereum and many other EVM chains). Useful for VeChain contracts that are forks of Ethereum protocols. Parameter names aren't preserved by the canonical signature.
                </p>
                <p v-else class="aside">
                    Matched via the b32 keccak signature database — we know the function's name and parameter types but not which contract defines it.
                </p>
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { abi } from 'thor-devkit'
import { loadAllContracts, decodeCalldata, DecodedCall } from '../../utils/abi-registry'
import { fetchSignature, canonicalSignature } from '../../services/b32-service'
import {
    fetchSignature as fetchOpenChainSignature,
    signatureToFunctionItem
} from '../../services/openchain-service'

interface DecodedFromB32 {
    canonicalName: string
    args: Array<{ name: string; type: string; value: any }>
    source: 'b32' | 'openchain'
}

@Component({ name: 'CalldataDecoderPanel' })
export default class CalldataDecoderPanel extends Vue {
    @Prop({ type: String, required: true }) value!: string

    private decoded: DecodedCall | null = null
    private b32Decoded: DecodedFromB32 | null = null
    private loading: boolean = false

    get selector(): string {
        return this.value.slice(0, 10)
    }

    get argsByteLength(): number {
        return Math.max(0, (this.value.length - 10) / 2)
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

    private decodeWithAbiItem(item: any, source: 'b32' | 'openchain'): DecodedFromB32 | null {
        if (!item || item.type !== 'function') return null
        const inputs = Array.isArray(item.inputs) ? item.inputs : []
        const argsHex = '0x' + this.value.slice(10)
        try {
            const decoded = inputs.length
                ? abi.decodeParameters(inputs as any, argsHex)
                : ({} as any)
            return {
                canonicalName: canonicalSignature(item),
                args: inputs.map((inp: any, i: number) => ({
                    name: inp.name || `arg${i}`,
                    type: inp.type,
                    value: decoded[i]
                })),
                source
            }
        } catch {
            return null
        }
    }

    private async runLookup() {
        this.loading = true
        this.decoded = null
        this.b32Decoded = null
        try {
            const contracts = await loadAllContracts(this.$connex.thor.genesis.id)
            this.decoded = decodeCalldata(contracts, null, this.value)
            if (!this.decoded) {
                const sig = await fetchSignature(this.selector)
                if (sig && sig.item) {
                    this.b32Decoded = this.decodeWithAbiItem(sig.item, 'b32')
                }
                if (!this.b32Decoded) {
                    const oc = await fetchOpenChainSignature('function', this.selector)
                    if (oc && oc.canonicalSignature) {
                        const item = signatureToFunctionItem(oc.canonicalSignature)
                        if (item) this.b32Decoded = this.decodeWithAbiItem(item, 'openchain')
                    }
                }
            }
        } finally {
            this.loading = false
        }
    }

    @Watch('value', { immediate: true })
    private onValueChange() {
        this.runLookup()
    }
}
</script>

<style lang="scss" scoped>
@import './lookup-panel.scss';

.header-aux {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
}
.aux-pill {
    font-size: 0.72rem;
    color: var(--text-color-light);
    background: var(--code-bg);
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
}
.aux-pill code {
    font-size: 0.72rem;
}

.canonical-contract {
    color: var(--text-color-light);
    font-size: 0.8rem;
}

.source-pill {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    margin-left: 0.5rem;
}
.source-pill.is-registry {
    background: rgba(50, 115, 220, 0.14);
    color: var(--primary-color);
}
.source-pill.is-b32 {
    background: rgba(255, 165, 32, 0.16);
    color: #b88010;
}
.source-pill.is-openchain {
    background: rgba(20, 184, 166, 0.18);
    color: #0d9488;
}

.aside {
    margin-top: 0.6rem;
    font-size: 0.78rem;
    color: var(--text-color-light);
}

.arg-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.arg-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.35rem 0;
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
.empty-mini {
    font-size: 0.85rem;
    color: var(--text-color-light);
    padding: 0.4rem 0;
    font-style: italic;
}
</style>
