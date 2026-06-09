<template>
    <div class="address-panel">
        <div v-if="loading" class="state-row">
            <b-icon icon="circle-notch" custom-class="fa-spin"></b-icon>
            <span>Inspecting address…</span>
        </div>

        <div v-else-if="error" class="error-state">
            <b-icon icon="exclamation-triangle" custom-class="has-text-warning"></b-icon>
            <span>{{ error }}</span>
        </div>

        <template v-else>
            <!-- Header / live account data -->
            <div class="card-block">
                <div class="block-head">
                    <span class="head-title">
                        <b-icon :icon="hasCode ? 'file-code' : 'user'" size="is-small"></b-icon>
                        {{ hasCode ? 'Contract' : 'EOA' }}
                        <button class="help-btn" @click="openHelp('contract')" title="What is this?">
                            <b-icon icon="question-circle" size="is-small"></b-icon>
                        </button>
                    </span>
                    <a :href="$explorerAccount(value)" target="_blank" rel="noopener" class="external-link">
                        View on explorer
                        <b-icon icon="external-link-alt" size="is-small"></b-icon>
                    </a>
                </div>

                <div class="kv-grid">
                    <div class="kv-row">
                        <span class="kv-key">Address</span>
                        <code class="kv-val is-family-monospace">{{ value }}</code>
                    </div>
                    <div v-if="registryHit" class="kv-row">
                        <span class="kv-key">Known as</span>
                        <span class="kv-val">{{ registryHit.name }}</span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">VET</span>
                        <span class="kv-val">{{ formatWei(account.balance) }}</span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">VTHO</span>
                        <span class="kv-val">{{ formatWei(account.energy) }}</span>
                    </div>
                </div>
            </div>

            <!-- Bytecode summary -->
            <div v-if="hasCode" class="card-block">
                <div class="block-head">
                    <span class="head-title">
                        Bytecode
                        <button class="help-btn" @click="openHelp('bytecode')" title="What is this?">
                            <b-icon icon="question-circle" size="is-small"></b-icon>
                        </button>
                    </span>
                </div>
                <div class="kv-grid">
                    <div class="kv-row">
                        <span class="kv-key">Size</span>
                        <span class="kv-val">{{ codeByteLength.toLocaleString() }} bytes</span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">ERC interfaces</span>
                        <span class="kv-val">
                            <span v-if="ercSniff.length === 0" class="tag-pill is-muted">none detected</span>
                            <span
                                v-for="tag in ercSniff"
                                :key="tag"
                                class="tag-pill"
                            >{{ tag }}</span>
                        </span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Shape</span>
                        <span class="kv-val">
                            <span v-if="isLikelyLibrary" class="tag-pill is-library">possible library</span>
                            <span v-else class="tag-pill is-muted">regular contract</span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Proxy detection -->
            <div v-if="hasCode" class="card-block">
                <div class="block-head">
                    <span class="head-title">
                        Proxy detection (EIP-1967)
                        <button class="help-btn" @click="openHelp('proxy')" title="What is this?">
                            <b-icon icon="question-circle" size="is-small"></b-icon>
                        </button>
                    </span>
                </div>
                <div v-if="!proxy.isProxy" class="empty-mini">
                    No EIP-1967 slots populated — this likely isn't a transparent / UUPS proxy.
                </div>
                <template v-else>
                    <div class="kv-grid">
                        <div v-if="proxy.implementation" class="kv-row">
                            <span class="kv-key">Implementation</span>
                            <code class="kv-val is-family-monospace">{{ proxy.implementation }}</code>
                        </div>
                        <div v-if="proxy.admin" class="kv-row">
                            <span class="kv-key">Admin</span>
                            <code class="kv-val is-family-monospace">{{ proxy.admin }}</code>
                        </div>
                        <div v-if="proxy.beacon" class="kv-row">
                            <span class="kv-key">Beacon</span>
                            <code class="kv-val is-family-monospace">{{ proxy.beacon }}</code>
                        </div>
                    </div>
                </template>
            </div>

            <!-- Registry hit summary -->
            <div v-if="registryHit && abiSummary" class="card-block">
                <div class="block-head">
                    <span class="head-title">
                        Imported ABI
                        <button class="help-btn" @click="openHelp('abi')" title="What is this?">
                            <b-icon icon="question-circle" size="is-small"></b-icon>
                        </button>
                    </span>
                    <span class="source-pill" :class="sourcePillClass">{{ sourceLabel }}</span>
                </div>

                <div
                    v-if="sourcedAbi && sourcedAbi.implAddress"
                    class="impl-note"
                >
                    <b-icon icon="link" size="is-small" class="impl-icon"></b-icon>
                    <div class="impl-note-text">
                        <span class="impl-note-key">ABI fetched via implementation</span>
                        <code class="impl-note-addr is-family-monospace">{{ sourcedAbi.implAddress }}</code>
                        <span class="impl-note-aside">
                            (this address is a proxy; Sourcify verifies the impl, not the proxy wrapper)
                        </span>
                    </div>
                </div>

                <div class="kv-grid">
                    <div class="kv-row">
                        <span class="kv-key">Functions</span>
                        <span class="kv-val">{{ abiSummary.functions }}</span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Events</span>
                        <span class="kv-val">{{ abiSummary.events }}</span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">Errors</span>
                        <span class="kv-val">{{ abiSummary.errors }}</span>
                    </div>
                    <div v-if="sourcedAbi" class="kv-row">
                        <span class="kv-key">Fetched</span>
                        <span class="kv-val">{{ formatTimestamp(sourcedAbi.fetchedTime) }}</span>
                    </div>
                </div>

                <div class="abi-actions">
                    <button
                        v-if="abiSource !== 'imported'"
                        type="button"
                        class="button is-small is-primary is-outlined"
                        @click="addToMyContracts"
                    >
                        <b-icon icon="plus" size="is-small"></b-icon>
                        <span>Add to my contracts</span>
                    </button>
                    <button
                        type="button"
                        class="button is-small is-light"
                        @click="showAbi = !showAbi"
                    >
                        <b-icon :icon="showAbi ? 'eye-slash' : 'eye'" size="is-small"></b-icon>
                        <span>{{ showAbi ? 'Hide ABI' : 'View ABI' }}</span>
                    </button>
                    <button
                        type="button"
                        class="button is-small is-light"
                        @click="copyAbi"
                    >
                        <b-icon icon="copy" size="is-small"></b-icon>
                        <span>Copy</span>
                    </button>
                </div>

                <pre v-if="showAbi" class="abi-display"><code class="is-family-monospace">{{ abiJson }}</code></pre>
            </div>

            <!-- No ABI available -->
            <div v-else-if="hasCode" class="card-block">
                <div class="block-head">
                    <span class="head-title">
                        ABI
                        <button class="help-btn" @click="openHelp('abi-missing')" title="Why is this missing?">
                            <b-icon icon="question-circle" size="is-small"></b-icon>
                        </button>
                    </span>
                    <span class="source-pill is-muted">unknown</span>
                </div>
                <div class="empty-mini">
                    No ABI available. Inspect the bytecode and proxy slots above, or import the ABI manually via the Contracts page to enable decoding.
                </div>
            </div>
        </template>

        <!-- Contextual help modal -->
        <b-modal :active.sync="helpActive" has-modal-card trap-focus :on-cancel="closeHelp">
            <div class="modal-card help-modal" v-if="helpEntry">
                <header class="modal-card-head">
                    <p class="modal-card-title">{{ helpEntry.title }}</p>
                    <button type="button" class="delete" @click="closeHelp" aria-label="Close"></button>
                </header>
                <section class="modal-card-body">
                    <div class="help-body" v-html="helpEntry.body"></div>
                </section>
                <footer class="modal-card-foot">
                    <button type="button" class="button" @click="closeHelp">Close</button>
                </footer>
            </div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import DB, { Entities } from '../../database'
