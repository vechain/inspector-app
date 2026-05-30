<template>
    <div class="deploy-success">
        <div class="header">
            <span class="title-line">
                <b-icon icon="check-circle" type="is-success" size="is-small" />
                <strong>Deployment confirmed</strong>
            </span>
        </div>

        <div class="row">
            <span class="row-label">Address</span>
            <code class="addr">{{ address }}</code>
            <button class="copy-btn" @click="copy(address)" title="Copy">
                <b-icon icon="copy" size="is-small" />
            </button>
        </div>

        <div v-if="implAddress" class="row">
            <span class="row-label">Implementation</span>
            <code class="addr">{{ implAddress }}</code>
            <button class="copy-btn" @click="copy(implAddress)" title="Copy">
                <b-icon icon="copy" size="is-small" />
            </button>
        </div>

        <div class="row">
            <span class="row-label">Tx</span>
            <a :href="txExplorerUrl" target="_blank" rel="noopener" class="tx-link">
                <code>{{ txid }}</code>
                <b-icon icon="external-link-alt" size="is-small" />
            </a>
        </div>

        <div v-if="!saved" class="save-form">
            <b-field grouped>
                <b-field label="Name" expanded>
                    <b-input v-model="form.name" placeholder="e.g. MyToken" />
                </b-field>
                <b-field label="Category" expanded>
                    <b-autocomplete
                        v-model="form.category"
                        :data="filteredCategories"
                        placeholder="optional"
                        open-on-focus
                    />
                </b-field>
            </b-field>
            <div class="actions">
                <button class="button is-small" @click="$emit('dismiss')">Skip</button>
                <button class="button is-small is-primary" @click="save">Add to contracts</button>
            </div>
        </div>
        <div v-else class="saved-state">
            <b-icon icon="check" type="is-success" size="is-small" />
            <span>Saved to contracts.</span>
            <router-link :to="`/contracts`" class="ml">View list</router-link>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Entities } from '@/database'
import { ImportService } from '@/services/import-service'

function plain<T>(obj: T): T {
    // JSON round-trip drops keys whose value is undefined and strips reactive
    // wrappers — exactly what Dexie wants before it structured-clones into IDB.
    return JSON.parse(JSON.stringify(obj)) as T
}

@Component
export default class DeploySuccessCard extends Vue {
    @Prop({ required: true }) address!: string
    @Prop({ required: true }) txid!: string
    @Prop({ default: null }) implAddress!: string | null
    @Prop({ default: () => [] }) abi!: any[]
    @Prop({ required: true }) network!: string
    @Prop({ default: '' }) suggestedName!: string
    @Prop({ default: () => [] }) existingCategories!: string[]
    @Prop({ default: null }) source!: Entities.ContractSource | null

    form: { name: string; category: string } = {
        name: this.suggestedName || '',
        category: '',
    }
    saved = false

    get txExplorerUrl(): string {
        return `${(this as any).$explorerTx}${this.txid}`
    }

    get filteredCategories(): string[] {
        const all = this.existingCategories || []
        const q = (this.form.category || '').toLowerCase()
        if (!q) return all
        return all.filter((c) => c.toLowerCase().includes(q))
    }

    async copy(value: string) {
        try {
            await navigator.clipboard.writeText(value)
            ;(this as any).$buefy.toast.open({
                message: 'Copied',
                type: 'is-success',
                position: 'is-top',
                duration: 1500,
            })
        } catch {
            /* ignore */
        }
    }

    async save() {
        // Strip Vue's reactivity (and any other non-cloneable wrappers) by going
        // through JSON. Dexie's hooks call JSON.stringify on the object and
        // structured-clone it into IndexedDB; reactive proxies sometimes carry
        // hidden Dep references that round-trip badly.
        const contract: Entities.Contract = plain({
            address: this.address,
            name: this.form.name || `Contract ${this.address.slice(0, 8)}`,
            abi: this.abi || [],
            network: this.network,
            category: this.form.category || undefined,
            source: this.source || undefined,
        })
        try {
            await ImportService.importContract(contract, this.network)
            this.saved = true
            this.$emit('saved', contract)
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('DeploySuccessCard.save failed', err, { contract })
            ;(this as any).$buefy.toast.open({
                message: `Failed to save: ${err.message || err}`,
                type: 'is-danger',
                position: 'is-top',
                duration: 4000,
            })
        }
    }
}
</script>

<style lang="scss" scoped>
.deploy-success {
    border: 1px solid var(--border-color);
    border-left: 3px solid #48c78e;
    border-radius: 6px;
    padding: 0.9rem 1rem;
    background: var(--body-background-alt);
    margin-top: 1rem;
}
.header {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
}
.title-line {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.95rem;
    color: var(--text-color-strong);
}
.title-line strong {
    color: inherit;
}
.row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.35rem 0;
    font-size: 0.85rem;
}
.row-label {
    color: var(--text-color-light);
    width: 7rem;
    flex-shrink: 0;
}
.addr,
.tx-link code {
    font-family: monospace;
    word-break: break-all;
    color: var(--text-color-strong);
}
.tx-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
}
.copy-btn {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
    color: var(--text-color-light);
}
.copy-btn:hover {
    color: var(--text-color-strong);
}
.save-form {
    margin-top: 0.75rem;
    border-top: 1px dashed var(--border-color);
    padding-top: 0.75rem;
}
.actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
    margin-top: 0.25rem;
}
.saved-state {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
}
.ml {
    margin-left: 0.25rem;
}
</style>
