<template>
    <section class="debugger-layout">
        <!-- Tab bar: each submitted search becomes its own tab so users can
             pivot to inspect something else without losing prior state. -->
        <div v-if="tabs.length" class="tab-bar">
            <div
                v-for="tab in tabs"
                :key="tab.id"
                class="tab"
                :class="{ 'is-active': tab.id === activeTabId }"
                @click="selectTab(tab.id)"
                :title="tab.value"
            >
                <span class="tab-kind">{{ kindLabel(tab.kind) }}</span>
                <input
                    v-if="editingTabId === tab.id"
                    ref="renameInput"
                    v-model="editingValue"
                    class="tab-rename"
                    @keyup.enter="commitRename(tab)"
                    @keyup.esc="cancelRename"
                    @blur="commitRename(tab)"
                    @click.stop
                    @dblclick.stop
                />
                <span
                    v-else
                    class="tab-label"
                    @dblclick.stop="startRename(tab)"
                    title="Double-click to rename"
                >{{ tab.label }}</span>
                <button
                    type="button"
                    class="tab-close"
                    @click.stop="closeTab(tab.id)"
                    aria-label="Close tab"
                >×</button>
            </div>
        </div>

        <div class="debugger-input-bar">
            <b-field class="input-field" expanded>
                <b-input
                    v-model="rawInput"
                    placeholder="Paste a tx hash, calldata, 4-byte selector, topic0, or address (0x…)"
                    icon="search"
                    @keyup.native.enter="onSubmit"
                    expanded
                />
            </b-field>
            <button
                type="button"
                class="button is-primary"
                :disabled="!canSubmit"
                :class="{ 'is-loading': resolving }"
                @click="onSubmit"
            >
                Inspect
            </button>
        </div>

        <div class="debugger-content">
            <div v-if="!tabs.length && !resolving && !errorMsg" class="empty-state">
                <b-icon icon="search-plus" size="is-large" custom-class="has-text-grey-light"></b-icon>
                <p class="empty-title">Inspect anything on-chain</p>
                <p class="empty-desc">
                    Paste one of the following to investigate it — each search opens in its own tab:
                </p>
                <ul class="accepted-list">
                    <li><strong>Transaction hash</strong> — full forensics (clauses, events, revert reason)</li>
                    <li><strong>Calldata</strong> — decode against your imported ABIs</li>
                    <li><strong>4-byte selector</strong> — find the matching function</li>
                    <li><strong>Event topic0</strong> — find the matching event</li>
                    <li><strong>Address</strong> — bytecode, proxy detection, ERC sniff</li>
                </ul>
            </div>

            <div v-if="errorMsg" class="error-state">
                <b-icon icon="exclamation-triangle" size="is-medium" custom-class="has-text-warning"></b-icon>
                <p class="error-text">{{ errorMsg }}</p>
            </div>

            <!-- Render every tab's panel and toggle visibility via v-show, so
                 inactive panels stay mounted and preserve their state (loaded
                 receipts, decoded args, traces, Sourcify/b32 enrichments). -->
            <template v-for="tab in tabs">
                <div
                    :key="tab.id"
                    v-show="tab.id === activeTabId"
                    class="tab-panel"
                >
                    <TxForensicsPanel v-if="tab.kind === 'tx'" :value="tab.value" />
                    <Topic0LookupPanel v-else-if="tab.kind === 'topic0'" :value="tab.value" />
                    <SelectorLookupPanel v-else-if="tab.kind === 'selector'" :value="tab.value" />
                    <CalldataDecoderPanel v-else-if="tab.kind === 'calldata'" :value="tab.value" />
                    <AddressInspectorPanel v-else-if="tab.kind === 'address'" :value="tab.value" />
                </div>
            </template>
        </div>
    </section>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import { classify, resolveTxOrTopic0, ClassifiedInput, DebuggerInputKind } from '../utils/input-classifier'
import TxForensicsPanel from '../components/Debugger/TxForensicsPanel.vue'
import SelectorLookupPanel from '../components/Debugger/SelectorLookupPanel.vue'
import Topic0LookupPanel from '../components/Debugger/Topic0LookupPanel.vue'
import CalldataDecoderPanel from '../components/Debugger/CalldataDecoderPanel.vue'
import AddressInspectorPanel from '../components/Debugger/AddressInspectorPanel.vue'

type ResolvedKind = Exclude<DebuggerInputKind, 'tx_or_topic0' | 'unknown'>

interface DebuggerTab {
    id: string
    kind: ResolvedKind
    value: string
    label: string
}

let _tabCounter = 0
function nextTabId(): string {
    _tabCounter += 1
    return `t${Date.now().toString(36)}${_tabCounter}`
}

