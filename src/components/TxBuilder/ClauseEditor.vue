<template>
    <div class="clause-editor">
        <!-- Section 1: Contract -->
        <section class="editor-section">
            <div class="section-label">Contract</div>
            <div v-if="clause.contractAddress" class="contract-summary">
                <div class="contract-summary__main">
                    <div class="contract-summary__name">{{ clause.contractName || 'Contract' }}</div>
                    <div class="contract-summary__addr is-family-monospace">{{ clause.contractAddress }}</div>
                </div>
                <button type="button" class="button is-small is-light" @click="changeContract">
                    <b-icon icon="exchange-alt" size="is-small"></b-icon>
                    <span>Change</span>
                </button>
            </div>
            <ContractPicker v-else :network="network" @pick="onPickContract" />
        </section>

        <!-- Section 2: Function -->
        <section v-if="clause.contractAddress" class="editor-section">
            <div class="section-label">Function</div>
            <div v-if="clause.selectedFunction" class="function-summary">
                <div class="function-summary__main">
                    <span class="function-summary__name is-family-monospace">{{ clause.selectedFunction.name }}</span>
                    <span class="function-summary__sig">
                        ({{ inputTypes(clause.selectedFunction) }})
                    </span>
                    <span class="mutability-pill" :class="mutabilityClass(clause.selectedFunction)">
                        {{ clause.selectedFunction.stateMutability || (clause.selectedFunction.constant ? 'view' : 'nonpayable') }}
                    </span>
                </div>
                <button type="button" class="icon-btn" title="Clear" @click="clearFunction">
                    <b-icon icon="times" size="is-small"></b-icon>
                </button>
            </div>
            <div v-else>
                <b-input
                    v-model="fnSearch"
                    placeholder="Filter functions"
                    icon="search"
                    size="is-small"
                ></b-input>
                <div v-if="filteredFunctions.length" class="function-list">
                    <div
                        v-for="fn in filteredFunctions"
                        :key="fn.name + ':' + (fn.inputs || []).map(i => i.type).join(',')"
                        class="function-row"
                        @click="onSelectFunction(fn)"
                    >
                        <span class="function-row__name is-family-monospace">{{ fn.name }}</span>
                        <span class="function-row__sig">({{ inputTypes(fn) }})</span>
                        <span class="mutability-pill" :class="mutabilityClass(fn)">
                            {{ fn.stateMutability || (fn.constant ? 'view' : 'nonpayable') }}
                        </span>
                    </div>
                </div>
                <div v-else class="no-fns has-text-grey-light">
                    No state-changing functions in this ABI. View/pure functions can't be used in a transaction.
                </div>
            </div>
        </section>

        <!-- Section 3: Parameters -->
        <section v-if="clause.selectedFunction" class="editor-section">
            <div class="section-label">
                Parameters
                <span class="section-sublabel" v-if="clause.selectedFunction.inputs && clause.selectedFunction.inputs.length">
                    · {{ clause.selectedFunction.inputs.length }}
                </span>
            </div>
            <div v-if="!clause.selectedFunction.inputs || !clause.selectedFunction.inputs.length" class="no-params has-text-grey-light">
                This function takes no parameters.
            </div>
            <div v-else class="params-stack">
                <div
                    v-for="(input, i) in clause.selectedFunction.inputs"
                    :key="i"
                    class="param-row"
                >
                    <div class="param-row__header">
                        <span class="param-row__name">{{ input.name || ('arg' + i) }}</span>
                        <span class="param-row__type is-family-monospace">{{ input.type }}</span>
                    </div>
                    <RoleSelector
                        v-if="isRoleInput(input)"
                        :contractAddress="clause.contractAddress"
                        :abi="clause.abi"
                        :network="network"
                        :value="clause.params[i] || ''"
                        @input="onParam(i, $event)"
                    />
                    <ParamInput
                        v-else
                        :input="input"
                        :value="clause.params[i]"
                        @input="onParam(i, $event)"
                    />
                </div>
            </div>
        </section>

        <!-- Section 4: VET value (only when payable) -->
        <section v-if="clause.selectedFunction && isPayable" class="editor-section">
            <div class="section-label">VET value</div>
            <b-field grouped>
                <b-input
                    custom-class="is-family-monospace has-text-weight-semibold"
                    :placeholder="valueUnit === 'vet' ? 'number (vet)' : 'number (wei)'"
                    v-model.trim="displayValue"
                    expanded
                ></b-input>
                <p class="control">
                    <div class="buttons has-addons unit-toggle-group">
                        <button
                            type="button"
                            class="button unit-toggle-btn"
                            :class="{ 'is-active': valueUnit === 'vet' }"
                            @click="valueUnit = 'vet'"
                        >VET</button>
                        <button
                            type="button"
                            class="button unit-toggle-btn"
                            :class="{ 'is-active': valueUnit === 'wei' }"
                            @click="valueUnit = 'wei'"
                        >WEI</button>
                    </div>
                </p>
            </b-field>
        </section>

        <!-- Section 5: Note -->
        <section v-if="clause.selectedFunction" class="editor-section">
            <div class="section-label">Note (optional)</div>
            <b-input
                :value="clause.note || ''"
                @input="updateNote"
                type="textarea"
                rows="2"
                placeholder="Per-clause comment (used as the clause's comment)"
            ></b-input>
        </section>

        <!-- Section 6: Encoded preview -->
        <section v-if="encoded" class="editor-section">
            <div class="section-label">Encoded calldata</div>
            <pre class="calldata-block">{{ encoded.isValid ? encoded.data : (encoded.error || '—') }}</pre>
            <div class="calldata-bytes" v-if="encoded.isValid">
                {{ ((encoded.data.length - 2) / 2) }} bytes
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { Entities } from '../../database'
import ContractPicker from './ContractPicker.vue'
import ParamInput from './ParamInput.vue'
import RoleSelector from './RoleSelector.vue'
import { isRoleParam } from '../../utils/role-discovery'

