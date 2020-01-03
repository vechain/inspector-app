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
                    <pre>{{request}}</pre>
                </b-field>
                <b-field v-if="resp" label="Response">
                    <pre>{{resp}}</pre>
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
        const account = connex.thor.account(this.address)
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