// localStorage key for the Debugger's tab list + active tab. Refreshing the
// page rebuilds the JS context (keep-alive only protects same-session route
// changes), so we serialize the slim state here and restore on mount. Per-tab
// panel state (loaded receipts, traces, etc.) is re-fetched on remount — the
// b32 / Sourcify / OpenChain Dexie caches keep that fast.
//
// Keyed by genesis ID so each network (main / test / solo / custom) keeps an
// independent tab set. Otherwise testnet would inherit mainnet hashes that
// don't resolve, and vice versa.
const STORAGE_KEY_BASE = 'debugger-tabs-v1'

function storageKey(genesisId: string): string {
    return `${STORAGE_KEY_BASE}:${genesisId}`
}

interface PersistedState {
    tabs: DebuggerTab[]
    activeTabId: string | null
}

function loadPersisted(genesisId: string): PersistedState | null {
    try {
        const raw = localStorage.getItem(storageKey(genesisId))
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || !Array.isArray(parsed.tabs)) return null
        return parsed as PersistedState
    } catch {
        return null
    }
}

function savePersisted(genesisId: string, state: PersistedState) {
    try {
        localStorage.setItem(storageKey(genesisId), JSON.stringify(state))
    } catch {
        // quota exceeded or storage disabled — ignore
    }
}

function shortHex(v: string, head = 8, tail = 4): string {
    if (!v) return ''
    if (v.length <= head + tail + 2) return v
    return v.slice(0, 2 + head) + '…' + v.slice(-tail)
}

function makeLabel(kind: ResolvedKind, value: string): string {
    switch (kind) {
        case 'tx':       return shortHex(value, 8, 4)
        case 'topic0':   return shortHex(value, 8, 4)
        case 'selector': return value
        case 'calldata': return shortHex(value, 6, 4)
        case 'address':  return shortHex(value, 6, 4)
    }
}

@Component({
    name: 'Debugger',
    components: {
        TxForensicsPanel,
        SelectorLookupPanel,
        Topic0LookupPanel,
        CalldataDecoderPanel,
        AddressInspectorPanel
    }
})
export default class Debugger extends Vue {
    private rawInput: string = ''
    private tabs: DebuggerTab[] = []
    private activeTabId: string | null = null
    private resolving: boolean = false
    private errorMsg: string = ''
    private editingTabId: string | null = null
    private editingValue: string = ''
    private restored: boolean = false

    private created() {
        const state = loadPersisted(this.$connex.thor.genesis.id)
        if (!state) {
            this.restored = true
            return
        }
        // Re-mint IDs on restore so they can't collide with anything new minted
        // during this session by nextTabId(). Re-point activeTabId at the
        // remapped value if it still exists.
        const idMap = new Map<string, string>()
        const restoredTabs: DebuggerTab[] = state.tabs
            .filter((t) => t && t.kind && t.value)
            .map((t) => {
                const newId = nextTabId()
                idMap.set(t.id, newId)
                return {
                    id: newId,
                    kind: t.kind,
                    value: t.value,
                    label: t.label || makeLabel(t.kind, t.value)
                }
            })
        this.tabs = restoredTabs
        if (state.activeTabId && idMap.has(state.activeTabId)) {
            this.activeTabId = idMap.get(state.activeTabId) || null
        } else {
            this.activeTabId = restoredTabs.length ? restoredTabs[restoredTabs.length - 1].id : null
        }
        this.restored = true
    }

    @Watch('tabs', { deep: true })
    private onTabsChanged() {
        if (!this.restored) return
        savePersisted(this.$connex.thor.genesis.id, {
            tabs: this.tabs,
            activeTabId: this.activeTabId
        })
    }

    @Watch('activeTabId')
    private onActiveTabIdChanged() {
        if (!this.restored) return
        savePersisted(this.$connex.thor.genesis.id, {
            tabs: this.tabs,
            activeTabId: this.activeTabId
        })
    }

    get canSubmit(): boolean {
        return !!this.rawInput.trim() && !this.resolving
    }

    private kindLabel(kind: ResolvedKind): string {
        switch (kind) {
            case 'tx':       return 'tx'
            case 'topic0':   return 'topic0'
            case 'selector': return 'fn'
            case 'calldata': return 'data'
            case 'address':  return 'addr'
        }
    }

    private openOrFocusTab(kind: ResolvedKind, value: string) {
        // De-dupe: if an identical tab is already open, just focus it.
        const existing = this.tabs.find((t) => t.kind === kind && t.value === value)
        if (existing) {
            this.activeTabId = existing.id
            return
        }
        const tab: DebuggerTab = {
            id: nextTabId(),
            kind,
            value,
            label: makeLabel(kind, value)
        }
        this.tabs.push(tab)
        this.activeTabId = tab.id
    }

