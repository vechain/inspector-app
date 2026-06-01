<template>
    <div class="projects-menu">
        <b-dropdown aria-role="list" position="is-bottom-right" append-to-body>
            <template #trigger>
                <button type="button" class="trigger-btn">
                    <b-icon icon="folder-open" size="is-small" />
                    <span class="trigger-label">
                        {{ currentProject ? currentProject.name : 'Untitled project' }}
                    </span>
                    <span v-if="dirty && currentProject" class="dirty-dot" title="Unsaved changes"></span>
                    <b-icon icon="caret-down" size="is-small" />
                </button>
            </template>

            <b-dropdown-item custom>
                <span class="section-label">Projects</span>
            </b-dropdown-item>

            <b-dropdown-item v-if="projects.length === 0" custom>
                <span class="has-text-grey-light">No projects saved yet</span>
            </b-dropdown-item>

            <b-dropdown-item
                v-for="p in projects"
                :key="p.id"
                custom
                class="project-row"
            >
                <div class="project-row__main" @click="$emit('load', p)">
                    <div class="project-row__name">
                        {{ p.name }}
                        <span v-if="loadedProjectId === p.id" class="badge-loaded">loaded</span>
                    </div>
                    <div class="project-row__meta">
                        {{ fileCount(p) }} file{{ fileCount(p) === 1 ? '' : 's' }} ·
                        {{ formatTime(p.updatedTime) }}
                    </div>
                </div>
                <div class="project-row__actions">
                    <button type="button" class="icon-btn" title="Rename" @click.stop="onRename(p)">
                        <b-icon icon="pen" size="is-small" />
                    </button>
                    <button
                        type="button"
                        class="icon-btn icon-btn--danger"
                        title="Delete"
                        @click.stop="onDelete(p)"
                    >
                        <b-icon icon="trash" size="is-small" />
                    </button>
                </div>
            </b-dropdown-item>

            <hr class="dropdown-divider" />

            <b-dropdown-item :disabled="!loadedProjectId || !dirty" @click="$emit('save')">
                <b-icon icon="save" size="is-small" />
                <span>Save</span>
            </b-dropdown-item>
            <b-dropdown-item :disabled="!workspaceHasContent" @click="$emit('save-as')">
                <b-icon icon="save" size="is-small" />
                <span>Save as…</span>
            </b-dropdown-item>
            <b-dropdown-item @click="$emit('new')">
                <b-icon icon="plus" size="is-small" />
                <span>New blank project</span>
            </b-dropdown-item>
        </b-dropdown>

        <div v-if="loadedProjectId && currentProject" class="loaded-indicator">
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
import { Vue, Component, Prop } from 'vue-property-decorator'
import DB, { Entities } from '@/database'

@Component
export default class SourceProjectsMenu extends Vue {
    @Prop({ default: null }) loadedProjectId!: number | null
    @Prop({ default: false }) dirty!: boolean
    @Prop({ default: false }) workspaceHasContent!: boolean

    projects: Entities.SourceProject[] = []

    get currentProject(): Entities.SourceProject | null {
        if (this.loadedProjectId === null) return null
        return this.projects.find((p) => p.id === this.loadedProjectId) || null
    }

    private fileCount(p: Entities.SourceProject): number {
        return Object.keys(p.files || {}).length
    }

    private async reload() {
        this.projects = await DB.sourceProjects
            .orderBy('updatedTime')
            .reverse()
            .toArray()
    }

    private formatTime(t: number) {
        const d = new Date(t)
        const today = new Date()
        if (d.toDateString() === today.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        return d.toLocaleDateString()
    }

    private onRename(p: Entities.SourceProject) {
        ;(this as any).$buefy.dialog.prompt({
            title: 'Rename project',
            message: 'Enter a new name for this project.',
            inputAttrs: { value: p.name, maxlength: 60, required: true },
            onConfirm: async (val: string) => {
                const name = val.trim()
                if (!name) return
                await DB.sourceProjects.update(p.id!, {
                    name,
                    updatedTime: Date.now(),
                })
                await this.reload()
                this.$emit('renamed', { id: p.id, name })
            },
        })
    }

    private onDelete(p: Entities.SourceProject) {
        ;(this as any).$buefy.dialog.confirm({
            title: 'Delete project',
            message: `Delete project "${p.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            type: 'is-danger',
            onConfirm: async () => {
                await DB.sourceProjects.delete(p.id!)
                await this.reload()
                this.$emit('deleted', p.id)
            },
        })
    }

    created() {
        this.reload()
        DB.subscribe('sourceProjects', () => this.reload())
    }
}
</script>

<style lang="scss" scoped>
.projects-menu {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
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
    width: 100%;
    text-align: left;
    min-width: 0;
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
.project-row {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem !important;
    gap: 0.5rem;
}
.project-row__main {
    flex: 1;
    min-width: 0;
    cursor: pointer;
}
.project-row__name {
    font-weight: 600;
    color: var(--text-color-strong);
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.project-row__meta {
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
.project-row__actions {
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
