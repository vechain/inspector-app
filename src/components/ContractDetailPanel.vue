<template>
    <div class="contract-detail-panel">
        <div v-if="contract" class="container">
            <Contract 
                :isShort="false" 
                :item="contract"
                @edit="editContract"
                @export="exportContract"
                @delete="deleteContract"
                @submitABI="submitABI"
            />
            <section class="search-and-tabs-section">
                <div class="search-section">
                    <b-field grouped >
                        <b-field expanded >
                            <b-field style="width: 100%;" class="is-pulled-right">
                                <b-autocomplete
                                    rounded
                                    v-model="name"
                                    :data="filterList"
                                    placeholder="Search for functions or events"
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
                </div>
                <div class="tabs-section">
                    <b-tabs v-model="tabIndex" class="block">
                        <b-tab-item :visible="item.visible" v-for="(item, index) in tabs" :key="index">
                            <span slot="header">
                                {{item.text}}
                                <span class="is-size-7" v-if="item.count">({{item.count}})</span>
                            </span>
                        </b-tab-item>
                    </b-tabs>
                </div>
                <div v-show="tabIndex === 0">
                    <FunctionCard
                        :id="item.name"
                        :ref="item.name"
                        v-for="(item, index) in readList"
                        :key="index"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                        :isHighlighted="highlightedItem === item.name"
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
                        :isHighlighted="highlightedItem === item.name"
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
                        :ref="item.name"
                        :address="contract.address"
                        v-for="(item, index) in eventList"
                        :key="index"
                        style="margin-bottom: 20px"
                        :item="item"
                        :title="item.name"
                        :isHighlighted="highlightedItem === item.name"
                    />
                </div>
                <div v-show="tabIndex === 4">
                    <FallbackCard :fb="fb" />
                </div>

                <div v-show="tabIndex === 5">
                    <FunctionCard
                        v-for="(item, index) in prList"
                        :ref="item.name"
                        :key="index"
                        :prototype="true"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                        :isHighlighted="highlightedItem === item.name"
                    />
                </div>
                <div v-show="tabIndex === 6">
                    <FunctionCard
                        v-for="(item, index) in pwList"
                        :ref="item.name"
                        :key="index"
                        :prototype="true"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                        :isHighlighted="highlightedItem === item.name"
                    />
                </div>
                <div v-show="tabIndex === 7">
                    <EventCard
                        v-for="(item, index) in peList"
                        :ref="item.name"
                        :key="index"
                        :prototype="true"
                        :address="contract.address"
                        style="margin-bottom: 20px"
                        :item="item"
                        :isHighlighted="highlightedItem === item.name"
                    />
                </div>
            </section>
        </div>
        <b-modal :width="640" :canCancel="[]" :active.sync="isModalActive">
            <EditContract @cancel="onCancelEdit" @finished="onFinishEdit" :item="contract" :isImport="false" />
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Mixins, Watch } from 'vue-property-decorator'
import Contract from './Contract.vue'
import EditContract from './EditContract.vue'
import FunctionCard from './FunctionCard.vue'
import FallbackCard from './FallbackCard.vue'
import EventCard from './EventCard.vue'
import DescCard from './DescCard.vue'
import { Entities } from '../database'
import PrototypeAbi from '../mixin/Prototype'

@Component({
    components: {
        Contract,
        EditContract,
        FunctionCard,
        FallbackCard,
        DescCard,
        EventCard
    }
})
export default class ContractDetailPanel extends Mixins(PrototypeAbi) {
    @Prop({ required: true })
    private contract!: Entities.Contract

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
    private highlightedItem: string = ''

    @Watch('contract', { immediate: true })
    onContractChange(newContract: Entities.Contract) {
        if (newContract) {
            this.loadContractData()
        }
    }

    @Watch('tabIndex')
    onTabChange() {
        this.highlightedItem = ''
    }

    async loadContractData() {
        this.abi = this.contract!.abi!
        
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
            { text: 'Fallback', count: '', visible: !!this.fb }
        ]
        this.tabs = this.tabs.concat(this.protoTabs)
        
        await this.getCode(this.contract!.address || '')
        
