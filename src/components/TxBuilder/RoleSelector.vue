<template>
    <div class="role-selector">
        <div class="role-row">
            <b-dropdown
                aria-role="list"
                position="is-bottom-right"
                expanded
                :disabled="loading"
                @change="onSelect"
            >
                <template #trigger>
                    <button type="button" class="button role-trigger">
                        <span v-if="loading" class="has-text-grey-light">Loading roles…</span>
                        <span v-else-if="matchedName" class="role-trigger__main">
                            <span class="role-name">{{ matchedName }}</span>
                        </span>
                        <span v-else-if="value" class="role-trigger__main">
                            <span class="role-name has-text-grey">Custom</span>
                            <span class="role-hash is-family-monospace">{{ shortHash(value) }}</span>
                        </span>
                        <span v-else class="has-text-grey-light">Select a role…</span>
                        <b-icon icon="caret-down" size="is-small"></b-icon>
                    </button>
                </template>

                <b-dropdown-item custom>
                    <b-input
                        v-model="search"
                        placeholder="Filter by name or hash"
                        size="is-small"
                        icon="search"
                    ></b-input>
                </b-dropdown-item>

                <b-dropdown-item v-if="!loading && filtered.length === 0" custom>
                    <span class="has-text-grey-light">No roles match.</span>
                </b-dropdown-item>

                <b-dropdown-item
                    v-for="r in filtered"
                    :key="r.hash"
                    :value="r.hash"
                    class="role-option"
                >
                    <div class="role-option__name">{{ r.name }}</div>
                    <div class="role-option__hash is-family-monospace">{{ shortHash(r.hash) }}</div>
                </b-dropdown-item>
            </b-dropdown>

            <button
                type="button"
                class="button is-small refresh-btn"
                title="Refresh roles from chain"
                :disabled="loading"
                @click="reload(true)"
            >
                <b-icon icon="sync-alt" size="is-small" :class="{ 'is-spinning': loading }"></b-icon>
            </button>
        </div>

        <div class="manual-row">
            <b-input
                custom-class="is-family-monospace"
                size="is-small"
                :value="value"
                :placeholder="'Or paste bytes32 (0x' + '0'.repeat(64) + ')'"
                @input="onManualInput"
            ></b-input>
            <span v-if="manualError" class="manual-error">{{ manualError }}</span>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { discoverContractRoles, clearRoleCache, DiscoveredRole } from '../../utils/role-discovery'

@Component
export default class RoleSelector extends Vue {
    @Prop({ required: true }) contractAddress!: string
    @Prop({ required: true }) abi!: any[]
    @Prop({ required: true }) network!: string
    @Prop({ default: '' }) value!: string

    private roles: DiscoveredRole[] = []
    private loading: boolean = false
    private search: string = ''
    private manualError: string = ''

    get matchedName(): string | null {
        if (!this.value) return null
        const v = this.value.toLowerCase()
        const found = this.roles.find(r => r.hash === v)
        return found ? found.name : null
    }

    get filtered(): DiscoveredRole[] {
        const q = this.search.trim().toLowerCase()
        if (!q) return this.roles
        return this.roles.filter(r =>
            r.name.toLowerCase().includes(q) || r.hash.toLowerCase().includes(q)
        )
    }

    private shortHash(hash: string): string {
        if (!hash) return ''
        if (hash.length <= 16) return hash
        return hash.substring(0, 10) + '…' + hash.substring(hash.length - 6)
    }

    private async reload(force: boolean = false) {
        if (!this.contractAddress || !this.abi) return
        this.loading = true
        try {
            if (force) clearRoleCache(this.network, this.contractAddress)
            this.roles = await discoverContractRoles(
                this.$connex,
                this.network,
                this.contractAddress,
                this.abi
            )
        } catch (e) {
            console.error('Role discovery failed', e)
        } finally {
            this.loading = false
        }
    }

    private onSelect(hash: string) {
        if (!hash) return
        this.manualError = ''
        this.$emit('input', hash.toLowerCase())
    }

    private onManualInput(val: string) {
        const v = (val || '').trim()
        if (!v) {
            this.manualError = ''
            this.$emit('input', '')
            return
        }
        if (!/^0x[0-9a-fA-F]{0,64}$/.test(v)) {
            this.manualError = 'Must be hex (0x…)'
        } else if (v.length !== 66) {
            this.manualError = `Bytes32 needs 64 hex chars (${v.length - 2}/64)`
        } else {
            this.manualError = ''
        }
        this.$emit('input', v.toLowerCase())
    }

    @Watch('contractAddress')
    private onContractChange() {
        this.roles = []
        this.reload()
    }

    @Watch('abi')
    private onAbiChange() {
        this.roles = []
        this.reload()
    }

    created() {
        this.reload()
    }
}
</script>

<style lang="scss" scoped>
.role-selector {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.role-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
}

.role-trigger {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--input-background);
    border: 1px solid var(--input-border);
    color: var(--text-color);
    text-align: left;
}
.role-trigger:hover,
.role-trigger:focus {
    border-color: var(--primary-color);
    background-color: var(--input-background);
    color: var(--text-color);
    box-shadow: none;
}
.role-trigger:hover .role-name,
.role-trigger:focus .role-name {
    color: var(--text-color-strong);
}
.role-trigger:hover .role-hash,
.role-trigger:focus .role-hash {
    color: var(--text-color-light);
}
.role-trigger__main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
}
.role-name {
    font-weight: 600;
    color: var(--text-color-strong);
    font-size: 0.85rem;
}
.role-hash {
    font-size: 0.7rem;
    color: var(--text-color-light);
}

.refresh-btn {
    flex-shrink: 0;
}
.refresh-btn .is-spinning {
    animation: spin 1s linear infinite;
}
@keyframes spin {
    to { transform: rotate(360deg); }
}

.role-option {
    padding: 0.4rem 0.75rem !important;
}
.role-option__name {
    font-weight: 600;
    color: var(--text-color-strong);
    font-size: 0.85rem;
}
.role-option__hash {
    font-size: 0.7rem;
    color: var(--text-color-light);
}

.manual-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.manual-error {
    font-size: 0.7rem;
    color: #ff3860;
}

::v-deep .dropdown {
    width: 100%;
}
::v-deep .dropdown-trigger {
    width: 100%;
}
::v-deep .dropdown-menu {
    min-width: 100%;
    width: 100%;
}
::v-deep .dropdown-content {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 360px;
    overflow-y: auto;
}
::v-deep .dropdown-item,
::v-deep a.dropdown-item {
    color: var(--text-color);
}
::v-deep .dropdown-item:hover,
::v-deep a.dropdown-item:hover {
    background-color: var(--body-background-alt);
    color: var(--text-color);
}
::v-deep .dropdown-item:hover .role-option__name {
    color: var(--text-color-strong);
}
::v-deep .dropdown-item:hover .role-option__hash {
    color: var(--text-color-light);
}
</style>
