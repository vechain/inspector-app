<template>
    <section class="section">
        <div class="level container">
            <div class="level-left">
                <h1 class="title level-item">Contracts</h1>
            </div>
            <div class="level-right">
                <button @click="addItem" class="button is-primary is-outlined">
                    <b-icon icon="plus"></b-icon>
                </button>
            </div>
        </div>
        <div
            v-if="contracts.length"
            :class="{'is-centered': contracts.length < 4}"
            class="columns section is-variable is-1 is-multiline"
        >
            <div
                class="column is-3-fullhd is-4-desktop is-6-tablet"
                v-for="(item, index) in contracts"
                :key="index"
            >
                <Contract @select="onSelect(item.id)" :item="item" class="contract-box">
                    <slot>
                        <p class="buttons buttons-slot">
                            <button @click.stop="edit(item)" class="button is-primary is-inverted">
                                <b-icon icon="edit" size="is-small"></b-icon>
                            </button>
                        </p>
                    </slot>
                    <slot slot="right">
                        <button
                            @click.stop="remove(item)"
                            class="buttons-slot button is-danger is-inverted"
                        >
                            <b-icon icon="trash-alt" size="is-small"></b-icon>
                        </button>
                    </slot>
                </Contract>
            </div>
        </div>
        <div v-if="!isloading && !contracts.length" class="section">
            <div class="container">
                <div class="card">
                    <div
                        class="card-content has-text-centered is-size-2 has-text-grey-light"
                    >No contracts here!</div>
                    <div class="card-footer">
                        <a @click="addItem" class="card-footer-item">Add</a>
                    </div>
                </div>
            </div>
        </div>
        <b-modal :width="640" :canCancel="['outside']" :active.sync="isModalActive">
            <EditContract @cancel="onCancel" @finished="reload" :item="currentItem" />
        </b-modal>
    </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import EditContract from '../components/EditContract.vue'
import Contract from '../components/Contract.vue'
import DB, { Entities } from '../database'
@Component({
    components: {
        Contract,
        EditContract
    }
})
export default class Contracts extends Vue {
    private isloading = true

    private isModalActive = false
    private currentItem: Entities.Contract | null = null
    private contracts: Entities.Contract[] = []

    onSelect(id: number) {
        this.$router.push({
            name: 'contract_detail',
            query: { id: id.toString() }
        })
    }

    async created() {
        this.$ga.page('/inspector/contracts')
        const loading = this.$loading.open({
            container: null
        })

        await this.list()
        this.prepare()
        loading.close()

        DB.subscribe('contracts', () => {
            this.list()
        })
    }

    prepare() {
        const { action, address } = this.$route.query
        switch (action) {
            case 'add':
                this.currentItem = {
                    address
                }
                this.open()
                break
            default:
                break
        }
    }

    reload() {
        this.currentItem = null
        this.list()
        this.isModalActive = false
    }

    private remove(item: any) {
        this.$dialog.confirm({
            title: 'Remove',
            message: `Are you sure want to remove ${item.name} contract`,
            cancelText: 'Cancel',
            confirmText: 'YES',
            type: 'is-danger',
            scroll: 'clip',
            onConfirm: () => {
                DB.contracts.delete(item.id).then(() => {
                    this.reload()
                })
            }
        })
    }
    private open() {
        this.isModalActive = true
    }
    private close() {
        this.isModalActive = false
    }
    private async list() {
        this.contracts = await DB.contracts.toArray()
        this.isloading = false
    }
    private addItem() {
        this.currentItem = null
        this.open()
    }
    private onCancel() {
        this.currentItem = null
        this.close()
    }
    private edit(item: Entities.Contract) {
        this.currentItem = item
        this.open()
    }
}
</script>
<style lang="css" scoped>
.column:last-child {
    margin-bottom: 1.5rem;
}
.buttons-slot {
    opacity: 0.3;
    transition: opacity 0.2s ease-in-out;
}
.contract-box {
    width: 320px;
}
.contract-box:hover .buttons-slot {
    opacity: 1;
}
</style>
