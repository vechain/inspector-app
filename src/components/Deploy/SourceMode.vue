<template>
    <div class="source-mode">
        <div class="layout">
            <div class="editor-pane">
                <SolidityEditor
                    :files="files"
                    :active-file="activeFile"
                    @change-file="onFileChange"
                    @switch-file="onSwitchFile"
                    @add-file="onAddFile"
                    @close-file="onCloseFile"
                />
                <div class="editor-meta">
                    <span class="solc-version">solc {{ solcVersionShort }} · paris · optimizer 200</span>
                    <span class="entry-hint" v-if="files[activeFile] !== undefined">
                        entry: <code>{{ entryFile }}</code>
                    </span>
                </div>
            </div>

            <div class="side-pane">
                <div class="actions">
                    <button
                        type="button"
                        class="button is-small"
                        :disabled="compiling"
                        @click="onCompile"
                    >
                        <b-icon
                            v-if="compiling"
                            icon="loading"
                            custom-class="mdi-spin"
                            size="is-small"
                        />
                        <span>{{ compiling ? 'Compiling…' : 'Compile' }}</span>
                    </button>
                </div>

                <CompileStatus
                    :diagnostics="compileErrors"
                    :warning-list="compileWarnings"
                    :result="compileResult"
                />

                <div v-if="compileResult" class="post-compile">
                    <b-field
                        v-if="compiledContracts.length > 1"
                        label="Contract"
                    >
                        <b-select v-model="selectedContractKey" expanded>
                            <option
                                v-for="c in compiledContracts"
                                :key="`${c.file}:${c.name}`"
                                :value="`${c.file}:${c.name}`"
                            >
                                {{ c.name }} <small>({{ c.file }})</small>
                            </option>
                        </b-select>
                    </b-field>

                    <b-field>
                        <b-checkbox v-model="useProxy">
                            Deploy as upgradeable (ERC1967Proxy + initialize)
                        </b-checkbox>
                    </b-field>

                    <b-field v-if="useProxy" label="Initializer function">
                        <b-select v-model="initFnName" expanded>
                            <option
                                v-for="fn in initializerCandidates"
                                :key="fn.name"
                                :value="fn.name"
                            >
                                {{ fn.name }}({{ formatInputs(fn.inputs) }})
                            </option>
                        </b-select>
                    </b-field>

                    <ConstructorForm
                        :inputs="entryInputs"
                        @input="onValues"
                        @valid="onValid"
                    />

                    <DeployStatus :stages="stages" />

                    <div class="actions deploy-actions">
                        <button
                            type="button"
                            class="button is-primary is-small"
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
                </div>

                <DeploySuccessCard
                    v-if="result"
                    :address="result.address"
                    :impl-address="result.implAddress"
                    :txid="result.txid"
                    :abi="compileResult ? compileResult.abi : []"
                    :network="network"
                    :suggested-name="result.contractName"
                    :existing-categories="existingCategories"
                    :source="contractSource"
                    @dismiss="result = null"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import SolidityEditor from './SolidityEditor.vue'
import CompileStatus from './CompileStatus.vue'
import ConstructorForm from './ConstructorForm.vue'
import DeployStatus from './DeployStatus.vue'
import DeploySuccessCard from './DeploySuccessCard.vue'
import {
    compile,
    listCompiledContracts,
    CompileError,
    CompileResult,
    SOLC_VERSION,
    SOLC_VERSION_SHORT,
    EVM_VERSION,
    OPTIMIZER,
} from '@/services/solc-service'
import {
    buildRegularClause,
    buildProxyClause,
    encodeFunctionCall,
    signAndWait,
    isUserRejection,
    containsPush0,
} from '@/services/deploy-service'
import { Entities } from '@/database'

const DEFAULT_FILE = 'Contract.sol'
const STARTER_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// OpenZeppelin (full sources) — both contracts and contracts-upgradeable @5.0.2
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// VeChain interface stubs (synthesized from artifacts):
//   import {B3TR} from "@vechain/vebetterdao-contracts/contracts/B3TR.sol";
//   import {Stargate} from "@vechain/stargate-contracts-artifacts/contracts/Stargate.sol";

