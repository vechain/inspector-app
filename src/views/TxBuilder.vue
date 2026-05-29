<template>
    <section class="tx-builder-layout">
        <!-- Header: drafts toolbar -->
        <div class="tx-builder-header">
            <DraftsMenu
                :network="network"
                :loadedDraftId="loadedDraftId"
                :dirty="dirty"
                :workspaceHasContent="clauses.length > 0"
                @load="onLoadDraft"
                @save="onSaveDraft"
                @save-as="onSaveAsDraft"
                @deleted="onDraftDeleted"
                @renamed="onDraftRenamed"
            />
            <button type="button" class="button is-small is-light" :disabled="clauses.length === 0" @click="confirmReset">
                <b-icon icon="eraser" size="is-small"></b-icon>
                <span>Clear</span>
            </button>
        </div>

        <!-- Main split: left rail + right pane -->
        <div class="tx-builder-main">
            <div class="clause-list-pane">
                <ClauseList
                    :clauses="clauses"
                    :activeId="activeId"
                    :encoded="encodedClauses"
                    @select="onSelect"
                    @add="onAdd"
                    @remove="onRemove"
                    @move="onMove"
                />
            </div>
            <div class="clause-editor-pane">
                <ClauseEditor
                    v-if="activeClause"
                    :key="activeClause.id"
                    :clause="activeClause"
                    :network="network"
                    :encoded="activeEncoded"
                    @update="onUpdateClause"
                />
                <div v-else class="empty-state">
                    <b-icon icon="layer-group" size="is-large" custom-class="has-text-grey-light"></b-icon>
                    <p class="empty-title">Build a transaction</p>
                    <p class="empty-desc">Add one or more clauses, then sign &amp; submit as a single VeChain transaction.</p>
                    <button type="button" class="button is-rounded is-primary" @click="onAdd">
                        <b-icon icon="plus" size="is-small"></b-icon>
                        <span>Add first clause</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Sticky footer · normal mode -->
        <div v-if="!submission" class="tx-builder-footer">
            <div class="footer-summary">
                <span class="summary-pill" :class="allValid ? 'is-valid' : 'is-pending'">
                    <span class="summary-dot"></span>
                    <span v-if="clauses.length === 0">No clauses</span>
                    <span v-else-if="allValid">All {{ clauses.length }} clause{{ clauses.length === 1 ? '' : 's' }} ready</span>
                    <span v-else>{{ validCount }} of {{ clauses.length }} clauses ready</span>
                </span>
                <span v-if="contractsTouched > 1" class="summary-aux">
                    · touches {{ contractsTouched }} contracts — verify each
                </span>
            </div>
            <div class="footer-actions">
                <button type="button" class="button is-rounded" @click="confirmReset" :disabled="clauses.length === 0">
                    Cancel
                </button>
                <button
                    type="button"
                    class="button is-rounded is-primary"
                    :disabled="!canSubmit"
                    :class="{ 'is-loading': submitting }"
                    @click="submit"
                >
                    <b-icon icon="paper-plane" size="is-small"></b-icon>
                    <span>Sign &amp; Submit</span>
                </button>
            </div>
        </div>

        <!-- Sticky footer · submission mode -->
        <div v-else class="tx-builder-footer is-submission" :class="'is-' + submission.status">
            <div class="submission-main">
                <div class="submission-icon">
                    <b-icon
                        v-if="submission.status === 'submitting' || submission.status === 'pending'"
                        icon="circle-notch"
                        custom-class="fa-spin"
                    ></b-icon>
                    <b-icon v-else-if="submission.status === 'confirmed'" icon="check-circle"></b-icon>
                    <b-icon v-else-if="submission.status === 'reverted'" icon="times-circle"></b-icon>
                    <b-icon v-else-if="submission.status === 'timeout'" icon="exclamation-circle"></b-icon>
                    <b-icon v-else icon="exclamation-triangle"></b-icon>
                </div>
                <div class="submission-text">
                    <div class="submission-status">{{ statusLabel }}</div>
                    <div class="submission-meta">
                        <span v-if="submission.txid" class="submission-txid is-family-monospace">
                            {{ submission.txid | addr }}
                        </span>
                        <a
                            v-if="submission.txid"
                            :href="$explorerTx + submission.txid"
                            target="_blank"
                            rel="noopener"
                            class="submission-link"
                        >
                            View on explorer
                            <b-icon icon="external-link-alt" size="is-small"></b-icon>
                        </a>
                        <span v-if="submission.receipt && submission.receipt.gasUsed" class="submission-aux">
                            · gas {{ submission.receipt.gasUsed.toLocaleString() }}
                        </span>
                        <span v-if="submission.receipt && submission.receipt.meta && submission.receipt.meta.blockNumber" class="submission-aux">
                            · block {{ submission.receipt.meta.blockNumber }}
                        </span>
                        <span v-if="submission.error" class="submission-error">
                            · {{ submission.error }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="footer-actions">
                <button
                    v-if="submission.status === 'confirmed'"
                    type="button"
                    class="button is-rounded is-primary"
                    @click="dismissAndReset"
                >
                    Start new
                </button>
                <button
                    v-else-if="submission.status !== 'submitting' && submission.status !== 'pending'"
                    type="button"
                    class="button is-rounded"
                    @click="dismissSubmission"
                >
                    Dismiss
                </button>
                <button
                    v-else
                    type="button"
                    class="button is-rounded"
                    @click="dismissSubmission"
                    title="Stop tracking — the transaction will keep its course on-chain"
                >
                    Hide
                </button>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import DB, { Entities } from '../database'
import ClauseList from '../components/TxBuilder/ClauseList.vue'
import ClauseEditor from '../components/TxBuilder/ClauseEditor.vue'
import DraftsMenu from '../components/TxBuilder/DraftsMenu.vue'

interface EncodedClause {
    isValid: boolean
    to: string
    value: string
    data: string
    comment?: string
    error?: string
}

type SubmissionStatus = 'submitting' | 'pending' | 'confirmed' | 'reverted' | 'timeout' | 'error'

interface Submission {
    status: SubmissionStatus
    txid: string | null
    receipt: Connex.Thor.Transaction.Receipt | null
    error: string | null
}

function uid(): string {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
        return (crypto as any).randomUUID()
    }
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

function makeEmptyClause(): Entities.TxBuilderClause {
    return {
        id: uid(),
        contractAddress: '',
        contractName: '',
        abi: [],
        selectedFunction: null,
        params: [],
        value: null,
        note: ''
    }
}

@Component({
    components: { ClauseList, ClauseEditor, DraftsMenu }
})
export default class TxBuilder extends Vue {
    private clauses: Entities.TxBuilderClause[] = []
    private activeId: string | null = null
    private loadedDraftId: number | null = null
    private dirty: boolean = false
    private submitting: boolean = false
    private suppressDirty: boolean = false
    private submission: Submission | null = null
    private pollIntervalId: number | null = null
    private pollTimeoutId: number | null = null

    get network(): string {
        return this.$connex.thor.genesis.id
    }

    get activeClause(): Entities.TxBuilderClause | null {
        if (!this.activeId) return null
        return this.clauses.find(c => c.id === this.activeId) || null
    }

    get encodedClauses(): EncodedClause[] {
        return this.clauses.map(c => this.encodeClause(c))
    }

    get activeEncoded(): EncodedClause | null {
        const idx = this.clauses.findIndex(c => c.id === this.activeId)
        if (idx === -1) return null
        return this.encodedClauses[idx] || null
    }

    get validCount(): number {
        return this.encodedClauses.filter(e => e.isValid).length
    }

    get allValid(): boolean {
        return this.clauses.length > 0 && this.validCount === this.clauses.length
    }

    get canSubmit(): boolean {
        return this.allValid && !this.submitting && !this.submission
    }

    get statusLabel(): string {
        if (!this.submission) return ''
        switch (this.submission.status) {
            case 'submitting': return 'Awaiting signature…'
            case 'pending': return 'Pending — waiting for confirmation'
            case 'confirmed': return 'Confirmed'
            case 'reverted': return 'Reverted on-chain'
            case 'timeout': return 'Timed out waiting for receipt'
            case 'error': return 'Submission failed'
            default: return ''
        }
    }

    get contractsTouched(): number {
        const set = new Set<string>()
        this.clauses.forEach(c => {
            if (c.contractAddress) set.add(c.contractAddress.toLowerCase())
        })
        return set.size
    }

    private encodeClause(c: Entities.TxBuilderClause): EncodedClause {
        if (!c.contractAddress) {
            return { isValid: false, to: '', value: '0x0', data: '0x', error: 'Pick a contract' }
        }
        if (!c.selectedFunction) {
            return { isValid: false, to: c.contractAddress, value: '0x0', data: '0x', error: 'Pick a function' }
        }
        const expected = c.selectedFunction.inputs ? c.selectedFunction.inputs.length : 0
        if (c.params.length !== expected || c.params.some(p => p === '' || p === null || p === undefined)) {
            return { isValid: false, to: c.contractAddress, value: '0x0', data: '0x', error: 'Fill all parameters' }
        }
        try {
            const account = this.$connex.thor.account(c.contractAddress.toLowerCase())
            const method = account.method(c.selectedFunction)
            const params = c.params.map((p, i) => {
                return c.selectedFunction!.inputs[i].type.endsWith(']') ? JSON.parse(p) : p
            })
            const payable = !!c.selectedFunction.payable || c.selectedFunction.stateMutability === 'payable'
            const hexValue = '0x' + BN(payable ? (c.value || 0) : 0).multipliedBy(1e18).toFixed(0).toString(16)
            const clause = method.value(hexValue).asClause(...params)
            return {
                isValid: true,
                to: clause.to || c.contractAddress,
                value: clause.value as string,
                data: clause.data,
                comment: c.note || c.selectedFunction.name
            }
        } catch (e: any) {
            return {
                isValid: false,
                to: c.contractAddress,
                value: '0x0',
                data: '0x',
                error: e && e.message ? e.message : 'Encoding failed'
            }
        }
    }

    private onAdd() {
        const c = makeEmptyClause()
        this.clauses.push(c)
        this.activeId = c.id
        this.markDirty()
    }

    private onRemove(id: string) {
        const idx = this.clauses.findIndex(c => c.id === id)
        if (idx === -1) return
        this.clauses.splice(idx, 1)
        if (this.activeId === id) {
            const next = this.clauses[idx] || this.clauses[idx - 1] || null
            this.activeId = next ? next.id : null
        }
        this.markDirty()
    }

    private onMove(payload: { id: string; delta: number }) {
        const idx = this.clauses.findIndex(c => c.id === payload.id)
        if (idx === -1) return
        const newIdx = idx + payload.delta
        if (newIdx < 0 || newIdx >= this.clauses.length) return
        const [item] = this.clauses.splice(idx, 1)
        this.clauses.splice(newIdx, 0, item)
        this.markDirty()
    }

    private onSelect(id: string) {
        this.activeId = id
    }

    private onUpdateClause(payload: { id: string; patch: Partial<Entities.TxBuilderClause> }) {
        const idx = this.clauses.findIndex(c => c.id === payload.id)
        if (idx === -1) return
        const updated = { ...this.clauses[idx], ...payload.patch }
        this.$set(this.clauses, idx, updated)
        this.markDirty()
    }

    private markDirty() {
        if (this.suppressDirty) return
        this.dirty = true
    }

    private confirmReset() {
        if (this.clauses.length === 0) return
        const proceed = () => {
            this.clauses = []
            this.activeId = null
            this.loadedDraftId = null
            this.dirty = false
        }
        if (!this.dirty) {
            proceed()
            return
        }
        this.$buefy.dialog.confirm({
            title: 'Discard workspace',
            message: 'You have unsaved changes. Clear the workspace anyway?',
            confirmText: 'Discard',
            type: 'is-warning',
            onConfirm: proceed
        })
    }

    private onLoadDraft(d: Entities.TxBuilderDraft) {
        const apply = () => {
            this.suppressDirty = true
            this.clauses = JSON.parse(JSON.stringify(d.clauses || []))
            this.activeId = this.clauses.length > 0 ? this.clauses[0].id : null
            this.loadedDraftId = d.id || null
            this.dirty = false
            this.$nextTick(() => { this.suppressDirty = false })
        }
        if (this.dirty && this.clauses.length > 0) {
            this.$buefy.dialog.confirm({
                title: 'Replace workspace',
                message: 'You have unsaved changes. Load "' + d.name + '" anyway?',
                confirmText: 'Load',
                onConfirm: apply
            })
        } else {
            apply()
        }
    }

    private async onSaveDraft() {
        if (!this.loadedDraftId) return
        await DB.txBuilderDrafts.update(this.loadedDraftId, {
            clauses: JSON.parse(JSON.stringify(this.clauses)),
            updatedTime: Date.now()
        })
        this.dirty = false
        this.$buefy.toast.open({ message: 'Draft saved', type: 'is-success', position: 'is-bottom' })
    }

    private onSaveAsDraft() {
        if (this.clauses.length === 0) return
        this.$buefy.dialog.prompt({
            title: 'Save draft',
            message: 'Give your draft a name (visible only on this network).',
            inputAttrs: { placeholder: 'e.g. monthly payouts', maxlength: 60, required: true },
            onConfirm: async (val: string) => {
                const name = val.trim()
                if (!name) return
                const now = Date.now()
                const id = await DB.txBuilderDrafts.add({
                    name,
                    network: this.network,
                    clauses: JSON.parse(JSON.stringify(this.clauses)),
                    createdTime: now,
                    updatedTime: now
                })
                this.loadedDraftId = typeof id === 'number' ? id : null
                this.dirty = false
                this.$buefy.toast.open({ message: 'Draft saved', type: 'is-success', position: 'is-bottom' })
            }
        })
    }

    private onDraftDeleted(id: number) {
        if (this.loadedDraftId === id) {
            this.loadedDraftId = null
        }
    }

    private onDraftRenamed(_: { id: number; name: string }) {
        // no-op: drafts list reloads itself
    }

    private async submit() {
        if (!this.canSubmit) return
        const clauses = this.encodedClauses
            .filter(e => e.isValid)
            .map(e => ({ to: e.to, value: e.value, data: e.data, comment: e.comment || '' }))

        if (clauses.length === 0) return
        this.submitting = true
        this.submission = { status: 'submitting', txid: null, receipt: null, error: null }
        try {
            const resp = await this.$connex.vendor
                .sign('tx', clauses)
                .comment('Inspector TX Builder')
                .request()
            if (resp && resp.txid) {
                this.submission = { status: 'pending', txid: resp.txid, receipt: null, error: null }
                this.startReceiptPolling(resp.txid)
            } else {
                this.submission = null
            }
        } catch (error: any) {
            const msg = (error && error.message) || ''
            const name = (error && error.name) || ''
            const isUserRejection =
                msg.toLowerCase().includes('rejected') ||
                msg.toLowerCase().includes('cancel') ||
                msg.toLowerCase().includes('denied') ||
                name.toLowerCase().includes('rejected') ||
                name.toLowerCase().includes('cancel')
            if (isUserRejection) {
                this.submission = null
            } else {
                this.submission = {
                    status: 'error',
                    txid: null,
                    receipt: null,
                    error: msg || 'Submission failed'
                }
            }
        } finally {
            this.submitting = false
        }
    }

    private startReceiptPolling(txid: string) {
        this.stopReceiptPolling()
        const timeoutMs = 5 * 12000 // 60s — VeChain block time ~10s
        const startTime = Date.now()

        this.pollIntervalId = window.setInterval(async () => {
            if (!this.submission || this.submission.txid !== txid) {
                this.stopReceiptPolling()
                return
            }
            try {
                const receipt = await this.$connex.thor.transaction(txid).getReceipt()
                if (receipt) {
                    this.submission = {
                        status: receipt.reverted ? 'reverted' : 'confirmed',
                        txid,
                        receipt,
                        error: receipt.reverted ? 'Transaction reverted' : null
                    }
                    this.stopReceiptPolling()
                    return
                }
                if (Date.now() - startTime > timeoutMs) {
                    this.submission = {
                        status: 'timeout',
                        txid,
                        receipt: null,
                        error: null
                    }
                    this.stopReceiptPolling()
                }
            } catch {
                if (Date.now() - startTime > timeoutMs) {
                    this.submission = {
                        status: 'timeout',
                        txid,
                        receipt: null,
                        error: null
                    }
                    this.stopReceiptPolling()
                }
            }
        }, 1000)

        this.pollTimeoutId = window.setTimeout(() => {
            if (this.submission && this.submission.status === 'pending') {
                this.submission = {
                    status: 'timeout',
                    txid,
                    receipt: null,
                    error: null
                }
                this.stopReceiptPolling()
            }
        }, timeoutMs)
    }

    private stopReceiptPolling() {
        if (this.pollIntervalId !== null) {
            clearInterval(this.pollIntervalId)
            this.pollIntervalId = null
        }
        if (this.pollTimeoutId !== null) {
            clearTimeout(this.pollTimeoutId)
            this.pollTimeoutId = null
        }
    }

    private dismissSubmission() {
        this.stopReceiptPolling()
        this.submission = null
    }

    private dismissAndReset() {
        this.dismissSubmission()
        this.clauses = []
        this.activeId = null
        this.loadedDraftId = null
        this.dirty = false
    }

    private beforeDestroy() {
        this.stopReceiptPolling()
    }

    @Watch('network')
    private onNetworkChange() {
        if (this.clauses.length === 0) return
        this.$buefy.dialog.confirm({
            title: 'Network changed',
            message: 'Workspace clauses target the previous network. Clear them?',
            confirmText: 'Clear',
            type: 'is-warning',
            canCancel: ['button'],
            onConfirm: () => {
                this.clauses = []
                this.activeId = null
                this.loadedDraftId = null
                this.dirty = false
            }
        })
    }

    private created() {
        window.scrollTo({ top: 0, left: 0 })
    }
}
</script>

<style lang="scss" scoped>
.tx-builder-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--body-background-alt);
}

