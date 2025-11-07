<template>
    <div class="modal-card modern-instructions-modal" style="width: 100%;">
        <header class="modal-card-head modern-header">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="modal-title">Import Contract Files</h1>
                    <p class="modal-subtitle">We support multiple contract formats</p>
                </div>
                <div class="header-right">
                    <b-icon icon="file-import" size="is-large" custom-class="header-icon"></b-icon>
                </div>
            </div>
        </header>
        <section class="modal-card-body modern-body">
            <!-- Import Options (shared for both) -->
            <div class="import-options-section">
                <div class="options-header" @click="toggleOptions">
                    <h3 class="options-title">Import Options</h3>
                    <b-icon 
                        icon="chevron-down" 
                        size="is-small"
                        :class="{ 'is-rotated': !showOptions }"
                    ></b-icon>
                </div>
                
                <transition name="slide-fade">
                    <div v-show="showOptions" class="options-content">
                        <div class="options-list">
                            <div class="option-item">
                                <b-icon icon="file" size="is-small"></b-icon>
                                <div class="option-content">
                                    <strong>Single file</strong>
                                    <span>Import one contract at a time</span>
                                </div>
                            </div>
                            <div class="option-item">
                                <b-icon icon="copy" size="is-small"></b-icon>
                                <div class="option-content">
                                    <strong>Multiple files</strong>
                                    <span>Select multiple JSON files to import</span>
                                </div>
                            </div>
                            <div class="option-item">
                                <b-icon icon="folder-open" size="is-small"></b-icon>
                                <div class="option-content">
                                    <strong>Folder</strong>
                                    <span>Import all contracts from a folder (e.g., Hardhat artifacts directory)</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="exclusion-note">
                            <b-icon icon="filter" size="is-small"></b-icon>
                            <span>Automatically excluded: .dbg.json files, interfaces, libraries, deprecated, and mock contracts</span>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- Tabs -->
            <b-tabs v-model="activeTab" class="format-tabs" size="is-small">
                <b-tab-item label="Standard Format">
                    
                    <div class="format-content">
                        <p class="format-description">
                            A JSON file with contract details including the deployed address.
                        </p>
                        
                        <div class="code-example">
                            <pre><code>{
  "name": "MyContract",
  "address": "0x1234567890123456789012345678901234567890",
  "abi": [
    {
      "type": "function",
      "name": "myFunction",
      ...
    }
  ],
  "category": "DeFi" // optional
}</code></pre>
                        </div>
                        
                        <div class="field-requirements">
                            <div class="requirements-title">Required fields:</div>
                            <ul>
                                <li><code>name</code> - Contract name</li>
                                <li><code>address</code> - Deployed contract address</li>
                                <li><code>abi</code> - Contract ABI (array)</li>
                            </ul>
                        </div>
                    </div>
                </b-tab-item>

                <b-tab-item label="Hardhat Artifacts">
                   
                    <div class="format-content">
                        <p class="format-description">
                            Compilation artifacts from Hardhat. You'll need to provide the deployment address manually.
                        </p>
                        
                        <div class="code-example">
                            <pre><code>{
  "_format": "hh-sol-artifact-1",
  "contractName": "MyContract",
  "sourceName": "contracts/MyContract.sol",
  "abi": [...],
  "bytecode": "0x...",
  ...
}</code></pre>
                        </div>
                        
                        <div class="field-requirements">
                            <div class="requirements-title">Required fields:</div>
                            <ul>
                                <li><code>contractName</code> - Will be used as the contract name</li>
                                <li><code>abi</code> - Contract ABI (array)</li>
                            </ul>
                            
                            <b-message type="is-info" size="is-small" class="info-note">
                                <b-icon icon="info-circle" size="is-small"></b-icon>
                                You'll be prompted to enter the deployment address after import.
                            </b-message>
                        </div>
                    </div>
                </b-tab-item>
            </b-tabs>
        </section>
        <footer class="modal-card-foot modern-footer">
            <button class="button is-outlined" type="button" @click="$emit('cancel')">Cancel</button>
            <div class="got-it-section">
                <div class="dont-show-section">
                    <b-checkbox v-model="dontShowAgain">
                        Don't show this again
                    </b-checkbox>
                </div>
                <button class="button is-primary" type="button" @click="handleProceed">
                    <b-icon icon="check" size="is-small"></b-icon>
                    <span>Got it</span>
                </button>
            </div>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class ImportInstructionsModal extends Vue {
    private dontShowAgain = false
    private activeTab = 0
    private showOptions = true

    private toggleOptions() {
        this.showOptions = !this.showOptions
    }

    private handleProceed() {
        if (this.dontShowAgain) {
            localStorage.setItem('hideImportInstructions', 'true')
        }
        this.$emit('proceed')
    }
}
</script>

