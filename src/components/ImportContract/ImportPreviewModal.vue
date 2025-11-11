<template>
    <div class="modal-card modern-import-modal" style="width: 100%;">
        <header class="modal-card-head modern-header">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="modal-title">Import Preview</h1>
                    <p class="modal-subtitle">Review and configure contracts before import</p>
                </div>
                <div class="header-right">
                    <div class="files-count">{{ parsedContracts.length }}</div>
                    <div class="files-label">files detected</div>
                </div>
            </div>
        </header>
        <section class="modal-card-body modern-body">
            <!-- Summary Cards -->
            <div v-if="validCount > 0 || contractsNeedingAddress > 0 || skippedCount > 0" class="summary-cards">
                <div v-if="validCount > 0" class="summary-card success-card">
                    <b-icon icon="check-circle" size="is-small"></b-icon>
                    <span><span class="count-number">{{ validCount }}</span> contract{{ validCount !== 1 ? 's' : '' }} ready to import</span>
                </div>
                <div v-if="contractsNeedingAddress > 0" class="summary-card warning-card">
                    <b-icon icon="exclamation-circle" size="is-small"></b-icon>
                    <span><span class="count-number">{{ contractsNeedingAddress }}</span> contract{{ contractsNeedingAddress !== 1 ? 's' : '' }} need{{ contractsNeedingAddress === 1 ? 's' : '' }} deployment address</span>
                </div>
                <div v-if="skippedCount > 0" class="summary-card info-card">
                    <b-icon icon="minus-circle" size="is-small"></b-icon>
                    <div class="summary-details">
                        <div><span class="count-number">{{ skippedCount }}</span> files skipped</div>
                        <div class="summary-subtext">{{ skippedReasons }}</div>
                    </div>
                </div>
            </div>

            <div v-if="validContracts.length === 0 && errorContracts.length === 0" class="empty-state">
                <b-icon icon="inbox" size="is-large" custom-class="has-text-grey-light"></b-icon>
                <p class="has-text-grey">No valid contract files found</p>
                <p class="is-size-7 has-text-grey-light mt-2" v-if="skippedCount > 0">
                    {{ skippedCount }} file(s) were automatically skipped
                </p>
            </div>
            
            <div v-else>
                <!-- Selection Controls -->
                <div class="selection-control-bar">
                    <label class="select-all-control">
                        <b-checkbox :value="isAllSelected" @input="toggleSelectAll"></b-checkbox>
                        <span class="select-all-label">Select All</span>
                    </label>
                    <div class="selected-badge">
                        {{ selectedCount }} selected
                    </div>
                </div>

                <!-- Search -->
                <div class="search-section">
                    <label class="category-label">
                        Filter contracts by name or filename
                    </label>
                    <b-input
                        v-model="searchQuery"
                        placeholder="Search contracts by name or filename..."
                        icon="search"
                        icon-right="times-circle"
                        icon-right-clickable
                        @icon-right-click="clearSearch"
                        size="is-small"
                    />
                </div>

                <!-- Contract Cards -->
                <div class="contract-cards-list">
                    <div 
                        v-for="(result, index) in filteredDisplayedContracts" 
                        :key="index"
                        class="contract-card"
                        :class="{ 
                            'is-selected': selectedContracts[result.filename],
                            'has-errors': !result.success
                        }"
                    >
                        <!-- Card Header (always visible) -->
                        <div class="card-header" @click="toggleExpand(result.filename)">
                            <div class="card-checkbox" @click.stop>
                                <b-checkbox 
                                    v-model="selectedContracts[result.filename]"
                                    :disabled="!result.success"
                                ></b-checkbox>
                            </div>
                            
                            <div class="card-content">
                                <div class="card-title-row">
                                    <h3 class="card-title">{{ result.contract?.name || 'Unknown' }}</h3>
                                    <span v-if="isBuiltInMode" class="badge badge-builtin">
                                        <b-icon icon="database" size="is-small"></b-icon>
                                        Built-in
                                    </span>
                                    <span v-else-if="result.isHardhatArtifact" class="badge badge-network">
                                        Hardhat
                                    </span>
                                    <span v-if="result.contract?.address" class="badge badge-success">
                                        <b-icon icon="check-circle" size="is-small"></b-icon>
                                        Ready
                                    </span>
                                    <span v-else-if="result.success" class="badge badge-warning">
                                        <b-icon icon="exclamation-circle" size="is-small"></b-icon>
                                        Address Required
                                    </span>
                                    <span v-else class="badge badge-error">
                                        <b-icon icon="exclamation-triangle" size="is-small"></b-icon>
                                        Error
                                    </span>
                                </div>
                                <div class="card-filename">{{ result.filename }}</div>
                            </div>

                            <div class="card-expand-icon">
                                <b-icon 
                                    icon="chevron-down" 
                                    size="is-small"
                                    :class="{ 'is-rotated': expandedCards[result.filename] }"
                                ></b-icon>
                            </div>
                        </div>

                        <!-- Card Expanded Content -->
                        <div v-if="expandedCards[result.filename]" class="card-body">
                            <!-- Address input for contracts without address -->
                            <div v-if="!result.contract?.address && result.success" class="address-input-container">
                                <label class="input-label">Deployed contract address</label>
                                <b-field 
                                    :type="contractAddressErrors[result.filename] ? 'is-danger' : ''"
                                    :message="contractAddressErrors[result.filename]"
                                >
                                    <b-input
                                        v-model="contractAddresses[result.filename]"
                                        placeholder="0x..."
                                        custom-class="is-family-monospace"
                                        size="is-small"
                                        @input="validateContractAddress(result.filename)"
                                        @blur="validateContractAddress(result.filename)"
                                    ></b-input>
                                </b-field>
                                <p v-if="!contractAddressErrors[result.filename] && contractAddresses[result.filename]" class="success-message">
                                    <b-icon icon="check-circle" size="is-small"></b-icon>
                                    Address configured
                                </p>
                            </div>

                            <!-- Show address if already has one -->
                            <div v-if="result.contract?.address" class="address-display">
                                <label class="input-label">Contract address</label>
                                <div class="address-value">{{ result.contract.address }}</div>
                            </div>

                            <!-- Error display -->
                            <div v-if="!result.success && result.errors.length > 0" class="error-container">
                                <div class="error-header">
                                    <b-icon icon="exclamation-circle" size="is-small"></b-icon>
                                    <span>{{ result.errors.length }} error(s)</span>
                                </div>
                                <div class="error-items">
                                    <div v-for="(error, errorIndex) in result.errors" :key="errorIndex" class="error-item">
                                        <div class="error-message">
                                            <strong>Problem:</strong> {{ error }}
                                        </div>
                                        <div v-if="getErrorFix(error)" class="error-fix">
                                            <b-icon icon="lightbulb" size="is-small"></b-icon>
                                            <div>
                                                <strong>How to fix:</strong> {{ getErrorFix(error) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="errorCount > 0" class="error-help">
                    <b-message type="is-warning">
                        <p>
                            <b-icon icon="exclamation-triangle" size="is-small"></b-icon>
                            <strong>{{ errorCount }} file(s) have errors</strong> and cannot be imported. 
                            Expand the cards above to see details and fix suggestions.
                        </p>
                    </b-message>
                </div>
            </div>
        </section>
        <footer class="modal-card-foot modern-footer">
            <div class="footer-left">
                <button class="button is-outlined" type="button" @click="$emit('cancel')">Cancel</button>
            </div>
            <div class="footer-right">
                <div class="footer-category">
                    <label class="footer-category-label">Set a category for the contracts</label>
                    <b-autocomplete
                        v-model="categoryForAll"
                        :data="filteredCategories"
                        placeholder="Uncategorized"
                        @typing="filterCategories"
                        clearable
                        size="is-small"
                    >
                        <template slot="empty">Type to create new category</template>
                    </b-autocomplete>
                </div>
                <button 
                    class="button is-primary" 
                    type="button" 
                    @click="handleImport"
                    :disabled="!canImport"
                >
                    Import Selected ({{ selectedCount }})
                </button>
            </div>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { ParseResult } from '../../utils/import-utils'

@Component
export default class ImportPreviewModal extends Vue {
    @Prop({ required: true })
    private parsedContracts!: ParseResult[]

    @Prop({ default: () => [] })
    private existingCategories!: string[]

    @Prop({ default: false })
    private isBuiltInMode!: boolean

    private selectedContracts: { [filename: string]: boolean } = {}
    private categoryForAll: string = ''
    private filteredCategories: string[] = []
    private contractAddresses: { [filename: string]: string } = {}
    private contractAddressErrors: { [filename: string]: string } = {}
    private expandedCards: { [filename: string]: boolean } = {}
    private searchQuery: string = ''

    get isAllSelected(): boolean {
        return this.validContracts.length > 0 && 
               this.validContracts.every(r => this.selectedContracts[r.filename])
    }

    get validContracts(): ParseResult[] {
        return this.parsedContracts.filter(r => r.success && !r.skipped)
    }

    get errorContracts(): ParseResult[] {
        return this.parsedContracts.filter(r => !r.success && !r.skipped)
    }

    get skippedContracts(): ParseResult[] {
        return this.parsedContracts.filter(r => r.skipped)
    }

    get displayedContracts(): ParseResult[] {
        // Only show valid and error contracts, not skipped ones
        return [...this.validContracts, ...this.errorContracts]
    }

    get filteredDisplayedContracts(): ParseResult[] {
        if (!this.searchQuery.trim()) {
            return this.displayedContracts
        }
        
        const query = this.searchQuery.toLowerCase()
        return this.displayedContracts.filter(result => {
            const name = (result.contract?.name || '').toLowerCase()
            const filename = result.filename.toLowerCase()
            return name.includes(query) || filename.includes(query)
        })
    }

    get selectedCount(): number {
        return Object.values(this.selectedContracts).filter(s => s).length
    }

    get contractsNeedingAddress(): number {
        return this.validContracts.filter(r => !r.contract?.address).length
    }

    get canImport(): boolean {
        // Check if any selected contracts are missing addresses
        const selectedResults = this.displayedContracts.filter(r => this.selectedContracts[r.filename])
        
        for (const result of selectedResults) {
            if (!result.contract?.address) {
                // This contract needs an address
                const address = this.contractAddresses[result.filename]
                if (!address || address.trim() === '' || this.contractAddressErrors[result.filename]) {
                    return false
                }
            }
        }
        
        return selectedResults.length > 0
    }

    get errorCount(): number {
        return this.errorContracts.length
    }

    get validCount(): number {
        return this.validContracts.length
    }

    get skippedCount(): number {
        return this.skippedContracts.length
    }

    get skippedReasons(): string {
        const reasons = new Map<string, number>()
        this.skippedContracts.forEach(c => {
            const reason = c.skipReason || 'Unknown'
            reasons.set(reason, (reasons.get(reason) || 0) + 1)
        })
        
        return Array.from(reasons.entries())
            .map(([reason, count]) => count > 1 ? `${count} ${reason}s` : reason)
            .join(', ')
    }

    mounted() {
        // For file imports, select all by default
        // For built-in contracts, start with nothing selected
        if (!this.isBuiltInMode) {
            this.validContracts.forEach(r => {
                this.$set(this.selectedContracts, r.filename, true)
            })
        }
        
        // Initialize filtered categories
        this.filteredCategories = this.existingCategories
        
        // Initialize addresses for contracts that don't have them
        this.validContracts.forEach(r => {
            if (!r.contract?.address) {
                this.$set(this.contractAddresses, r.filename, '')
                this.$set(this.contractAddressErrors, r.filename, '')
            }
        })
    }

    toggleExpand(filename: string) {
        this.$set(this.expandedCards, filename, !this.expandedCards[filename])
    }

    toggleSelectAll() {
        if (this.isAllSelected) {
            this.deselectAll()
        } else {
            this.selectAll()
        }
    }

    validateContractAddress(filename: string) {
        const address = this.contractAddresses[filename]
        
        if (!address || address.trim() === '') {
            this.$set(this.contractAddressErrors, filename, 'Address is required')
            return false
        }

        if (!address.startsWith('0x')) {
            this.$set(this.contractAddressErrors, filename, 'Address must start with 0x')
            return false
        }

        if (address.length !== 42) {
            this.$set(this.contractAddressErrors, filename, 'Address must be 42 characters')
            return false
        }

        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            this.$set(this.contractAddressErrors, filename, 'Invalid hexadecimal address')
            return false
        }

        this.$set(this.contractAddressErrors, filename, '')
        return true
    }

    filterCategories(text: string) {
        this.filteredCategories = this.existingCategories.filter(category => {
            return category.toLowerCase().includes(text.toLowerCase())
        })
    }

    clearSearch() {
        this.searchQuery = ''
    }

    selectAll() {
        this.validContracts.forEach(r => {
            this.$set(this.selectedContracts, r.filename, true)
        })
    }

    deselectAll() {
        this.validContracts.forEach(r => {
            this.$set(this.selectedContracts, r.filename, false)
        })
    }

    getErrorFix(error: string): string {
        if (error.includes('Invalid JSON')) {
            return 'Use a JSON validator to check your file syntax. Look for missing commas, quotes, or brackets.'
        }
        if (error.includes('Unrecognized file format')) {
            return 'Ensure your file follows either the standard format or Hardhat artifact format as shown in the instructions.'
        }
        if (error.includes('Missing') || error.includes('required')) {
            return 'Add the missing field to your JSON file. Check the import instructions for the required format.'
        }
        if (error.includes('Invalid') && error.includes('address')) {
            return 'The address must be a valid hexadecimal string starting with "0x" and 42 characters long.'
        }
        if (error.includes('Invalid') && error.includes('ABI')) {
            return 'Ensure the ABI is properly formatted as a JSON array of function/event definitions.'
        }
        return ''
    }

    handleImport() {
        // Validate all selected contracts without addresses
        let allValid = true
        const selectedResults = this.displayedContracts.filter(r => this.selectedContracts[r.filename])
        
        selectedResults.forEach(result => {
            if (!result.contract?.address) {
                if (!this.validateContractAddress(result.filename)) {
                    allValid = false
                }
            }
        })
        
        if (!allValid) {
            return
        }
        
        const selected = selectedResults.map(r => {
            const contract = { ...r.contract! }
            
            // Set address if it was filled in
            if (!contract.address) {
                contract.address = this.contractAddresses[r.filename]
            }
            
            // Apply category if set
            if (this.categoryForAll && this.categoryForAll.trim() !== '') {
                contract.category = this.categoryForAll.trim()
            }
            
            return contract
        })
        
        this.$emit('import-selected', selected)
    }
}
</script>

<style lang="scss" scoped>
.modern-import-modal {
    border-radius: 12px;
    overflow: hidden;
}

.modern-header {
    background: var(--modal-card-head-background);
    border-bottom: 1px solid var(--border-color);
    padding: 1.25rem 1.5rem;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    width: 100%;
}

.header-left {
    flex: 1;
    min-width: 0;
}

.modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color-strong);
    line-height: 1.2;
}

