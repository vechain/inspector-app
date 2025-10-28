<template>
    <section class="section">
        <div class="level container">
            <div class="level-left">
                <h1 class="title level-item">Contracts</h1>
            </div>
            <div class="level-right">
                <button @click="onImport" style="margin-right: 10px;" class="button is-primary is-outlined">
                    <b-icon icon="file-import"></b-icon>
                </button>
                <button @click="addItem" class="button is-primary is-outlined">
                    <b-icon icon="plus"></b-icon>
                </button>
                <input class="is-hidden" ref="files" type="file" accept="application/json" />
            </div>
        </div>
        <div class="container search-container">
            <b-field>
                <b-input
                    v-model="searchQuery"
                    placeholder="Search by name or address..."
                    icon="search"
                    icon-right="times-circle"
                    icon-right-clickable
                    @icon-right-click="clearSearch"
                    expanded
                />
            </b-field>
        </div>
        <div v-if="filteredContracts.length" class="section">
            <div v-for="category in sortedCategories" :key="category" class="category-section">
                <div class="container">
                    <div class="category-header">
                        <h2 class="subtitle category-title">
                            {{ category || 'Uncategorized' }}
                            <span class="tag is-light is-rounded">{{ getCategoryContracts(category).length }}</span>
                            <button v-if="category" @click="renameCategory(category)" class="button is-small is-text">
                                <b-icon icon="pen" size="is-small"></b-icon>
                            </button>
                        </h2>
                    </div>
            
                    <div class="columns is-variable is-2 is-multiline">
                        <div
                            class="column is-3-fullhd is-6-desktop is-6-tablet is-12-mobile"
                            v-for="(item, index) in getCategoryContracts(category)"
                            :key="item.id"
                        >
                            <Contract 
                                variant="list"
                                :item="item"
                                :canMoveUp="index > 0"
                                :canMoveDown="index < getCategoryContracts(category).length - 1"
                                @select="onSelect(item.id)"
                                @edit="edit(item)"
                                @moveUp="moveUp(item, category)"
                                @moveDown="moveDown(item, category)"
                                @export="exportJson(item)"
                                @delete="remove(item)"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="!isloading && contracts.length && !filteredContracts.length" class="section">
            <div class="container">
                <div class="card">
                    <div class="card-content has-text-centered is-size-4 has-text-grey-light">
                        No contracts found matching "{{ searchQuery }}"
                    </div>
                    <div class="card-footer">
                        <a @click="clearSearch" class="card-footer-item">Clear Search</a>
                    </div>
                </div>
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
            <EditContract @cancel="onCancel" @finished="reload" :item="currentItem" :isImport="isImport" />
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
    private isImport: boolean = false
    private searchQuery: string = ''

    get filteredContracts(): Entities.Contract[] {
        if (!this.searchQuery.trim()) {
            return this.contracts
        }
        
        const query = this.searchQuery.toLowerCase()
        return this.contracts.filter(contract => {
            const name = (contract.name || '').toLowerCase()
            const address = contract.address.toLowerCase()
            return name.includes(query) || address.includes(query)
        })
    }

    get sortedCategories(): string[] {
        const categories = new Set<string>()
        this.filteredContracts.forEach(contract => {
            categories.add(contract.category || '')
        })
        const sorted = Array.from(categories).sort((a, b) => {
            if (!a) return 1
            if (!b) return -1
            return a.localeCompare(b)
        })
        return sorted
    }

    getCategoryContracts(category: string): Entities.Contract[] {
        return this.filteredContracts
            .filter(c => (c.category || '') === category)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    clearSearch() {
        this.searchQuery = ''
    }

    onSelect(id: number) {
        this.$router.push({
            name: 'contract_detail',
            query: { id: id.toString() }
        })
    }

    async created() {
        this.$ga.page('/inspector/contracts')
        const loading = this.$buefy.loading.open({
            container: null
        })

        await this.list()
        this.prepare()
        loading.close()

        DB.subscribe('contracts', () => {
            this.list()
        })
    }

    mounted() {
        const fileEle = this.$refs.files as HTMLInputElement
        fileEle.onchange = () => {
            const file = fileEle.files && fileEle.files[0]

            if (file) {
                const fr = new FileReader()
                fr.onloadend = (event) => {
                    const json: Entities.Contract = JSON.parse(
                        (fr.result as string) || ''
                    )
                    if (json) {
                        this.currentItem = {
                            abi: json.abi,
                            address: json.address,
                            name: json.name
                        }
                        const temp = this.contracts.find(
                            (contract) =>
                                contract.address.toLowerCase() ===
                                json.address.toLowerCase()
                        )
                        if (temp) {
                            this.currentItem.id = temp.id
                        }
                        this.isImport = true
                        this.open()
                    }
                }
                fr.readAsText(file)
            }
        }
    }

    onImport() {
        const fileEle = this.$refs.files as HTMLInputElement
        fileEle.click()
    }

    async prepare() {
        const { action, address, id } = this.$route.query
        switch (action) {
            case 'add':
                this.currentItem = {
                    address
                }
                this.open()
                break
            case 'edit':
                if (id) {
                    const contract = await DB.contracts
                        .where('id')
                        .equals(parseInt(id as string, 10))
                        .first()
                    if (contract) {
                        this.currentItem = contract
                        this.isImport = false
                        this.open()
                    }
                }
                break
            default:
                break
        }
    }

    reload() {
        (this.$refs.files as HTMLInputElement).value = ''
        this.currentItem = null
        this.list()
        this.isModalActive = false
    }

    private exportJson(item: any) {
        const fileSaver = require('file-saver-es')
        const blob = new Blob(
            [
                JSON.stringify({
                    name: item.name,
                    abi: item.abi,
                    address: item.address
                })
            ],
            { type: 'text/plain' }
        )
        fileSaver.saveAs(blob, `${item.address}.json`)
    }
    private remove(item: any) {
        this.$buefy.dialog.confirm({
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
        (this.$refs.files as HTMLInputElement).value = ''
        this.isModalActive = false
    }
    private async list() {
        const network = this.$connex.thor.genesis.id
        this.contracts = await DB.contracts
            .filter((item) => (item.network === network) || (item.network === undefined)).toArray()
        this.isloading = false
    }
    private addItem() {
        this.currentItem = null
        this.isImport = false
        this.open()
    }
    private onCancel() {
        this.currentItem = null
        this.close()
    }
    private edit(item: Entities.Contract) {
        this.currentItem = item
        this.isImport = false
        this.open()
    }

    // Move up/down handlers
    async moveUp(item: Entities.Contract, category: string) {
        const categoryContracts = this.getCategoryContracts(category)
        const currentIndex = categoryContracts.findIndex(c => c.id === item.id)
        
        if (currentIndex > 0) {
            const prevItem = categoryContracts[currentIndex - 1]
            const tempOrder = item.order || currentIndex
            
            await DB.contracts.where('id').equals(item.id!).modify({ order: prevItem.order || (currentIndex - 1) })
            await DB.contracts.where('id').equals(prevItem.id!).modify({ order: tempOrder })
            await this.list()
        }
    }

    async moveDown(item: Entities.Contract, category: string) {
        const categoryContracts = this.getCategoryContracts(category)
        const currentIndex = categoryContracts.findIndex(c => c.id === item.id)
        
        if (currentIndex < categoryContracts.length - 1) {
            const nextItem = categoryContracts[currentIndex + 1]
            const tempOrder = item.order || currentIndex
            
            await DB.contracts.where('id').equals(item.id!).modify({ order: nextItem.order || (currentIndex + 1) })
            await DB.contracts.where('id').equals(nextItem.id!).modify({ order: tempOrder })
            await this.list()
        }
    }

    // Category management
    async renameCategory(oldCategory: string) {
        this.$buefy.dialog.prompt({
            message: 'Enter new category name',
            inputAttrs: {
                value: oldCategory,
                maxlength: 50
            },
            trapFocus: true,
            onConfirm: async (newCategory: string) => {
                if (newCategory && newCategory !== oldCategory) {
                    const categoryContracts = this.contracts.filter(c => c.category === oldCategory)
                    for (const contract of categoryContracts) {
                        await DB.contracts.where('id').equals(contract.id!).modify({ category: newCategory })
                    }
                    await this.list()
                }
            }
        })
    }

    // Helper to reorder contracts in a category
    async reorderCategoryContracts(category: string) {
        const categoryContracts = this.getCategoryContracts(category)
        for (let i = 0; i < categoryContracts.length; i++) {
            await DB.contracts.where('id').equals(categoryContracts[i].id!).modify({ order: i })
        }
    }
}
</script>
<style lang="css" scoped>
.column:last-child {
    margin-bottom: 1.5rem;
}

/* Search container */
.search-container {
    margin-top: 1rem;
    margin-bottom: 1rem;
}

/* Category styles */
.category-section {
    margin-bottom: 2rem;
}

.category-header {
    margin-bottom: 0.5rem;
    padding: 0.5rem 0;
}

.category-title {
    margin-bottom: 0 !important;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
