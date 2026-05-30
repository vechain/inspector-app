<template>
    <section class="deploy-layout">
        <div class="deploy-header">
            <div class="mode-tabs">
                <button
                    v-for="m in modes"
                    :key="m.id"
                    type="button"
                    class="mode-tab"
                    :class="{ active: mode === m.id }"
                    @click="onModeChange(m.id)"
                >
                    <b-icon :icon="m.icon" size="is-small" />
                    <span>{{ m.label }}</span>
                </button>
            </div>
            <div class="header-meta">
                <span class="meta-pill">
                    <span class="meta-dot"></span>
                    {{ modeBlurb }}
                </span>
            </div>
        </div>

        <TemplateMode
            v-if="mode === 'template'"
            :network="network"
            :existing-categories="existingCategories"
        />
        <SourceMode
            v-else-if="mode === 'source'"
            :network="network"
            :existing-categories="existingCategories"
        />
        <BytecodeMode
            v-else
            :network="network"
            :existing-categories="existingCategories"
        />
    </section>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import BytecodeMode from '@/components/Deploy/BytecodeMode.vue'
import TemplateMode from '@/components/Deploy/TemplateMode.vue'
import DB from '@/database'

const SourceMode = () =>
    import(/* webpackChunkName: "deploy-source-mode" */ '@/components/Deploy/SourceMode.vue')

type DeployMode = 'template' | 'source' | 'bytecode'

@Component({ components: { BytecodeMode, TemplateMode, SourceMode } })
export default class DeployContract extends Vue {
    mode: DeployMode = 'template'
    existingCategories: string[] = []

    readonly modes: { id: DeployMode; label: string; icon: string; blurb: string }[] = [
        {
            id: 'template',
            label: 'Template',
            icon: 'th-large',
            blurb: 'Pick a pre-built contract and fill its arguments',
        },
        {
            id: 'source',
            label: 'Source',
            icon: 'code',
            blurb: 'Paste Solidity, compile, deploy',
        },
        {
            id: 'bytecode',
            label: 'Bytecode',
            icon: 'cube',
            blurb: 'Deploy raw creation bytecode',
        },
    ]

    get network(): string {
        return (this as any).$connex.thor.genesis.id
    }

    get modeBlurb(): string {
        return this.modes.find((m) => m.id === this.mode)?.blurb || ''
    }

    onModeChange(id: DeployMode) {
        this.mode = id
    }

    private async created() {
        ;(this as any).$ga.page('/inspector/deploy')
        await this.loadCategories()
    }

    private async loadCategories() {
        try {
            const all = await DB.contracts.toArray()
            const set = new Set<string>()
            for (const c of all) {
                if (c.category && c.category.trim() !== '') set.add(c.category)
            }
            this.existingCategories = Array.from(set).sort()
        } catch {
            this.existingCategories = []
        }
    }
}
</script>

<style lang="scss" scoped>
.deploy-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--body-background-alt);
    min-height: 0;
}

.deploy-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 1.25rem;
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    flex-shrink: 0;
}

.mode-tabs {
    display: inline-flex;
    padding: 3px;
    border-radius: 9px;
    background: var(--body-background-alt);
    border: 1px solid var(--border-color);
    gap: 2px;
}

.mode-tab {
    border: 0;
    background: transparent;
    padding: 0.35rem 0.9rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-color-light);
    border-radius: 6px;
    transition: background 0.18s ease, color 0.18s ease,
        box-shadow 0.18s ease, transform 0.05s ease;
    position: relative;
}
.mode-tab .icon {
    font-size: 0.78rem;
}
.mode-tab:hover:not(.active) {
    color: var(--text-color-strong);
}
.mode-tab:active:not(.active) {
    transform: scale(0.97);
}
.mode-tab.active {
    background: var(--card-background);
    color: var(--text-color-strong);
    font-weight: 600;
    box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(0, 0, 0, 0.04);
}
.mode-tab.active .icon {
    color: var(--primary-color, #485fc7);
}

[data-theme='dark'] .mode-tab.active {
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.06);
}

.header-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.25rem 0.65rem;
    border-radius: 14px;
    font-size: 0.78rem;
    color: var(--text-color-light);
    background: var(--body-background-alt);
}
.meta-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--primary-color, #485fc7);
}

@media (max-width: 768px) {
    .deploy-header {
        padding: 0.5rem 0.75rem;
    }
}
</style>
