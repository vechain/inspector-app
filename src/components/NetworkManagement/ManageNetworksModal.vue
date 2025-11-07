<template>
    <div class="modal-card">
        <header class="modal-card-head">
            <span class="modal-card-title">Manage VeChain Networks</span>
        </header>
        <section class="modal-card-body">
            <b-loading :is-full-page="false" :active.sync="isLoading"></b-loading>
            
            <div v-if="!isLoading">
                <div class="networks-section">
                    <div class="built-in-networks">
                        <div 
                            v-for="network in builtInNetworks" 
                            :key="network.name"
                            class="network-item"
                            :class="{ 'is-active': isActiveNetwork(network.genesisId) }"
                            @click="switchToNetwork(network.name)"
                        >
                            <div class="network-info">
                                <strong>{{ network.label }}</strong>
                                <span class="network-url">{{ network.url }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="customNetworks.length > 0" class="custom-networks">
                        <h3 class="section-title">Custom Networks</h3>
                        <div 
                            v-for="network in customNetworks" 
                            :key="network.id"
                            class="network-item"
                            :class="{ 'is-active': isActiveNetwork(network.genesisId) }"
                        >
                            <div class="network-info" @click="switchToNetwork(`custom-${network.id}`)">
                                <strong>{{ network.name }}</strong>
                                <span class="network-url">{{ network.nodeUrl }}</span>
                            </div>
                            <div class="network-actions">
                                <b-dropdown aria-role="list" position="is-bottom-left">
                                    <template #trigger>
                                        <b-button size="is-small" icon-right="ellipsis-v"></b-button>
                                    </template>
                                    <b-dropdown-item aria-role="listitem" @click="openEditNetworkModal(network)">
                                        <b-icon icon="edit" size="is-small"></b-icon>
                                        <span>Edit</span>
                                    </b-dropdown-item>
                                    <b-dropdown-item aria-role="listitem" @click="confirmDelete(network)">
                                        <b-icon icon="trash" size="is-small"></b-icon>
                                        <span>Delete</span>
                                    </b-dropdown-item>
                                </b-dropdown>
                            </div>
                        </div>
                    </div>

                    <div class="add-network-section">
                        <button class="add-network-button" @click="openAddNetworkModal">
                            + Add network
                        </button>
                    </div>
                </div>
            </div>
        </section>
        <footer class="modal-card-foot">
            <button class="button" type="button" @click="$emit('close')">Close</button>
        </footer>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { Entities } from '../../database'
import {
    getCustomNetworks,
    deleteNetwork
} from '../../services/network-service'
import AddNetworkModal from './AddNetworkModal.vue'
import { isSoloNode } from '@/create-connex'

@Component({
    components: {
        AddNetworkModal
    }
})
export default class ManageNetworksModal extends Vue {
    private customNetworks: Entities.Network[] = []
    private isLoading = true

    get builtInNetworks() {
        const networks = [
            { 
                name: 'main', 
                label: 'Main Net', 
                url: 'https://mainnet.vechain.org',
                genesisId: '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a'
            },
            { 
                name: 'test', 
                label: 'Test Net', 
                url: 'https://testnet.vechain.org',
                genesisId: '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127'
            }
        ]
        
        if (isSoloNode) {
            networks.push({
                name: 'solo',
                label: 'Solo Net',
                url: 'http://localhost:8669',
                genesisId: '0x00000000c05a20fbca2bf6ae3affba6af4a74b800b585bf7a4988aba7aea69f6'
            })
        }
        
        return networks
    }

    async created() {
        await this.loadNetworks()
    }

    private async loadNetworks() {
        this.isLoading = true
        try {
            this.customNetworks = await getCustomNetworks()
        } catch (error: any) {
            this.$buefy.toast.open({
                message: 'Failed to load networks',
                type: 'is-danger'
            })
        } finally {
            this.isLoading = false
        }
    }

    private isActiveNetwork(genesisId: string): boolean {
        return this.$connex.thor.genesis.id === genesisId
    }

    private switchToNetwork(networkName: string) {
        localStorage.setItem('last-net', networkName)
        window.location.href = window.location.origin
    }

    private openAddNetworkModal() {
        this.$buefy.modal.open({
            parent: this,
            component: AddNetworkModal,
            hasModalCard: true,
            trapFocus: true
        })
    }

    private openEditNetworkModal(network: Entities.Network) {
        this.$buefy.modal.open({
            parent: this,
            component: AddNetworkModal,
            hasModalCard: true,
            trapFocus: true,
            props: {
                network
            },
            events: {
                updated: () => {
                    this.loadNetworks()
                }
            }
        })
    }

    private confirmDelete(network: Entities.Network) {
        this.$buefy.dialog.confirm({
            title: 'Delete Network',
            message: `Are you sure you want to delete <strong>${network.name}</strong>? This action cannot be undone.`,
            confirmText: 'Delete',
            type: 'is-danger',
            hasIcon: true,
            onConfirm: () => this.deleteNetwork(network)
        })
    }

    private async deleteNetwork(network: Entities.Network) {
        try {
            await deleteNetwork(network.id!)
            
            this.$buefy.toast.open({
                message: 'Network deleted successfully',
                type: 'is-success'
            })

            await this.loadNetworks()
            this.$emit('network-deleted')

            const lastNet = localStorage.getItem('last-net')
            if (lastNet === `custom-${network.id}`) {
                localStorage.setItem('last-net', 'main')
                this.$buefy.dialog.alert({
                    message: 'You deleted the currently active network. Switching to Mainnet...',
                    onConfirm: () => {
                        window.location.href = window.location.origin
                    }
                })
            }
        } catch (error: any) {
            this.$buefy.toast.open({
                message: 'Failed to delete network',
                type: 'is-danger'
            })
        }
    }

}
</script>

<style scoped>
.modal-card {
    width: 500px;
    max-width: 95vw;
}

.modal-card-body {
    min-height: 300px;
    max-height: 600px;
    overflow-y: auto;
    position: relative;
    padding: 0;
}

.networks-section {
    display: flex;
    flex-direction: column;
}

.built-in-networks,
.custom-networks {
    padding: 1rem 0;
}

.custom-networks {
    border-top: 1px solid var(--border-color, #dbdbdb);
}

.section-title {
    font-size: 0.875rem;
    color: var(--text-color-light, #7a7a7a);
    margin-bottom: 0.75rem;
    padding: 0 1.5rem;
}

.network-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
}

.network-item:hover {
    background-color: var(--body-background-alt, #f5f5f5);
}

.network-item.is-active {
    background-color: var(--primary-color-light, #e8f4fd);
    border-left: 3px solid var(--primary-color, #485fc7);
}

.network-item.is-active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: var(--primary-color, #485fc7);
}

.network-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.network-info strong {
    font-size: 0.95rem;
}

.network-url {
    font-size: 0.85rem;
    color: var(--text-color-light, #7a7a7a);
}

.network-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.network-actions ::v-deep .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.add-network-section {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color, #dbdbdb);
}

.add-network-button {
    width: 100%;
    padding: 0.75rem;
    background-color: transparent;
    border: 2px dashed var(--border-color, #dbdbdb);
    border-radius: 6px;
    color: var(--primary-color, #485fc7);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.add-network-button:hover {
    background-color: var(--body-background-alt, #f5f5f5);
    border-color: var(--primary-color, #485fc7);
}

/* Dark mode support */
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

[data-theme="dark"] .section-title {
    color: #b5b5b5;
}

[data-theme="dark"] .network-item strong {
    color: #ffffff;
}

[data-theme="dark"] .network-item .network-url {
    color: #b5b5b5;
}

[data-theme="dark"] .network-item:hover {
    background-color: #2a2a2a;
}

[data-theme="dark"] .network-item.is-active {
    background-color: #1a3a52;
}

[data-theme="dark"] .network-item.is-active strong {
    color: #6bb6ff;
}

[data-theme="dark"] .add-network-button:hover {
    background-color: #2a2a2a;
}

[data-theme="dark"] .custom-networks,
[data-theme="dark"] .add-network-section {
    border-top-color: #404040;
}

/* Fix dialog text in dark mode */
::v-deep [data-theme="dark"] .dialog .modal-card-body strong {
    color: #6bb6ff;
}
</style>