import { loadAllContracts, ensureAbisForAddresses, findContractByAddress } from '../../utils/abi-registry'
import { getAccount, getAccountCode, getStorage, AccountInfo } from '../../services/debug-service'
import EditContract from '../EditContract.vue'

// EIP-1967 storage slots.
const SLOT_IMPL = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const SLOT_ADMIN = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'
const SLOT_BEACON = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

// 4-byte function selectors used to sniff ERC standards. We just substring-match
// these against bytecode — the Solidity dispatcher emits each selector as
// PUSH4 literal bytes, so this catches typical compiled contracts.
const ERC20_SELECTORS = [
    '18160ddd', // totalSupply()
    '70a08231', // balanceOf(address)
    'a9059cbb', // transfer(address,uint256)
    '23b872dd', // transferFrom(address,address,uint256)
    '095ea7b3', // approve(address,uint256)
    'dd62ed3e'  // allowance(address,address)
]
const ERC721_SELECTORS = [
    '6352211e', // ownerOf(uint256)
    'b88d4fde', // safeTransferFrom(address,address,uint256,bytes)
    'a22cb465', // setApprovalForAll(address,bool)
    'e985e9c5'  // isApprovedForAll(address,address)
]

type AbiSource = 'imported' | 'builtin' | 'sourcify' | 'unknown'

