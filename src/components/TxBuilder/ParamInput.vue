<template>
    <div class="param-input">
        <!-- bool -->
        <div v-if="input.type === 'bool'" class="bool-group">
            <b-radio :value="value" :native-value="true" @input="onChange">True</b-radio>
            <b-radio :value="value" :native-value="false" @input="onChange">False</b-radio>
        </div>

        <!-- tuple (struct) — render each component as a nested ParamInput -->
        <div v-else-if="isTuple" class="tuple-group">
            <div
                v-for="(comp, i) in components"
                :key="i"
                class="tuple-field"
            >
                <label class="tuple-label">
                    <span class="tuple-name">{{ comp.name || `field${i}` }}</span>
                    <span class="tuple-type">{{ comp.type }}</span>
                </label>
                <ParamInput
                    :input="comp"
                    :value="tupleAt(i)"
                    @input="onTupleField(i, $event)"
                />
            </div>
        </div>

        <!-- everything else: plain text input + validation -->
        <div v-else class="text-input-wrapper">
            <b-input
                custom-class="is-family-monospace has-text-weight-semibold"
                :class="{ 'is-invalid': showError }"
                :value="value"
                :placeholder="input.type"
                @input="onChange"
            ></b-input>
            <span v-if="showError" class="param-error">{{ validation.error }}</span>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { validateParam, ParamValidation } from '../../utils/param-validation'

@Component({ name: 'ParamInput' })
export default class ParamInput extends Vue {
    @Prop({ required: true }) input!: ABI.InputItem
    @Prop({ default: '' }) value!: any

    /**
     * Tuple support: when `input.type === 'tuple'`, `value` is an array
     * (positional, matching `input.components`). For `tuple[]` we still
     * render a textarea — array-of-tuples are out of scope for v1.
     */
    get isTuple(): boolean {
        return this.input.type === 'tuple' && !!this.input.components
    }

    get components(): ABI.InputItem[] {
        return this.input.components || []
    }

    tupleAt(i: number): any {
        const v = this.value
        if (Array.isArray(v)) return v[i] ?? ''
        return ''
    }

    onTupleField(i: number, val: any) {
        const next = Array.isArray(this.value)
            ? [...this.value]
            : new Array(this.components.length).fill('')
        next[i] = val
        this.$emit('input', next)
    }

    get validation(): ParamValidation {
        return validateParam(this.value, this.input.type)
    }

    get showError(): boolean {
        const v = this.value
        if (v === null || v === undefined || v === '') return false
        return !this.validation.valid
    }

    private onChange(val: any) {
        this.$emit('input', val)
    }
}
</script>

<style lang="scss" scoped>
.param-input {
    width: 100%;
}
.bool-group {
    display: flex;
    gap: 1rem;
}
.text-input-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.param-error {
    font-size: 0.7rem;
    color: #ff3860;
}
.param-input ::v-deep .is-invalid input,
.param-input ::v-deep .is-invalid textarea {
    border-color: #ff3860 !important;
    box-shadow: 0 0 0 0.125em rgba(255, 56, 96, 0.15);
}

.tuple-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.55rem 0.7rem;
    border-left: 2px solid var(--primary-color, #485fc7);
    background: var(--body-background-alt);
    border-radius: 0 4px 4px 0;
}
.tuple-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.tuple-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.75rem;
    gap: 0.4rem;
}
.tuple-name {
    font-weight: 600;
    color: var(--text-color-strong);
}
.tuple-type {
    color: var(--text-color-light);
    font-family: monospace;
    font-size: 0.7rem;
}
</style>
