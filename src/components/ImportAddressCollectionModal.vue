<template>
    <div class="modal-card" style="width: 700px; max-width: 95vw;">
        <header class="modal-card-head">
            <p class="modal-card-title">Enter Contract Addresses</p>
            <p class="subtitle is-6 has-text-grey ml-3">{{ contracts.length }} contract(s) need addresses</p>
        </header>
        <section class="modal-card-body">
            <b-message type="is-info" class="mb-4">
                <p>
                    <b-icon icon="info-circle" size="is-small"></b-icon>
                    The following contracts were imported from Hardhat artifacts and don't have deployment addresses.
                    Please enter the deployed address for each contract.
                </p>
            </b-message>

            <div class="contracts-list">
                <div 
                    v-for="(contract, index) in contracts" 
                    :key="index"
                    class="contract-item"
                >
                    <div class="contract-header">
                        <b-icon icon="file-contract" size="is-small"></b-icon>
                        <span class="contract-name">{{ contract.name }}</span>
                        <span class="tag is-info is-light is-small ml-2">
                            <b-icon icon="hammer" size="is-small"></b-icon>
                            <span>Hardhat</span>
                        </span>
                    </div>

                    <b-field 
                        :type="addressErrors[index] ? 'is-danger' : ''"
                        :message="addressErrors[index]"
                    >
                        <b-input
                            v-model="addresses[index]"
                            placeholder="0x..."
                            custom-class="is-family-monospace"
                            @input="validateAddress(index)"
                            @blur="validateAddress(index)"
                        ></b-input>
                    </b-field>
                </div>
            </div>
        </section>
        <footer class="modal-card-foot" style="justify-content: space-between;">
            <button class="button" type="button" @click="$emit('cancel')">Cancel</button>
            <button 
                class="button is-primary" 
                type="button" 
                @click="handleContinue"
                :disabled="!allAddressesValid"
            >
                Continue Import
            </button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Entities } from '../database'

@Component
export default class ImportAddressCollectionModal extends Vue {
    @Prop({ required: true })
    private contracts!: Entities.Contract[]

    private addresses: string[] = []
    private addressErrors: string[] = []

    get allAddressesValid(): boolean {
        if (this.addresses.length !== this.contracts.length) {
            return false
        }
        
        return this.addresses.every((addr, index) => {
            return addr && addr.trim() !== '' && !this.addressErrors[index]
        })
    }

    mounted() {
        // Initialize arrays
        this.addresses = this.contracts.map(c => c.address || '')
        this.addressErrors = this.contracts.map(() => '')
    }

    validateAddress(index: number) {
        const address = this.addresses[index]
        
        if (!address || address.trim() === '') {
            this.$set(this.addressErrors, index, 'Address is required')
            return false
        }

        if (!address.startsWith('0x')) {
            this.$set(this.addressErrors, index, 'Address must start with 0x')
            return false
        }

        if (address.length !== 42) {
            this.$set(this.addressErrors, index, 'Address must be 42 characters (0x + 40 hex chars)')
            return false
        }

        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            this.$set(this.addressErrors, index, 'Address must contain only hexadecimal characters')
            return false
        }

        this.$set(this.addressErrors, index, '')
        return true
    }

    handleContinue() {
        // Validate all addresses
        let allValid = true
        for (let i = 0; i < this.addresses.length; i++) {
            if (!this.validateAddress(i)) {
                allValid = false
            }
        }

        if (!allValid) {
            return
        }

        // Emit contracts with addresses
        const contractsWithAddresses = this.contracts.map((contract, index) => ({
            ...contract,
            address: this.addresses[index]
        }))

        this.$emit('continue', contractsWithAddresses)
    }
}
</script>

<style lang="scss" scoped>
.contracts-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-height: 500px;
    overflow-y: auto;
}

.contract-item {
    padding: 1.25rem;
    background: var(--body-background-alt);
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.contract-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
}

.contract-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-color);
}
</style>

