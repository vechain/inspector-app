<template>
    <section class="section contract-detail">
        <div v-if="contract" class="container">
            <Contract 
                :isShort="false" 
                :item="contract"
                @edit="editContract"
                @export="exportContract"
                @delete="deleteContract"
                @submitABI="submitABI"
            />
            <section style="margin-top: 20px;">
                <b-field grouped>
                    <b-field expanded>
                        <b-field class="is-pulled-right">
                            <b-autocomplete
                                rounded
                                v-model="name"
                                :data="filterList"
                                placeholder="Func/Event Name"
                                @select="onSearchSelect"
                            >
                                <template slot-scope="props">
                                    <div>
                                        <span class="is-size-6">{{props.option.name}}</span>
                                    </div>
                                    <span class="has-text-grey">{{props.option.type}}</span>
                                </template>
                                <template slot="empty">No results found</template>
                            </b-autocomplete>
                        </b-field>
                    </b-field>
                </b-field>
                <b-tabs v-model="tabIndex" class="block">
                    <b-tab-item :visible="item.visible" v-for="(item, index) in tabs" :key="index">
                        <span slot="header">
                            {{item.text}}
                            <span class="is-size-7" v-if="item.count">({{item.count}})</span>
                        </span>
                    </b-tab-item>
                </b-tabs>
                <div v-show="tabIndex === 0">
                    <FunctionCard
                        :id="item.name"
                        :ref="item.name"
                        v-for="(item, index) in readList"
                        :key="index"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                    />
                </div>
                <div v-show="tabIndex === 1">
                    <FunctionCard
                        v-for="(item, index) in writeList"
                        :ref="item.name"
                        :key="index"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                    />
                </div>
                <div v-show="tabIndex === 2">
                    <DescCard style="margin-bottom: 20px" :item="abi" title="ABI" />
                    <DescCard
                        class="code-pre"
                        v-if="code"
                        style="margin-bottom: 20px"
                        :item="code"
                        title="Code"
                    />
                </div>
                <div v-show="tabIndex === 3">
                    <EventCard
                        :address="contract.address"
                        v-for="(item, index) in eventList"
                        :key="index"
                        style="margin-bottom: 20px"
                        :item="item"
                        :title="item.name"
                    />
                </div>
                <div v-show="tabIndex === 4">
                    <RolesTab
                        v-if="hasAccessControl"
                        :contractAddress="contract.address"
                        :abi="abi"
                        :network="network"
                    />
                </div>
                <div v-show="tabIndex === 5">
                    <FallbackCard :fb="fb" />
                </div>

                <div v-show="tabIndex === 6">
                    <FunctionCard
                        v-for="(item, index) in prList"
                        :ref="item.name"
                        :key="index"
                        :prototype="true"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                    />
                </div>
                <div v-show="tabIndex === 7">
                    <FunctionCard
                        v-for="(item, index) in pwList"
                        :ref="item.name"
                        :key="index"
                        :prototype="true"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                    />
                </div>
                <div v-show="tabIndex === 8">
                    <EventCard
                        v-for="(item, index) in peList"
                        :ref="item.name"
                        :key="index"
                        :prototype="true"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                    />
                </div>
            </section>
        </div>
        <b-modal :width="640" :canCancel="[]" :active.sync="isModalActive">
            <EditContract @cancel="onCancelEdit" @finished="onFinishEdit" :item="contract" :isImport="false" />
        </b-modal>
    </section>
</template>
<script lang="ts">
import { Vue, Component, Mixins } from 'vue-property-decorator'
import Contract from '../components/Contract.vue'
import EditContract from '../components/EditContract.vue'
import FunctionCard from '../components/FunctionCard.vue'
import FallbackCard from '../components/FallbackCard.vue'
import EventCard from '../components/EventCard.vue'
import DescCard from '../components/DescCard.vue'
import RolesTab from '../components/RolesTab.vue'
import DB, { Entities } from '../database'
import PrototypeAbi from '../mixin/Prototype'
import { detectAccessControl } from '../services/access-control-service'
@Component({
    components: {
        Contract,
        EditContract,
        FunctionCard,
        FallbackCard,
        DescCard,
        EventCard,
        RolesTab
    }
})
export default class ContractDetail extends Mixins(PrototypeAbi) {
    get filterList() {
        const temp = this.abi
        return temp.filter((item: ABI.FunctionItem | ABI.EventItem) => {
            return (
                item.name &&
                this.name &&
                item.name
                    .toString()
                    .toLowerCase()
                    .indexOf(this.name.toLowerCase()) >= 0
            )
        })
    }
    get readList() {
        return this.abi.filter((item: ABI.FunctionItem) => {
            return (
                item.type === 'function' &&
                (item.constant === true ||
                    ['pure', 'view'].includes(item.stateMutability))
            )
        })
    }
    get writeList() {
        return this.abi.filter((item: ABI.FunctionItem) => {
            return (
                item.type === 'function' &&
                (item.constant === false ||
                    !['pure', 'view'].includes(item.stateMutability))
            )
        })
    }

