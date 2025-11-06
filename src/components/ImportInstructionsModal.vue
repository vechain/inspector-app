<template>
    <div class="modal-card" style="width: 100%;">
        <header class="modal-card-head">
            <p class="modal-card-title">Import Contract Files</p>
        </header>
        <section class="modal-card-body" style="padding: 1.25rem 1.5rem;">
            <div class="content">
                <p class="mb-4">
                    You can import contracts from JSON files. We support two formats:
                </p>

                <div class="format-section mb-5">
                    <h4 class="title is-5">
                        <b-icon icon="file-code" size="is-small"></b-icon>
                        Standard Format
                    </h4>
                    <p class="mb-3">
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
                    <div class="field-requirements mt-3">
                        <p class="has-text-weight-semibold mb-2">Required fields:</p>
                        <ul>
                            <li><code>name</code> - Contract name</li>
                            <li><code>address</code> - Deployed contract address</li>
                            <li><code>abi</code> - Contract ABI (array)</li>
                        </ul>
                    </div>
                </div>

                <div class="format-section mb-5">
                    <h4 class="title is-5">
                        <b-icon icon="hammer" size="is-small"></b-icon>
                        Hardhat Artifacts
                    </h4>
                    <p class="mb-3">
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
                    <div class="field-requirements mt-3">
                        <p class="has-text-weight-semibold mb-2">Required fields:</p>
                        <ul>
                            <li><code>contractName</code> - Will be used as the contract name</li>
                            <li><code>abi</code> - Contract ABI (array)</li>
                        </ul>
                        <b-message type="is-info" size="is-small" class="mt-3">
                            <b-icon icon="info-circle" size="is-small"></b-icon>
                            You'll be prompted to enter the deployment address after import.
                        </b-message>
                    </div>
                </div>

                <div class="import-options">
                    <h5 class="title is-6">Import Options</h5>
                    <ul>
                        <li><strong>Single file:</strong> Import one contract at a time</li>
                        <li><strong>Multiple files:</strong> Select multiple JSON files to import</li>
                        <li><strong>Folder:</strong> Import all contracts from a folder (e.g., Hardhat artifacts directory)</li>
                    </ul>
                    <p class="mt-3 is-size-7 has-text-grey">
                        Note: .dbg.json files, interfaces, libraries, deprecated, and mock contracts are automatically excluded.
                    </p>
                </div>

                <b-field class="mt-5">
                    <b-checkbox v-model="dontShowAgain">
                        Don't show this again
                    </b-checkbox>
                </b-field>
            </div>
        </section>
        <footer class="modal-card-foot" style="justify-content: flex-end; padding: 1rem 1.5rem;">
            <button class="button is-outlined" type="button" @click="$emit('cancel')">Cancel</button>
            <button class="button is-primary" type="button" @click="handleProceed">Got it</button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class ImportInstructionsModal extends Vue {
    private dontShowAgain = false

    private handleProceed() {
        if (this.dontShowAgain) {
            localStorage.setItem('hideImportInstructions', 'true')
        }
        this.$emit('proceed')
    }
}
</script>

<style lang="scss" scoped>
.content {
    max-width: 100%;
}

.format-section {
    padding: 0.875rem 1rem;
    background: var(--body-background-alt);
    border-radius: 6px;
    border: 1px solid var(--border-color);
}

.code-example {
    background: #282c34;
    border-radius: 4px;
    padding: 0.875rem;
    overflow-x: auto;
    
    pre {
        margin: 0;
        padding: 0;
        background: transparent;
        
        code {
            color: #abb2bf;
            font-size: 0.8rem;
            line-height: 1.5;
            font-family: 'Courier New', Courier, monospace;
        }
    }
}

.field-requirements {
    ul {
        margin-left: 1.5rem;
        
        li {
            margin-bottom: 0.25rem;
            
            code {
                background: var(--input-background);
                border: 1px solid var(--border-color);
                padding: 0.125rem 0.375rem;
                border-radius: 3px;
                font-size: 0.85em;
                color: var(--text-color-strong);
            }
        }
    }
}

.import-options {
    ul {
        margin-left: 1.5rem;
        
        li {
            margin-bottom: 0.5rem;
        }
    }
}
</style>

