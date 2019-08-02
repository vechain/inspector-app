<template>
    <section>
        <div class="log-container">
            <div class="columns">
                <div class="column is-one-third" v-for="(v, index) in params" :key="index">
                    <b-field :label="v.name">
                        <b-input v-model="conditions[v.name]" :placeholder="v.type"></b-input>
                    </b-field>
                </div>
                <div class="column is-one-third">
                    <b-field label="Order">
                        <b-select expanded placeholder="Order" v-model="page.order">
                            <option :value="true">ASC</option>
                            <option :value="false">DESC</option>
                        </b-select>
                    </b-field>
                </div>
            </div>
            <nav class="navbar is-transparent" style="margin-bottom: 2px; z-index: 20">
                <div class="navbar-start">
                    <div class="navbar-item" style="padding-left: 0">
                        <b-field style="width: 350px" horizontal>
                            <template slot="label">
                                <div style="width: 100px; text-align: left">Block Range</div>
                            </template>
                            <b-input v-model="blockFrom" placeholder="from"></b-input>
                            <b-input v-model="blockTo" placeholder="to"></b-input>
                        </b-field>
                    </div>
                </div>
                <div class="navbar-end">
                    <div class="navbar-item">{{ranges}}</div>
                    <div class="navbar-item">
                        <div class="buttons has-addons">
                            <button @click="prePage" :disabled="page.num < 1" class="button">
                                <b-icon icon="angle-left"></b-icon>
                            </button>
                            <button
                                @click="nextPage"
                                :disabled="list.length < page.size"
                                class="button"
                            >
                                <b-icon icon="angle-right"></b-icon>
                            </button>
                        </div>
                    </div>
                    <div class="navbar-item">
                        <button @click="search" class="button is-primary is-outlined">Search</button>
                    </div>
                </div>
            </nav>
            <b-loading :is-full-page="false" :active.sync="isLoading" :can-cancel="true"></b-loading>
            <template v-for="(item, i) in list">
                <EventShowCard :item="item" :key="i" :params="abi.inputs">
                    <span slot="title">#{{page.num * page.size + i + 1}}</span>
                </EventShowCard>
            </template>
        </div>
    </section>
</template>
<script lang="ts">
import EventShowCard from '../components/EventShowCard.vue'
import { Vue, Component, Watch } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component({
    components: {
        EventShowCard
    }
})
export default class FilterView extends Vue {
    private isLoading = true
    private filter!: Entities.Filter | null
    private event!: Connex.Thor.EventVisitor
    private abi!: any
    private conditions: any = {}
    private page = {
        num: 0,
        size: 10,
        order: true
    }
    private blockFrom: number | null = null
    private blockTo: number | null = null

    private list: any[] = []
    private metadata: boolean = false
    private params: ABI.EventInputItem[] = []

    setParams() {
        this.params = this.abi.inputs.filter((item: ABI.EventInputItem) => {
            return item.indexed
        })
    }

    get ranges() {
        return '#'
            + (this.page.num * this.page.size + (this.list.length ? 1 : 0))
            + ' - #'
            + (this.page.num * this.page.size + this.list.length)
    }

    @Watch('$route')
    async onRouterChange() {
        await this.init()
        this.getList(0)
    }

    @Watch('page.size')
    onSizeChanged(value: number) {
        if (!value) {
            this.page.size = 5
        }
        this.search()
    }

    @Watch('page.order')
    onOrderChanged() {
        this.search()
    }

    private async init() {
        this.filter =
            (await DB.filters
                .where('id')
                .equals(parseInt(this.$route.params.id, 10))
                .first()) || null
        const account = connex.thor.account(this.filter!.address)
        this.abi = this.filter!.abi ? this.filter!.abi : ''
        this.event = account.event(this.abi)
        this.setParams()
    }

    private search() {
        this.page.num = 0
        this.getList(0)
    }

    private prePage() {
        if (this.page.num > 0) {
            this.page.num--
            this.getList(this.page.num)
        }
    }
    private nextPage() {
        this.page.num++
        this.getList(this.page.num)
    }

    private async getList(page: number) {
        this.isLoading = true
        const params: any[] = []

        for (const key in this.conditions) {
            if (this.conditions.hasOwnProperty(key)) {
                const element = this.conditions[key]
                if (element) {
                    params.push({
                        [key]: element
                    })
                }
            }
        }

        this.list = await this.event
            .filter(params)
            .order(this.page.order ? 'asc' : 'desc')
            .range(this.getBlcokRange())
            .apply(page * this.page.size, this.page.size)
        this.isLoading = false
    }

    private getBlcokRange(): Connex.Thor.Filter.Range {
        const from = this.blockFrom || 0
        const to = this.blockTo || connex.thor.status.head.number
        return {
            unit: 'block',
            from: BN(from).toNumber(),
            to: BN(to).toNumber()
        }
    }

    private async created() {
        this.$ga.page('/inspector/view/list')
        await this.init()
        this.getList(0)
    }
}
</script>
<style scoped>
.log-container {
    width: 800px;
    margin: auto;
    padding: 1.1rem;
    overflow-x: auto;
    min-height: 100%;
}
.block-range.field-label {
    width: 100px;
}
</style>