interface EncodedClause {
    isValid: boolean
    data: string
    error?: string
}

@Component({
    components: { ContractPicker, ParamInput, RoleSelector }
})
export default class ClauseEditor extends Vue {
    @Prop({ required: true }) clause!: Entities.TxBuilderClause
    @Prop({ required: true }) network!: string
    @Prop({ default: null }) encoded!: EncodedClause | null

    private fnSearch: string = ''
    private valueUnit: 'vet' | 'wei' = 'vet'

    get isPayable(): boolean {
        const fn = this.clause.selectedFunction
        if (!fn) return false
        return !!fn.payable || fn.stateMutability === 'payable'
    }

    get functions(): ABI.FunctionItem[] {
        const abi = this.clause.abi || []
        return abi
            .filter((item: any) => {
                if (!item || item.type !== 'function') return false
                const m = item.stateMutability || (item.constant ? 'view' : 'nonpayable')
                return m !== 'view' && m !== 'pure'
            })
            .map((item: any) => ({
                ...item,
                inputs: item.inputs || [],
                outputs: item.outputs || [],
                stateMutability: item.stateMutability || 'nonpayable',
                payable: !!item.payable
            }))
    }

    private isRoleInput(input: ABI.InputItem): boolean {
        return isRoleParam(input)
    }

    get filteredFunctions(): ABI.FunctionItem[] {
        const q = this.fnSearch.trim().toLowerCase()
        if (!q) return this.functions
        return this.functions.filter(fn => fn.name.toLowerCase().includes(q))
    }

    get displayValue(): string {
        if (!this.clause.value) return ''
        try {
            const bn = BN(this.clause.value)
            if (bn.isNaN() || !bn.isFinite()) return this.clause.value
            if (this.valueUnit === 'wei') {
                return bn.multipliedBy('1000000000000000000').toFixed(0, BN.ROUND_DOWN)
            }
            return bn.toFixed(18, BN.ROUND_DOWN).replace(/\.?0+$/, '') || '0'
        } catch {
            return this.clause.value || ''
        }
    }

    set displayValue(val: string) {
        if (!val) {
            this.update({ value: null })
            return
        }
        if (this.valueUnit === 'wei') {
            if (!/^\d+$/.test(val)) return
            try {
                const bn = BN(val)
                if (bn.isNaN() || !bn.isFinite()) return
                const result = bn.dividedBy('1000000000000000000').toFixed(18, BN.ROUND_DOWN)
                this.update({ value: result.replace(/\.?0+$/, '') || '0' })
            } catch {
                /* ignore */
            }
        } else {
            if (!/^\d*\.?\d*$/.test(val)) return
            this.update({ value: val })
        }
    }

    private inputTypes(fn: ABI.FunctionItem): string {
        return (fn.inputs || []).map(i => i.type).join(', ')
    }

    private mutabilityClass(fn: ABI.FunctionItem): string {
        const m = fn.stateMutability || (fn.constant ? 'view' : 'nonpayable')
        if (m === 'view' || m === 'pure') return 'is-view'
        if (m === 'payable') return 'is-payable'
        return 'is-write'
    }

    private onPickContract(payload: { address: string; name: string; abi: any[] }) {
        this.update({
            contractAddress: payload.address,
            contractName: payload.name,
            abi: payload.abi,
            selectedFunction: null,
            params: [],
            value: null
        })
    }

