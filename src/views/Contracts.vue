<template>
    <section class="contracts-layout">
        <!-- Sidebar -->
        <Sidebar 
            :contracts="contracts"
            :categoryOrder="categoryOrder"
            @open-contract="openContract"
            @add-contract="addItem"
            @edit-contract="edit"
            @export-contract="exportJson"
            @delete-contract="remove"
            @import-contract="handleImport"
            @drop-contract="handleDropContract"
            @move-category-up="moveCategoryUp"
            @move-category-down="moveCategoryDown"
            @rename-category="renameCategory"
        />

        <!-- Main Content Area -->
        <div class="main-content">
            <!-- Tab Bar -->
            <TabBar 
                :openContracts="openContracts"
                :activeContractId="activeContractId"
                :pinnedTabs="pinnedTabs"
                @select-tab="selectTab"
                @close-tab="closeTab"
                @pin-tab="pinTab"
                @unpin-tab="unpinTab"
            />

            <!-- Contract Detail Panel or Empty State -->
            <div class="content-area">
                <!-- Render all open contracts but show only active one -->
                <ContractDetailPanel 
                    v-for="contract in openContracts"
                    :key="contract.id"
                    v-show="activeContractId === contract.id"
                    :contract="getContractById(contract.id)"
                    @contract-updated="handleContractUpdate"
                    @delete-contract="handleDeleteFromPanel"
                />
                
                <!-- Empty State -->
                <div v-show="openContracts.length === 0" class="empty-state-container">
                    <div class="empty-state-content">
                        <div class="empty-icon">
                            <b-icon icon="file-contract" size="is-large" custom-class="has-text-grey-light"></b-icon>
                        </div>
                        <h2 class="empty-title">No Contract Selected</h2>
                        <p class="empty-description">
                            Select a contract from the list on the left to explore its functions and interact with it.
                        </p>
                        <div class="empty-hints">
                            <div class="hint-card">
                                <p class="hint-title">Getting Started</p>
                                <ul class="hint-list">
                                    <li>Search contracts by name or address</li>
                                    <li>Click "View" to open in a new tab</li>
                                    <li>Organize contracts with categories</li>
                                    <li>Execute read and write functions</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit/Add Contract Modal -->
        <b-modal :width="640" :canCancel="['outside']" :active.sync="isModalActive">
            <EditContract @cancel="onCancel" @finished="reload" :item="currentItem" :isImport="isImport" />
        </b-modal>
    </section>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Sidebar from '../components/Sidebar.vue'
import TabBar from '../components/TabBar.vue'
import ContractDetailPanel from '../components/ContractDetailPanel.vue'
import EditContract from '../components/EditContract.vue'
import DB, { Entities } from '../database'

interface OpenContract {
    id: number
    name: string
    address: string
}

@Component({
    components: {
        Sidebar,
        TabBar,
        ContractDetailPanel,
        EditContract
    }
})
export default class Contracts extends Vue {
    private isloading = true
    private isModalActive = false
    private currentItem: Entities.Contract | null = null
    private contracts: Entities.Contract[] = []
    private isImport: boolean = false
    private categoryOrder: { [key: string]: number } = {}
    
    // Tab management state
    private openContracts: OpenContract[] = []
    private activeContractId: number | null = null
    private pinnedTabs: Set<number> = new Set()

    get activeContract(): Entities.Contract | null {
        if (this.activeContractId === null) {
            return null
        }
        return this.contracts.find(c => c.id === this.activeContractId) || null
    }

    getContractById(id: number): Entities.Contract | null {
        return this.contracts.find(c => c.id === id) || null
    }

    openContract(contract: Entities.Contract) {
        // Check if contract is already open
        const existing = this.openContracts.find(c => c.id === contract.id)
        if (existing) {
            this.activeContractId = contract.id!
            this.saveTabState()
            return
        }

        // Add new contract to open contracts
        const newContract: OpenContract = {
            id: contract.id!,
            name: contract.name || 'Unnamed Contract',
            address: contract.address
        }
        this.openContracts.push(newContract)
        this.activeContractId = contract.id!
        this.saveTabState()
    }

