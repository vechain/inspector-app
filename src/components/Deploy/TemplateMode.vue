<template>
    <div class="mode-shell">
        <aside class="mode-sidebar">
            <div class="sidebar-head">
                <h3 class="sidebar-title">Templates</h3>
                <p class="sidebar-sub">Pre-built, pre-compiled<br />solc 0.8.20 · paris · optimizer 200</p>
            </div>
            <nav class="template-list">
                <button
                    v-for="f in families"
                    :key="f.id"
                    type="button"
                    class="template-row"
                    :class="{ active: selectedFamilyId === f.id }"
                    @click="onPickFamily(f.id)"
                >
                    <span class="row-head">
                        <span class="row-name">{{ f.label }}</span>
                        <span v-if="f.variants.length > 1" class="row-tag">
                            {{ f.variants.length }} variants
                        </span>
                    </span>
                    <span class="row-desc">{{ f.shortDescription }}</span>
                </button>
            </nav>
        </aside>

        <main class="mode-main">
            <div v-if="!family" class="empty-state">
                <b-icon icon="th-large" size="is-large" custom-class="has-text-grey-light" />
                <p class="empty-title">Pick a template to begin</p>
                <p class="empty-desc">Choose a contract on the left to configure and deploy.</p>
            </div>

            <div v-else class="content-pad">
                <!-- Long description + features -->
                <div class="deploy-card intro-card">
                    <div class="card-head">
                        <div class="card-head-text">
                            <h3 class="card-title">{{ family.label }}</h3>
                            <p class="long-desc">{{ family.longDescription }}</p>
                        </div>
                        <div class="card-head-side">
                            <span class="contract-name-tag" v-if="template">{{ template.contractName }}</span>
                            <button
                                v-if="template"
                                type="button"
                                class="open-source-btn"
                                title="Load this template's source into the editor — modify and recompile before deploying"
                                @click="onOpenInSource"
                            >
                                <b-icon icon="code" size="is-small" />
                                <span>Open in Source</span>
                            </button>
                        </div>
                    </div>
                    <div class="features" v-if="family.features.length">
                        <span class="features-label">What's included</span>
                        <ul class="features-list">
                            <li v-for="(f, i) in family.features" :key="i">{{ f }}</li>
                        </ul>
                    </div>
                </div>

                <!-- Configure -->
                <div class="deploy-card configure-card">
                    <div class="card-head">
                        <h3 class="card-title small">Configure</h3>
                    </div>

                    <div v-if="hasVariantChoice" class="config-row">
                        <span class="config-label">
                            Variant
                            <span class="config-hint">Pick which version of this contract to deploy.</span>
                        </span>
                        <div class="variant-toggle">
                            <button
                                v-for="v in family.variants"
                                :key="v.id"
                                type="button"
                                class="variant-btn"
                                :class="{ active: variantId === v.id }"
                                @click="onPickVariant(v.id)"
                            >
                                <span class="variant-label">{{ v.label }}</span>
                                <span class="variant-blurb">{{ v.blurb }}</span>
                            </button>
                        </div>
                    </div>
                    <div v-else class="config-row">
                        <span class="config-label">
                            Variant
                            <span class="config-hint">Only one variant available for this template.</span>
                        </span>
                        <div class="variant-fixed">
                            <span class="variant-label">{{ family.variants[0].label }}</span>
                            <span class="variant-blurb">{{ family.variants[0].blurb }}</span>
                        </div>
                    </div>

                    <div class="config-row args-row" v-if="template">
                        <span class="config-label">
                            {{ template.upgradeable ? 'Initializer arguments' : 'Constructor arguments' }}
                            <span class="config-hint" v-if="template.upgradeable">
                                Encoded into the proxy's <code>_data</code> and delegate-called once at deploy.
                            </span>
                            <span class="config-hint" v-else>
                                Encoded and appended to the creation bytecode.
                            </span>
                        </span>
                        <div v-if="defaultsBanner" class="defaults-banner">
                            <b-icon icon="info-circle" size="is-small" />
                            <span>{{ defaultsBanner }}</span>
                        </div>
                        <ConstructorForm
                            :key="`${selectedFamilyId}:${variantId}:${network}`"
                            :inputs="entryInputs"
                            :value="initialValues"
                            @input="onValues"
                            @valid="onValid"
                        />
                    </div>

                    <DeployStatus v-if="stages.length" :stages="stages" />
                </div>

                <DeploySuccessCard
                    v-if="result && template"
                    :address="result.address"
                    :impl-address="result.implAddress"
                    :txid="result.txid"
                    :abi="template.abi"
                    :network="network"
                    :suggested-name="template.contractName"
                    :existing-categories="existingCategories"
                    :source="contractSource"
                    @dismiss="result = null"
                />
            </div>
        </main>

        <DeployFooter
            class="mode-footer"
            :status="footerStatus"
            :status-label="footerLabel"
            :status-aux="footerAux"
            :primary-label="primaryLabel"
            :primary-icon="result ? 'check' : 'rocket'"
            :primary-disabled="!canDeploy || !!result"
            :primary-loading="deploying"
            :show-cancel="!!result || !!family"
            :cancel-label="result ? 'Reset' : 'Clear'"
            :cancel-disabled="deploying"
            @primary="deploy"
            @cancel="onReset"
        />
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import ConstructorForm from './ConstructorForm.vue'
import DeploySuccessCard from './DeploySuccessCard.vue'
import DeployStatus from './DeployStatus.vue'
import DeployFooter, { FooterStatus } from './DeployFooter.vue'
import {
    listFamilies,
    getFamily,
    getTemplate,
    getEntryFragment,
    familyHasChoice,
    DeployTemplate,
    TemplateFamily,
    VariantId,
    COMPILER_VERSION,
    GENESIS,
} from '@/contracts/templates'
import { Entities } from '@/database'
import {
    buildRegularClause,
    buildProxyClause,
    encodeFunctionCall,
    signAndWait,
    isUserRejection,
} from '@/services/deploy-service'