    private changeContract() {
        this.update({
            contractAddress: '',
            contractName: '',
            abi: [],
            selectedFunction: null,
            params: [],
            value: null
        })
    }

    private onSelectFunction(fn: ABI.FunctionItem) {
        const params = new Array((fn.inputs || []).length).fill('')
        this.update({ selectedFunction: fn, params })
        this.fnSearch = ''
    }

    private clearFunction() {
        this.update({ selectedFunction: null, params: [], value: null })
    }

    private onParam(index: number, val: any) {
        const params = [...this.clause.params]
        params[index] = val === undefined || val === null ? '' : String(val)
        this.update({ params })
    }

    private updateNote(val: string) {
        this.update({ note: val })
    }

    private update(patch: Partial<Entities.TxBuilderClause>) {
        this.$emit('update', { id: this.clause.id, patch })
    }

    @Watch('clause.id')
    private onClauseChange() {
        this.fnSearch = ''
        this.valueUnit = 'vet'
    }
}
</script>

<style lang="scss" scoped>
.clause-editor {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    height: 100%;
}

.editor-section {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1rem 1.25rem;
}
.section-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-color-light);
    font-weight: 600;
    margin-bottom: 0.75rem;
}
.section-sublabel {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
}

.contract-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}
.contract-summary__name {
    font-weight: 600;
    color: var(--text-color-strong);
}
.contract-summary__addr {
    font-size: 0.8rem;
    color: var(--text-color-light);
    word-break: break-all;
}

.function-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.function-summary__main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
}
.function-summary__name {
    font-weight: 600;
    color: var(--text-color-strong);
}
.function-summary__sig {
    color: var(--text-color-light);
    font-size: 0.85rem;
}

.function-list {
    max-height: 280px;
    overflow-y: auto;
    margin-top: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
}
.function-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color-light);
}
.function-row:last-child {
    border-bottom: none;
}
.function-row:hover {
    background: var(--body-background-alt);
}
.function-row__name {
    font-weight: 600;
    color: var(--text-color-strong);
    flex-shrink: 0;
}
.function-row__sig {
    flex: 1;
    color: var(--text-color-light);
    font-size: 0.85rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mutability-pill {
    font-size: 0.65rem;
    padding: 0.1rem 0.45rem;
    border-radius: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.mutability-pill.is-view {
    background: rgba(50, 175, 50, 0.12);
    color: #228822;
}
.mutability-pill.is-payable {
    background: rgba(255, 165, 0, 0.12);
    color: #cc7700;
}
.mutability-pill.is-write {
    background: rgba(50, 115, 220, 0.12);
    color: #3273dc;
}

.no-fns, .no-params {
    padding: 0.5rem 0;
    font-size: 0.85rem;
}

.params-stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.param-row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.param-row__header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
}
.param-row__name {
    font-weight: 600;
    color: var(--text-color-strong);
    font-size: 0.85rem;
}
.param-row__type {
    font-size: 0.7rem;
    color: var(--text-color-light);
    background: var(--body-background-alt);
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
}

.calldata-block {
    background: var(--body-background-alt);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.75rem;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
}
.calldata-bytes {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    color: var(--text-color-light);
}

.icon-btn {
    border: none;
    background: transparent;
    color: var(--text-color-light);
    cursor: pointer;
    padding: 0.15rem 0.3rem;
    border-radius: 4px;
}
.icon-btn:hover {
    color: var(--text-color-strong);
    background: var(--body-background-alt);
}

.unit-toggle-group {
    margin: 0;
}
.unit-toggle-btn {
    min-width: 50px;
    font-weight: 600;
    height: 2.5em;
    background-color: #f5f5f5;
    border-color: #dbdbdb;
    color: #363636;
}
.unit-toggle-btn:hover {
    background-color: #e8e8e8;
}
.unit-toggle-btn.is-active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: #ffffff;
}

[data-theme="dark"] {
    .calldata-block {
        background: #101010;
        color: #e8e8e8;
    }
    .mutability-pill.is-view {
        background: rgba(80, 220, 80, 0.18);
        color: #6be86b;
    }
    .mutability-pill.is-payable {
        background: rgba(255, 180, 30, 0.18);
        color: #ffd766;
    }
    .mutability-pill.is-write {
        background: rgba(107, 182, 255, 0.18);
        color: #6bb6ff;
    }
    .unit-toggle-btn {
        background-color: #2a2a2a;
        border-color: #404040;
        color: #e8e8e8;
    }
    .unit-toggle-btn:hover {
        background-color: #353535;
    }
    .unit-toggle-btn.is-active {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
        color: #ffffff;
    }
}
</style>