function slotToAddress(slotValue: string): string | null {
    // Storage word is 32 bytes; an address sits in the low 20 bytes.
    if (!slotValue || !slotValue.startsWith('0x')) return null
    const hex = slotValue.slice(2).padStart(64, '0')
    const addr = '0x' + hex.slice(24)
    if (/^0x0+$/.test(addr)) return null
    return addr
}

@Component({ name: 'AddressInspectorPanel' })
export default class AddressInspectorPanel extends Vue {
    @Prop({ type: String, required: true }) value!: string

    private loading: boolean = false
    private error: string = ''
    private account: AccountInfo = { balance: '0x0', energy: '0x0', hasCode: false }
    private code: string = '0x'
    private proxy: { isProxy: boolean; implementation: string | null; admin: string | null; beacon: string | null } = {
        isProxy: false,
        implementation: null,
        admin: null,
        beacon: null
    }
    private registryHit: Entities.Contract | null = null
    private importedHit: Entities.Contract | null = null
    private sourcedAbi: Entities.SourcedAbi | null = null
    private helpKey: string | null = null
    private showAbi: boolean = false

    get helpActive(): boolean {
        return this.helpKey !== null
    }
    set helpActive(v: boolean) {
        if (!v) this.helpKey = null
    }

    get helpEntry(): { title: string; body: string } | null {
        if (!this.helpKey) return null
        const entries: Record<string, { title: string; body: string }> = {
            contract: {
                title: 'Contract vs EOA',
                body: `
                    <p>Live account state pulled from the connected node.</p>
                    <ul>
                        <li><strong>Contract</strong> — the address has deployed bytecode and can execute logic when called.</li>
                        <li><strong>EOA</strong> (Externally Owned Account) — a regular wallet with no code. Can sign transactions but not be called like a contract.</li>
                    </ul>
                    <p>VET and VTHO balances are the current on-chain values.</p>
                `
            },
            bytecode: {
                title: 'Bytecode & ERC sniff',
                body: `
                    <p><strong>Size</strong> is the length of the deployed runtime bytecode at this address.</p>
                    <p><strong>ERC interface detection</strong> works by substring-matching the standard 4-byte function selectors against the bytecode. Solidity's dispatcher emits each function selector as a literal <code>PUSH4</code> instruction, so common implementations are easy to recognize.</p>
                    <p>This is a heuristic only:</p>
                    <ul>
                        <li>Contracts using delegatecall fallbacks (proxies, diamonds) won't have the impl's selectors in their own bytecode.</li>
                        <li>Non-standard dispatchers (e.g. assembly-coded contracts) can slip through.</li>
                    </ul>
                `
            },
            proxy: {
                title: 'EIP-1967 proxy detection',
                body: `
                    <p>The Debugger reads three reserved storage slots defined by
                    <a href="https://eips.ethereum.org/EIPS/eip-1967" target="_blank" rel="noopener">EIP-1967</a>
                    directly from the node:</p>
                    <ul>
                        <li><strong>Implementation</strong> — the address where the logic actually lives. If this slot is non-zero, the address is almost certainly an OpenZeppelin transparent or UUPS upgradeable proxy.</li>
                        <li><strong>Admin</strong> — the address allowed to upgrade the proxy (transparent proxies only).</li>
                        <li><strong>Beacon</strong> — for beacon-based proxies, the beacon contract that resolves the impl.</li>
                    </ul>
                    <p>To decode calls against the proxy you need the <strong>implementation's</strong> ABI — the Debugger tries to fetch it from Sourcify automatically when you inspect a proxy address.</p>
                `
            },
            abi: {
                title: 'Where this ABI came from',
                body: this.abiSourceLongHelp()
            },
            'abi-missing': {
                title: 'Why is there no ABI?',
                body: `
                    <p>We checked three sources and found nothing for this contract:</p>
                    <ul>
                        <li><strong>User-imported</strong> — no entry in your local IndexedDB <code>contracts</code> table.</li>
                        <li><strong>Built-in (b32)</strong> — not part of the vechain/b32 registry that ships with the app.</li>
                        <li><strong>Sourcify</strong> — either the contract isn't verified there, or the request didn't return metadata.</li>
                    </ul>
                    <p>You can still inspect the bytecode and proxy slots. To decode calls / events / errors against this contract, import the ABI manually via the Contracts page.</p>
                `
            }
        }
        return entries[this.helpKey] || null
    }

