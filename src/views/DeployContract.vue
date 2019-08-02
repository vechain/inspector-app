<template>
    <div class="section" style="max-width: 1000px; margin: auto">
        <div class="container">
            <form @submit.prevent="sendCode">
                <b-field
                    :type="{'is-danger': errors.has('code')}"
                    :message="errors.first('code')"
                    label="Byte Code"
                >
                    <b-input
                        name="code"
                        rows="10"
                        v-validate="{required: true, bytecode: true}"
                        v-model.trim="code"
                        type="textarea"
                    />
                </b-field>
                <b-field
                    :type="{'is-danger': errors.has('vet')}"
                    :message="errors.first('vet')"
                    label="Vet"
                >
                    <b-input v-model.trim="vet" v-validate="'vet'" placeholder="number (optional)" name="vet" type="text"/>
                </b-field>
                <b-field label="Valid Hex value (wei)">
                    <span class="is-family-monospace has-text-weight-semibold">{{haxValue}}</span>
                </b-field>
                <b-field label="Valid Integer value (wei)">
                    <span class="is-family-monospace has-text-weight-semibold">{{numberValue}}</span>
                </b-field>
                <b-field class="is-clearfix">
                    <button type="submit" class="is-pulled-right button is-primary">Send</button>
                </b-field>
            </form>
        </div>
    </div>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class DeployContract extends Vue {
    code: string = ''
    vet: number | null = null
    get haxValue() {
        const vet = BN(this.vet)
        if (!vet.isNaN() && !vet.isNegative()) {
            return '0x' + BN(vet.multipliedBy(1e18).toFixed(0)).toString(16)
        } else {
            return '0x0'
        }
    }
    get numberValue() {
        const vet = BN(this.vet)
        if (!vet.isNaN() && !vet.isNegative()) {
            return vet.multipliedBy(1e18).toFixed(0)
        } else {
            return '0'
        }
    }
    async checkForm() {
        const result = await this.$validator.validateAll()
        return result
    }
    async sendCode() {
        if (await this.checkForm()) {
            try {
                connex.vendor
                    .sign('tx')
                    .comment('Inspector deploy CT')
                    .request([{ value: this.haxValue || 0, data: this.code, to: null }])
            } catch (error) {
                this.$toast.open({
                    type: 'is-danger',
                    message: `${error.name}: ${error.message}`,
                    position: 'is-top',
                    duration: 3000
                })
            }
        }
    }

    private created() {
        this.$ga.page('/inspector/deploy')
    }
}
</script>
