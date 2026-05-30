<template>
    <div class="constructor-form">
        <div v-if="!inputs.length" class="no-args">
            <em>No arguments required.</em>
        </div>
        <div v-else class="arg-list">
            <div v-for="(input, i) in inputs" :key="i" class="arg-row">
                <label class="arg-label">
                    <span class="arg-name">{{ input.name || `arg${i}` }}</span>
                    <span class="arg-type">{{ input.type }}</span>
                </label>
                <ParamInput
                    :input="input"
                    :value="values[i]"
                    @input="onChange(i, $event)"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import ParamInput from '@/components/TxBuilder/ParamInput.vue'
import { validateParam } from '@/utils/param-validation'

function validateInput(value: any, input: ABI.InputItem): boolean {
    if (input.type === 'tuple' && input.components) {
        if (!Array.isArray(value)) return false
        for (let i = 0; i < input.components.length; i++) {
            if (!validateInput(value[i], input.components[i])) return false
        }
        return true
    }
    if (value === '' || value === null || value === undefined) return false
    return validateParam(value, input.type).valid
}

@Component({ components: { ParamInput } })
export default class ConstructorForm extends Vue {
    @Prop({ default: () => [] }) inputs!: ABI.InputItem[]
    @Prop({ default: () => [] }) value!: any[]

    private values: any[] = []

    created() {
        this.values = this.value.length
            ? [...this.value]
            : this.makeInitialValues(this.inputs)
    }

    @Watch('inputs')
    onInputsChanged() {
        this.values = this.makeInitialValues(this.inputs)
        this.emitChange()
    }

    private makeInitialValues(inputs: ABI.InputItem[]): any[] {
        return inputs.map((i) =>
            i.type === 'tuple' && i.components
                ? this.makeInitialValues(i.components as ABI.InputItem[])
                : '',
        )
    }

    onChange(i: number, val: any) {
        this.$set(this.values, i, val)
        this.emitChange()
    }

    private emitChange() {
        this.$emit('input', [...this.values])
        this.$emit('valid', this.isValid())
    }

    isValid(): boolean {
        for (let i = 0; i < this.inputs.length; i++) {
            if (!validateInput(this.values[i], this.inputs[i])) return false
        }
        return true
    }
}
</script>

<style lang="scss" scoped>
.no-args {
    color: var(--text-color-light);
    font-size: 0.85rem;
    padding: 0.5rem 0;
}
.arg-list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
}
.arg-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}
.arg-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.8rem;
    gap: 0.5rem;
}
.arg-name {
    font-weight: 600;
    color: var(--text-color-strong);
}
.arg-type {
    color: var(--text-color-light);
    font-family: monospace;
    font-size: 0.72rem;
}
</style>
