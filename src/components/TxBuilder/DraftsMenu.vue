<template>
    <div class="drafts-menu">
        <b-dropdown aria-role="list" position="is-bottom-right" append-to-body>
            <template #trigger>
                <button type="button" class="trigger-btn">
                    <b-icon icon="folder-open" size="is-small" />
                    <span class="trigger-label">
                        {{ currentDraft ? currentDraft.name : 'Untitled draft' }}
                    </span>
                    <span
                        v-if="dirty && currentDraft"
                        class="dirty-dot"
                        title="Unsaved changes"
                    ></span>
                    <b-icon icon="caret-down" size="is-small" />
                </button>
            </template>

            <b-dropdown-item custom>
                <span class="section-label">Drafts · this network only</span>
            </b-dropdown-item>

            <b-dropdown-item v-if="drafts.length === 0" custom>
                <span class="has-text-grey-light">No drafts saved yet</span>
            </b-dropdown-item>

            <b-dropdown-item
                v-for="d in drafts"
                :key="d.id"
                custom
                class="draft-row"
            >
                <div class="draft-row__main" @click="$emit('load', d)">
                    <div class="draft-row__name">
                        {{ d.name }}
                        <span v-if="loadedDraftId === d.id" class="badge-loaded">loaded</span>
                    </div>
                    <div class="draft-row__meta">
                        {{ d.clauses.length }} clause{{ d.clauses.length === 1 ? '' : 's' }} · {{ formatTime(d.updatedTime) }}
                    </div>
                </div>
                <div class="draft-row__actions">
                    <button type="button" class="icon-btn" title="Rename" @click.stop="onRename(d)">
                        <b-icon icon="pen" size="is-small" />
                    </button>
                    <button type="button" class="icon-btn icon-btn--danger" title="Delete" @click.stop="onDelete(d)">
                        <b-icon icon="trash" size="is-small" />
                    </button>
                </div>
            </b-dropdown-item>

            <hr class="dropdown-divider" />

            <b-dropdown-item :disabled="!loadedDraftId || !dirty" @click="$emit('save')">
                <b-icon icon="save" size="is-small" />
                <span>Save</span>
            </b-dropdown-item>
            <b-dropdown-item :disabled="!workspaceHasContent" @click="$emit('save-as')">
                <b-icon icon="save" size="is-small" />
                <span>Save as…</span>
            </b-dropdown-item>
        </b-dropdown>

        <div v-if="loadedDraftId && currentDraft" class="loaded-indicator">
            <b-icon
                icon="circle"
                size="is-small"
                :class="{ 'has-text-warning': dirty, 'has-text-success': !dirty }"
            />
            <span v-if="dirty" class="loaded-dirty">unsaved changes</span>
            <span v-else class="loaded-saved">saved</span>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import DB, { Entities } from '../../database'

@Component
export default class DraftsMenu extends Vue {
    @Prop({ required: true }) network!: string
    @Prop({ default: null }) loadedDraftId!: number | null
    @Prop({ default: false }) dirty!: boolean
    @Prop({ default: false }) workspaceHasContent!: boolean

    private drafts: Entities.TxBuilderDraft[] = []

    get currentDraft(): Entities.TxBuilderDraft | null {
        if (this.loadedDraftId === null) return null
        return this.drafts.find(d => d.id === this.loadedDraftId) || null
    }

    private async reload() {
        if (!this.network) {
            this.drafts = []
            return
        }
        this.drafts = await DB.txBuilderDrafts
            .where('network')
            .equals(this.network)
            .reverse()
            .sortBy('updatedTime')
    }

    private formatTime(t: number) {
        const d = new Date(t)
        const today = new Date()
        if (d.toDateString() === today.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        return d.toLocaleDateString()
    }

    private onRename(d: Entities.TxBuilderDraft) {
        this.$buefy.dialog.prompt({
            title: 'Rename draft',
            message: 'Enter a new name for this draft.',
            inputAttrs: { value: d.name, maxlength: 60, required: true },
            onConfirm: async (val: string) => {
                const name = val.trim()
                if (!name) return
                await DB.txBuilderDrafts.update(d.id!, { name, updatedTime: Date.now() })
                await this.reload()
                this.$emit('renamed', { id: d.id, name })
            }
        })
    }

    private onDelete(d: Entities.TxBuilderDraft) {
        this.$buefy.dialog.confirm({
            title: 'Delete draft',
            message: `Delete draft "${d.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            type: 'is-danger',
            onConfirm: async () => {
                await DB.txBuilderDrafts.delete(d.id!)
                await this.reload()
                this.$emit('deleted', d.id)
            }
        })
    }

    @Watch('network')
    private onNetworkChange() {
        this.reload()
    }

    created() {
        this.reload()
        DB.subscribe('txBuilderDrafts', () => this.reload())
    }
}
</script>

<style lang="scss" scoped>
.drafts-menu {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    color: var(--text-color);
    font-size: 0.8rem;
    text-align: left;
    min-width: 0;
    max-width: 280px;
}
.trigger-btn:hover {
    border-color: var(--primary-color, #485fc7);
}
.trigger-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-color-strong);
    font-weight: 600;
}
.dirty-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d4a017;
    flex-shrink: 0;
}

::v-deep .dropdown-menu {
    min-width: 300px;
}
::v-deep .dropdown-content {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
::v-deep .dropdown-item {
    color: var(--text-color);
}
::v-deep .dropdown-item:hover {
    background-color: var(--body-background-alt);
    color: var(--text-color-strong);
}
::v-deep .dropdown-item.is-disabled,
::v-deep .dropdown-item[disabled] {
    opacity: 0.45;
    cursor: not-allowed;
}
::v-deep .dropdown-divider {
    background-color: var(--border-color);
}
.section-label {
    font-size: 0.7rem;
    color: var(--text-color-light);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.draft-row {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem !important;
    gap: 0.5rem;
}
.draft-row__main {
    flex: 1;
    min-width: 0;
    cursor: pointer;
}
.draft-row__name {
    font-weight: 600;
    color: var(--text-color-strong);
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.draft-row__meta {
    font-size: 0.7rem;
    color: var(--text-color-light);
}
.badge-loaded {
    font-size: 0.6rem;
    padding: 0.05rem 0.4rem;
    border-radius: 6px;
    background: rgba(50, 115, 220, 0.15);
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.draft-row__actions {
    display: flex;
    gap: 0.2rem;
    flex-shrink: 0;
}
.icon-btn {
    border: none;
    background: transparent;
    color: var(--text-color-light);
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 4px;
}
.icon-btn:hover {
    color: var(--text-color-strong);
    background: var(--body-background-alt);
}
.icon-btn--danger:hover {
    color: #ff3860;
}

.loaded-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    flex-shrink: 0;
}
.loaded-dirty {
    color: #b88010;
}
.loaded-saved {
    color: #2e8b57;
}
</style>