.modal-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-light);
    margin-top: 0.25rem;
}

.header-right {
    text-align: right;
    flex-shrink: 0;
}

.files-count {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-color);
    line-height: 1;
}

.files-label {
    font-size: 0.75rem;
    color: var(--text-color-light);
    margin-top: 0.25rem;
}

.modern-body {
    padding: 1.25rem 1.5rem;
    max-height: calc(90vh - 180px);
    overflow-y: auto;
}

// Search Section
.search-section {
    margin-bottom: 1rem;
}

// Summary Cards
.summary-cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
}

.summary-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: 8px;
    font-size: 0.875rem;
    
    .icon {
        flex-shrink: 0;
    }
}

.success-card {
    background: rgba(72, 187, 120, 0.1);
    border: 1px solid rgba(72, 187, 120, 0.2);
    color: #38a169;
    
    .icon {
        color: #38a169;
    }
}

[data-theme="dark"] .success-card {
    background: rgba(90, 214, 125, 0.15);
    border-color: rgba(90, 214, 125, 0.25);
    color: #5ad67d;
    
    .icon {
        color: #5ad67d;
    }
}

.warning-card {
    background: rgba(237, 137, 54, 0.1);
    border: 1px solid rgba(237, 137, 54, 0.2);
    color: #dd6b20;
    
    .icon {
        color: #dd6b20;
    }
}

