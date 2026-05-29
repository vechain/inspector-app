<template>
    <div class="lookup-panel">
        <div class="lookup-header">
            <div class="header-label">Function selector</div>
            <div class="header-value is-family-monospace">{{ value }}</div>
        </div>

        <div v-if="loading" class="state-row">
            <b-icon icon="circle-notch" custom-class="fa-spin"></b-icon>
            <span>Searching imported / built-in contracts and the b32 keccak DB…</span>
        </div>

        <div v-else-if="hits.length === 0 && !b32Item" class="empty">
            <b-icon icon="search-minus" size="is-medium" custom-class="has-text-grey-light"></b-icon>
            <p class="empty-title">No match found</p>
            <p class="empty-desc">
                Searched your imported contracts, the built-in registry, and the b32 keccak signature database. Import the contract that defines this function, then try again.
            </p>
        </div>

        <div v-else class="results">
            <div class="canonical-row">
                <span class="canonical-label">Function signature</span>
                <code class="canonical-name">{{ canonicalName }}</code>
                <span class="source-pill" :class="sourcePillClass">{{ sourceLabel }}</span>
            </div>

            <div class="inputs-block" v-if="displayInputs.length">
                <div class="inputs-label">Parameters</div>
                <ul class="inputs-list">
                    <li v-for="(inp, i) in displayInputs" :key="i">
                        <span class="arg-type">{{ inp.type }}</span>
                        <span class="arg-name">{{ inp.name || `arg${i}` }}</span>
                    </li>
                </ul>
            </div>

            <div class="meta-row" v-if="stateMutability">
                <span class="meta-key">State mutability</span>
                <span class="meta-val">{{ stateMutability }}</span>
            </div>

            <div v-if="hits.length" class="contracts-block">
                <div class="contracts-label">
                    Found in {{ hits.length }} contract{{ hits.length === 1 ? '' : 's' }}
                </div>
                <ul class="contracts-list">
                    <li v-for="(hit, i) in hits" :key="i" class="contract-row">
                        <span class="contract-name">{{ hit.contract.name }}</span>
                        <code class="contract-address is-family-monospace">{{ hit.contract.address }}</code>
                    </li>
                </ul>
            </div>

            <p v-else-if="b32Item" class="aside">
                Matched via the b32 keccak signature database. No imported contract claims this selector — to attribute it to a specific contract, import that contract's ABI on the Contracts page.
            </p>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { loadAllContracts, lookupBySelector, FunctionHit } from '../../utils/abi-registry'
import { fetchSignature, canonicalSignature } from '../../services/b32-service'
import {
    fetchSignature as fetchOpenChainSignature,
    signatureToFunctionItem
} from '../../services/openchain-service'

@Component({ name: 'SelectorLookupPanel' })
export default class SelectorLookupPanel extends Vue {
    @Prop({ type: String, required: true }) value!: string

    private hits: FunctionHit[] = []
    private b32Item: any | null = null
    private loading: boolean = false

    get canonicalName(): string {
        if (this.hits.length) return this.hits[0].canonicalName
        if (this.b32Item) return canonicalSignature(this.b32Item)
        return ''
    }

    get displayInputs(): Array<{ name: string; type: string }> {
        if (this.hits.length) {
            return this.hits[0].definition.inputs as any
        }
        if (this.b32Item && Array.isArray(this.b32Item.inputs)) {
            return this.b32Item.inputs as any
        }
        return []
    }

    get stateMutability(): string {
        if (this.hits.length) return this.hits[0].definition.stateMutability || ''
        if (this.b32Item) return this.b32Item.stateMutability || ''
        return ''
    }

    get sourceLabel(): string {
        if (this.hits.length) return 'registry'
        if (this.b32Item && (this.b32Item as any)._openchain) return 'openchain (cross-chain)'
        if (this.b32Item) return 'b32 keccak DB'
        return ''
    }

    get sourcePillClass(): string {
        if (this.hits.length) return 'is-registry'
        if (this.b32Item && (this.b32Item as any)._openchain) return 'is-openchain'
        if (this.b32Item) return 'is-b32'
        return ''
    }

    private async runLookup() {
        this.loading = true
        this.hits = []
        this.b32Item = null
        try {
            const contracts = await loadAllContracts(this.$connex.thor.genesis.id)
            this.hits = lookupBySelector(contracts, this.value)
            if (this.hits.length === 0) {
                const sig = await fetchSignature(this.value)
                if (sig && sig.item && (sig.item.type === 'function' || !sig.item.type)) {
                    this.b32Item = sig.item
                } else {
                    // Final fallback: OpenChain cross-chain signature DB.
                    const oc = await fetchOpenChainSignature('function', this.value)
                    if (oc && oc.canonicalSignature) {
                        const item = signatureToFunctionItem(oc.canonicalSignature)
                        if (item) this.b32Item = { ...item, _openchain: true }
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
</style>