    private abiSourceLongHelp(): string {
        switch (this.abiSource) {
            case 'imported':
                return `
                    <p><strong>Source: user-imported.</strong></p>
                    <p>This ABI was added via the Contracts page (by you or someone using this browser profile). User imports always win over built-in or Sourcify ABIs for the same address.</p>
                    <p>To replace it, edit or delete the contract from the Contracts page and reload.</p>
                `
            case 'builtin':
                return `
                    <p><strong>Source: built-in registry (vechain/b32).</strong></p>
                    <p>This ABI ships with the app via the <a href="https://github.com/vechain/b32" target="_blank" rel="noopener">vechain/b32</a> registry — Authority/VTHO/Prototype, VeBetterDAO contracts, StarGate, ERC-20/721, and a handful of ecosystem projects.</p>
                    <p>Updates land when the b32 repo cuts a new release and we sync. If you need a newer ABI in the meantime, import the JSON manually.</p>
                `
            case 'sourcify':
                if (this.sourcedAbi && this.sourcedAbi.implAddress) {
                    return `
                        <p><strong>Source: Sourcify (verified) — fetched via the implementation contract.</strong></p>
                        <p>This address is a proxy. The Debugger:</p>
                        <ol>
                            <li>Read the EIP-1967 implementation slot from on-chain storage.</li>
                            <li>Looked up the implementation address (<code>${this.sourcedAbi.implAddress}</code>) on Sourcify.</li>
                            <li>Pulled the verified ABI from the impl's metadata.</li>
                            <li>Stored it locally under <em>this</em> (proxy) address so future inspections are instant.</li>
                        </ol>
                        <p>This is why decoding works against the proxy even though Sourcify only verifies the impl.</p>
                    `
                }
                return `
                    <p><strong>Source: Sourcify (verified).</strong></p>
                    <p>Pulled directly from Sourcify's verified contract record for this address. The ABI is persisted locally in the <code>sourcedAbis</code> IndexedDB table so future inspections are instant.</p>
                `
            default:
                return ''
        }
    }

    private openHelp(key: string) {
        this.helpKey = key
    }

    private closeHelp() {
        this.helpKey = null
    }

    get hasCode(): boolean {
        return !!this.account && this.account.hasCode
    }

    get codeByteLength(): number {
        if (!this.code || this.code === '0x') return 0
        return (this.code.length - 2) / 2
    }

    get ercSniff(): string[] {
        if (!this.hasCode || !this.code) return []
        const lower = this.code.toLowerCase()
        const has = (sel: string) => lower.indexOf(sel) !== -1
        const tags: string[] = []
        if (ERC20_SELECTORS.every(has)) tags.push('ERC-20')
        if (ERC721_SELECTORS.every(has)) tags.push('ERC-721')
        return tags
    }