    selectTab(id: number) {
        this.activeContractId = id
        this.saveTabState()
    }

    closeTab(id: number) {
        // Check if tab is pinned
        if (this.pinnedTabs.has(id)) {
            this.$buefy.toast.open({
                message: 'Unpin the tab before closing it',
                type: 'is-warning',
                duration: 2000,
                position: 'is-bottom'
            })
            return
        }

        const index = this.openContracts.findIndex(c => c.id === id)
        if (index === -1) return

        this.openContracts.splice(index, 1)

        // If closed contract was active, switch to another
        if (this.activeContractId === id) {
            if (this.openContracts.length > 0) {
                // Switch to the last tab or the one before the closed tab
                const newIndex = Math.min(index, this.openContracts.length - 1)
                this.activeContractId = this.openContracts[newIndex].id
            } else {
                this.activeContractId = null
            }
        }
        this.saveTabState()
    }

    pinTab(id: number) {
        this.pinnedTabs.add(id)
        // Force reactivity update
        this.pinnedTabs = new Set(this.pinnedTabs)
        this.saveTabState()
    }

    unpinTab(id: number) {
        this.pinnedTabs.delete(id)
        // Force reactivity update
        this.pinnedTabs = new Set(this.pinnedTabs)
        this.saveTabState()
    }

    saveTabState() {
        const openIds = this.openContracts.map(c => c.id)
        const pinnedIds = Array.from(this.pinnedTabs)
        
        localStorage.setItem('inspector-open-contracts', JSON.stringify(openIds))
        localStorage.setItem('inspector-active-contract', JSON.stringify(this.activeContractId))
        localStorage.setItem('inspector-pinned-contracts', JSON.stringify(pinnedIds))
    }

    async loadTabState() {
        try {
            const openIdsJson = localStorage.getItem('inspector-open-contracts')
            const activeIdJson = localStorage.getItem('inspector-active-contract')
            const pinnedIdsJson = localStorage.getItem('inspector-pinned-contracts')

            if (openIdsJson) {
                const openIds: number[] = JSON.parse(openIdsJson)
                
                // Validate that contracts still exist
                for (const id of openIds) {
                    const contract = this.contracts.find(c => c.id === id)
                    if (contract) {
                        this.openContracts.push({
                            id: contract.id!,
                            name: contract.name || 'Unnamed Contract',
                            address: contract.address
                        })
                    }
                }
            }

            if (activeIdJson) {
                const activeId: number | null = JSON.parse(activeIdJson)
                if (activeId && this.openContracts.find(c => c.id === activeId)) {
                    this.activeContractId = activeId
                }
            }

            if (pinnedIdsJson) {
                const pinnedIds: number[] = JSON.parse(pinnedIdsJson)
                this.pinnedTabs = new Set(pinnedIds.filter(id => 
                    this.openContracts.find(c => c.id === id)
                ))
            }
        } catch (e) {
            console.error('Failed to load tab state:', e)
        }
    }

    async handleContractUpdate(contractId: number) {
        // Reload contract from database
        await this.list()
        
        // Update open contract name if it changed
        const contract = this.contracts.find(c => c.id === contractId)
        if (contract) {
            const openContract = this.openContracts.find(c => c.id === contractId)
            if (openContract) {
                openContract.name = contract.name || 'Unnamed Contract'
                openContract.address = contract.address
            }
        }
    }

    handleDeleteFromPanel(contract: Entities.Contract) {
        this.$buefy.dialog.confirm({
            title: 'Remove',
            message: `Are you sure want to remove ${contract.name} contract`,
            cancelText: 'Cancel',
            confirmText: 'YES',
            type: 'is-danger',
            scroll: 'clip',
            onConfirm: async () => {
                await DB.contracts.where('id').equals(contract.id!).delete()
                // Close the tab
                this.closeTab(contract.id!)
                await this.list()
            }
        })
    }

