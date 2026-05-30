<template>
    <div class="mode-shell">
        <aside class="mode-sidebar">
            <div class="sidebar-head">
                <span class="sidebar-eyebrow">Project</span>
                <SourceProjectsMenu
                    :loaded-project-id="loadedProjectId"
                    :dirty="dirty"
                    :workspace-has-content="workspaceHasContent"
                    @load="onLoadProject"
                    @save="onSaveProject"
                    @save-as="onSaveAsProject"
                    @new="onNewProject"
                    @deleted="onProjectDeleted"
                    @renamed="onProjectRenamed"
                />
            </div>

            <div class="sidebar-head sidebar-head--files">
                <div class="sidebar-head-row">
                    <h3 class="sidebar-title">Files</h3>
                    <button
                        type="button"
                        class="icon-btn"
                        title="Add file"
                        @click="onAddFile"
                    >
                        <b-icon icon="plus" size="is-small" />
                    </button>
                </div>
                <p class="sidebar-sub">
                    solc {{ solcVersionShort }} · paris · optimizer 200
                </p>
            </div>

            <nav class="file-list">
                <button
                    v-for="(_, name) in files"
                    :key="name"
                    type="button"
                    class="file-row"
                    :class="{ active: activeFile === name, entry: name === entryFile }"
                    @click="activeFile = name"
                >
                    <span class="file-marker" :title="name === entryFile ? 'Entry file' : ''">
                        <b-icon
                            :icon="name === entryFile ? 'star' : 'file-alt'"
                            size="is-small"
                        />
                    </span>
                    <span class="file-name">{{ name }}</span>
                    <span
                        v-if="canRemove(name)"
                        class="file-close"
                        @click.stop="onCloseFile(name)"
                        title="Remove file"
                    >×</span>
                </button>
            </nav>

            <div class="sidebar-foot">
                <button
                    type="button"
                    class="entry-btn"
                    :disabled="entryFile === activeFile"
                    @click="entryFile = activeFile"
                    title="Mark the active file as the entry (compile target)"
                >
                    <b-icon icon="star" size="is-small" />
                    <span>Set as entry</span>
                </button>
                <div class="hint">
                    <b-icon icon="info-circle" size="is-small" />
                    <span>
                        OZ &amp; VeChain packages resolve via virtual FS — see the starter file.
                    </span>
                </div>
            </div>
        </aside>

        <main class="mode-main">
            <div class="editor-wrap">
                <SolidityEditor
                    :files="files"
                    :active-file="activeFile"
                    @change-file="onFileChange"
                />
            </div>

            <div class="diagnostics-pane">
                <CompileStatus
                    :diagnostics="compileErrors"
                    :warning-list="compileWarnings"
                    :result="compileResult"
                />

                <div v-if="compileResult" class="post-compile-card">
                    <div class="card-head">
                        <h3 class="card-title">{{ compileResult.contractName }}</h3>
                        <span class="card-meta">{{ bytecodeSize }} bytes</span>
                    </div>

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
                                {{ c.name }} ({{ c.file }})
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

                    <div class="args-section">
                        <span class="args-label">
                            {{ useProxy ? 'Initializer arguments' : 'Constructor arguments' }}
                        </span>
                        <ConstructorForm
                            :inputs="entryInputs"
                            @input="onValues"
                            @valid="onValid"
                        />
                    </div>

                    <DeployStatus v-if="stages.length" :stages="stages" />
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
        </main>

        <DeployFooter
            class="mode-footer"
            :status="footerStatus"
            :status-label="footerLabel"
            :status-aux="footerAux"
            :primary-label="primaryLabel"
            :primary-icon="primaryIcon"
            :primary-disabled="!canPrimary"
            :primary-loading="primaryLoading"
            :show-secondary="!!compileResult && !result"
            :secondary-label="'Recompile'"
            :secondary-disabled="compiling || deploying"
            @primary="onPrimary"
            @secondary="onCompile"
            :show-cancel="true"
            :cancel-label="result ? 'Reset' : 'Clear'"
            :cancel-disabled="compiling || deploying"
            @cancel="onReset"
        />
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import SolidityEditor from './SolidityEditor.vue'
import CompileStatus from './CompileStatus.vue'
import ConstructorForm from './ConstructorForm.vue'
import DeployStatus from './DeployStatus.vue'
import DeploySuccessCard from './DeploySuccessCard.vue'
import DeployFooter, { FooterStatus } from './DeployFooter.vue'
import SourceProjectsMenu from './SourceProjectsMenu.vue'
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
import DB, { Entities } from '@/database'