[data-theme="dark"] .warning-card {
    background: rgba(255, 234, 127, 0.15);
    border-color: rgba(255, 234, 127, 0.25);
    color: #ffea7f;
    
    .icon {
        color: #ffea7f;
    }
}

.info-card {
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    color: var(--text-color-light);
    
    .icon {
        color: var(--text-color-light);
    }
}

.summary-details {
    flex: 1;
}

.summary-subtext {
    font-size: 0.75rem;
    margin-top: 0.125rem;
    opacity: 0.8;
}

// Selection Controls
.selection-control-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 1rem;
}

.select-all-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    flex: 1;
}

.select-all-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color-strong);
}

.selected-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    background: var(--primary-color);
    color: var(--primary-invert);
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 600;
}


// Contract Cards
.contract-cards-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.contract-card {
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--card-background);
    transition: all 0.2s ease;
    
    &:hover {
        background: var(--body-background-alt);
    }
    
    &.is-selected {
        border-color: var(--primary-color);
        background: rgba(50, 115, 220, 0.05);
        box-shadow: 0 0 0 1px var(--primary-color);
    }
    
    &.has-errors {
        border-color: var(--danger-color);
        background: rgba(255, 56, 96, 0.05);
    }
}

[data-theme="dark"] .contract-card {
    &.is-selected {
        background: rgba(74, 158, 255, 0.1);
    }
    
    &.has-errors {
        background: rgba(255, 82, 82, 0.1);
    }
}

