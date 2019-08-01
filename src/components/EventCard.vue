<template>
    <Panel v-model="activeTab" :tabs="tabs" :title="item.name">
        <template slot="panel-content">
            <div v-show="activeTab === tabs[0]">
                <b-field
                    class="item-content"
                    horizontal
                    :label="v.name"
                    v-for="(v, index) in filters"
                    :key="index"
                >
                    <b-input ref="input" v-model="params[v.name]" :placeholder="v.type"></b-input>
                </b-field>
                <b-field class="item-content" horizontal>
                    <div class="buttons has-addons">
                        <button
                            type="button"
                            @click="addFilter(item.name)"
                            class="button is-rounded is-primary is-outlined"
                        >As a view</button>
                        <button
                            type="button"
                            @click="onRefresh(0)"
                            class="button is-rounded is-primary is-outlined"
                        >Execute</button>
                        <button
                            v-if="filters.length"
                            type="button"
                            @click="reset"
                            class="button is-rounded is-primary is-outlined"
                        >Reset</button>
                    </div>
                </b-field>
            </div>
            <div v-show="activeTab === tabs[1]">
                <pre>{{item}}</pre>
            </div>
            <div v-show="activeTab === tabs[2]">
                <nav class="navbar is-transparent" style="margin-bottom: 2px;">
                    <div class="navbar-item">
                        <div class="buttons has-addons">
                            <b-button
                                @click="onRefresh"
                                tag="button"
                                class="is-primary"
                                icon-left="sync-alt"
                            ></b-button>
                            <b-button
                                @click="onPrev"
                                tag="button"
                                class="is-primary"
                                :disabled="this.page < 1"
                                icon-left="chevron-left"
                            ></b-button>
                            <b-button
                                @click="onNext"
                                tag="button"
                                class="is-primary"
                                :disabled="list.length < 5"
                                icon-left="chevron-right"
                            ></b-button>
                        </div>
                    </div>
                    <div class="navbar-item">{{ranges}}</div>
                </nav>
                <b-loading :is-full-page="true" :active.sync="isLoading"></b-loading>
                <template v-for="(event, i) in list">
                    <EventShowCard :item="event" :key="page * 5 + i" :params="item.inputs">
                        <span slot="title">#{{page * 5 + i + 1}}</span>
                    </EventShowCard>
                </template>
            </div>
        </template>
    </Panel>
</template>
<script lang="ts">
import Panel from './Panel.vue'

import EventShowCard from './EventShowCard.vue'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import DB from '../database'
@Component({
    components: {
        Panel,
        EventShowCard
    }
})
export default class EventCard extends Vue {
    @Prop({ default: null })
    private item: ABI.EventItem | any

    @Prop()
    private address!: string

    @Prop({default: false})
    private prototype?: boolean

    private page = 0

    private list: any[] = []
    private params: any = {}
    private tabs = ['Filters', 'Description', 'Datas']
    private activeTab = ''
    private isLoading = false

    private event!: Connex.Thor.EventVisitor

    created() {
        this.filters.forEach((item: ABI.EventInputItem) => {
            this.params[item.name] = ''
        })
        this.activeTab = this.tabs[0]
        const account = connex.thor.account(this.address)
        this.event = account.event(this.item)
    }

    get filters() {
        return this.item.inputs.filter((item: ABI.EventInputItem) => {
            return item.indexed
        })
    }

    get ranges() {
        return (this.page * 5 + (this.list.length ? 1 : 0)) + ' - ' + (this.page * 5 + this.list.length)
    }
    @Watch('activeTab')
    onTabChange() {
        if (this.activeTab === 'Datas') {
            this.getResult(this.page)
        }
    }
    private onNext() {
        this.page++
        this.getResult(this.page)
    }
    private onPrev() {
        if (this.page > 0) {
            this.page--
            this.getResult(this.page)
        }
    }
    private onRefresh() {
        this.page = 0
        this.getResult(0)
    }

    private addFilter(name: string) {
        this.$dialog.prompt({
            title: 'Add quick view',
            message: 'Input a filter name',
            inputAttrs: {
                placeholder: 'Filter name',
                value: name,
                maxlength: 30,
                required: true
            },
            onConfirm: (value: string) => {
                this.saveFilter(value)
            }
        })
    }

    private reset() {
        this.params = {}
    }

    private async saveFilter(name: string) {
        const contract =
            (await DB.contracts
                .where('address')
                .equals(this.address)
                .first()) || null

        await DB.filters.add({
            name,
            address: contract!.address,
            contractName: contract!.name,
            fromPrototype: this.prototype,
            createdTime: Date.now(),
            abi: this.item
        })
        BUS.$emit('added-filter')
        this.$toast.open({
            message: 'Added success!',
            type: 'is-success'
        })
    }

    private async getResult(page: number) {
        this.isLoading = true
        const params: any[] = []

        for (const key in this.params) {
            if (this.params.hasOwnProperty(key)) {
                const element = this.params[key]
                if (element) {
                    params.push({
                        [key]: element
                    })
                }
            }
        }
        try {
            this.list = await this.event
                .filter(params)
                .order('desc')
                .apply(page * 5, 5)
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error)
        } finally {
            this.isLoading = false
            this.activeTab = this.tabs[2]
        }
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