interface DeployResult {
    address: string
    implAddress: string | null
    txid: string
}

@Component({
    components: {
        ConstructorForm,
        DeploySuccessCard,
        DeployStatus,
        DeployFooter,
    },
})
export default class TemplateMode extends Vue {
    @Prop({ required: true }) network!: string
    @Prop({ default: () => [] }) existingCategories!: string[]

    families: TemplateFamily[] = listFamilies()
    selectedFamilyId: string = ''
    variantId: VariantId | '' = ''
    values: any[] = []
    valid = false
    deploying = false
    result: DeployResult | null = null
    stages: { label: string; state: 'pending' | 'active' | 'done' | 'error' }[] = []

    get family(): TemplateFamily | undefined {
        return getFamily(this.selectedFamilyId)
    }

    get hasVariantChoice(): boolean {
        return !!this.family && familyHasChoice(this.family)
    }

    get template(): DeployTemplate | undefined {
        if (!this.family) return undefined
        const v = this.family.variants.find((x) => x.id === this.variantId) || this.family.variants[0]
        return v ? getTemplate(v.templateId) : undefined
    }

    get entryInputs(): ABI.InputItem[] {
        if (!this.template) return []
        const frag = getEntryFragment(this.template)
        return (frag?.inputs as ABI.InputItem[]) || []
    }

    get canDeploy(): boolean {
        return !!this.template && this.valid && !this.deploying
    }

    get footerStatus(): FooterStatus {
        if (this.result) return 'success'
        if (this.deploying) return 'busy'
        if (!this.family) return 'idle'
        if (this.valid) return 'ready'
        return 'pending'
    }

    get footerLabel(): string {
        if (this.result) return 'Deployed'
        if (this.deploying) {
            const active = this.stages.find((s) => s.state === 'active')
            return active ? active.label : 'Deploying…'
        }
        if (!this.family) return 'Pick a template'
        if (!this.valid) return 'Fill required arguments'
        return `Ready · ${this.template?.contractName || this.family.label}`
    }

