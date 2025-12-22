<template>
    <div class="func-card">
        <p class="panel-tabs" style="justify-content: left">
            <a
                v-for="(item, index) in tabs"
                :key="index"
                @click.stop="switchTab(item)"
                :class="{'is-active': activeTab === item}"
            >{{item}}</a>
        </p>
        <div class="card-content">
            <form ref="form" @reset.prevent="reset" v-show="activeTab === tabs[0]">
                <b-field
                    class="item-content"
                    horizontal
                    v-model="caller"
                    message="Special address to call the method, it's not the param of the method"
                    label="Caller"
                >
                    <b-input placeholder="Optional: Address"></b-input>
                </b-field>
                <b-field
                    class="item-content"
                    horizontal
                    :label="v.name"
                    v-for="(v, index) in item.inputs"
                    :key="index"
                >
                    <b-input ref="input" :readonly="(prototype && v.name === '_self')" required v-model="params[index]" :placeholder="v.type"></b-input>
                </b-field>
                <b-field v-if="item.payable" class="item-content" horizontal label="value">
                    <b-input type="number" placeholder="number" v-model="value"></b-input>
                </b-field>
                <b-field class="item-content">
                    <div class="buttons has-addons">
                        <button
                            type="button"
                            v-if="!item.constant"
                            @click.stop="executeFC"
                            class="button is-rounded is-primary is-outlined"
                        >Execute</button>
                        <button
                            type="button"
                            @click.stop="callFC"
                            class="button is-rounded is-primary is-outlined"
                        >Call</button>
                        <button type="reset" class="button is-rounded is-primary is-outlined">Reset</button>
                    </div>
                </b-field>
                <b-field v-if="request" label="Request">
                    <pre style="width: 100%;white-space: break-spaces; word-break: break-all;">{{request}}</pre>
                </b-field>
                <b-field v-if="resp" label="Response">
                    <pre style="width: 100%;white-space: break-spaces; word-break: break-all;">{{resp}}</pre>
                </b-field>
                <b-field v-if="txid || receipt" label="Receipt">
                    <pre style="width: 100%;white-space: break-spaces; word-break: break-all;" v-html="receiptDisplay"></pre>
                </b-field>
            </form>
            <div v-show="activeTab === tabs[1]">
                <pre>{{item}}</pre>
            </div>
        </div>
    </div>
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
export default class SampleFuncCard extends Mixins(AccountCall) {
    @Prop({ default: false })
    prototype?: boolean

    private tabs = ['Inputs', 'Description']
    private activeTab = ''

    created() {
        this.activeTab = this.tabs[0]
        const account = this.$connex.thor.account(this.address)
        this.method = account.method(this.item)
        if (this.prototype) {
            const index = this.item.inputs.findIndex((ele: ABI.FunctionItem) => {
                return ele.name === '_self'
            })
            this.params[index] = this.address
        }
    }

    private switchTab(tab: string) {
        this.activeTab = tab
    }

    get receiptDisplay() {
        if (!this.txid && !this.receipt) {
            return ''
        }
        
        let output = ''
        
        if (this.receiptStatus === 'pending') {
            output += 'Status: Pending\n'
            output += 'Waiting for transaction confirmation...\n\n'
        } else if (this.receiptStatus === 'error') {
            output += 'Status: Error\n'
            output += 'Failed to retrieve receipt (timeout or transaction not found)\n\n'
        } else if (this.receiptStatus === 'completed' && this.receipt) {
            const statusText = this.receipt.reverted ? 'Reverted' : 'Completed'
            const statusColor = this.receipt.reverted ? '#ff3860' : '#23d160'
            output += `Status: <span style="color: ${statusColor};">${statusText}</span>\n\n`
        }
        
        if (this.txid) {
            output += `Transaction ID: ${this.txid}\n`
            output += `Explorer: ${this.$explorerTx}${this.txid}\n\n`
        }
        
        if (this.receipt) {
            output += `Gas Used: ${this.receipt.gasUsed}\n`
            output += `Reverted: ${this.receipt.reverted ? 'Yes' : 'No'}\n`
            if (this.receipt.meta && this.receipt.meta.blockNumber) {
                output += `Block Number: ${this.receipt.meta.blockNumber}\n`
            }
            if (this.receipt.meta && this.receipt.meta.blockID) {
                output += `Block ID: ${this.receipt.meta.blockID}\n`
            }
            if (this.receipt.gasPayer) {
                output += `Gas Payer: ${this.receipt.gasPayer}\n`
            }
            if (this.receipt.paid) {
                output += `Paid: ${this.receipt.paid}\n`
            }
            if (this.receipt.reward) {
                output += `Reward: ${this.receipt.reward}\n`
            }
        }
        
        return output.trim()
    }
}
</script>
<style lang="scss" scoped>
.item-content {
    padding: 0.5rem 5rem 0 0;
}
.func-card .card-content {
    border-left: 1px solid #dbdbdb;
    border-right: 1px solid #dbdbdb;
    border-bottom: 1px solid #dbdbdb;
    padding-bottom: 20px;
}
.item-content .buttons {
    justify-content: flex-end;
}
</style>