.card-header {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 0.875rem 1rem;
    cursor: pointer;
}

.card-checkbox {
    flex-shrink: 0;
    padding-top: 0.125rem;
}

.card-content {
    flex: 1;
    min-width: 0;
    padding: 0;
}

.card-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    flex-wrap: wrap;
}

.card-title {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--text-color-strong);
    margin: 0;
}

.badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 500;
}

.badge-network {
    background: rgba(50, 115, 220, 0.15);
    color: var(--primary-color);
}

.badge-builtin {
    background: rgba(138, 43, 226, 0.15);
    color: #8a2be2;
    
    .icon {
        color: #8a2be2;
    }
}

[data-theme="dark"] .badge-builtin {
    background: rgba(186, 85, 211, 0.2);
    color: #ba55d3;
    
    .icon {
        color: #ba55d3;
    }
}

.badge-success {
    background: rgba(72, 187, 120, 0.15);
    color: #38a169;
    
    .icon {
        color: #38a169;
    }
}

[data-theme="dark"] .badge-success {
    background: rgba(90, 214, 125, 0.2);
    color: #5ad67d;
    
    .icon {
        color: #5ad67d;
    }
}

.badge-warning {
    background: rgba(237, 137, 54, 0.15);
    color: #dd6b20;
    
    .icon {
        color: #dd6b20;
    }
}

