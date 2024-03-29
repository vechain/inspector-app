<template>
    <Panel v-model="activeTab" :tabs="tabs" :title="item.name">
        <template slot="panel-content">
            <form @reset.self.prevent="reset" v-show="activeTab === tabs[0]">
                <b-field
                    class="item-content"
                    horizontal
                    message="Special address to call the method, it's not the param of the method"
                    label="Caller"
                >
                    <b-input custom-class="is-family-monospace has-text-weight-semibold" v-model="caller" placeholder="Optional: Address"></b-input>
                </b-field>
                <b-field
                    class="item-content"
                    horizontal
                    :label="v.name"
                    v-for="(v, index) in item.inputs"
                    :key="index"
                >
                    <div  v-if="v.type === 'bool'">
                        <b-radio v-model="params[index]"
                            name="True"
                            :native-value="true">
                            True
                        </b-radio>
                        <b-radio v-model="params[index]"
                            name="False"
                            :native-value="false">
                            False
                        </b-radio>
                    </div>
                    <b-input
                        v-else
                        ref="input"
                        custom-class="is-family-monospace has-text-weight-semibold"
                        required
                        :name="v.name"
                        :readonly="(prototype && v.name === '_self')"
                        v-model="params[index]"
                        :placeholder="v.type"
                    ></b-input>
                </b-field>
                <b-field v-if="payable" class="item-content" horizontal label="value">
                    <b-input custom-class="is-family-monospace has-text-weight-semibold" type="text" placeholder="number(vet)" v-model.trim="value"></b-input>
                </b-field>
                <b-field class="item-content" horizontal>
                    <div class="buttons has-addons">
                        <button
                            type="button"
                            @click="addShortCut(item.name)"
                            class="button is-rounded is-primary is-outlined"
                        >Shortcut</button>
                        <button
                            v-if="couldExc"
                            @click.stop="executeFC"
                            type="button"
                            class="button is-rounded is-primary is-outlined"
                        >Execute</button>
                        <button
                            type="button"
                            @click.stop="callFC"
                            class="button is-rounded is-primary is-outlined"
                        >Call</button>
                        <button
                            v-if="params.length"
                            type="reset"
                            class="button is-rounded is-primary is-outlined"
                        >Reset</button>
                    </div>
                </b-field>
                <b-field v-if="request" label="Request">
                    <pre style="width: 100%;white-space: break-spaces; word-break: break-all;">{{request}}</pre>
                </b-field>
                <b-field v-if="resp" label="Response">
                    <pre style="width: 100%;white-space: break-spaces; word-break: break-all;">{{resp}}</pre>
                </b-field>
            </form>
            <div v-show="activeTab === tabs[1]">
                <pre>{{item}}</pre>
            </div>
        </template>
    </Panel>
</template>
<script lang="ts">
import Panel from './Panel.vue'
import AccountCall from '../mixin/AccountCall'
import { Vue, Component, Prop, Mixins } from 'vue-property-decorator'
import DB from '../database'
@Component({
    components: {
        Panel
    }
})
export default class FunctionCard extends Mixins(AccountCall) {
    private tabs = ['Inputs', 'Description']
    private activeTab = 'Inputs'

    created() {
        this.activeTab = this.tabs[0]
        if (this.prototype) {
            const index = this.item.inputs.findIndex((ele: ABI.FunctionItem) => {
                return ele.name === '_self'
            })
            this.params[index] = this.address
        }
        this.initMethod(this.address, this.item)
    }
    get couldExc() {
        return !(this.item.constant === true || ['view', 'pure'].includes(this.item.stateMutability))
    }
    private addShortCut(name: string) {
        this.$buefy.dialog.prompt({
            title: 'Add Shortcut',
            message: 'Input a shortcut',
            inputAttrs: {
                placeholder: 'Filter name',
                value: name,
                maxlength: 30,
                required: true
            },
            onConfirm: (value: string) => {
                this.saveShortCut(value)
            }
        })
    }

    private async saveShortCut(name: string) {
        const contract =
            (await DB.contracts
                .where('address')
                .equals(this.address)
                .first()) || null

        await DB.shortCuts.add({
            name,
            address: contract!.address,
            contractName: contract!.name,
            fromPrototype: this.prototype,
            createdTime: Date.now(),
            abi: this.item,
            network: this.$connex.thor.genesis.id,
            type: this.couldExc ? 'write' : 'read'
        })

        BUS.$emit('added-shortcut')
        this.$buefy.toast.open({
            message: 'Added success!',
            type: 'is-success'
        })
    }
}
</script>
<style lang="scss" scoped>
.item-content {
    padding: 0.5rem 5rem 0 0;
}
.item-content .buttons {
    justify-content: flex-end;
}
</style>