    get eventList() {
        return this.abi.filter((item: ABI.EventItem) => {
            return item.type === 'event'
        })
    }
    get fb() {
        return this.abi.find((item: ABI.EventItem) => {
            return item.type === 'fallback'
        })
    }
    get hasAccessControl(): boolean {
        return detectAccessControl(this.abi)
    }
    get network(): string {
        return this.$connex.thor.genesis.id
    }
    private contract: Entities.Contract | null = null
    private tabIndex: number = 0
    private tabs: Array<{
        text: string
        count: number | ''
        visible: boolean
    }> = []
    private abi: any = []
    private code?: string = ''
    private name: string = ''
    private caller: string = ''
    private isProtoType = true
    private isModalActive = false
    async getDetail(idOrAddress: string) {
        this.contract =
            (await DB.contracts
                .where('id')
                .equals(parseInt(idOrAddress, 10))
                .or('address')
                .equals(idOrAddress)
                .first()) || null

        if (!this.contract) {
            const toast = this.$buefy.toast.open({
                duration: 3000,
                message: `No item got`,
                position: 'is-top',
                queue: false,
                type: 'is-info'
            })
            setTimeout(() => {
                this.$router.push({ name: 'contracts' })
            }, 3100)
            return
        } else {
            this.abi = this.contract!.abi!
        }
    }
    editContract() {
        this.isModalActive = true
    }

    onCancelEdit() {
        this.isModalActive = false
    }

    async onFinishEdit(data: { category: string; contractId: number; isNewContract: boolean }) {
        this.isModalActive = false
        // Reload the contract data
        const idOrAddress: string = this.$route.query.id || this.$route.query.address
        await this.getDetail(idOrAddress)
        // Re-initialize tabs since the ABI might have changed
        this.tabs = [
            {
                text: 'Read',
                count: this.readList.length,
                visible: !!this.readList.length
            },
            {
                text: 'Write',
                count: this.writeList.length,
                visible: !!this.writeList.length
            },
            { text: 'Code & ABI', count: '', visible: true },
            {
                text: 'Events',
                count: this.eventList.length,
                visible: !!this.eventList.length
            },
            { text: 'Roles', count: '', visible: this.hasAccessControl },
            { text: 'Fallback', count: '', visible: !!this.fb }
        ]
        this.tabs = this.tabs.concat(this.protoTabs)
    }

    exportContract() {
        const fileSaver = require('file-saver-es')
        const blob = new Blob(
            [
                JSON.stringify({
                    name: this.contract!.name,
                    abi: this.contract!.abi,
                    address: this.contract!.address
                })
            ],
            { type: 'text/plain' }
        )
        fileSaver.saveAs(blob, `${this.contract!.address}.json`)
    }

    deleteContract() {
        this.$buefy.dialog.confirm({
            title: 'Remove',
            message: `Are you sure want to remove ${this.contract!.name} contract`,
            cancelText: 'Cancel',
            confirmText: 'YES',
            type: 'is-danger',
            scroll: 'clip',
            onConfirm: async () => {
                await DB.contracts.where('id').equals(this.contract!.id!).delete()
                this.$router.push({ name: 'contracts' })
            }
        })
    }

    submitABI() {
        window.open('https://github.com/vechain/b32/new/master/ABIs', '_blank')
    }

    async getCode(address: string) {
        try {
            if (address) {
                const temp = await this.$connex.thor.account(address).getCode()
                this.code = temp.code
            }
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error)
        }
    }

    private async created() {
        this.$ga.page('/inspector/contract/detail')
        this.initAbi()
        const idOrAddress: string =
            this.$route.query.id || this.$route.query.address

        await this.getDetail(idOrAddress)
        this.tabs = [
            {
                text: 'Read',
                count: this.readList.length,
                visible: !!this.readList.length
            },
            {
                text: 'Write',
                count: this.writeList.length,
                visible: !!this.writeList.length
            },
            { text: 'Code & ABI', count: '', visible: true },
            {
                text: 'Events',
                count: this.eventList.length,
                visible: !!this.eventList.length
            },
            { text: 'Roles', count: '', visible: this.hasAccessControl },
            { text: 'Fallback', count: '', visible: !!this.fb }
        ]
        this.tabs = this.tabs.concat(this.protoTabs)
        await this.getCode(this.contract!.address || '')
        this.tabIndex = this.tabs.findIndex((item) => {
            return item.visible
        })
    }

    private onSearchSelect(item: any) {
        const types = {
            cb: 2,
            fb: 4,
            read: 0,
            write: 1,
            event: 3
        }

        let type: 'cb' | 'fb' | 'read' | 'write' | 'event' | 'function' =
            item.type
        if (type === 'function') {
            type = item.constant ? 'read' : 'write'
        }
        this.tabIndex = types[type]
        const temp = this.$refs[item.name] as any[]
        temp[0].$children[0].toggle(true)
        temp[0].$el.scrollIntoView()
    }
}
</script>

<style scope>
.code-pre pre {
    word-wrap: break-word;
    white-space: pre-wrap;
}
.contract-detail {
    max-width: 1000px;
    margin: auto;
}
</style>
