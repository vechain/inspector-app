<template>
    <div class="mode-shell">
        <aside class="mode-sidebar">
            <div class="sidebar-head">
                <h3 class="sidebar-title">Templates</h3>
                <p class="sidebar-sub">Pre-built, pre-compiled<br />solc 0.8.20 · paris · optimizer 200</p>
            </div>
            <nav class="template-list">
                <button
                    v-for="t in templates"
                    :key="t.id"
                    type="button"
                    class="template-row"
                    :class="{ active: selectedId === t.id }"
                    @click="onPick(t.id)"
                >
                    <span class="row-head">
                        <span class="row-name">{{ t.label }}</span>
                        <span v-if="t.upgradeable" class="row-tag">UUPS</span>
                    </span>
                    <span class="row-desc">{{ t.description }}</span>
                </button>
            </nav>
        </aside>

        <main class="mode-main">
            <div v-if="!template" class="empty-state">
                <b-icon icon="th-large" size="is-large" custom-class="has-text-grey-light" />
                <p class="empty-title">Pick a template to begin</p>
                <p class="empty-desc">Choose a contract on the left to configure its constructor or initializer arguments.</p>
            </div>

            <div v-else class="content-pad">
                <div class="deploy-card">
                    <div class="card-head">
                        <div class="card-head-text">
                            <h3 class="card-title">{{ template.label }}</h3>
                            <p class="card-sub" v-if="template.upgradeable">
                                Upgradeable (UUPS) — deploys an implementation then an
                                <code>ERC1967Proxy</code> with the encoded
                                <code>{{ template.entryFn }}(…)</code> call.
                            </p>
                            <p class="card-sub" v-else>
                                Constructor arguments are encoded and appended to the creation bytecode.
                            </p>
                        </div>
                        <span class="contract-name-tag">{{ template.contractName }}</span>
                    </div>

                    <ConstructorForm
                        :inputs="entryInputs"
                        @input="onValues"
                        @valid="onValid"
                    />

                    <DeployStatus v-if="stages.length" :stages="stages" />
                </div>

                <DeploySuccessCard
                    v-if="result"
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
            :show-cancel="!!result || !!template"
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
    listTemplates,
    getTemplate,
    getEntryFragment,
    DeployTemplate,
    COMPILER_VERSION,
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

    templates: DeployTemplate[] = listTemplates()
    selectedId: string = ''
    values: any[] = []
    valid = false
    deploying = false
    result: DeployResult | null = null
    stages: { label: string; state: 'pending' | 'active' | 'done' | 'error' }[] = []

    get template(): DeployTemplate | undefined {
        return getTemplate(this.selectedId)
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
        if (!this.template) return 'idle'
        if (this.valid) return 'ready'
        return 'pending'
    }

    get footerLabel(): string {
        if (this.result) return 'Deployed'
        if (this.deploying) {
            const active = this.stages.find((s) => s.state === 'active')
            return active ? active.label : 'Deploying…'
        }
        if (!this.template) return 'Pick a template'
        if (!this.valid) return 'Fill required arguments'
        return `Ready · ${this.template.contractName}`
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
        return this.template?.upgradeable ? 'Deploy proxy' : 'Deploy'
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

    onPick(id: string) {
        if (this.deploying) return
        this.selectedId = id
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
        if (!this.template) return
        // Reset args by re-picking the same template (clears the form).
        this.onPick(this.selectedId)
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
    padding: 0.55rem 1rem;
    cursor: pointer;
    color: var(--text-color);
    transition: background 0.12s;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
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
    font-size: 0.85rem;
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
    line-height: 1.35;
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
    max-width: 820px;
    margin: 0 auto;
}

.deploy-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
}
.card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
}
.card-head-text {
    flex: 1;
    min-width: 0;
}
.card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0 0 0.2rem 0;
}
.card-sub {
    font-size: 0.82rem;
    color: var(--text-color-light);
    margin: 0;
    line-height: 1.45;
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