<style lang="scss" scoped>
.modern-instructions-modal {
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
    flex-shrink: 0;
    color: var(--primary-color);
    opacity: 0.5;
}

.modern-body {
    padding: 1.25rem 1.5rem;
    max-height: calc(90vh - 180px);
    overflow-y: auto;
}

// Import Options Section
.import-options-section {
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
}

.options-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    
    &:hover {
        .options-title {
            color: var(--primary-color);
        }
    }
    
    .icon {
        color: var(--text-color-light);
        transition: transform 0.2s ease;
        
        &.is-rotated {
            transform: rotate(-90deg);
        }
    }
}

.options-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0;
    transition: color 0.2s ease;
}

.options-content {
    overflow: hidden;
    margin-top: 1rem;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-enter,
.slide-fade-leave-to {
    opacity: 0;
    max-height: 0;
}

.slide-fade-enter-to,
.slide-fade-leave {
    opacity: 1;
    max-height: 500px;
}

.options-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.25rem;
}

.option-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    
    .icon {
        flex-shrink: 0;
        color: var(--primary-color);
        margin-top: 0.125rem;
    }
}

.option-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    
    strong {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-color-strong);
    }
    
    span {
        font-size: 0.8125rem;
        color: var(--text-color-light);
    }
}

.exclusion-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.8125rem;
    color: var(--text-color-light);
    
    .icon {
        flex-shrink: 0;
        margin-top: 0.125rem;
        color: var(--text-color-light);
    }
}

// Format Tabs
.format-tabs {
    margin-top: 1.5rem;
}

// Fix tab styling for dark mode
.format-tabs ::v-deep {
    .tabs {
        a {
            color: var(--text-color);
       
            
            &:hover {
                color: var(--text-color-strong);
                border-bottom-color: var(--text-color-light);
            }
        }
        
        li.is-active a {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
        }
    }
    
    .tab-content {
        padding: 1rem 0;
    }
}

.tab-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--primary-color);
    color: var(--primary-invert);
    border-radius: 8px;
    margin-bottom: 1rem;
}

.format-content {
    padding-top: 0.5rem;
}

.format-description {
    font-size: 0.9375rem;
    color: var(--text-color);
    margin-bottom: 1.25rem;
    line-height: 1.5;
}

.code-example {
    background: #282c34;
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin-bottom: 1.25rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    
    pre {
        margin: 0;
        padding: 0;
        background: transparent;
        
        code {
            color: #abb2bf;
            font-size: 0.8125rem;
            line-height: 1.6;
            font-family: 'Courier New', Courier, monospace;
        }
    }
}

.field-requirements {
    background: var(--body-background-alt);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    
    ul {
        margin-left: 1.25rem;
        
        li {
            margin-bottom: 0.5rem;
            color: var(--text-color);
            line-height: 1.5;
            
            code {
                background: var(--input-background);
                border: 1px solid var(--border-color);
                padding: 0.125rem 0.5rem;
                border-radius: 4px;
                font-size: 0.875rem;
                color: var(--primary-color);
                font-weight: 600;
            }
        }
    }
}

.requirements-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color-strong);
    margin-bottom: 0.75rem;
}

.info-note {
    margin-top: 1rem;
}

// Footer
.modern-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--modal-card-foot-background);
    border-top: 1px solid var(--border-color);
}

.got-it-section {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.dont-show-section {
    display: flex;
    align-items: center;
    
    ::v-deep .b-checkbox {
        .check {
            border-color: var(--border-color);
            background-color: var(--input-background);
        }
        
        &:hover .check {
            border-color: var(--primary-color);
        }
        
        .control-label {
            color: var(--text-color);
        }
    }
}
</style>