.tx-builder-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1.25rem;
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
}

.tx-builder-main {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.clause-list-pane {
    width: 360px;
    border-right: 1px solid var(--border-color);
    background: var(--card-background);
    overflow-y: auto;
    flex-shrink: 0;
}

.clause-editor-pane {
    flex: 1;
    overflow-y: auto;
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
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color-strong);
    margin: 0.5rem 0 0;
}
.empty-desc {
    color: var(--text-color-light);
    max-width: 360px;
    margin-bottom: 0.75rem;
}

.tx-builder-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    background: var(--card-background);
    border-top: 1px solid var(--border-color);
}

.footer-summary {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-color);
}
.summary-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.25rem 0.65rem;
    border-radius: 14px;
    font-size: 0.8rem;
    font-weight: 600;
}
.summary-pill.is-valid {
    background: rgba(50, 175, 50, 0.12);
    color: #228822;
}
.summary-pill.is-pending {
    background: rgba(255, 165, 32, 0.12);
    color: #b88010;
}
.summary-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
}
.is-pending .summary-dot {
    animation: pulse 1.4s ease-in-out infinite;
}
.summary-aux {
    font-size: 0.75rem;
    color: var(--text-color-light);
}

.footer-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.tx-builder-footer.is-submission {
    border-top-width: 2px;
}
.tx-builder-footer.is-submitting,
.tx-builder-footer.is-pending {
    border-top-color: #b88010;
}
.tx-builder-footer.is-confirmed {
    border-top-color: #228822;
}
.tx-builder-footer.is-reverted,
.tx-builder-footer.is-error {
    border-top-color: #ff3860;
}
.tx-builder-footer.is-timeout {
    border-top-color: #b88010;
}

