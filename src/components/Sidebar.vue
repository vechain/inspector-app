<template>
    <div class="sidebar">
        <!-- Header with Search and Actions -->
        <div class="sidebar-header">
            <div class="sidebar-title">
                <b-icon icon="file-contract" size="is-small"></b-icon>
                <h2>Your contracts</h2>
            </div>
            <div class="sidebar-actions">
                <button @click="onImport" class="button is-small is-primary is-outlined" title="Import Contract">
                    <p>Import</p>
                    <b-icon icon="upload" size="is-small"></b-icon>
                </button>
                <button @click="addItem" class="button is-small is-primary is-outlined" title="Add Contract">
                    <p>New</p>
                    <b-icon icon="plus" size="is-small"></b-icon>
                </button>
            </div>
            <input class="is-hidden" ref="files" type="file" accept="application/json" multiple webkitdirectory />
            <input class="is-hidden" ref="filesMultiple" type="file" accept="application/json" multiple />
        </div>

        <!-- Search -->
        <div class="sidebar-search">
            <b-field>
                <b-input
                    v-model="searchQuery"
                    placeholder="Search by name or address..."
                    icon="search"
                    icon-right="times-circle"
                    icon-right-clickable
                    @icon-right-click="clearSearch"
                    size="is-small"
                />
            </b-field>
        </div>

        <!-- Contract List -->
        <div class="sidebar-content">
            <div v-if="filteredContracts.length" class="contract-categories">
                <div v-for="category in sortedCategories" :key="category" class="category-section">
                    <!-- Category Header -->
                    <button @click="toggleCategory(category)" class="category-header">
                        <div class="category-info">
                            <b-icon 
                                :icon="expandedCategories[category] ? 'chevron-down' : 'chevron-right'" 
                                size="is-small"
                            ></b-icon>
                            <span class="category-name">{{ category || 'Uncategorized' }}</span>
                            <span class="category-count">{{ getCategoryContracts(category).length }}</span>
                        </div>
                        <div class="category-actions" @click.stop>
                            <button 
                                v-if="category"
                                @click="renameCategory(category)" 
                                class="button is-small is-text"
                                title="Rename category"
                            >
                                <b-icon icon="pen" size="is-small"></b-icon>
                            </button>
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
                    </button>

                    <!-- Contract Items -->
                    <div v-show="expandedCategories[category]" class="category-contracts">
                        <div 
                            v-for="(item, index) in getCategoryContracts(category)"
                            :key="item.id"
                            @dragover.prevent="handleDragOver($event, category, index)"
                            @dragleave="handleDragLeave"
                            @drop="handleDrop($event, category, index)"
                            :class="{ 'drop-target': dropTarget && dropTarget.category === category && dropTarget.index === index }"
                            class="contract-item-wrapper"
                        >
                            <div class="drop-indicator" v-if="dropTarget && dropTarget.category === category && dropTarget.index === index"></div>
                            <Contract 
                                variant="list"
                                :item="item"
                                @select="onSelect(item)"
                                @edit="edit(item)"
                                @dragstart="handleDragStartContract"
                                @dragend="handleDragEndContract"
                                @export="exportJson(item)"
                                @delete="remove(item)"
                            />
                        </div>
                        <!-- Drop zone at the end of category -->
                        <div
                            v-if="getCategoryContracts(category).length > 0 && draggedContract"
                            class="drop-zone-end"
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

            <!-- Empty State -->
            <div v-else-if="!contracts.length" class="empty-state">
                <b-icon icon="inbox" size="is-large" custom-class="has-text-grey-light"></b-icon>
                <p class="has-text-grey">No contracts here!</p>
                <button @click="addItem" class="button is-small is-primary is-outlined">Add Contract</button>
            </div>

            <!-- No Search Results -->
            <div v-else class="empty-state">
                <b-icon icon="search" size="is-large" custom-class="has-text-grey-light"></b-icon>
                <p class="has-text-grey">No contracts found</p>
                <p class="is-size-7 has-text-grey-light">Try a different search term</p>
            </div>
        </div>

        <!-- Footer -->
        <div class="sidebar-footer">
            <p class="is-size-7 has-text-grey">
                {{ filteredContracts.length }} contract{{ filteredContracts.length !== 1 ? 's' : '' }}
            </p>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import Contract from './Contract.vue'
import { Entities } from '../database'

@Component({
    components: {
        Contract
    }
})
export default class Sidebar extends Vue {
    @Prop({ required: true })
    private contracts!: Entities.Contract[]

    @Prop({ default: () => ({}) })
    private categoryOrder!: { [key: string]: number }

    private searchQuery: string = ''
    private expandedCategories: { [key: string]: boolean } = {}
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

    toggleCategory(category: string) {
        this.$set(this.expandedCategories, category, !this.expandedCategories[category])
    }

    clearSearch() {
        this.searchQuery = ''
    }

    onSelect(item: Entities.Contract) {
        this.$emit('open-contract', item)
    }