    get footerAux(): string {
        if (this.result) {
            return this.result.implAddress
                ? `proxy ${shortAddr(this.result.address)} · impl ${shortAddr(this.result.implAddress)}`
                : shortAddr(this.result.address)
        }
        return ''
    }

    get primaryLabel(): string {
        if (this.result) return 'Done'
        if (this.deploying) return 'Deploying…'
        return 'Deploy'
    }

    /**
     * Per-network pre-fill for the entry function's arguments. The
     * ConstructorForm merges these with the empty-shape tree so the user
     * can edit any pre-filled field as well as fill the gaps.
     */
    get initialValues(): any[] {
        if (!this.family || !this.family.defaults || !this.variantId) return []
        const out = this.family.defaults(this.network, this.variantId)
        return out || []
    }

    /**
     * If the family declares per-network defaults, surface a small banner
     * explaining where the pre-fills came from and which fields the user
     * still has to provide (or what to do on unsupported networks).
     */
    get defaultsBanner(): string {
        if (!this.family || !this.family.defaults) return ''
        const supported = this.family.defaultsNetworks || []
        const hasPrefill = supported.indexOf(this.network) !== -1
        const netLabel =
            this.network === GENESIS.MAIN
                ? 'mainnet'
                : this.network === GENESIS.TEST
                ? 'testnet'
                : 'this network'
        if (this.family.id === 'endorsers-reward-distributor') {
            if (hasPrefill) {
                return `Pre-filled VeBetterDAO contract addresses (XAllocationVoting, X2EarnRewardsPool, X2EarnApps, XAllocationPool) for ${netLabel}. Fill the remaining fields (upgrader, admin, vetDomainOwner, appId, startRound, rewardsPercentage).`
            }
            return `No known VeBetterDAO deployment on ${netLabel} — you'll need to supply every address yourself.`
        }
        return ''
    }

    get contractSource(): Entities.ContractSource | null {
        if (!this.template) return null
        return {
            files: this.template.files,
            entry: this.template.file,
            contractName: this.template.contractName,
            compiler: {
                version: COMPILER_VERSION,
                evmVersion: 'paris',
                optimizer: { enabled: true, runs: 200 },
            },
        }
    }

    onOpenInSource() {
        if (!this.template) return
        // Emit a payload the parent (DeployContract) can hand to the Source
        // tab. We send copies, not references, so future edits in the source
        // editor don't mutate the template artifact.
        this.$emit('open-in-source', {
            files: JSON.parse(JSON.stringify(this.template.files)),
            entry: this.template.file,
            contractName: this.template.contractName,
        })
    }

    onPickFamily(id: string) {
        if (this.deploying) return
        this.selectedFamilyId = id
        const f = getFamily(id)
        // Default variant: prefer 'standard' if present, otherwise the first.
        const def = f?.variants.find((v) => v.id === 'standard') || f?.variants[0]
        this.variantId = def ? def.id : ''
        this.values = []
        this.valid = false
        this.result = null
        this.stages = []
    }

    onPickVariant(id: VariantId) {
        if (this.deploying) return
        if (this.variantId === id) return
        this.variantId = id
        // Args differ between variants (constructor vs initialize), so reset.
        this.values = []
        this.valid = false
        this.result = null
        this.stages = []
    }

    onValues(values: any[]) {
        this.values = values
    }

    onValid(v: boolean) {
        this.valid = v
    }

    onReset() {
        if (this.deploying) return
        this.result = null
        this.stages = []
        if (!this.family) return
        this.onPickFamily(this.selectedFamilyId)
    }

    async deploy() {
        if (!this.template) return
        this.deploying = true
        this.result = null
        try {
            const decoded = this.decodeValues(this.values, this.entryInputs)
            if (this.template.upgradeable) {
                await this.deployUpgradeable(this.template, decoded)
            } else {
                await this.deployRegular(this.template, decoded)
            }
        } catch (err: any) {
            this.markCurrentStageError()
            if (!isUserRejection(err)) {
                ;(this as any).$buefy.toast.open({
                    type: 'is-danger',
                    message: `${err.name || 'Error'}: ${err.message || err}`,
                    position: 'is-top',
                    duration: 4000,
                })
            }
        } finally {
            this.deploying = false
        }
    }