contract MyContract is Ownable {
    uint256 public value;

    constructor(address initialOwner, uint256 initialValue) Ownable(initialOwner) {
        value = initialValue;
    }

    function setValue(uint256 v) external onlyOwner {
        value = v;
    }
}
`

interface DeployResult {
    address: string
    implAddress: string | null
    txid: string
    contractName: string
}

@Component({
    components: {
        SolidityEditor,
        CompileStatus,
        ConstructorForm,
        DeployStatus,
        DeploySuccessCard,
    },
})
export default class SourceMode extends Vue {
    @Prop({ required: true }) network!: string
    @Prop({ default: () => [] }) existingCategories!: string[]

    files: Record<string, string> = { [DEFAULT_FILE]: STARTER_SOURCE }
    activeFile: string = DEFAULT_FILE
    /** Entry file = the file that the user wants to deploy a contract from. */
    entryFile: string = DEFAULT_FILE

    compiling = false
    compileErrors: any[] = []
    compileWarnings: any[] = []
    compileResult: CompileResult | null = null
    compiledContracts: { file: string; name: string }[] = []
    selectedContractKey: string = ''

    useProxy = false
    initFnName: string = 'initialize'

    values: any[] = []
    valid = false
    deploying = false
    stages: { label: string; state: 'pending' | 'active' | 'done' | 'error' }[] = []
    result: DeployResult | null = null

    readonly solcVersionShort = SOLC_VERSION_SHORT

    @Watch('selectedContractKey')
    async onSelectedContractChange() {
        if (!this.selectedContractKey) return
        const [file, name] = this.selectedContractKey.split(':')
        this.entryFile = file
        // Re-emit compile result for the chosen contract so ABI / bytecode match.
        await this.recompileFor(name)
    }

    get initializerCandidates(): any[] {
        if (!this.compileResult) return []
        return this.compileResult.abi.filter(
            (i: any) =>
                i.type === 'function' &&
                i.stateMutability !== 'view' &&
                i.stateMutability !== 'pure' &&
                (i.name.startsWith('initialize') || i.name === 'init'),
        )
    }

    get entryInputs(): ABI.InputItem[] {
        if (!this.compileResult) return []
        if (this.useProxy) {
            const fn = this.compileResult.abi.find(
                (i: any) => i.type === 'function' && i.name === this.initFnName,
            )
            return (fn?.inputs as ABI.InputItem[]) || []
        }
        const ctor = this.compileResult.abi.find(
            (i: any) => i.type === 'constructor',
        )
        return (ctor?.inputs as ABI.InputItem[]) || []
    }

    get canDeploy(): boolean {
        return !!this.compileResult && this.valid && !this.deploying
    }

    get deployButtonLabel(): string {
        if (!this.deploying) return 'Deploy'
        const active = this.stages.find((s) => s.state === 'active')
        return active ? active.label : 'Deploying…'
    }

    get contractSource(): Entities.ContractSource | null {
        if (!this.compileResult) return null
        return {
            files: { ...this.files },
            entry: this.entryFile,
            contractName: this.compileResult.contractName,
            compiler: {
                version: SOLC_VERSION,
                evmVersion: EVM_VERSION,
                optimizer: OPTIMIZER,
            },
        }
    }

    onFileChange(name: string, text: string) {
        this.$set(this.files, name, text)
    }

    onSwitchFile(name: string) {
        this.activeFile = name
    }

    onAddFile(name: string) {
        this.$set(this.files, name, '')
        this.activeFile = name
    }

    onCloseFile(name: string) {
        if (Object.keys(this.files).length <= 1) return
        this.$delete(this.files, name)
        if (this.activeFile === name) {
            this.activeFile = Object.keys(this.files)[0]
        }
        if (this.entryFile === name) {
            this.entryFile = Object.keys(this.files)[0]
        }
    }

    onValues(values: any[]) {
        this.values = values
    }

    onValid(v: boolean) {
        this.valid = v
    }

    formatInputs(inputs: any[]): string {
        return (inputs || []).map((i) => `${i.type}${i.name ? ' ' + i.name : ''}`).join(', ')
    }

    async onCompile() {
        this.compiling = true
        this.compileErrors = []
        this.compileWarnings = []
        this.compileResult = null
        this.compiledContracts = []
        this.result = null
        this.stages = []
        this.entryFile = this.activeFile

        try {
            this.compiledContracts = await listCompiledContracts({
                files: this.files,
                entry: this.entryFile,
            })
            if (!this.compiledContracts.length) {
                throw new CompileError([
                    { severity: 'error', message: 'No contracts found.' },
                ])
            }
            const inEntry = this.compiledContracts.filter(
                (c) => c.file === this.entryFile,
            )
            const pick = inEntry[0] || this.compiledContracts[0]
            this.selectedContractKey = `${pick.file}:${pick.name}`
            this.entryFile = pick.file
            const res = await compile({
                files: this.files,
                entry: this.entryFile,
                contractName: pick.name,
            })
            this.compileResult = res
            this.compileWarnings = res.warnings
            // Default the initialize fn to the first matching candidate, if any.
            const init = this.initializerCandidates[0]
            if (init) this.initFnName = init.name
        } catch (err: any) {
            if (err instanceof CompileError) {
                this.compileErrors = err.errors
            } else {
                this.compileErrors = [
                    { severity: 'error', message: err.message || String(err) },
                ]
            }
        } finally {
            this.compiling = false
        }
    }

    private async recompileFor(name: string) {
        try {
            const res = await compile({
                files: this.files,
                entry: this.entryFile,
                contractName: name,
            })
            this.compileResult = res
            this.compileWarnings = res.warnings
            this.compileErrors = []
        } catch (err: any) {
            this.compileResult = null
            if (err instanceof CompileError) this.compileErrors = err.errors
            else this.compileErrors = [{ severity: 'error', message: err.message }]
        }
    }

    async deploy() {
        if (!this.compileResult) return
        const bytecode = this.compileResult.bytecode
        if (containsPush0(bytecode)) {
            const ok = await this.confirm(
                'PUSH0 opcode detected',
                'Compiled bytecode contains PUSH0 (0x5f). VeChain may reject it. Deploy anyway?',
            )
            if (!ok) return
        }

        this.deploying = true
        this.result = null
        try {
            const decoded = this.decodeValues(this.values, this.entryInputs)
            if (this.useProxy) {
                await this.deployUpgradeable(decoded)
            } else {
                await this.deployRegular(decoded)
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

    private async deployRegular(values: any[]) {
        const res = this.compileResult!
        this.stages = [{ label: 'Deploying contract', state: 'active' }]
        const ctor = res.abi.find((i: any) => i.type === 'constructor')
        const inputs = (ctor?.inputs as ABI.InputItem[]) || []
        const clause = buildRegularClause(
            res.bytecode,
            this.toDeployArgs(inputs),
            values,
            '0x0',
            `Deploy ${res.contractName}`,
        )
        const out = await signAndWait(
            (this as any).$connex,
            [clause],
            `Inspector deploy ${res.contractName}`,
        )
        this.stages[0].state = 'done'
        this.result = {
            address: out.contractAddresses[0],
            implAddress: null,
            txid: out.txid,
            contractName: res.contractName,
        }
    }

    private async deployUpgradeable(values: any[]) {
        const res = this.compileResult!
        this.stages = [
            { label: '1/2 Deploying implementation', state: 'active' },
            { label: '2/2 Deploying proxy', state: 'pending' },
        ]
        const implClause = buildRegularClause(
            res.bytecode,
            [],
            [],
            '0x0',
            `Deploy ${res.contractName} implementation`,
        )
        const implOut = await signAndWait(
            (this as any).$connex,
            [implClause],
            `Inspector deploy ${res.contractName} impl`,
        )
        const implAddress = implOut.contractAddresses[0]
        this.stages[0].state = 'done'
        this.stages[1].state = 'active'

        const initFn = res.abi.find(
            (i: any) => i.type === 'function' && i.name === this.initFnName,
        )
        if (!initFn) {
            throw new Error(`Initializer ${this.initFnName} not found in ABI`)
        }
        const initInputs = (initFn.inputs as ABI.InputItem[]) || []
        const initData = encodeFunctionCall(
            this.initFnName,
            this.toDeployArgs(initInputs),
            values,
        )
        const proxyClause = buildProxyClause(
            implAddress,
            initData,
            '0x0',
            `Deploy ERC1967Proxy(${res.contractName})`,
        )
        const proxyOut = await signAndWait(
            (this as any).$connex,
            [proxyClause],
            `Inspector deploy ${res.contractName} proxy`,
        )
        this.stages[1].state = 'done'
        this.result = {
            address: proxyOut.contractAddresses[0],
            implAddress,
            txid: proxyOut.txid,
            contractName: res.contractName,
        }
    }

    private markCurrentStageError() {
        const idx = this.stages.findIndex((s) => s.state === 'active')
        if (idx >= 0) this.stages[idx].state = 'error'
    }

    private confirm(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            ;(this as any).$buefy.dialog.confirm({
                title,
                message,
                confirmText: 'Deploy anyway',
                cancelText: 'Cancel',
                type: 'is-warning',
                hasIcon: true,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            })
        })
    }
}
</script>

<style lang="scss" scoped>
.source-mode {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
}
@media (max-width: 900px) {
    .layout {
        grid-template-columns: 1fr;
    }
}
.editor-pane,
.side-pane {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.1rem;
}
.editor-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--text-color-light);
    margin-top: 0.45rem;
}
.solc-version {
    font-family: monospace;
}
.actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.6rem;
}
.deploy-actions {
    margin-top: 0.75rem;
}
.post-compile {
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px dashed var(--border-color);
}
</style>