    // Heuristic: Solidity emits a library address check at the very start of
    // a library's bytecode — `PUSH20 <self-address>` (opcode 0x73) followed by
    // an address-equality check that rejects non-DELEGATECALL invocations.
    // If we find PUSH20 + this address within the first ~100 bytes of code,
    // this is most likely a library deployment. Not 100% reliable but covers
    // standard `library Foo { ... }` Solidity output.
    get isLikelyLibrary(): boolean {
        if (!this.hasCode || !this.code) return false
        const addrHex = this.value.toLowerCase().replace(/^0x/, '')
        if (addrHex.length !== 40) return false
        const lowerCode = this.code.toLowerCase()
        const pattern = '73' + addrHex
        const head = lowerCode.slice(0, 250) // ~125 bytes
        return head.includes(pattern)
    }

    get abiJson(): string {
        if (!this.registryHit || !Array.isArray(this.registryHit.abi)) return ''
        try {
            return JSON.stringify(this.registryHit.abi, null, 2)
        } catch {
            return ''
        }
    }

    get abiSummary(): { functions: number; events: number; errors: number } | null {
        if (!this.registryHit) return null
        const abi = this.registryHit.abi
        if (!Array.isArray(abi)) return null
        let f = 0
        let e = 0
        let er = 0
        for (const item of abi) {
            if (!item || typeof item !== 'object') continue
            const t = (item as any).type
            if (t === 'function') f++
            else if (t === 'event') e++
            else if (t === 'error') er++
        }
        return { functions: f, events: e, errors: er }
    }

    get abiSource(): AbiSource {
        if (!this.registryHit) return 'unknown'
        if (this.importedHit) return 'imported'
        if (this.sourcedAbi) return 'sourcify'
        return 'builtin'
    }

    get sourceLabel(): string {
        switch (this.abiSource) {
            case 'imported': return 'user-imported'
            case 'builtin':  return 'built-in (b32)'
            case 'sourcify': return 'sourcify (verified)'
            default:         return 'unknown'
        }
    }

    get sourcePillClass(): string {
        return 'is-' + this.abiSource
    }

    private formatWei(hexWei: string): string {
        try {
            const bn = BN(hexWei || '0')
            return bn.dividedBy(1e18).toFormat(4)
        } catch {
            return hexWei
        }
    }

    private formatTimestamp(ts: number | undefined): string {
        if (!ts) return ''
        const d = new Date(ts)
        return d.toLocaleString()
    }

    private async copyAbi() {
        if (!this.abiJson) return
        try {
            await navigator.clipboard.writeText(this.abiJson)
        } catch {
            try {
                const ta = document.createElement('textarea')
                ta.value = this.abiJson
                ta.setAttribute('readonly', '')
                ta.style.position = 'absolute'
                ta.style.left = '-9999px'
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
            } catch { return }
        }
        ;(this as any).$buefy.toast.open({
            message: 'ABI copied',
            type: 'is-success',
            position: 'is-bottom',
            duration: 1500
        })
    }

    private addToMyContracts() {
        if (!this.registryHit) return
        const prefill: Entities.Contract = {
            name: this.registryHit.name || '',
            address: this.value,
            abi: this.registryHit.abi as any,
            category: ''
        }
        // $buefy.modal.open doesn't auto-close when the inner component emits
        // its own `cancel` / `finished` events — only on the modal's own
        // cancellation (escape, outside-click, ×). EditContract emits cancel
        // and finished but doesn't tell the modal to close, so we have to
        // close it ourselves via the returned instance.
        let modal: any = null
        modal = (this as any).$buefy.modal.open({
            parent: this,
            component: EditContract,
            hasModalCard: true,
            trapFocus: true,
            canCancel: ['escape', 'outside'],
            props: {
                item: prefill,
                isImport: false
            },
            events: {
                cancel: () => {
                    if (modal) modal.close()
                },
                finished: () => {
                    if (modal) modal.close()
                    ;(this as any).$buefy.toast.open({
                        message: `Added "${prefill.name || prefill.address.slice(0, 10) + '…'}" to your contracts`,
                        type: 'is-success',
                        position: 'is-bottom',
                        duration: 2500
                    })
                    // Re-run lookup so the panel reflects the new "user-imported" source.
                    this.load()
                }
            }
        })
    }