    async created() {
        this.$ga.page('/inspector/contracts')
        const loading = this.$buefy.loading.open({
            container: null
        })

        this.loadCategoryOrder()
        await this.list()
        await this.loadTabState()
        this.prepare()
        loading.close()

        DB.subscribe('contracts', () => {
            this.list()
        })
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
        this.currentItem = null
        this.list()
        this.isModalActive = false
    }

    private exportJson(item: Entities.Contract) {
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

    private remove(item: Entities.Contract) {
        this.$buefy.dialog.confirm({
            title: 'Remove',
            message: `Are you sure want to remove ${item.name} contract`,
            cancelText: 'Cancel',
            confirmText: 'YES',
            type: 'is-danger',
            scroll: 'clip',
            onConfirm: async () => {
                await DB.contracts.delete(item.id!)
                // Close tab if open
                const tabIndex = this.openContracts.findIndex(c => c.id === item.id!)
                if (tabIndex !== -1) {
                    this.closeTab(item.id!)
                }
                this.reload()
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

    private handleImport(json: Entities.Contract) {
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

    // Drag and drop handlers
    async handleDropContract(payload: { contract: Entities.Contract, targetCategory: string, targetIndex: number }) {
        const { contract, targetCategory, targetIndex } = payload
        const sourceCategory = contract.category || ''

        // If dropping in the same position, do nothing
        const categoryContracts = this.contracts
            .filter(c => (c.category || '') === sourceCategory)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        const sourceIndex = categoryContracts.findIndex(c => c.id === contract.id)

        if (sourceCategory === targetCategory && sourceIndex === targetIndex) {
            return
        }

        // Update category if changed
        if (sourceCategory !== targetCategory) {
            await DB.contracts.where('id').equals(contract.id!).modify({ 
                category: targetCategory || undefined 
            })
        }

        // Reorder contracts in the target category
        await this.reorderAfterDrop(targetCategory, contract, targetIndex)
        
        await this.list()
    }

    async reorderAfterDrop(category: string, draggedContract: Entities.Contract, targetIndex: number) {
        const categoryContracts = this.contracts
            .filter(c => (c.category || '') === category)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
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
        const categories = new Set<string>()
        this.contracts.forEach(contract => {
            categories.add(contract.category || '')
        })
        
        const categoryArray = Array.from(categories)
        let needsSave = false
        
        categoryArray.forEach((category, index) => {
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
        
        const categories = Array.from(new Set(this.contracts.map(c => c.category || '')))
            .sort((a, b) => {
                const orderA = this.categoryOrder[a] ?? 9999
                const orderB = this.categoryOrder[b] ?? 9999
                if (orderA !== orderB) return orderA - orderB
                if (!a) return 1
                if (!b) return -1
                return a.localeCompare(b)
            })
        
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
        
        const categories = Array.from(new Set(this.contracts.map(c => c.category || '')))
            .sort((a, b) => {
                const orderA = this.categoryOrder[a] ?? 9999
                const orderB = this.categoryOrder[b] ?? 9999
                if (orderA !== orderB) return orderA - orderB
                if (!a) return 1
                if (!b) return -1
                return a.localeCompare(b)
            })
        
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
}
</script>

<style lang="css" scoped>
.contracts-layout {
    display: flex;
    height: 100%;
    overflow: hidden;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fafafa;
}

.content-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.empty-state-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}

.empty-state-content {
    max-width: 500px;
    text-align: center;
}

.empty-icon {
    margin-bottom: 1.5rem;
}

.empty-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #363636;
    margin-bottom: 0.75rem;
}

.empty-description {
    font-size: 1rem;
    color: #7a7a7a;
    margin-bottom: 2rem;
    line-height: 1.5;
}

.empty-hints {
    margin-top: 2rem;
}

.hint-card {
    background: white;
    border: 1px solid #dbdbdb;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: left;
}

.hint-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #363636;
    margin-bottom: 0.75rem;
}

.hint-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.hint-list li {
    font-size: 0.875rem;
    color: #7a7a7a;
    padding: 0.25rem 0;
    padding-left: 1.25rem;
    position: relative;
}

.hint-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #3273dc;
    font-weight: bold;
}
</style>
