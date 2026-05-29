<template>
    <div class="contract-picker">
        <!-- Tabs: Library / Manual -->
        <div class="picker-tabs">
            <button
                type="button"
                class="picker-tab"
                :class="{ 'is-active': mode === 'library' }"
                @click="mode = 'library'"
            >Library</button>
            <button
                type="button"
                class="picker-tab"
                :class="{ 'is-active': mode === 'manual' }"
                @click="mode = 'manual'"
            >Enter manually</button>
        </div>

        <!-- Library: autocomplete over user contracts + built-ins -->
        <div v-if="mode === 'library'" class="picker-body">
            <b-autocomplete
                v-model="search"
                :data="filtered"
                field="name"
                :loading="loading"
                open-on-focus
                clearable
                placeholder="Search contracts by name or address"
                @select="onSelect"
            >
                <template #default="{ option }">
                    <div class="picker-row">
                        <div class="picker-row__name">
                            <span class="has-text-weight-semibold">{{ option.name }}</span>
                            <span v-if="option.source" class="picker-row__badge" :class="badgeClass(option.source)">
                                {{ option.source }}
                            </span>
                        </div>
                        <div v-if="option.address" class="picker-row__addr is-family-monospace">
                            {{ option.address | addr }}
                        </div>
                        <div v-else class="picker-row__addr has-text-grey-light">
                            no address for this network
                        </div>
                    </div>
                </template>
                <template #empty>
                    <div class="has-text-grey py-2 px-3">No matches. Try "Enter manually".</div>
                </template>
            </b-autocomplete>
        </div>

        <!-- Manual entry: name + address + ABI textarea -->
        <div v-else class="picker-body">
            <b-field
                :type="formErrors.name ? 'is-danger' : ''"
                :message="formErrors.name"
                label="Name"
            >
                <b-input v-model="manual.name" placeholder="My Contract"></b-input>
            </b-field>
            <b-field
                :type="formErrors.address ? 'is-danger' : ''"
                :message="formErrors.address"
                label="Address"
            >
                <b-input
                    v-model="manual.address"
                    custom-class="is-family-monospace has-text-weight-semibold"
                    placeholder="0x..."
                ></b-input>
            </b-field>
            <b-field
                :type="formErrors.abi ? 'is-danger' : ''"
                :message="formErrors.abi"
                label="ABI (JSON array)"
            >
                <b-input
                    v-model="manual.abi"
                    type="textarea"
                    rows="6"
                    placeholder='[{"type":"function","name":"transfer", ...}]'
                ></b-input>
            </b-field>
            <div class="picker-actions">
                <button type="button" class="button is-rounded is-primary" @click="applyManual">Use this contract</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { address as Address } from 'thor-devkit'
import DB, { Entities } from '../../database'
import { BuiltInContractsService } from '../../services/builtin-contracts-service'

interface PickerOption {
    name: string
    address: string
    abi: any[]
    source: 'Library' | 'Built-in'
}

@Component
export default class ContractPicker extends Vue {
    @Prop({ required: true }) network!: string

    private mode: 'library' | 'manual' = 'library'
    private search: string = ''
    private loading: boolean = false
    private userContracts: Entities.Contract[] = []
    private builtIns: PickerOption[] = []

    private manual = {
        name: '',
        address: '',
        abi: ''
    }
    private formErrors: { name: string; address: string; abi: string } = {
        name: '',
        address: '',
        abi: ''
    }

    get options(): PickerOption[] {
        const user: PickerOption[] = this.userContracts
            .filter(c => Array.isArray(c.abi) && (c.abi as any[]).length > 0)
            .map(c => ({
                name: c.name || 'Unnamed',
                address: c.address || '',
                abi: c.abi as any[],
                source: 'Library' as const
            }))
        // de-dupe: prefer user library over built-ins by address
        const known = new Set(user.map(o => o.address.toLowerCase()))
        const builtins = this.builtIns.filter(o => !known.has((o.address || '').toLowerCase()))
        return [...user, ...builtins]
    }

