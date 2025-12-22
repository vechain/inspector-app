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
                    <b-field grouped>
                        <b-input
                            custom-class="is-family-monospace has-text-weight-semibold"
                            type="text"
                            :placeholder="valueUnit === 'vet' ? 'number(vet)' : 'number(wei)'"
                            v-model.trim="displayValue"
                            expanded
                        ></b-input>
                        <p class="control">
                            <div class="buttons has-addons unit-toggle-group">
                                <button
                                    @click="setValueUnit('vet')"
                                    type="button"
                                    class="button unit-toggle-btn"
                                    :class="{ 'is-active': valueUnit === 'vet' }"
                                >
                                    VET
                                </button>
                                <button
                                    @click="setValueUnit('wei')"
                                    type="button"
                                    class="button unit-toggle-btn"
                                    :class="{ 'is-active': valueUnit === 'wei' }"
                                >
                                    WEI
                                </button>
                            </div>
                        </p>
                    </b-field>
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
                <b-field v-if="txid || receipt" label="Receipt">
                    <pre style="width: 100%;white-space: break-spaces; word-break: break-all;" v-html="receiptDisplay"></pre>
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
    private valueUnit: 'vet' | 'wei' = 'vet'

    get displayValue(): string {
        if (!this.value) return ''

        try {
            const bn = BN(this.value)
            if (bn.isNaN() || !bn.isFinite()) {
                return this.value
            }

            if (this.valueUnit === 'wei') {
                // Convert VET to wei for display (multiply by 1e18)
                return bn.multipliedBy('1000000000000000000').toFixed(0, BN.ROUND_DOWN)
            } else {
                // VET mode: ensure no scientific notation
                // Format with up to 18 decimal places, remove trailing zeros
                const formatted = bn.toFixed(18, BN.ROUND_DOWN)
                return formatted.replace(/\.?0+$/, '') || '0'
            }
        } catch {
            return this.value
        }
    }

    set displayValue(val: string) {
        if (!val) {
            this.value = null
            return
        }

        if (this.valueUnit === 'wei') {
            // Convert wei to VET for storage (divide by 1e18)
            // Only accept integers in wei mode
            if (!/^\d+$/.test(val)) {
                return // Ignore invalid input
            }
            try {
                const bn = BN(val)
                if (bn.isNaN() || !bn.isFinite()) {
                    return
                }
                // Divide by 1e18 and keep precision, avoid scientific notation
                // Use toFixed with 18 decimals (max precision for wei/vet conversion)
                const result = bn.dividedBy('1000000000000000000').toFixed(18, BN.ROUND_DOWN)
                // Remove trailing zeros and unnecessary decimal point
                this.value = result.replace(/\.?0+$/, '') || '0'
            } catch {
                // Keep old value on error
            }
        } else {
            // VET mode: allow decimals
            // Validate format: number with optional decimal point
            if (!/^\d*\.?\d*$/.test(val)) {
                return // Ignore invalid input
            }
            this.value = val
        }
    }

    private setValueUnit(unit: 'vet' | 'wei') {
        this.valueUnit = unit
    }

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

/* Remove top, right, and left borders from panel-tabs */
::v-deep .panel-tabs {
    border-top: none !important;
    border-right: none !important;
    border-left: none !important;
}

/* Dark mode styling for function results (Request/Response) */
[data-theme="dark"] pre {
    background-color: #101010;
    color: #e8e8e8;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #404040;
}

/* Unit toggle button styling */
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
    transition: all 0.2s ease;
}

.unit-toggle-btn:hover {
    background-color: #e8e8e8;
    border-color: #b5b5b5;
}

.unit-toggle-btn.is-active {
    background-color: #485fc7;
    border-color: #485fc7;
    color: #ffffff;
    font-weight: 700;
}

.unit-toggle-btn.is-active:hover {
    background-color: #3e56c4;
    border-color: #3e56c4;
}

/* Dark mode styling for toggle */
[data-theme="dark"] .unit-toggle-btn {
    background-color: #2a2a2a;
    border-color: #404040;
    color: #e8e8e8;
}

[data-theme="dark"] .unit-toggle-btn:hover {
    background-color: #353535;
    border-color: #505050;
}

[data-theme="dark"] .unit-toggle-btn.is-active {
    background-color: #4a63d8;
    border-color: #4a63d8;
    color: #ffffff;
}

[data-theme="dark"] .unit-toggle-btn.is-active:hover {
    background-color: #5570dc;
    border-color: #5570dc;
}
</style>