[data-theme="dark"] .badge-warning {
    background: rgba(255, 234, 127, 0.2);
    color: #ffea7f;
    
    .icon {
        color: #ffea7f;
    }
}

.badge-error {
    background: rgba(255, 56, 96, 0.15);
    color: #e53e3e;
    
    .icon {
        color: #e53e3e;
    }
}

[data-theme="dark"] .badge-error {
    background: rgba(255, 82, 82, 0.2);
    color: #ff5252;
    
    .icon {
        color: #ff5252;
    }
}

.card-filename {
    font-size: 0.6875rem;
    font-family: monospace;
    color: var(--text-color-light);
}

.card-expand-icon {
    flex-shrink: 0;
    color: var(--text-color-light);
    
    .icon {
        transition: transform 0.2s ease;
        
        &.is-rotated {
            transform: rotate(180deg);
        }
    }
}

.card-body {
    padding: 0.875rem 1rem;
    border-top: 1px solid var(--border-color);
    background: var(--body-background-alt);
}

.input-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color-strong);
    margin-bottom: 0.5rem;
}

.address-display {
    .address-value {
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--text-color);
        padding: 0.625rem 0.75rem;
        background: var(--input-background);
        border: 1px solid var(--border-color);
        border-radius: 6px;
    }
}

.success-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--success-color);
    
    .icon {
        color: var(--success-color);
    }
}

.error-container {
    padding: 0.875rem;
    background: rgba(255, 56, 96, 0.08);
    border-radius: 8px;
    border: 1px solid rgba(255, 56, 96, 0.2);
}

[data-theme="dark"] .error-container {
    background: rgba(255, 82, 82, 0.12);
    border-color: rgba(255, 82, 82, 0.25);
}

.error-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--danger-color);
    font-weight: 600;
    margin-bottom: 0.875rem;
    font-size: 0.875rem;
}

.error-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.error-item {
    // Individual error item styling
}

.error-message {
    font-size: 0.875rem;
    color: var(--text-color);
    margin-bottom: 0.5rem;
    
    strong {
        color: var(--danger-color);
    }
}

.error-fix {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem;
    background: rgba(50, 115, 220, 0.08);
    border-radius: 4px;
    border-left: 3px solid var(--info-color);
    font-size: 0.8125rem;
    
    .icon {
        flex-shrink: 0;
        color: var(--info-color);
        margin-top: 0.125rem;
    }
    
    strong {
        color: var(--info-color);
    }
}

[data-theme="dark"] .error-fix {
    background: rgba(74, 163, 227, 0.12);
}

.error-help {
    margin-top: 1rem;
}

.modern-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--modal-card-foot-background);
    border-top: 1px solid var(--border-color);
    gap: 1rem;
}

.footer-left {
    display: flex;
    align-items: center;
}

.footer-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    justify-content: flex-end;
}

.footer-category {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 200px;
}

.footer-category-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color-strong);
    white-space: nowrap;
}

.count-number {
    font-weight: 800;
    color: var(--primary-color);
}
</style>


