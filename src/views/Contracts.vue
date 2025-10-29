<template>
    <section class="section">
        <div class="level container">
            <div class="level-left">
                <h1 class="title level-item">Contracts</h1>
            </div>
            <div class="level-right">
                <button @click="onImport" style="margin-right: 10px;" class="button is-primary is-outlined">
                    <b-icon icon="upload"></b-icon>
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
                            <button v-if="category" @click="renameCategory(category)" class="button is-small is-text">
                                <b-icon icon="pen" size="is-small"></b-icon>
                            </button>
                            <span class="tag is-light is-rounded" style="background-color: #e9ecef;">{{ getCategoryContracts(category).length }}</span>
                        </h2>
                        <div class="category-actions">

                            <button 
                                @click="moveCategoryUp(category)" 
                                class="button is-small is-text"
                                :disabled="sortedCategories.indexOf(category) === 0"
                                title="Move category up"
                            >
                                <b-icon icon="chevron-up" size="is-small"></b-icon>
                            </button>
                            <button 
                                @click="moveCategoryDown(category)" 
                                class="button is-small is-text"
                                :disabled="sortedCategories.indexOf(category) === sortedCategories.length - 1"
                                title="Move category down"
                            >
                                <b-icon icon="chevron-down" size="is-small"></b-icon>
                            </button>
                          
                        </div>
                    </div>
            
                    <div class="columns is-variable is-2 is-multiline">
                        <div
                            class="column is-3-fullhd is-6-desktop is-6-tablet is-12-mobile"
                            v-for="(item, index) in getCategoryContracts(category)"
                            :key="item.id"
                            @dragover.prevent="handleDragOver($event, category, index)"
                            @dragleave="handleDragLeave"
                            @drop="handleDrop($event, category, index)"
                            :class="{ 'drop-target': dropTarget && dropTarget.category === category && dropTarget.index === index }"
                        >
                            <div class="drop-indicator" v-if="dropTarget && dropTarget.category === category && dropTarget.index === index"></div>
                            <Contract 
                                variant="list"
                                :item="item"
                                @select="onSelect(item.id)"
                                @edit="edit(item)"
                                @dragstart="handleDragStartContract"
                                @dragend="handleDragEndContract"
                                @export="exportJson(item)"
                                @delete="remove(item)"
                            />
                        </div>
                        <!-- Drop zone at the end of category -->
                        <div
                            v-if="getCategoryContracts(category).length > 0"
                            class="column is-3-fullhd is-6-desktop is-6-tablet is-12-mobile drop-zone-end"
                            @dragover.prevent="handleDragOver($event, category, getCategoryContracts(category).length)"
                            @dragleave="handleDragLeave"
                            @drop="handleDrop($event, category, getCategoryContracts(category).length)"
                            :class="{ 'drop-target': dropTarget && dropTarget.category === category && dropTarget.index === getCategoryContracts(category).length }"
                        >
                            <div class="drop-indicator" v-if="dropTarget && dropTarget.category === category && dropTarget.index === getCategoryContracts(category).length"></div>
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
    private categoryOrder: { [key: string]: number } = {}
    private draggedContract: Entities.Contract | null = null
    private dropTarget: { category: string; index: number } | null = null

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
        
        // Sort by custom order first, then alphabetically
        const sorted = Array.from(categories).sort((a, b) => {
            const orderA = this.categoryOrder[a] ?? 9999
            const orderB = this.categoryOrder[b] ?? 9999
            
            if (orderA !== orderB) {
                return orderA - orderB
            }
            
            // If same order or no order, sort alphabetically
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

        this.loadCategoryOrder()
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

    // Drag and drop handlers
    handleDragStartContract(contract: Entities.Contract) {
        this.draggedContract = contract
    }

    handleDragEndContract() {
        this.draggedContract = null
        this.dropTarget = null
    }

    handleDragOver(e: DragEvent, category: string, index: number) {
        e.preventDefault()
        if (this.draggedContract) {
            this.dropTarget = { category, index }
        }
    }

    handleDragLeave(e: DragEvent) {
        // Only clear if we're leaving the drop zone entirely
        const relatedTarget = e.relatedTarget as HTMLElement
        if (!relatedTarget || !relatedTarget.closest('.column')) {
            this.dropTarget = null
        }
    }

    async handleDrop(e: DragEvent, targetCategory: string, targetIndex: number) {
        e.preventDefault()
        
        if (!this.draggedContract) {
            return
        }

        const draggedContract = this.draggedContract
        const sourceCategory = draggedContract.category || ''
        const categoryContracts = this.getCategoryContracts(sourceCategory)
        const sourceIndex = categoryContracts.findIndex(c => c.id === draggedContract.id)

        // If dropping in the same position, do nothing
        if (sourceCategory === targetCategory && sourceIndex === targetIndex) {
            this.dropTarget = null
            return
        }

        // Update category if changed
        if (sourceCategory !== targetCategory) {
            await DB.contracts.where('id').equals(draggedContract.id!).modify({ 
                category: targetCategory || undefined 
            })
        }

        // Reorder contracts in the target category
        await this.reorderAfterDrop(targetCategory, draggedContract, targetIndex)
        
        this.dropTarget = null
        await this.list()
    }

    async reorderAfterDrop(category: string, draggedContract: Entities.Contract, targetIndex: number) {
        const categoryContracts = this.getCategoryContracts(category)
        const draggedIndex = categoryContracts.findIndex(c => c.id === draggedContract.id)
        
        // Remove dragged item from current position
        if (draggedIndex !== -1) {
            categoryContracts.splice(draggedIndex, 1)
        }
        
        // Insert at new position
        categoryContracts.splice(targetIndex, 0, draggedContract)
        
        // Update order for all contracts in category
        for (let i = 0; i < categoryContracts.length; i++) {
            await DB.contracts.where('id').equals(categoryContracts[i].id!).modify({ order: i })
        }
    }

    // Category management
    loadCategoryOrder() {
        const stored = localStorage.getItem('categoryOrder')
        if (stored) {
            try {
                this.categoryOrder = JSON.parse(stored)
            } catch (e) {
                this.categoryOrder = {}
            }
        }
    }

    saveCategoryOrder() {
        localStorage.setItem('categoryOrder', JSON.stringify(this.categoryOrder))
    }

    ensureAllCategoriesHaveOrder() {
        // Initialize orders for all categories if any are missing
        const categories = this.sortedCategories
        let needsSave = false
        
        categories.forEach((category, index) => {
            if (this.categoryOrder[category] === undefined) {
                this.$set(this.categoryOrder, category, index)
                needsSave = true
            }
        })
        
        if (needsSave) {
            this.saveCategoryOrder()
        }
    }

    moveCategoryUp(category: string) {
        this.ensureAllCategoriesHaveOrder()
        
        const categories = this.sortedCategories
        const currentIndex = categories.indexOf(category)
        
        if (currentIndex > 0) {
            const prevCategory = categories[currentIndex - 1]
            const currentOrder = this.categoryOrder[category]
            const prevOrder = this.categoryOrder[prevCategory]
            
            this.$set(this.categoryOrder, category, prevOrder)
            this.$set(this.categoryOrder, prevCategory, currentOrder)
            this.saveCategoryOrder()
        }
    }

    moveCategoryDown(category: string) {
        this.ensureAllCategoriesHaveOrder()
        
        const categories = this.sortedCategories
        const currentIndex = categories.indexOf(category)
        
        if (currentIndex < categories.length - 1) {
            const nextCategory = categories[currentIndex + 1]
            const currentOrder = this.categoryOrder[category]
            const nextOrder = this.categoryOrder[nextCategory]
            
            this.$set(this.categoryOrder, category, nextOrder)
            this.$set(this.categoryOrder, nextCategory, currentOrder)
            this.saveCategoryOrder()
        }
    }

    async renameCategory(oldCategory: string) {
        this.$buefy.dialog.prompt({
            message: 'Enter new category name',
            inputAttrs: {
                value: oldCategory,
                maxlength: 50
            },
            trapFocus: true,
            onConfirm: async (newCategory: string) => {
                const normalized = (newCategory || '').trim()
                if (normalized.toLowerCase() === 'uncategorized') {
                    this.$buefy.toast.open({
                        message: 'Category name "Uncategorized" is reserved. Please choose another name.',
                        type: 'is-danger',
                        duration: 2500,
                        position: 'is-bottom'
                    })
                    return
                }
                if (normalized && normalized !== oldCategory) {
                    const categoryContracts = this.contracts.filter(c => c.category === oldCategory)
                    for (const contract of categoryContracts) {
                        await DB.contracts.where('id').equals(contract.id!).modify({ category: normalized })
                    }
                    
                    // Update category order if exists
                    if (this.categoryOrder[oldCategory] !== undefined) {
                        this.$set(this.categoryOrder, normalized, this.categoryOrder[oldCategory])
                        this.$delete(this.categoryOrder, oldCategory)
                        this.saveCategoryOrder()
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
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #f8f9fa;
    border-radius: 4px;
}

.category-title {
    margin-bottom: 0 !important;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.category-actions {
    display: flex;
    gap: 0.25rem;
}

/* Drag and drop styles */
.column.drop-target {
    position: relative;
}

.drop-indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #3273dc;
    border-radius: 2px;
    z-index: 100;
    animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
        box-shadow: 0 0 8px rgba(50, 115, 220, 0.6);
    }
    50% {
        opacity: 0.6;
        box-shadow: 0 0 16px rgba(50, 115, 220, 0.8);
    }
}

.drop-zone-end {
    min-height: 100px;
    position: relative;
}

.drop-zone-end .drop-indicator {
    width: 100%;
    height: 4px;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
}
</style>
