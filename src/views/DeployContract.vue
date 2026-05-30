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
                    @click="mode = m.id"
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

        <div class="deploy-main">
            <div class="deploy-content">
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
            </div>
        </div>
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
            icon: 'view-list-outline',
            blurb: 'Pick a pre-built contract and fill its arguments',
        },
        {
            id: 'source',
            label: 'Source',
            icon: 'code-tags',
            blurb: 'Paste Solidity, compile, deploy',
        },
        {
            id: 'bytecode',
            label: 'Bytecode',
            icon: 'cube-outline',
            blurb: 'Deploy raw creation bytecode',
        },
    ]

    get network(): string {
        return (this as any).$connex.thor.genesis.id
    }

    get modeBlurb(): string {
        return this.modes.find((m) => m.id === this.mode)?.blurb || ''
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
}

.mode-tabs {
    display: inline-flex;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;
    background: var(--body-background-alt);
}

.mode-tab {
    border: 0;
    background: transparent;
    padding: 0.4rem 0.9rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-color);
    transition: background 0.15s, color 0.15s;
}
.mode-tab + .mode-tab {
    border-left: 1px solid var(--border-color);
}
.mode-tab.active {
    background: var(--primary-color, #485fc7);
    color: white;
}
.mode-tab:hover:not(.active) {
    background: var(--hover-bg, rgba(0, 0, 0, 0.04));
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

.deploy-main {
    flex: 1;
    overflow-y: auto;
    background: var(--body-background-alt);
}

.deploy-content {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.25rem;
}

@media (max-width: 768px) {
    .deploy-header {
        padding: 0.5rem 0.75rem;
    }
    .deploy-content {
        padding: 0.75rem;
    }
}
</style>
