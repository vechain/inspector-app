<template>
    <div class="modal-card" style="width: 100%;">
        <header class="modal-card-head">
            <p class="modal-card-title">Import Errors</p>
            <p class="subtitle is-6 has-text-grey" style="margin-left: 0.75rem;">{{ errorContracts.length }} file(s) with errors</p>
        </header>
        <section class="modal-card-body" style="padding: 1.25rem 1.5rem;">
            <div class="errors-container">
                <div 
                    v-for="(result, index) in errorContracts" 
                    :key="index"
                    class="error-section"
                >
                    <div class="error-header">
                        <div class="error-icon">
                            <b-icon icon="file-excel" type="is-danger"></b-icon>
                        </div>
                        <div class="error-file-info">
                            <h4 class="error-filename">{{ result.filename }}</h4>
                            <p v-if="result.contract?.name" class="error-contract-name">
                                Contract: {{ result.contract.name }}
                            </p>
                        </div>
                    </div>

                    <div class="error-details">
                        <div class="error-count-badge">
                            <b-icon icon="exclamation-triangle" size="is-small"></b-icon>
                            <span>{{ result.errors.length }} error(s) found</span>
                        </div>

                        <div class="error-items">
                            <div 
                                v-for="(error, errorIndex) in getDetailedErrors(result)" 
                                :key="errorIndex"
                                class="error-item"
                            >
                                <div class="error-item-header">
                                    <span class="error-number">{{ errorIndex + 1 }}.</span>
                                    <span class="error-field" v-if="error.field">
                                        <code>{{ error.field }}</code>
                                    </span>
                                </div>
                                <div class="error-item-body">
                                    <div class="error-message">
                                        <strong>Problem:</strong> {{ error.message }}
                                    </div>
                                    <div class="error-fix" v-if="error.fix">
                                        <b-icon icon="lightbulb" size="is-small"></b-icon>
                                        <strong>How to fix:</strong> {{ error.fix }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section mt-5">
                    <b-message type="is-info">
                        <p class="mb-3"><strong>Common Issues:</strong></p>
                        <ul>
                            <li>
                                <strong>Hardhat artifacts:</strong> These files don't include deployment addresses. 
                                You'll need to enter the address manually after import.
                            </li>
                            <li>
                                <strong>Invalid ABI:</strong> Ensure the ABI is properly formatted as a JSON array. 
                                If it's a string, make sure it's valid JSON.
                            </li>
                            <li>
                                <strong>Missing fields:</strong> Standard format requires name, address, and abi fields. 
                                Hardhat artifacts need contractName and abi.
                            </li>
                            <li>
                                <strong>Debug files (.dbg.json):</strong> These are automatically excluded as they don't contain contract ABIs.
                            </li>
                            <li>
                                <strong>Interfaces, libraries, deprecated, and mocks:</strong> These are automatically excluded. 
                                Only deployable contracts are imported (those with bytecode and not in excluded folders).
                            </li>
                        </ul>
                    </b-message>
                </div>
            </div>
        </section>
        <footer class="modal-card-foot" style="justify-content: flex-end; padding: 1rem 1.5rem;">
            <button class="button is-primary" type="button" @click="$emit('close')">Close</button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { ParseResult, ValidationError, validateContract } from '../utils/import-utils'

interface DetailedError {
    field?: string
    message: string
    fix?: string
}

@Component
export default class ImportErrorModal extends Vue {
    @Prop({ required: true })
    private errorContracts!: ParseResult[]

    getDetailedErrors(result: ParseResult): DetailedError[] {
        // If we have a contract object, validate it to get detailed errors
        if (result.contract) {
            const validationErrors = validateContract(result.contract, result.isHardhatArtifact)
            return validationErrors.map(e => ({
                field: e.field,
                message: e.message,
                fix: e.fix
            }))
        }
        
        // Otherwise, return basic error messages
        return result.errors.map(error => ({
            message: error,
            fix: this.getSuggestionForError(error)
        }))
    }

    getSuggestionForError(error: string): string {
        if (error.includes('Invalid JSON')) {
            return 'Use a JSON validator to check your file syntax. Look for missing commas, quotes, or brackets.'
        }
        if (error.includes('Debug files')) {
            return 'Debug files are automatically excluded. Use the main artifact file instead.'
        }
        if (error.includes('Interfaces and libraries') || error.includes('deprecated') || error.includes('mock')) {
            return 'Only deployable contracts are imported. Interfaces, libraries, deprecated, and mock contracts are skipped automatically.'
        }
        if (error.includes('Unrecognized file format')) {
            return 'Ensure your file follows either the standard format or Hardhat artifact format as shown in the instructions.'
        }
        if (error.includes('Failed to read')) {
            return 'Check file permissions and try again. Make sure the file is accessible and not corrupted.'
        }
        return ''
    }
}
</script>

<style lang="scss" scoped>
.errors-container {
    max-height: 600px;
    overflow-y: auto;
}

.error-section {
    padding: 1.25rem;
    background: var(--body-background-alt);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    margin-bottom: 1.25rem;
    
    &:last-child {
        margin-bottom: 0;
    }
}

.error-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.875rem;
    border-bottom: 1px solid var(--border-color);
}

.error-icon {
    flex-shrink: 0;
    font-size: 1.5rem;
}

.error-file-info {
    flex: 1;
    min-width: 0;
}

.error-filename {
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--text-color-strong);
    word-break: break-all;
}

.error-contract-name {
    font-size: 0.875rem;
    color: var(--text-color-light);
    margin-top: 0.25rem;
}

.error-details {
    margin-top: 0.875rem;
}

.error-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 56, 96, 0.1);
    border-radius: 6px;
    color: var(--danger-color);
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.875rem;
}

[data-theme="dark"] .error-count-badge {
    background: rgba(255, 82, 82, 0.15);
}

.error-items {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}

.error-item {
    padding: 0.875rem;
    background: var(--card-background);
    border-radius: 6px;
    border-left: 3px solid var(--danger-color);
}

.error-item-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.error-number {
    font-weight: 700;
    color: var(--danger-color);
}

.error-field {
    code {
        background: rgba(255, 56, 96, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        font-size: 0.875rem;
        color: var(--danger-color);
        font-weight: 600;
    }
}

[data-theme="dark"] .error-field code {
    background: rgba(255, 82, 82, 0.15);
}

.error-item-body {
    margin-left: 1.5rem;
}

.error-message {
    margin-bottom: 0.75rem;
    color: var(--text-color);
    
    strong {
        color: var(--danger-color);
    }
}

.error-fix {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(50, 115, 220, 0.05);
    border-radius: 4px;
    border-left: 3px solid var(--info-color);
    font-size: 0.875rem;
    color: var(--text-color);
    
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
    background: rgba(74, 163, 227, 0.1);
}

.help-section {
    ul {
        margin-left: 1.5rem;
        
        li {
            margin-bottom: 0.75rem;
            
            strong {
                display: block;
                margin-bottom: 0.25rem;
            }
        }
    }
}
</style>