.submission-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
}
.submission-icon {
    flex-shrink: 0;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
}
.is-submitting .submission-icon,
.is-pending .submission-icon,
.is-timeout .submission-icon {
    color: #b88010;
}
.is-confirmed .submission-icon {
    color: #228822;
}
.is-reverted .submission-icon,
.is-error .submission-icon {
    color: #ff3860;
}
.submission-text {
    flex: 1;
    min-width: 0;
}
.submission-status {
    font-weight: 600;
    color: var(--text-color-strong);
    font-size: 0.9rem;
}
.submission-meta {
    margin-top: 0.15rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--text-color-light);
    flex-wrap: wrap;
}
.submission-txid {
    color: var(--text-color);
    font-weight: 600;
}
.submission-link {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    color: var(--primary-color);
    text-decoration: none;
}
.submission-link:hover {
    text-decoration: underline;
}
.submission-aux {
    color: var(--text-color-light);
}
.submission-error {
    color: #ff3860;
}

::v-deep .fa-spin {
    animation: fa-spin 1.2s linear infinite;
}
@keyframes fa-spin {
    to { transform: rotate(360deg); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

@media (max-width: 768px) {
    .tx-builder-main {
        flex-direction: column;
    }
    .clause-list-pane {
        width: 100%;
        max-height: 40vh;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
    }
}

[data-theme="dark"] {
    .summary-pill.is-valid {
        background: rgba(80, 220, 80, 0.18);
        color: #6be86b;
    }
    .summary-pill.is-pending {
        background: rgba(255, 180, 30, 0.18);
        color: #ffd766;
    }
}
</style>