    get filtered(): PickerOption[] {
        const q = this.search.trim().toLowerCase()
        if (!q) return this.options
        return this.options.filter(o =>
            o.name.toLowerCase().includes(q) ||
            (o.address && o.address.toLowerCase().includes(q))
        )
    }

    private badgeClass(src: string) {
        return src === 'Built-in' ? 'is-builtin' : 'is-library'
    }

    private onSelect(option: PickerOption | null) {
        if (!option) return
        if (!option.address || !Address.test(option.address)) {
            this.$buefy.toast.open({
                message: 'This built-in contract has no address on the current network. Use manual entry.',
                type: 'is-warning',
                position: 'is-bottom'
            })
            return
        }
        this.$emit('pick', {
            address: option.address,
            name: option.name,
            abi: option.abi
        })
        this.search = ''
    }

    private applyManual() {
        this.formErrors = { name: '', address: '', abi: '' }
        const name = this.manual.name.trim()
        const address = this.manual.address.trim()
        const abiRaw = this.manual.abi.trim()

        if (!name) this.formErrors.name = 'Name is required'
        if (!address) this.formErrors.address = 'Address is required'
        else if (!Address.test(address)) this.formErrors.address = 'Invalid address'
        if (!abiRaw) this.formErrors.abi = 'ABI is required'

        let abi: any[] = []
        if (abiRaw && !this.formErrors.abi) {
            try {
                const parsed = JSON.parse(abiRaw)
                if (!Array.isArray(parsed)) {
                    this.formErrors.abi = 'ABI must be a JSON array'
                } else {
                    abi = parsed
                }
            } catch (e: any) {
                this.formErrors.abi = 'Invalid JSON: ' + e.message
            }
        }

        if (this.formErrors.name || this.formErrors.address || this.formErrors.abi) return

        this.$emit('pick', { address, name, abi })
        this.manual = { name: '', address: '', abi: '' }
    }

    @Watch('network')
    private onNetworkChange() {
        this.load()
    }

    private async load() {
        this.loading = true
        try {
            this.userContracts = await DB.contracts
                .filter(item => (item.network === this.network) || (item.network === undefined))
                .toArray()
        } catch (e) {
            console.error('Failed to load user contracts', e)
        }
        try {
            const results = await BuiltInContractsService.getBuiltInContracts(this.network)
            this.builtIns = results
                .filter(r => r.success && r.contract && Array.isArray(r.contract.abi) && (r.contract.abi as any[]).length > 0)
                .map(r => ({
                    name: r.contract!.name || 'Built-in',
                    address: r.contract!.address || '',
                    abi: r.contract!.abi as any[],
                    source: 'Built-in' as const
                }))
        } catch (e) {
            console.error('Failed to load built-in contracts', e)
        }
        this.loading = false
    }

    created() {
        this.load()
    }
}
</script>

<style lang="scss" scoped>
.contract-picker {
    width: 100%;
}
.picker-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 1rem;
}
.picker-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-color);
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
}
.picker-tab.is-active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
    font-weight: 600;
}
.picker-tab:hover:not(.is-active) {
    color: var(--text-color-strong);
}
.picker-body {
    padding-top: 0.25rem;
}
.picker-row {
    padding: 0.25rem 0;
}
.picker-row__name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.picker-row__badge {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 8px;
    font-weight: 600;
    letter-spacing: 0.02em;
}
.picker-row__badge.is-library {
    background: rgba(50, 115, 220, 0.12);
    color: #3273dc;
}
.picker-row__badge.is-builtin {
    background: rgba(120, 80, 200, 0.12);
    color: #7850c8;
}
.picker-row__addr {
    font-size: 0.75rem;
    color: var(--text-color-light);
}
.picker-actions {
    display: flex;
    justify-content: flex-end;
}

[data-theme="dark"] {
    .picker-row__badge.is-library {
        background: rgba(107, 182, 255, 0.18);
        color: #6bb6ff;
    }
    .picker-row__badge.is-builtin {
        background: rgba(180, 140, 240, 0.18);
        color: #b48cf0;
    }
}
</style>