const DEFAULT_FILE = 'Contract.sol'
const STARTER_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// OpenZeppelin (full sources, @5.0.2)
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
        DeployFooter,
        SourceProjectsMenu,
    },
})
export default class SourceMode extends Vue {
    @Prop({ required: true }) network!: string
    @Prop({ default: () => [] }) existingCategories!: string[]

    files: Record<string, string> = { [DEFAULT_FILE]: STARTER_SOURCE }
    activeFile: string = DEFAULT_FILE
    entryFile: string = DEFAULT_FILE

    // Project persistence (sourceProjects Dexie table)
    loadedProjectId: number | null = null
    dirty: boolean = false
    private suppressDirty: boolean = false

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

    get canPrimary(): boolean {
        if (this.deploying || this.compiling) return false
        if (this.result) return false
        if (!this.compileResult) return true // primary = Compile
        return this.valid // primary = Deploy
    }

    get primaryLoading(): boolean {
        return this.compiling || this.deploying
    }

    get primaryLabel(): string {
        if (this.deploying) return 'Deploying…'
        if (this.compiling) return 'Compiling…'
        if (this.result) return 'Done'
        if (!this.compileResult) return 'Compile'
        return this.useProxy ? 'Deploy proxy' : 'Deploy'
    }

    get primaryIcon(): string {
        if (!this.compileResult) return 'cog'
        if (this.result) return 'check'
        return 'rocket'
    }

    get footerStatus(): FooterStatus {
        if (this.result) return 'success'
        if (this.deploying || this.compiling) return 'busy'
        if (this.compileErrors.length) return 'error'
        if (this.compileResult) return this.valid ? 'ready' : 'pending'
        return 'idle'
    }

    get footerLabel(): string {
        if (this.result) return 'Deployed'
        if (this.deploying) {
            const active = this.stages.find((s) => s.state === 'active')
            return active ? active.label : 'Deploying…'
        }
        if (this.compiling) return 'Compiling…'
        if (this.compileErrors.length) {
            return `${this.compileErrors.length} compile error${this.compileErrors.length > 1 ? 's' : ''}`
        }
        if (!this.compileResult) return 'Ready to compile'
        if (!this.valid) return `Fill ${this.useProxy ? 'initializer' : 'constructor'} arguments`
        return `Ready · ${this.compileResult.contractName}`
    }

    get footerAux(): string {
        if (this.result) {
            return this.result.implAddress
                ? `proxy ${shortAddr(this.result.address)} · impl ${shortAddr(this.result.implAddress)}`
                : shortAddr(this.result.address)
        }
        if (this.compileResult) return `${this.bytecodeSize} bytes`
        return ''
    }