        this.tabIndex = this.tabs.findIndex((item) => {
            return item.visible
        })
    }

    editContract() {
        this.isModalActive = true
    }

    onCancelEdit() {
        this.isModalActive = false
    }

    async onFinishEdit(data: { category: string; contractId: number; isNewContract: boolean }) {
        this.isModalActive = false
        // Notify parent to reload contract data
        this.$emit('contract-updated', this.contract.id)
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
        this.$emit('delete-contract', this.contract)
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

    private created() {
        this.initAbi()
    }

    private onSearchSelect(item: any) {
        // Set highlighted item
        this.highlightedItem = item.name
        
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
            // Check both constant (legacy) and stateMutability (modern) for read functions
            const isReadFunction = item.constant === true || 
                ['pure', 'view'].includes(item.stateMutability)
            type = isReadFunction ? 'read' : 'write'
        }
        this.tabIndex = types[type]
        
        // Wait for tab switch and DOM update before scrolling
        this.$nextTick(() => {
            setTimeout(() => {
                const temp = this.$refs[item.name] as any[]
                if (temp && temp[0]) {
                    temp[0].$children[0].toggle(true)
                    // Wait for panel to open before scrolling
                    setTimeout(() => {
                        temp[0].$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 100)
                }
            }, 50)
        })
    }
}
</script>

<style scoped>
.contract-detail-panel {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--body-background-alt);
}

/* Remove borders from Panel components in contract detail */
.contract-detail-panel >>> .panel {
    border: none !important;
}

.contract-detail-panel >>> .panel-heading {
    border: none !important;
}

.contract-detail-panel >>> .panel-block {
    border: none !important;
}

.contract-detail-panel >>> .panel-tabs {
    border-bottom: 1px solid var(--border-color) !important;
}

/* Improve text visibility in dark mode */
.contract-detail-panel >>> .panel-heading strong {
    color: var(--text-color-strong);
}

.contract-detail-panel >>> .media-content strong {
    color: var(--text-color-strong);
}

.contract-detail-panel >>> .media-content p {
    color: var(--text-color);
}

.contract-detail-panel >>> .custom-tabs a {
    color: var(--text-color-strong);
}

.contract-detail-panel >>> .custom-tabs a:hover {
    border-bottom-color: #6bb6ff;
}

.contract-detail-panel >>> .custom-tabs a.is-active {
    color: var(--primary-color);
}

/* Buefy tabs styling */
.contract-detail-panel >>> .b-tabs .tabs a {
    color: var(--text-color-strong);
}

.contract-detail-panel >>> .b-tabs .tabs a:hover {
    color: var(--text-color-strong);
    border-bottom-color: #6bb6ff;
}

.contract-detail-panel >>> .b-tabs .tabs li.is-active a {
    color: var(--primary-color);
}

.code-pre pre {
    word-wrap: break-word;
    white-space: pre-wrap;
}

.container {
    max-width: 1000px;
    margin: auto;
    padding: 1.5rem 1rem;
}

/* Sticky Search and Tabs Container */
.search-and-tabs-section {
    margin-top: 20px;
}

/* Search Section Sticky Positioning */
.search-section {
    position: -webkit-sticky;
    position: sticky;
    top: 0px;
    z-index: 100;
    background: var(--body-background-alt);
    padding: 15px 0 10px 0;
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
}

/* Tabs Section Sticky Positioning */
.tabs-section {
    position: -webkit-sticky;
    position: sticky;
    top: 60px;
    z-index: 99;
    background: var(--body-background-alt);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    box-shadow: 0 2px 1px rgba(0, 0, 0, 0.05);
    margin-bottom: 10px;
}

.tabs-section >>> .b-tabs {
    margin-bottom: 0;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
    .container {
        padding: 1rem 0.75rem;
    }
    
    .search-section {
        margin-left: -0.75rem;
        margin-right: -0.75rem;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
    }
    
    .tabs-section {
        margin-left: -0.75rem;
        margin-right: -0.75rem;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
    }
}

@media (max-width: 480px) {
    .container {
        padding: 0.75rem 0.5rem;
    }
    
    .search-section {
        margin-left: -0.5rem;
        margin-right: -0.5rem;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }
    
    .tabs-section {
        margin-left: -0.5rem;
        margin-right: -0.5rem;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }
}
</style>

