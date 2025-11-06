<template>
    <div class="modal-card" style="width: 900px; max-width: 95vw;">
        <header class="modal-card-head">
            <p class="modal-card-title">Import Preview</p>
            <p class="subtitle is-6 has-text-grey ml-3">{{ parsedContracts.length }} file(s) detected</p>
        </header>
        <section class="modal-card-body">
            <!-- Summary -->
            <div v-if="skippedCount > 0 || validCount > 0 || errorCount > 0" class="import-summary mb-4">
                <div class="summary-stats">
                    <div class="summary-stat" v-if="validCount > 0">
                        <b-icon icon="check-circle" type="is-success" size="is-small"></b-icon>
                        <span><strong>{{ validCount }}</strong> contract(s) ready to import</span>
                    </div>
                    <div class="summary-stat" v-if="skippedCount > 0">
                        <b-icon icon="minus-circle" type="is-info" size="is-small"></b-icon>
                        <span><strong>{{ skippedCount }}</strong> file(s) skipped ({{ skippedReasons }})</span>
                    </div>
                    <div class="summary-stat" v-if="errorCount > 0">
                        <b-icon icon="exclamation-circle" type="is-danger" size="is-small"></b-icon>
                        <span><strong>{{ errorCount }}</strong> file(s) with errors</span>
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
                <div class="import-options mb-4">
                    <div class="selection-controls">
                        <div class="buttons">
                            <button class="button is-small" @click="selectAll">
                                <b-icon icon="check-square" size="is-small"></b-icon>
                                <span>Select All</span>
                            </button>
                            <button class="button is-small" @click="deselectAll">
                                <b-icon icon="square" size="is-small"></b-icon>
                                <span>Deselect All</span>
                            </button>
                        </div>
                        <div class="summary">
                            <span class="tag is-info">{{ selectedCount }} selected</span>
                            <span v-if="errorCount > 0" class="tag is-danger ml-2">{{ errorCount }} with errors</span>
                        </div>
                    </div>

                    <div class="category-field mt-3">
                        <b-field label="Category for all contracts (optional)">
                            <b-autocomplete
                                v-model="categoryForAll"
                                :data="filteredCategories"
                                placeholder="Leave empty to keep individual categories"
                                @typing="filterCategories"
                                clearable
                                size="is-small"
                            >
                                <template slot="empty">Type to create new category</template>
                            </b-autocomplete>
                        </b-field>
                    </div>
                </div>

                <div class="contracts-list">
                    <div 
                        v-for="(result, index) in displayedContracts" 
                        :key="index"
                        class="contract-item"
                        :class="{ 'has-errors': !result.success, 'is-selected': selectedContracts[result.filename] }"
                    >
                        <div class="contract-item-main">
                            <b-checkbox 
                                v-model="selectedContracts[result.filename]"
                                :disabled="!result.success"
                            ></b-checkbox>
                            
                            <div class="contract-status">
                                <b-icon 
                                    v-if="result.success" 
                                    icon="check-circle" 
                                    type="is-success"
                                    size="is-small"
                                ></b-icon>
                                <b-icon 
                                    v-else 
                                    icon="exclamation-triangle" 
                                    type="is-danger"
                                    size="is-small"
                                ></b-icon>
                            </div>

                            <div class="contract-details">
                                <div class="contract-header">
                                    <span class="contract-name">{{ result.contract?.name || 'Unknown' }}</span>
                                    <span v-if="result.isHardhatArtifact" class="tag is-info is-light is-small ml-2">
                                        <b-icon icon="hammer" size="is-small"></b-icon>
                                        <span>Hardhat</span>
                                    </span>
                                </div>
                                <div class="contract-meta">
                                    <span class="filename">
                                        <b-icon icon="file" size="is-small"></b-icon>
                                        {{ result.filename }}
                                    </span>
                                    <span class="address" v-if="result.contract?.address">
                                        <b-icon icon="map-marker-alt" size="is-small"></b-icon>
                                        {{ result.contract.address }}
                                    </span>
                                    <span v-else class="address-required">
                                        <b-icon icon="info-circle" size="is-small"></b-icon>
                                        Address required
                                    </span>
                                </div>

                                <!-- Address input for contracts without address -->
                                <div v-if="!result.contract?.address && result.success" class="address-input-section mt-3">
                                    <b-field 
                                        :type="contractAddressErrors[result.filename] ? 'is-danger' : ''"
                                        :message="contractAddressErrors[result.filename]"
                                    >
                                        <b-input
                                            v-model="contractAddresses[result.filename]"
                                            placeholder="Enter deployed contract address (0x...)"
                                            custom-class="is-family-monospace"
                                            size="is-small"
                                            @input="validateContractAddress(result.filename)"
                                            @blur="validateContractAddress(result.filename)"
                                        ></b-input>
                                    </b-field>
                                </div>

                                <div v-if="!result.success && result.errors.length > 0" class="contract-errors">
                                    <div class="error-summary">
                                        <b-icon icon="exclamation-circle" size="is-small"></b-icon>
                                        <span>{{ result.errors.length }} error(s)</span>
                                    </div>
                                    <ul class="error-list">
                                        <li v-for="(error, errorIndex) in result.errors" :key="errorIndex">
                                            {{ error }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="errorCount > 0" class="error-help mt-4">
                    <b-message type="is-warning">
                        <p>
                            <strong>{{ errorCount }} file(s) have errors</strong> and cannot be imported. 
                            <a @click="$emit('show-errors', errorContracts)" class="has-text-link">
                                View detailed errors
                            </a>
                        </p>
                    </b-message>
                </div>
            </div>
        </section>
        <footer class="modal-card-foot" style="justify-content: space-between;">
            <button class="button" type="button" @click="$emit('cancel')">Cancel</button>
            <button 
                class="button is-primary" 
                type="button" 
                @click="handleImport"
                :disabled="!canImport"
            >
                Import Selected ({{ selectedCount }})
            </button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { ParseResult } from '../utils/import-utils'

@Component
export default class ImportPreviewModal extends Vue {
    @Prop({ required: true })
    private parsedContracts!: ParseResult[]

    @Prop({ default: () => [] })
    private existingCategories!: string[]

    private selectedContracts: { [filename: string]: boolean } = {}
    private categoryForAll: string = ''
    private filteredCategories: string[] = []
    private contractAddresses: { [filename: string]: string } = {}
    private contractAddressErrors: { [filename: string]: string } = {}

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

    get selectedCount(): number {
        return Object.values(this.selectedContracts).filter(s => s).length
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
        // Initially select all valid contracts
        this.validContracts.forEach(r => {
            this.$set(this.selectedContracts, r.filename, true)
        })
        
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
.empty-state {
    padding: 3rem;
    text-align: center;
    
    .icon {
        margin-bottom: 1rem;
    }
}

.import-summary {
    padding: 1rem;
    background: var(--body-background-alt);
    border-radius: 6px;
    border: 1px solid var(--border-color);
}

.summary-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.summary-stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    
    .icon {
        flex-shrink: 0;
    }
}

.import-options {
    padding: 1rem;
    background: var(--body-background-alt);
    border-radius: 6px;
    border: 1px solid var(--border-color);
}

.selection-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.category-field {
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
}

.summary {
    display: flex;
    align-items: center;
}

.contracts-list {
    max-height: 500px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 6px;
}

.contract-item {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.2s;
    
    &:last-child {
        border-bottom: none;
    }
    
    &.is-selected {
        background: rgba(50, 115, 220, 0.05);
    }
    
    &.has-errors {
        background: rgba(255, 56, 96, 0.05);
    }
}

.contract-item-main {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}

.contract-status {
    flex-shrink: 0;
    padding-top: 0.25rem;
}

.contract-details {
    flex: 1;
    min-width: 0;
}

.contract-header {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
}

.contract-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-color);
}

.contract-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-color-light);
    margin-bottom: 0.5rem;
    
    .filename, .address, .address-required {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    
    .address {
        font-family: monospace;
        font-size: 0.8rem;
    }
    
    .address-required {
        color: var(--warning-color);
        font-style: italic;
    }
}

.contract-errors {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 56, 96, 0.1);
    border-radius: 4px;
    border-left: 3px solid var(--danger-color);
}

.error-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--danger-color);
    font-weight: 600;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
}

.error-list {
    margin-left: 1.5rem;
    font-size: 0.875rem;
    
    li {
        margin-bottom: 0.25rem;
        color: var(--text-color);
    }
}

.error-help {
    a {
        cursor: pointer;
        text-decoration: underline;
        
        &:hover {
            text-decoration: none;
        }
    }
}

.address-input-section {
    padding-top: 0.75rem;
    border-top: 1px dashed var(--border-color);
}
</style>

