<template>
    <div class="compile-status" v-if="diagnostics.length || warningList.length || result">
        <div v-if="diagnostics.length" class="block errors">
            <div class="block-head">
                <b-icon icon="exclamation-circle" type="is-danger" size="is-small" />
                <strong>{{ diagnostics.length }} error{{ diagnostics.length > 1 ? 's' : '' }}</strong>
            </div>
            <pre class="block-body">{{ diagnostics.map(e => e.formattedMessage || e.message).join('\n\n') }}</pre>
        </div>
        <div v-if="warningList.length" class="block warnings">
            <div class="block-head">
                <b-icon icon="exclamation-triangle" type="is-warning" size="is-small" />
                <strong>{{ warningList.length }} warning{{ warningList.length > 1 ? 's' : '' }}</strong>
            </div>
            <pre class="block-body">{{ warningList.map(w => w.formattedMessage || w.message).join('\n\n') }}</pre>
        </div>
        <div v-if="result" class="block ok">
            <div class="block-head">
                <b-icon icon="check-circle" type="is-success" size="is-small" />
                <strong>Compiled {{ result.contractName }}</strong>
                <span class="ml meta">{{ bytecodeSize }} bytes</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

interface SolcError {
    severity: 'error' | 'warning'
    formattedMessage?: string
    message: string
}

interface CompileResult {
    contractName: string
    bytecode: string
}

@Component
export default class CompileStatus extends Vue {
    @Prop({ default: () => [] }) diagnostics!: SolcError[]
    @Prop({ default: () => [] }) warningList!: SolcError[]
    @Prop({ default: null }) result!: CompileResult | null

    get bytecodeSize(): number {
        if (!this.result) return 0
        const hex = this.result.bytecode.startsWith('0x')
            ? this.result.bytecode.slice(2)
            : this.result.bytecode
        return hex.length / 2
    }
}
</script>

<style lang="scss" scoped>
.compile-status {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.block {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.6rem 0.8rem;
    background: var(--body-background-alt);
}
.errors {
    border-color: rgba(255, 56, 96, 0.4);
    background: rgba(255, 56, 96, 0.06);
}
.warnings {
    border-color: rgba(255, 183, 15, 0.4);
    background: rgba(255, 183, 15, 0.06);
}
.ok {
    border-color: rgba(72, 199, 142, 0.4);
    background: rgba(72, 199, 142, 0.06);
}
.block-head {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
}
.block-body {
    margin: 0.4rem 0 0 0;
    padding: 0;
    background: transparent;
    color: var(--text-color);
    font-family: monospace;
    font-size: 0.75rem;
    white-space: pre-wrap;
    word-break: break-word;
}
.meta {
    font-size: 0.75rem;
    color: var(--text-color-light);
}
.ml {
    margin-left: 0.5rem;
}
</style>
