<template>
    <div class="section">
        <div class="container">
            <form>
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
                    :type="{'is-danger': errors.has('value')}"
                    :message="errors.firstByRule('value', 'decimal')"
                    label="Value"
                >
                    <b-input
                        v-model.trim="value"
                        name="value"
                        v-validate="'decimal'"
                        placeholder="number"
                        type="text"
                    />
                </b-field>
                <b-field class="is-clearfix">
                    <button
                        type="button"
                        @click="sendCode"
                        class="is-pulled-right button is-primary"
                    >Send</button>
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
    value: number | null = null
    async checkForm() {
        const result = await this.$validator.validateAll()
        return result
    }
    async sendCode() {
        if (await this.checkForm()) {
            connex.vendor
                .sign('tx')
                .comment('Inspector deploy CT')
                .request([{ value: this.value || 0, data: this.code, to: null }])
        }
    }
}
</script>