    addItem() {
        this.$emit('add-contract')
    }

    edit(item: Entities.Contract) {
        this.$emit('edit-contract', item)
    }

    exportJson(item: Entities.Contract) {
        this.$emit('export-contract', item)
    }

    remove(item: Entities.Contract) {
        this.$emit('delete-contract', item)
    }

    onImport() {
        this.$emit('show-import-instructions')
    }

    triggerFileUpload(mode: 'files' | 'folder' = 'files') {
        if (mode === 'folder') {
            const fileEle = this.$refs.files as HTMLInputElement
            fileEle.click()
        } else {
            const fileEle = this.$refs.filesMultiple as HTMLInputElement
            fileEle.click()
        }
    }

    moveCategoryUp(category: string) {
        this.$emit('move-category-up', category)
    }

    moveCategoryDown(category: string) {
        this.$emit('move-category-down', category)
    }

    renameCategory(category: string) {
        this.$emit('rename-category', category)
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
        const relatedTarget = e.relatedTarget as HTMLElement
        if (!relatedTarget || !relatedTarget.closest('.contract-item-wrapper')) {
            this.dropTarget = null
        }
    }

    handleDrop(e: DragEvent, targetCategory: string, targetIndex: number) {
        e.preventDefault()
        
        if (!this.draggedContract) {
            return
        }

        this.$emit('drop-contract', {
            contract: this.draggedContract,
            targetCategory,
            targetIndex
        })
        
        this.dropTarget = null
    }

    mounted() {
        const setupFileInput = (inputRef: string) => {
            const fileEle = this.$refs[inputRef] as HTMLInputElement
            fileEle.onchange = () => {
                const files = fileEle.files
                if (files && files.length > 0) {
                    const fileArray = Array.from(files)
                    this.$emit('files-selected', fileArray)
                    // Reset the input so the same file can be selected again
                    fileEle.value = ''
                }
            }
        }

        setupFileInput('files')
        setupFileInput('filesMultiple')

        // Initialize all categories as expanded
        this.sortedCategories.forEach(category => {
            this.$set(this.expandedCategories, category, true)
        })
    }
}
</script>

<style lang="css" scoped>
.sidebar {
    width: 320px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-background);
    border-right: 1px solid var(--sidebar-border);
    overflow: hidden;
    flex-shrink: 0;
}

.sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.sidebar-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.sidebar-title h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
}

.sidebar-actions {
    display: flex;
    gap: 0.5rem;
}

.sidebar-actions .button {
    flex: 1;
}

.sidebar-actions .button.is-outlined {
    border-width: 1.5px;
    font-weight: 500;
    color: var(--primary-color);
    border-color: var(--primary-color);
}

.sidebar-actions .button.is-outlined:hover {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
}

.sidebar-search {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
}

.contract-categories {
    padding: 0.5rem 0;
}

.category-section {
    margin-bottom: 0.5rem;
}

.category-header {
    width: 100%;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-bottom: 0.5rem;
}

.category-header:hover {
    background: var(--body-background-alt);
}

.category-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
}

.category-info .icon {
    color: var(--text-color);
}

.category-name {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-color-light);
    letter-spacing: 0.05em;
    text-align: left;
}

.category-count {
    font-size: 0.75rem;
    color: var(--text-color-light);
    background: var(--body-background-alt);
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
}

.category-actions {
    display: flex;
    gap: 0.125rem;
    opacity: 0;
    transition: opacity 0.2s;
}

.category-header:hover .category-actions {
    opacity: 1;
}

.category-actions .button {
    padding: 0.25rem;
    height: auto;
}

.category-contracts {
    padding: 0 0.5rem;
}

.contract-item-wrapper {
    position: relative;
    margin-bottom: 0.5rem;
}

.contract-item-wrapper.drop-target {
    position: relative;
}

.drop-indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--primary-color);
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
    min-height: 0;
    position: relative;
    transition: min-height 0.2s ease;
    margin-bottom: 0.5rem;
}

.drop-zone-end.drop-target {
    min-height: 40px;
}

.drop-zone-end .drop-indicator {
    width: calc(100% - 1rem);
    height: 4px;
    top: 50%;
    left: 0.5rem;
    transform: translateY(-50%);
}

.empty-state {
    padding: 3rem 1.5rem;
    text-align: center;
}

.empty-state .icon {
    margin-bottom: 1rem;
}

.empty-state p {
    margin-bottom: 0.5rem;
}

.empty-state .button {
    margin-top: 1rem;
}

.sidebar-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border-color);
    background: var(--body-background-alt);
    flex-shrink: 0;
    text-align: center;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
    .sidebar {
        width: 280px;
    }

    .sidebar-header {
        padding: 0.75rem;
    }

    .sidebar-search {
        padding: 0.5rem 0.75rem;
    }
}

@media (max-width: 480px) {
    .sidebar {
        width: 260px;
    }

    .sidebar-title h2 {
        font-size: 1rem;
    }
}
</style>