    get bytecodeSize(): number {
        if (!this.compileResult) return 0
        const hex = this.compileResult.bytecode.startsWith('0x')
            ? this.compileResult.bytecode.slice(2)
            : this.compileResult.bytecode
        return hex.length / 2
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

    canRemove(name: string): boolean {
        return Object.keys(this.files).length > 1
    }

    onFileChange(name: string, text: string) {
        this.$set(this.files, name, text)
        this.markDirty()
    }

    onAddFile() {
        let i = Object.keys(this.files).length + 1
        let name = `File${i}.sol`
        while (this.files[name] !== undefined) {
            i++
            name = `File${i}.sol`
        }
        const input = window.prompt('New file name (must end with .sol)', name)
        if (!input) return
        if (!input.endsWith('.sol')) {
            ;(this as any).$buefy.toast.open({
                message: 'File name must end with .sol',
                type: 'is-warning',
                position: 'is-top',
                duration: 2500,
            })
            return
        }
        if (this.files[input] !== undefined) {
            ;(this as any).$buefy.toast.open({
                message: 'A file with that name already exists',
                type: 'is-warning',
                position: 'is-top',
                duration: 2500,
            })
            return
        }
        this.$set(this.files, input, '')
        this.activeFile = input
        this.markDirty()
    }

    onCloseFile(name: string) {
        if (Object.keys(this.files).length <= 1) return
        this.$delete(this.files, name)
        const remaining = Object.keys(this.files)
        if (this.activeFile === name) {
            this.activeFile = remaining[0]
        }
        if (this.entryFile === name) {
            this.entryFile = remaining[0]
        }
        this.markDirty()
    }

    private markDirty() {
        if (this.suppressDirty) return
        this.dirty = true
    }

    get workspaceHasContent(): boolean {
        return Object.values(this.files).some((s) => (s || '').trim().length > 0)
    }

    // ─── Project save / load ──────────────────────────────────────────────

    onLoadProject(p: Entities.SourceProject) {
        const apply = () => {
            this.suppressDirty = true
            this.files = JSON.parse(JSON.stringify(p.files || {}))
            const fileNames = Object.keys(this.files)
            this.entryFile = p.entry && this.files[p.entry] ? p.entry : fileNames[0] || ''
            this.activeFile = this.entryFile
            this.loadedProjectId = p.id || null
            this.dirty = false
            // Compile state from the previous workspace is meaningless now.
            this.compileResult = null
            this.compileErrors = []
            this.compileWarnings = []
            this.compiledContracts = []
            this.selectedContractKey = ''
            this.useProxy = false
            this.values = []
            this.valid = false
            this.result = null
            this.stages = []
            this.$nextTick(() => {
                this.suppressDirty = false
            })
        }
        if (this.dirty && this.workspaceHasContent) {
            ;(this as any).$buefy.dialog.confirm({
                title: 'Replace workspace',
                message: `You have unsaved changes. Load "${p.name}" anyway?`,
                confirmText: 'Load',
                onConfirm: apply,
            })
        } else {
            apply()
        }
    }

    async onSaveProject() {
        if (!this.loadedProjectId) return
        await DB.sourceProjects.update(this.loadedProjectId, {
            files: JSON.parse(JSON.stringify(this.files)),
            entry: this.entryFile,
            updatedTime: Date.now(),
        })
        this.dirty = false
        ;(this as any).$buefy.toast.open({
            message: 'Project saved',
            type: 'is-success',
            position: 'is-bottom',
        })
    }

    onSaveAsProject() {
        if (!this.workspaceHasContent) return
        ;(this as any).$buefy.dialog.prompt({
            title: 'Save project',
            message: 'Give your project a name.',
            inputAttrs: { placeholder: 'e.g. MyVault demo', maxlength: 60, required: true },
            onConfirm: async (val: string) => {
                const name = val.trim()
                if (!name) return
                const now = Date.now()
                const id = await DB.sourceProjects.add({
                    name,
                    files: JSON.parse(JSON.stringify(this.files)),
                    entry: this.entryFile,
                    createdTime: now,
                    updatedTime: now,
                })
                this.loadedProjectId = typeof id === 'number' ? id : null
                this.dirty = false
                ;(this as any).$buefy.toast.open({
                    message: 'Project saved',
                    type: 'is-success',
                    position: 'is-bottom',
                })
            },
        })
    }

    onNewProject() {
        const apply = () => {
            this.suppressDirty = true
            this.files = { [DEFAULT_FILE]: STARTER_SOURCE }
            this.activeFile = DEFAULT_FILE
            this.entryFile = DEFAULT_FILE
            this.loadedProjectId = null
            this.dirty = false
            this.compileResult = null
            this.compileErrors = []
            this.compileWarnings = []
            this.compiledContracts = []
            this.selectedContractKey = ''
            this.useProxy = false
            this.values = []
            this.valid = false
            this.result = null
            this.stages = []
            this.$nextTick(() => {
                this.suppressDirty = false
            })
        }
        if (this.dirty && this.workspaceHasContent) {
            ;(this as any).$buefy.dialog.confirm({
                title: 'Discard workspace',
                message: 'You have unsaved changes. Start a new blank project?',
                confirmText: 'Discard',
                type: 'is-warning',
                onConfirm: apply,
            })
        } else {
            apply()
        }
    }

    onProjectDeleted(id: number) {
        if (this.loadedProjectId === id) {
            this.loadedProjectId = null
            this.dirty = true
        }
    }

    onProjectRenamed(_: { id: number; name: string }) {
        /* the dropdown re-fetches its own list; nothing to do here */
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

    onPrimary() {
        if (!this.compileResult) {
            this.onCompile()
        } else {
            this.deploy()
        }
    }

    onReset() {
        if (this.compiling || this.deploying) return
        this.compileResult = null
        this.compileErrors = []
        this.compileWarnings = []
        this.compiledContracts = []
        this.selectedContractKey = ''
        this.useProxy = false
        this.values = []
        this.valid = false
        this.result = null
        this.stages = []
    }

    async onCompile() {
        this.compiling = true
        this.compileErrors = []
        this.compileWarnings = []
        this.compileResult = null
        this.compiledContracts = []
        this.result = null
        this.stages = []
        // Refresh the entry file in case the user edited it but didn't pin it as entry.
        if (!this.files[this.entryFile]) {
            this.entryFile = this.activeFile
        }

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
        if (!initFn) throw new Error(`Initializer ${this.initFnName} not found in ABI`)
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

function shortAddr(a: string): string {
    if (!a) return ''
    return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}
</script>

<style lang="scss" scoped>
.mode-shell {
    flex: 1;
    display: grid;
    grid-template-columns: 280px 1fr;
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
    min-height: 0;
}
.sidebar-head {
    padding: 0.85rem 0.85rem 0.7rem 0.85rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.sidebar-head--files {
    padding-top: 0.7rem;
}
.sidebar-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-color-light);
}
.sidebar-head-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.2rem;
}
.sidebar-title {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-color-light);
}
.icon-btn {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0.15rem;
    color: var(--text-color-light);
    display: inline-flex;
    align-items: center;
}
.icon-btn:hover {
    color: var(--primary-color, #485fc7);
}
.sidebar-sub {
    margin: 0;
    font-size: 0.7rem;
    font-family: monospace;
    color: var(--text-color-light);
}
.file-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0;
    overflow-y: auto;
}
.file-row {
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.4rem 0.8rem 0.4rem 0.7rem;
    cursor: pointer;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 0.45rem;
    border-left: 3px solid transparent;
    font-size: 0.82rem;
    transition: background 0.12s;
}
.file-row:hover {
    background: var(--body-background-alt);
}
.file-row.active {
    background: var(--body-background-alt);
    border-left-color: var(--primary-color, #485fc7);
}
.file-row.entry .file-marker {
    color: #d4a017;
}
.file-marker {
    color: var(--text-color-light);
    display: inline-flex;
    flex-shrink: 0;
}
.file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
}
.file-close {
    color: var(--text-color-light);
    opacity: 0.5;
    padding: 0 0.2rem;
    font-size: 1rem;
    line-height: 1;
}
.file-close:hover {
    opacity: 1;
    color: #ff3860;
}
.sidebar-foot {
    border-top: 1px solid var(--border-color);
    padding: 0.6rem 0.8rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.entry-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    padding: 0.35rem 0.6rem;
    font-size: 0.78rem;
    color: var(--text-color);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    justify-content: center;
}
.entry-btn:not(:disabled):hover {
    border-color: var(--primary-color, #485fc7);
    color: var(--primary-color, #485fc7);
}
.entry-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.hint {
    display: flex;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--text-color-light);
    line-height: 1.4;
}

.mode-main {
    grid-column: 2;
    grid-row: 1;
    overflow-y: auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
}
.editor-wrap {
    flex-shrink: 0;
    height: 420px;
}
.diagnostics-pane {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.post-compile-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.2rem;
}
.card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
}
.card-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0;
}
.card-meta {
    font-size: 0.72rem;
    font-family: monospace;
    color: var(--text-color-light);
}
.args-section {
    margin-top: 0.5rem;
}
.args-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin-bottom: 0.4rem;
}

.mode-footer {
    grid-column: 1 / -1;
    grid-row: 2;
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
