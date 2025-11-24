<template>
    <section class="contracts-layout">
        <!-- Mobile Sidebar Toggle -->
        <button 
            class="mobile-sidebar-toggle"
            @click="toggleSidebar"
            v-if="isMobileView"
        >
            <b-icon :icon="isSidebarOpen ? 'times' : 'bars'"></b-icon>
        </button>

        <!-- Sidebar -->
        <div class="sidebar-wrapper" :class="{ 'is-open': isSidebarOpen }">
            <Sidebar 
                ref="sidebar"
                :contracts="contracts"
                :categoryOrder="categoryOrder"
                :activeContractId="activeContractId"
                @open-contract="handleOpenContract"
                @add-contract="addItem"
                @edit-contract="edit"
                @export-contract="exportJson"
                @delete-contract="remove"
                @show-import-instructions="handleShowImportInstructions"
                @files-selected="handleFilesSelected"
                @drop-contract="handleDropContract"
                @move-category-up="moveCategoryUp"
                @move-category-down="moveCategoryDown"
                @rename-category="renameCategory"
            />
        </div>

        <!-- Mobile Overlay -->
        <div 
            v-if="isMobileView && isSidebarOpen"
            class="sidebar-overlay"
            @click="closeSidebar"
        ></div>

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
                                    <li>Click the contract name to open in a new tab</li>
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
        <b-modal :width="640" :canCancel="[]" :active.sync="isModalActive">
            <EditContract @cancel="onCancel" @finished="handleContractSaved" :item="currentItem" :isImport="isImport" />
        </b-modal>

        <!-- Import Instructions Modal -->
        <b-modal :active.sync="showInstructionsModal" :canCancel="['escape']">
            <ImportInstructionsModal 
                @cancel="showInstructionsModal = false"
                @proceed="handleInstructionsProceed"
            />
        </b-modal>

        <!-- Import Type Modal -->
        <b-modal :active.sync="showTypeModal" :canCancel="['escape', 'outside']">
            <ImportTypeModal 
                @cancel="showTypeModal = false"
                @select-files="handleSelectFiles"
                @select-folder="handleSelectFolder"
                @select-builtin="handleSelectBuiltIn"
                @files-dropped="handleFilesDropped"
            />
        </b-modal>

        <!-- Import Preview Modal -->
        <b-modal :active.sync="showPreviewModal" :canCancel="['escape']">
            <ImportPreviewModal 
                :parsedContracts="parsedContracts"
                :existingCategories="existingCategories"
                :isBuiltInMode="isBuiltInMode"
                @cancel="showPreviewModal = false"
                @import-selected="handleImportSelected"
            />
        </b-modal>
    </section>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Sidebar from '../components/Sidebar.vue'
import TabBar from '../components/TabBar.vue'
import ContractDetailPanel from '../components/ContractDetailPanel.vue'
import EditContract from '../components/EditContract.vue'
import ImportInstructionsModal from '../components/ImportContract/ImportInstructionsModal.vue'
import ImportTypeModal from '../components/ImportContract/ImportTypeModal.vue'
import ImportPreviewModal from '../components/ImportContract/ImportPreviewModal.vue'
import DB, { Entities } from '../database'
import { ParseResult } from '../utils/import-utils'
import { ImportService } from '../services/import-service'
import { BuiltInContractsService } from '../services/builtin-contracts-service'

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
        EditContract,
        ImportInstructionsModal,
        ImportTypeModal,
        ImportPreviewModal
    }
})
export default class Contracts extends Vue {
    private isloading = true
    private isModalActive = false
    private currentItem: Entities.Contract | null = null
    private contracts: Entities.Contract[] = []
    private isImport: boolean = false
    private categoryOrder: { [key: string]: number } = {}
    private categoryToExpand: string | null = null
    
    // Tab management state
    private openContracts: OpenContract[] = []
    private activeContractId: number | null = null
    private pinnedTabs: Set<number> = new Set()
    
    // Mobile state
    private isMobileView: boolean = false
    private isSidebarOpen: boolean = false

    // Import state
    private showInstructionsModal: boolean = false
    private showTypeModal: boolean = false
    private showPreviewModal: boolean = false
    private parsedContracts: ParseResult[] = []
    private isBuiltInMode: boolean = false