    private async lookupSourcedAbi(genesisId: string, address: string) {
        try {
            const hit = await DB.sourcedAbis
                .where('[genesisId+address]')
                .equals([genesisId, address.toLowerCase()])
                .first()
            this.sourcedAbi = hit || null
        } catch {
            this.sourcedAbi = null
        }
    }

    private async lookupImportedAbi(address: string) {
        try {
            const hit = await DB.contracts
                .filter((c) => (c.address || '').toLowerCase() === address.toLowerCase())
                .first()
            this.importedHit = hit || null
        } catch {
            this.importedHit = null
        }
    }

    private async load() {
        this.loading = true
        this.error = ''
        this.registryHit = null
        this.importedHit = null
        this.sourcedAbi = null
        this.code = '0x'
        this.proxy = { isProxy: false, implementation: null, admin: null, beacon: null }
        try {
            const genesisId = this.$connex.thor.genesis.id
            const [account, code, contracts] = await Promise.all([
                getAccount(this.$nodeUrl, this.value),
                getAccountCode(this.$nodeUrl, this.value),
                loadAllContracts(genesisId)
            ])
            this.account = account
            this.code = code || '0x'
            this.registryHit = findContractByAddress(contracts, this.value)

            // If we don't know this contract locally, try Sourcify silently.
            if (!this.registryHit && account.hasCode) {
                const refreshed = await ensureAbisForAddresses(genesisId, [this.value], this.$nodeUrl)
                this.registryHit = findContractByAddress(refreshed, this.value)
            }

            // Provenance lookups (independent of registryHit resolution above).
            await Promise.all([
                this.lookupImportedAbi(this.value),
                this.lookupSourcedAbi(genesisId, this.value)
            ])

            if (account.hasCode) {
                const [implSlot, adminSlot, beaconSlot] = await Promise.all([
                    getStorage(this.$nodeUrl, this.value, SLOT_IMPL).catch(() => ''),
                    getStorage(this.$nodeUrl, this.value, SLOT_ADMIN).catch(() => ''),
                    getStorage(this.$nodeUrl, this.value, SLOT_BEACON).catch(() => '')
                ])
                const impl = slotToAddress(implSlot)
                const admin = slotToAddress(adminSlot)
                const beacon = slotToAddress(beaconSlot)
                this.proxy = {
                    isProxy: !!(impl || beacon),
                    implementation: impl,
                    admin,
                    beacon
                }
            }
        } catch (e: any) {
            this.error = e && e.message ? e.message : 'Failed to inspect address.'
        } finally {
            this.loading = false
        }
    }

    @Watch('value', { immediate: true })
    private onValueChange() {
        this.load()
    }
}
</script>

<style lang="scss" scoped>
.address-panel {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.state-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-light);
    padding: 1.5rem;
    justify-content: center;
}

.error-state {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 165, 32, 0.1);
    border: 1px solid rgba(255, 165, 32, 0.3);
    border-radius: 6px;
    color: var(--text-color);
    font-size: 0.9rem;
}

.card-block {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.25rem;
}

.block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border-color);
}
.head-title {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--text-color);
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
}

.external-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--primary-color);
    text-decoration: none;
    font-size: 0.8rem;
}
.external-link:hover {
    text-decoration: underline;
}

.help-btn {
    background: transparent;
    border: none;
    color: var(--text-color-light);
    cursor: pointer;
    padding: 0 0 0 0.25rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    transition: color 0.15s ease;
}
.help-btn:hover {
    color: var(--primary-color);
}
.help-btn:focus {
    outline: none;
    color: var(--primary-color);
}

