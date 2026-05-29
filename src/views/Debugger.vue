<template>
    <section class="debugger-layout">
        <div class="debugger-input-bar">
            <b-field class="input-field" expanded>
                <b-input
                    v-model="rawInput"
                    placeholder="Paste a tx hash, calldata, 4-byte selector, topic0, or address (0x…)"
                    icon="search"
                    @keyup.native.enter="onSubmit"
                    expanded
                />
            </b-field>
            <button
                type="button"
                class="button is-primary"
                :disabled="!canSubmit"
                :class="{ 'is-loading': resolving }"
                @click="onSubmit"
            >
                Inspect
            </button>
            <button
                v-if="active"
                type="button"
                class="button is-light"
                @click="onClear"
            >
                Clear
            </button>
        </div>

        <div class="debugger-content">
            <div v-if="!active && !resolving && !errorMsg" class="empty-state">
                <b-icon icon="search-plus" size="is-large" custom-class="has-text-grey-light"></b-icon>
                <p class="empty-title">Inspect anything on-chain</p>
                <p class="empty-desc">
                    Paste one of the following to investigate it:
                </p>
                <ul class="accepted-list">
                    <li><strong>Transaction hash</strong> — full forensics (clauses, events, revert reason)</li>
                    <li><strong>Calldata</strong> — decode against your imported ABIs</li>
                    <li><strong>4-byte selector</strong> — find the matching function</li>
                    <li><strong>Event topic0</strong> — find the matching event</li>
                    <li><strong>Address</strong> — bytecode, proxy detection, ERC sniff</li>
                </ul>
            </div>

            <div v-if="errorMsg" class="error-state">
                <b-icon icon="exclamation-triangle" size="is-medium" custom-class="has-text-warning"></b-icon>
                <p class="error-text">{{ errorMsg }}</p>
            </div>

            <TxForensicsPanel v-if="active && active.kind === 'tx'" :value="active.value" />
            <Topic0LookupPanel v-else-if="active && active.kind === 'topic0'" :value="active.value" />
            <SelectorLookupPanel v-else-if="active && active.kind === 'selector'" :value="active.value" />
            <CalldataDecoderPanel v-else-if="active && active.kind === 'calldata'" :value="active.value" />
            <AddressInspectorPanel v-else-if="active && active.kind === 'address'" :value="active.value" />
        </div>
    </section>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { classify, resolveTxOrTopic0, ClassifiedInput, DebuggerInputKind } from '../utils/input-classifier'
import TxForensicsPanel from '../components/Debugger/TxForensicsPanel.vue'
import SelectorLookupPanel from '../components/Debugger/SelectorLookupPanel.vue'
import Topic0LookupPanel from '../components/Debugger/Topic0LookupPanel.vue'
import CalldataDecoderPanel from '../components/Debugger/CalldataDecoderPanel.vue'
import AddressInspectorPanel from '../components/Debugger/AddressInspectorPanel.vue'

type ResolvedKind = Exclude<DebuggerInputKind, 'tx_or_topic0' | 'unknown'>

interface ActiveInput {
    kind: ResolvedKind
    value: string
}

@Component({
    name: 'Debugger',
    components: {
        TxForensicsPanel,
        SelectorLookupPanel,
        Topic0LookupPanel,
        CalldataDecoderPanel,
        AddressInspectorPanel
    }
})
export default class Debugger extends Vue {
    private rawInput: string = ''
    private active: ActiveInput | null = null
    private resolving: boolean = false
    private errorMsg: string = ''

    get canSubmit(): boolean {
        return !!this.rawInput.trim() && !this.resolving
    }

    private async onSubmit() {
        if (!this.canSubmit) return
        this.errorMsg = ''
        const classified: ClassifiedInput = classify(this.rawInput)

        if (classified.kind === 'unknown') {
            this.active = null
            this.errorMsg = 'Unrecognized input. Expected a 0x-prefixed hex value.'
            return
        }

        if (classified.kind === 'tx_or_topic0') {
            this.resolving = true
            try {
                const resolved = await resolveTxOrTopic0(this.$connex, classified.value)
                this.active = { kind: resolved, value: classified.value }
            } catch (e: any) {
                this.errorMsg = e && e.message ? e.message : 'Failed to resolve input.'
                this.active = null
            } finally {
                this.resolving = false
            }
            return
        }

        this.active = { kind: classified.kind as ResolvedKind, value: classified.value }
    }

    private onClear() {
        this.rawInput = ''
        this.active = null
        this.errorMsg = ''
    }
}
</script>

<style lang="scss" scoped>
.debugger-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--body-background-alt);
}

.debugger-input-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
}

.input-field {
    flex: 1;
    margin-bottom: 0 !important;
}

.debugger-content {
    flex: 1;
    overflow-y: auto;
}

.empty-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    text-align: center;
}

.empty-title {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0.5rem 0 0.25rem;
}

.empty-desc {
    color: var(--text-color-light);
    margin-bottom: 0.5rem;
}

.accepted-list {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
    color: var(--text-color-light);
    font-size: 0.9rem;
    line-height: 1.8;
}

.accepted-list strong {
    color: var(--text-color);
    font-weight: 600;
}

.error-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 165, 32, 0.1);
    border: 1px solid rgba(255, 165, 32, 0.3);
    border-radius: 6px;
    color: var(--text-color);
}

.error-text {
    margin: 0;
    font-size: 0.9rem;
}
</style>