    get activeContract(): Entities.Contract | null {
        if (this.activeContractId === null) {
            return null
        }
        return this.contracts.find(c => c.id === this.activeContractId) || null
    }

    get existingCategories(): string[] {
        const categories = new Set<string>()
        this.contracts.forEach(contract => {
            if (contract.category && contract.category.trim() !== '') {
                categories.add(contract.category)
            }
        })
        return Array.from(categories).sort()
    }

    getContractById(id: number): Entities.Contract | null {
        return this.contracts.find(c => c.id === id) || null
    }

    handleOpenContract(contract: Entities.Contract) {
        this.openContract(contract)
        // Close sidebar on mobile after opening contract
        if (this.isMobileView) {
            this.closeSidebar()
        }
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen
    }

    closeSidebar() {
        this.isSidebarOpen = false
    }

    checkMobileView() {
        this.isMobileView = window.innerWidth < 768
        // Close sidebar on resize if not mobile anymore
        if (!this.isMobileView) {
            this.isSidebarOpen = false
        }
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
            // Force Vue to re-read the connex instance to avoid stale references in Safari
            this.$nextTick(() => {
                this.list()
            })
        })
    }

    mounted() {
        this.checkMobileView()
        window.addEventListener('resize', this.checkMobileView)
    }

    beforeDestroy() {
        window.removeEventListener('resize', this.checkMobileView)
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

    handleContractSaved(data: { category: string; contractId: number; isNewContract: boolean }) {
        this.categoryToExpand = data.category
        this.reload(data.isNewContract ? data.contractId : null)
    }

    async reload(contractIdToOpen: number | null = null) {
        const categoryToExpand = this.categoryToExpand
        this.currentItem = null
        this.categoryToExpand = null
        await this.list()
        this.isModalActive = false
        
        // Expand the category if specified
        if (categoryToExpand !== null) {
            this.$nextTick(() => {
                const sidebar = this.$refs.sidebar as any
                if (sidebar && sidebar.expandCategory) {
                    sidebar.expandCategory(categoryToExpand)
                }
            })
        }

        // Open the contract if it's a newly added one
        if (contractIdToOpen !== null) {
            const contract = this.contracts.find(c => c.id === contractIdToOpen)
            if (contract) {
                this.$nextTick(() => {
                    this.openContract(contract)
                })
            }
        }
    }

    private exportJson(item: Entities.Contract) {
        ImportService.exportContractToJson(item)
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
        // Ensure connex is available and get current network
        if (!this.$connex || !this.$connex.thor || !this.$connex.thor.genesis) {
            console.warn('Connex not properly initialized')
            this.isloading = false
            return
        }
        
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

    private handleShowImportInstructions() {
        const hideInstructions = localStorage.getItem('hideImportInstructions')
        if (hideInstructions === 'true') {
            this.showTypeModal = true
        } else {
            this.showInstructionsModal = true
        }
    }

    private handleInstructionsProceed() {
        this.showInstructionsModal = false
        this.showTypeModal = true
    }

    // Import handlers
    private handleSelectFiles() {
        this.showTypeModal = false
        const sidebar = this.$refs.sidebar as any
        if (sidebar && sidebar.triggerFileUpload) {
            sidebar.triggerFileUpload('files')
        }
    }

    private handleSelectFolder() {
        this.showTypeModal = false
        const sidebar = this.$refs.sidebar as any
        if (sidebar && sidebar.triggerFileUpload) {
            sidebar.triggerFileUpload('folder')
        }
    }

    private async handleSelectBuiltIn() {
        this.showTypeModal = false
        
        const loadingComponent = this.$buefy.loading.open({
            container: null
        })
        
        try {
            const currentNetwork = this.$connex.thor.genesis.id
            const results = await BuiltInContractsService.getBuiltInContracts(currentNetwork)
            
            if (results.length === 0) {
                this.$buefy.toast.open({
                    message: 'No built-in contracts available for this network',
                    type: 'is-info'
                })
                return
            }

            this.parsedContracts = results
            this.isBuiltInMode = true
            this.showPreviewModal = true
        } catch (error) {
            this.$buefy.toast.open({
                message: `Error loading built-in contracts: ${(error as Error).message}`,
                type: 'is-danger'
            })
        } finally {
            loadingComponent.close()
        }
    }

    private async handleFilesDropped(payload: { files: File[], isFromFolder?: boolean }) {
        console.log('handleFilesDropped called with', payload.files.length, 'files, isFromFolder:', payload.isFromFolder)
        this.showTypeModal = false
        this.isBuiltInMode = false
        await this.processFiles(payload.files, payload.isFromFolder || false)
    }

    private async handleFilesSelected(files: File[]) {
        // Determine if it's from folder based on the input element used
        const sidebar = this.$refs.sidebar as any
        const isFromFolder = sidebar?.lastUploadMode === 'folder'
        await this.processFiles(files, isFromFolder)
    }

    private async processFiles(files: File[], isFromFolder: boolean) {
        if (files.length === 0) {
            return
        }

        const loadingComponent = this.$buefy.loading.open({
            container: null
        })
        
        try {
            const results = await ImportService.processFiles(files, isFromFolder)
            this.parsedContracts = results
            this.isBuiltInMode = false
            
            if (results.length === 0) {
                this.$buefy.toast.open({
                    message: 'No valid contract files found',
                    type: 'is-warning'
                })
                return
            }

            this.showPreviewModal = true
        } catch (error) {
            this.$buefy.toast.open({
                message: `Error processing files: ${(error as Error).message}`,
                type: 'is-danger'
            })
        } finally {
            loadingComponent.close()
        }
    }

    private async handleImportSelected(contracts: Entities.Contract[]) {
        this.showPreviewModal = false
        
        if (contracts.length === 0) {
            return
        }

        const currentNetwork = this.$connex.thor.genesis.id
        const importedCount = await ImportService.importContracts(contracts, currentNetwork)

        this.$buefy.toast.open({
            message: `Successfully imported ${importedCount} contract(s)`,
            type: 'is-success'
        })

        await this.reload()
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
    position: relative;
}

.sidebar-wrapper {
    transition: transform 0.3s ease;
    z-index: 30;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--body-background-alt);
}

.content-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* Mobile Sidebar Toggle Button */
.mobile-sidebar-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 40;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.mobile-sidebar-toggle:hover {
    background: var(--primary-color);
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    opacity: 0.9;
}

.mobile-sidebar-toggle:active {
    transform: scale(0.95);
}

.sidebar-overlay {
    display: none;
}

/* Mobile Styles */
@media (max-width: 768px) {
    .mobile-sidebar-toggle {
        display: flex;
    }

    .sidebar-wrapper {
        position: fixed;
        top: 52px;
        left: 0;
        height: calc(100vh - 52px);
        transform: translateX(-100%);
        z-index: 35;
    }

    .sidebar-wrapper.is-open {
        transform: translateX(0);
    }

    .sidebar-overlay {
        display: block;
        position: fixed;
        top: 52px;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 25;
    }

    .main-content {
        width: 100%;
    }
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
    color: var(--text-color-strong);
    margin-bottom: 0.75rem;
}

.empty-description {
    font-size: 1rem;
    color: var(--text-color-light);
    margin-bottom: 2rem;
    line-height: 1.5;
}

.empty-hints {
    margin-top: 2rem;
}

.hint-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: left;
}

.hint-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin-bottom: 0.75rem;
}

.hint-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.hint-list li {
    font-size: 0.875rem;
    color: var(--text-color-light);
    padding: 0.25rem 0;
    padding-left: 1.25rem;
    position: relative;
}

.hint-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: var(--primary-color);
    font-weight: bold;
}

/* Additional Mobile Responsive Styles */
@media (max-width: 768px) {
    .empty-state-content {
        max-width: 90%;
        padding: 1rem;
    }

    .empty-title {
        font-size: 1.25rem;
    }

    .empty-description {
        font-size: 0.9rem;
    }

    .hint-card {
        padding: 1rem;
    }
}

@media (max-width: 480px) {
    .empty-state-container {
        padding: 1rem;
    }

    .empty-title {
        font-size: 1.1rem;
    }

    .empty-description {
        font-size: 0.85rem;
    }

    .hint-card {
        padding: 0.75rem;
    }

    .hint-list li {
        font-size: 0.8rem;
    }
}
</style>
