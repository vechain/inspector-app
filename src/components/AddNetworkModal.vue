<template>
    <div class="modal-card">
        <header class="modal-card-head">
            <span class="modal-card-title">{{ isEditMode ? 'Edit Network' : 'Add Network' }}</span>
        </header>
        <section class="modal-card-body">
            <p v-if="!isEditMode" class="help-text">
                If you are having problems adding your custom node, it usually indicates a poorly formatted URL or a problem with the CORS configuration of the node.
            </p>

            <b-field label="Node Name" :type="nameError ? 'is-danger' : ''" :message="nameError">
                <b-input
                    v-model="networkName"
                    placeholder="My Custom Network"
                    required
                    @input="nameError = ''"
                ></b-input>
            </b-field>

            <b-field label="URL" :type="urlError ? 'is-danger' : ''" :message="urlError">
                <b-input
                    v-model="nodeUrl"
                    placeholder="http://localhost:8669"
                    required
                    @input="onNodeUrlChange"
                ></b-input>
            </b-field>

            <b-field v-if="genesisId || isFetchingGenesis" label="Genesis ID">
                <b-input
                    v-model="genesisId"
                    placeholder="Will be fetched automatically..."
                    disabled
                    :loading="isFetchingGenesis"
                ></b-input>
            </b-field>

            <b-message v-if="fetchError" type="is-danger">
                {{ fetchError }}
            </b-message>

            <b-message v-if="isFetchingGenesis" type="is-info">
                Connecting to node and fetching genesis block...
            </b-message>

            <b-message v-if="genesisId && !fetchError && !isFetchingGenesis" type="is-success">
                Successfully connected to node!
            </b-message>
        </section>
        <footer class="modal-card-foot">
            <button class="button" type="button" @click="$emit('close')">Cancel</button>
            <button 
                class="button is-primary" 
                type="button" 
                @click="saveNetwork"
                :disabled="!canSave"
                :class="{ 'is-loading': isSaving }"
            >{{ isEditMode ? 'Save' : 'Add' }}</button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { fetchGenesisBlock, validateNodeUrl, saveNetwork, updateNetwork } from '../services/network-service'
import { Entities } from '../database'

@Component
export default class AddNetworkModal extends Vue {
    @Prop({ default: null })
    private network!: Entities.Network | null

    private networkName = ''
    private nodeUrl = ''
    private genesisId = ''
    private isFetchingGenesis = false
    private isSaving = false
    private nameError = ''
    private urlError = ''
    private fetchError = ''
    private debounceTimer: any = null

    get isEditMode() {
        return !!this.network
    }

    created() {
        if (this.network) {
            this.networkName = this.network.name
            this.nodeUrl = this.network.nodeUrl
            this.genesisId = this.network.genesisId
        }
    }

    get canSave() {
        return (
            this.networkName.trim() !== '' &&
            this.nodeUrl.trim() !== '' &&
            this.genesisId !== '' &&
            !this.isFetchingGenesis &&
            !this.fetchError
        )
    }

    private onNodeUrlChange() {
        this.urlError = ''
        this.fetchError = ''
        this.genesisId = ''

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }

        const url = this.nodeUrl.trim()
        if (!url) {
            return
        }

        if (!validateNodeUrl(url)) {
            this.urlError = 'Please enter a valid HTTP or HTTPS URL'
            return
        }

        this.debounceTimer = setTimeout(() => {
            this.fetchGenesis()
        }, 800)
    }

    private async fetchGenesis() {
        if (!this.nodeUrl.trim()) {
            return
        }

        this.isFetchingGenesis = true
        this.fetchError = ''
        this.genesisId = ''

        try {
            const genesisBlock = await fetchGenesisBlock(this.nodeUrl.trim())
            this.genesisId = genesisBlock.id
        } catch (error: any) {
            this.fetchError = error.message || 'Failed to fetch genesis block'
        } finally {
            this.isFetchingGenesis = false
        }
    }

    private async saveNetwork() {
        if (!this.canSave) {
            return
        }

        this.isSaving = true
        this.nameError = ''
        this.urlError = ''

        try {
            if (this.isEditMode) {
                await updateNetwork(this.network!.id!, {
                    name: this.networkName.trim(),
                    nodeUrl: this.nodeUrl.trim(),
                    genesisId: this.genesisId
                })

                this.$buefy.toast.open({
                    message: 'Network updated successfully!',
                    type: 'is-success'
                })

                const lastNet = localStorage.getItem('last-net')
                if (lastNet === `custom-${this.network!.id}`) {
                    window.location.href = window.location.origin
                } else {
                    this.$emit('close')
                    this.$emit('updated')
                }
            } else {
                const networkId = await saveNetwork({
                    name: this.networkName.trim(),
                    nodeUrl: this.nodeUrl.trim(),
                    genesisId: this.genesisId,
                    createdTime: Date.now()
                })

                this.$buefy.toast.open({
                    message: 'Network added successfully!',
                    type: 'is-success'
                })

                localStorage.setItem('last-net', `custom-${networkId}`)
                window.location.href = window.location.origin
            }
        } catch (error: any) {
            if (error.message.includes('name already exists')) {
                this.nameError = error.message
            } else {
                this.$buefy.toast.open({
                    message: error.message || 'Failed to save network',
                    type: 'is-danger'
                })
            }
        } finally {
            this.isSaving = false
        }
    }

    beforeDestroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }
    }
}
</script>

<style scoped>
.modal-card {
    width: 500px;
    max-width: 90vw;
}

.modal-card-body {
    min-height: 300px;
}

.help-text {
    margin-bottom: 1.5rem;
    color: var(--text-color-light, #7a7a7a);
    font-size: 0.875rem;
    line-height: 1.5;
}

/* Dark mode support */
[data-theme="dark"] .help-text {
    color: #b5b5b5;
}

[data-theme="dark"] .modal-card-head {
    background-color: #2a2a2a;
    border-bottom-color: #404040;
}

[data-theme="dark"] .modal-card-body {
    background-color: #1f1f1f;
}

[data-theme="dark"] .modal-card-foot {
    background-color: #2a2a2a;
    border-top-color: #404040;
}
</style>

