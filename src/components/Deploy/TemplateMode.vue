<template>
    <div class="template-mode">
        <div class="deploy-card picker-card">
            <div class="card-head">
                <h3 class="card-title">Pick a template</h3>
                <p class="card-sub">Pre-built, pre-compiled with solc 0.8.20 + evmVersion=paris.</p>
            </div>
            <div class="template-grid">
                <button
                    v-for="t in templates"
                    :key="t.id"
                    type="button"
                    class="template-card"
                    :class="{ active: selectedId === t.id }"
                    @click="onPick(t.id)"
                >
                    <div class="tcard-head">
                        <strong>{{ t.label }}</strong>
                        <span v-if="t.upgradeable" class="tag is-info is-light">UUPS</span>
                    </div>
                    <p class="tcard-desc">{{ t.description }}</p>
                </button>
            </div>
        </div>

        <div v-if="template" class="deploy-card form-card">
            <div class="card-head">
                <h3 class="card-title">
                    {{ template.upgradeable ? 'Initializer arguments' : 'Constructor arguments' }}
                </h3>
                <p class="card-sub" v-if="template.upgradeable">
                    Encoded into ERC1967Proxy's <code>_data</code> and delegate-called at proxy deploy.
                </p>
                <p class="card-sub" v-else>Encoded and appended to the creation bytecode.</p>
            </div>
            <ConstructorForm
                :inputs="entryInputs"
                @input="onValues"
                @valid="onValid"
            />

            <DeployStatus :stages="stages" />

            <div class="actions">
                <button
                    type="button"
                    class="button is-rounded is-primary"
                    :disabled="!canDeploy"
                    @click="deploy"
                >
                    <b-icon
                        v-if="deploying"
                        icon="loading"
                        custom-class="mdi-spin"
                        size="is-small"
                    />
                    <span>{{ deployButtonLabel }}</span>
                </button>
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
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import ConstructorForm from './ConstructorForm.vue'
import DeploySuccessCard from './DeploySuccessCard.vue'
import DeployStatus from './DeployStatus.vue'
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
    components: { ConstructorForm, DeploySuccessCard, DeployStatus },
})
export default class TemplateMode extends Vue {
    @Prop({ required: true }) network!: string
    @Prop({ default: () => [] }) existingCategories!: string[]

    templates: DeployTemplate[] = listTemplates()
    selectedId: string = this.templates[0]?.id || ''
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

    get deployButtonLabel(): string {
        if (!this.deploying) return 'Deploy'
        if (this.template?.upgradeable) {
            const active = this.stages.find((s) => s.state === 'active')
            return active ? active.label : 'Deploying…'
        }
        return 'Deploying…'
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
            if (inp.type === 'tuple') return v // already an array (from ParamInput tuple)
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
        // Step 1: deploy the implementation (no constructor args — templates use _disableInitializers()).
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

        // Step 2: encode initialize(...) and deploy the proxy.
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
</script>

<style lang="scss" scoped>
.template-mode {
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
.card-head {
    margin-bottom: 0.85rem;
}
.card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0 0 0.25rem 0;
}
.card-sub {
    font-size: 0.82rem;
    color: var(--text-color-light);
    margin: 0;
}
.template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.6rem;
}
.template-card {
    text-align: left;
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.7rem 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    color: var(--text-color);
}
.template-card:hover {
    border-color: var(--primary-color, #485fc7);
}
.template-card.active {
    border-color: var(--primary-color, #485fc7);
    background: var(--card-background);
    box-shadow: 0 0 0 1px var(--primary-color, #485fc7);
}
.tcard-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.25rem;
    color: var(--text-color-strong);
}
.tcard-desc {
    font-size: 0.78rem;
    color: var(--text-color-light);
    line-height: 1.4;
    margin: 0;
}
.actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;
}
</style>