    private decodeValues(values: any[], inputs: ABI.InputItem[]): any[] {
        return values.map((v, i) => {
            const inp = inputs[i]
            if (inp.type === 'tuple') return v
            if (inp.type.endsWith(']')) return JSON.parse(v)
            return v
        })
    }

    private toDeployArgs(inputs: ABI.InputItem[]): any[] {
        return inputs.map((i) => ({
            name: i.name,
            type: i.type,
            components: i.components
                ? this.toDeployArgs(i.components as ABI.InputItem[])
                : undefined,
        }))
    }

    private async deployRegular(t: DeployTemplate, values: any[]) {
        this.stages = [{ label: 'Deploying contract', state: 'active' }]
        const inputs = (getEntryFragment(t)?.inputs as ABI.InputItem[]) || []
        const clause = buildRegularClause(
            t.bytecode,
            this.toDeployArgs(inputs),
            values,
            '0x0',
            `Deploy ${t.contractName}`,
        )
        const out = await signAndWait(
            (this as any).$connex,
            [clause],
            `Inspector deploy ${t.contractName}`,
        )
        this.stages[0].state = 'done'
        this.result = {
            address: out.contractAddresses[0],
            implAddress: null,
            txid: out.txid,
        }
    }

    private async deployUpgradeable(t: DeployTemplate, values: any[]) {
        this.stages = [
            { label: '1/2 Deploying implementation', state: 'active' },
            { label: '2/2 Deploying proxy', state: 'pending' },
        ]
        const implClause = buildRegularClause(
            t.bytecode,
            [],
            [],
            '0x0',
            `Deploy ${t.contractName} implementation`,
        )
        const implOut = await signAndWait(
            (this as any).$connex,
            [implClause],
            `Inspector deploy ${t.contractName} impl`,
        )
        const implAddress = implOut.contractAddresses[0]
        this.stages[0].state = 'done'
        this.stages[1].state = 'active'

        const initFrag = getEntryFragment(t)
        const initInputs = (initFrag?.inputs as ABI.InputItem[]) || []
        const initData = encodeFunctionCall(
            t.entryFn,
            this.toDeployArgs(initInputs),
            values,
        )
        const proxyClause = buildProxyClause(
            implAddress,
            initData,
            '0x0',
            `Deploy ERC1967Proxy(${t.contractName})`,
        )
        const proxyOut = await signAndWait(
            (this as any).$connex,
            [proxyClause],
            `Inspector deploy ${t.contractName} proxy`,
        )
        this.stages[1].state = 'done'
        this.result = {
            address: proxyOut.contractAddresses[0],
            implAddress,
            txid: proxyOut.txid,
        }
    }

    private markCurrentStageError() {
        const idx = this.stages.findIndex((s) => s.state === 'active')
        if (idx >= 0) this.stages[idx].state = 'error'
    }
}

function shortAddr(a: string): string {
    if (!a) return ''
    return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}
</script>

<style lang="scss" scoped>
.mode-shell {
    flex: 1;
    display: grid;
    grid-template-columns: 320px 1fr;
    grid-template-rows: 1fr auto;
    min-height: 0;
    background: var(--body-background-alt);
}

.mode-sidebar {
    grid-column: 1;
    grid-row: 1;
    background: var(--card-background);
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}
.sidebar-head {
    padding: 0.9rem 1rem 0.4rem 1rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.sidebar-title {
    margin: 0 0 0.15rem 0;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-color-light);
}
.sidebar-sub {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.4;
    color: var(--text-color-light);
}
.template-list {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0;
}
.template-row {
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.6rem 1rem;
    cursor: pointer;
    color: var(--text-color);
    transition: background 0.12s;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-left: 3px solid transparent;
}
.template-row:hover {
    background: var(--body-background-alt);
}
.template-row.active {
    background: var(--body-background-alt);
    border-left-color: var(--primary-color, #485fc7);
}
.row-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.4rem;
}
.row-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-color-strong);
    line-height: 1.25;
}
.row-tag {
    font-size: 0.6rem;
    font-weight: 700;
    background: rgba(72, 95, 199, 0.12);
    color: var(--primary-color, #485fc7);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.04em;
    flex-shrink: 0;
}
.row-desc {
    font-size: 0.74rem;
    color: var(--text-color-light);
    line-height: 1.4;
}

.mode-main {
    grid-column: 2;
    grid-row: 1;
    overflow-y: auto;
    min-width: 0;
}

.mode-footer {
    grid-column: 1 / -1;
    grid-row: 2;
}

.empty-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    text-align: center;
}
.empty-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0.5rem 0 0;
}
.empty-desc {
    color: var(--text-color-light);
    max-width: 360px;
    margin: 0;
}