    private async onSubmit() {
        if (!this.canSubmit) return
        this.errorMsg = ''
        const classified: ClassifiedInput = classify(this.rawInput)

        if (classified.kind === 'unknown') {
            this.errorMsg = 'Unrecognized input. Expected a 0x-prefixed hex value.'
            return
        }

        if (classified.kind === 'tx_or_topic0') {
            this.resolving = true
            try {
                const resolved = await resolveTxOrTopic0(this.$connex, classified.value)
                this.openOrFocusTab(resolved, classified.value)
                this.rawInput = ''
            } catch (e: any) {
                this.errorMsg = e && e.message ? e.message : 'Failed to resolve input.'
            } finally {
                this.resolving = false
            }
            return
        }

        this.openOrFocusTab(classified.kind as ResolvedKind, classified.value)
        this.rawInput = ''
    }

    private selectTab(id: string) {
        this.activeTabId = id
        this.errorMsg = ''
    }

    private closeTab(id: string) {
        const idx = this.tabs.findIndex((t) => t.id === id)
        if (idx === -1) return
        this.tabs.splice(idx, 1)
        if (this.activeTabId === id) {
            const next = this.tabs[idx] || this.tabs[idx - 1] || null
            this.activeTabId = next ? next.id : null
        }
        if (this.editingTabId === id) {
            this.editingTabId = null
        }
    }

    private startRename(tab: DebuggerTab) {
        this.editingTabId = tab.id
        this.editingValue = tab.label
        this.$nextTick(() => {
            const refs = this.$refs.renameInput as any
            const el = Array.isArray(refs) ? refs[0] : refs
            if (el && typeof el.focus === 'function') {
                el.focus()
                if (typeof el.select === 'function') el.select()
            }
        })
    }

    private commitRename(tab: DebuggerTab) {
        if (this.editingTabId !== tab.id) return
        const trimmed = this.editingValue.trim()
        // Empty input resets to the auto-generated label, so users can revert
        // to the default by clearing.
        const idx = this.tabs.findIndex((t) => t.id === tab.id)
        if (idx !== -1) {
            this.$set(this.tabs, idx, {
                ...this.tabs[idx],
                label: trimmed || makeLabel(tab.kind, tab.value)
            })
        }
        this.editingTabId = null
    }

    private cancelRename() {
        this.editingTabId = null
    }
}
</script>

<style lang="scss" scoped>
.debugger-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--body-background-alt);
}

.tab-bar {
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
    padding: 0.4rem 1rem 0;
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    overflow-y: hidden;
}

.tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.55rem 0.4rem 0.7rem;
    background: var(--code-bg);
    border: 1px solid var(--border-color);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    font-size: 0.78rem;
    color: var(--text-color-light);
    user-select: none;
    transition: background 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
    max-width: 240px;
    min-width: 0;
    position: relative;
    top: 1px;
}
.tab:hover {
    background: var(--hover-bg);
    color: var(--text-color);
}
.tab.is-active {
    background: var(--body-background-alt);
    color: var(--text-color);
    border-color: var(--border-color);
    border-bottom: 1px solid var(--body-background-alt);
    z-index: 1;
}
/* Primary-coloured accent line at the top of the active tab — matches the
   active-contract treatment in Contract.vue (border-left there). */
.tab.is-active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--primary-color);
    border-radius: 6px 6px 0 0;
}

.tab-kind {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    background: rgba(50, 115, 220, 0.18);
    color: var(--primary-color);
    flex-shrink: 0;
}

.tab-label {
    font-family: monospace;
    font-size: 0.78rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    cursor: text;
}

.tab-rename {
    font-family: monospace;
    font-size: 0.78rem;
    background: var(--card-background);
    color: var(--text-color);
    border: 1px solid var(--primary-color);
    border-radius: 3px;
    padding: 0.05rem 0.3rem;
    min-width: 0;
    width: 12ch;
    outline: none;
}

.tab-close {
    background: transparent;
    border: none;
    color: var(--text-color-light);
    cursor: pointer;
    font-size: 1.05rem;
    line-height: 1;
    padding: 0 0.15rem;
    border-radius: 3px;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;
}
.tab-close:hover {
    background: var(--hover-bg);
    color: var(--text-color);
}

.debugger-input-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
}

.input-field {
    flex: 1;
    margin-bottom: 0 !important;
}

.debugger-content {
    flex: 1;
    overflow-y: auto;
    position: relative;
}

.tab-panel {
    /* Inactive tabs are hidden with v-show=false so they keep their state. */
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
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0.5rem 0 0.25rem;
}

.empty-desc {
    color: var(--text-color-light);
    margin-bottom: 0.5rem;
}

.accepted-list {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
    color: var(--text-color-light);
    font-size: 0.9rem;
    line-height: 1.8;
}

.accepted-list strong {
    color: var(--text-color);
    font-weight: 600;
}

.error-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 165, 32, 0.1);
    border: 1px solid rgba(255, 165, 32, 0.3);
    border-radius: 6px;
    color: var(--text-color);
}

.error-text {
    margin: 0;
    font-size: 0.9rem;
}
</style>
