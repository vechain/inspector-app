<template>
    <div class="param-input">
        <div v-if="input.type === 'bool'" class="bool-group">
            <b-radio :value="value" :native-value="true" @input="onChange">True</b-radio>
            <b-radio :value="value" :native-value="false" @input="onChange">False</b-radio>
        </div>
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

@Component
export default class ParamInput extends Vue {
    @Prop({ required: true }) input!: ABI.InputItem
    @Prop({ default: '' }) value!: any

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
</style>