.content-pad {
    padding: 1.25rem;
    max-width: 860px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.deploy-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
}

.intro-card .card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.85rem;
}
.card-head-text {
    flex: 1;
    min-width: 0;
}
.card-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0 0 0.4rem 0;
}
.card-title.small {
    font-size: 0.95rem;
    margin-bottom: 0;
}
.long-desc {
    font-size: 0.88rem;
    color: var(--text-color);
    line-height: 1.55;
    margin: 0;
}
.contract-name-tag {
    font-size: 0.72rem;
    font-family: monospace;
    font-weight: 600;
    color: var(--text-color-light);
    background: var(--body-background-alt);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    flex-shrink: 0;
}
.card-head-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
    flex-shrink: 0;
}
.open-source-btn {
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    color: var(--text-color);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.open-source-btn:hover {
    border-color: var(--primary-color, #485fc7);
    color: var(--primary-color, #485fc7);
}

.features {
    margin-top: 1rem;
    padding-top: 0.9rem;
    border-top: 1px dashed var(--border-color);
}
.features-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-color-light);
    margin-bottom: 0.4rem;
}
.features-list {
    margin: 0;
    padding-left: 1.1rem;
    list-style: disc;
    color: var(--text-color);
    font-size: 0.84rem;
    line-height: 1.55;
}
.features-list li {
    margin-bottom: 0.15rem;
}

.configure-card .card-head {
    margin-bottom: 1rem;
}
.config-row {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.85rem 0;
    border-top: 1px dashed var(--border-color);
}
.config-row:first-of-type {
    border-top: 0;
    padding-top: 0.5rem;
}
.config-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color-strong);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.config-hint {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-color-light);
    line-height: 1.4;
}

.variant-toggle {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.5rem;
}
.variant-btn {
    text-align: left;
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.65rem 0.85rem;
    cursor: pointer;
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.variant-btn:hover {
    border-color: var(--primary-color, #485fc7);
}
.variant-btn.active {
    border-color: var(--primary-color, #485fc7);
    background: var(--card-background);
    box-shadow: 0 0 0 1px var(--primary-color, #485fc7);
}
.variant-fixed {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.65rem 0.85rem;
}
.variant-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color-strong);
}
.variant-blurb {
    font-size: 0.74rem;
    color: var(--text-color-light);
    line-height: 1.4;
}

.args-row {
    padding-top: 1rem;
}

.defaults-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    padding: 0.55rem 0.75rem;
    background: rgba(72, 95, 199, 0.08);
    border: 1px solid rgba(72, 95, 199, 0.25);
    color: var(--text-color);
    border-radius: 6px;
    font-size: 0.8rem;
    line-height: 1.45;
    margin-bottom: 0.6rem;
}
.defaults-banner ::v-deep .icon {
    color: var(--primary-color, #485fc7);
    flex-shrink: 0;
}
[data-theme='dark'] .defaults-banner {
    background: rgba(120, 140, 240, 0.12);
    border-color: rgba(120, 140, 240, 0.3);
}

@media (max-width: 900px) {
    .mode-shell {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
    }
    .mode-sidebar {
        grid-column: 1;
        grid-row: 1;
        max-height: 35vh;
        border-right: 0;
        border-bottom: 1px solid var(--border-color);
    }
    .mode-main {
        grid-column: 1;
        grid-row: 2;
    }
    .mode-footer {
        grid-row: 3;
    }
}
</style>