::v-deep .help-modal .modal-card {
    max-width: 540px;
    width: 100%;
    background: var(--card-background);
}
::v-deep .help-modal .modal-card-head,
::v-deep .help-modal .modal-card-foot {
    background: var(--card-background);
    border-color: var(--border-color);
}
::v-deep .help-modal .modal-card-title {
    color: var(--text-color);
    font-size: 1rem;
}
::v-deep .help-modal .modal-card-body {
    background: var(--card-background);
    color: var(--text-color);
}
::v-deep .help-modal .help-body {
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--text-color);
}
::v-deep .help-modal .help-body p {
    margin: 0 0 0.75rem 0;
}
::v-deep .help-modal .help-body p:last-child {
    margin-bottom: 0;
}
::v-deep .help-modal .help-body ul,
::v-deep .help-modal .help-body ol {
    margin: 0 0 0.75rem 1.25rem;
    padding: 0;
    color: var(--text-color-light);
}
::v-deep .help-modal .help-body li {
    margin-bottom: 0.35rem;
}
::v-deep .help-modal .help-body strong {
    color: var(--text-color);
    font-weight: 600;
}
::v-deep .help-modal .help-body code {
    font-size: 0.8rem;
    color: var(--text-color);
}
::v-deep .help-modal .help-body a {
    color: var(--primary-color);
}

.source-pill {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.18rem 0.55rem;
    border-radius: 10px;
}
.source-pill.is-imported {
    background: rgba(50, 175, 50, 0.14);
    color: #228822;
}
.source-pill.is-builtin {
    background: rgba(50, 115, 220, 0.14);
    color: var(--primary-color);
}
.source-pill.is-sourcify {
    background: rgba(127, 86, 217, 0.18);
    color: #7f56d9;
}
.source-pill.is-muted,
.source-pill.is-unknown {
    background: var(--code-bg);
    color: var(--text-color-light);
}

.impl-note {
    display: flex;
    gap: 0.55rem;
    align-items: flex-start;
    padding: 0.6rem 0.75rem;
    border: 1px solid rgba(127, 86, 217, 0.25);
    background: rgba(127, 86, 217, 0.06);
    border-radius: 6px;
    margin-bottom: 0.75rem;
}
.impl-icon {
    color: #7f56d9;
    flex-shrink: 0;
    margin-top: 0.15rem;
}
.impl-note-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.8rem;
}
.impl-note-key {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7f56d9;
}
.impl-note-addr {
    color: var(--text-color);
    word-break: break-all;
    font-size: 0.82rem;
}
.impl-note-aside {
    color: var(--text-color-light);
    font-size: 0.75rem;
}

.kv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 1.5rem;
}
.kv-row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    font-size: 0.85rem;
    min-width: 0;
}
.kv-key {
    color: var(--text-color-light);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    width: 110px;
}
.kv-val {
    color: var(--text-color);
    word-break: break-all;
    min-width: 0;
}

.tag-pill {
    display: inline-block;
    background: rgba(50, 175, 50, 0.12);
    color: #228822;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    margin-right: 0.3rem;
}
.tag-pill.is-muted {
    background: var(--code-bg);
    color: var(--text-color-light);
}
.tag-pill.is-library {
    background: rgba(127, 86, 217, 0.18);
    color: #7f56d9;
}

.abi-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.85rem;
    flex-wrap: wrap;
}

.abi-display {
    margin-top: 0.85rem;
    background: var(--code-bg);
    color: var(--text-color);
    padding: 0.75rem 0.9rem;
    border-radius: 6px;
    font-size: 0.75rem;
    line-height: 1.45;
    max-height: 360px;
    overflow: auto;
    white-space: pre;
    border: 1px solid var(--border-color);
}
.abi-display code {
    background: transparent;
    padding: 0;
    font-size: inherit;
    color: inherit;
}

.empty-mini {
    font-size: 0.85rem;
    color: var(--text-color-light);
    padding: 0.4rem 0;
    font-style: italic;
}

.aside {
    margin-top: 0.6rem;
    font-size: 0.78rem;
    color: var(--text-color-light);
}
.aside em {
    color: var(--text-color);
    font-style: normal;
    font-weight: 600;
}

@media (max-width: 768px) {
    .kv-grid {
        grid-template-columns: 1fr;
    }
}
</style>
