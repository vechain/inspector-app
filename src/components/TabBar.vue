<template>
    <div class="tab-bar" v-if="openContracts.length > 0">
        <!-- Tabs Container -->
        <div class="tabs-container">
            <div 
                v-for="contract in sortedContracts" 
                :key="contract.id"
                class="tab-item"
                :class="{ 'is-active': activeContractId === contract.id, 'is-pinned': isPinned(contract.id) }"
                @click="selectTab(contract.id)"
            >
                <button 
                    v-if="isPinned(contract.id)"
                    class="tab-pin pinned"
                    @click.stop="unpinTab(contract.id)"
                    title="Unpin tab"
                >
                    <b-icon icon="thumbtack" size="is-small"></b-icon>
                </button>
                <span class="tab-name">{{ contract.name }}</span>
                <div class="tab-actions">
                    <button 
                        v-if="!isPinned(contract.id)"
                        class="tab-pin"
                        @click.stop="pinTab(contract.id)"
                        title="Pin tab"
                    >
                        <b-icon icon="thumbtack" size="is-small"></b-icon>
                    </button>
                    <button 
                        class="tab-close"
                        @click.stop="closeTab(contract.id)"
                        title="Close tab"
                    >
                        <b-icon icon="times" size="is-small"></b-icon>
                    </button>
                </div>
            </div>
        </div>

        <!-- Tab Count Badge -->
        <div class="tab-count">
            {{ openContracts.length }}
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

interface OpenContract {
    id: number
    name: string
    address: string
}

@Component
export default class TabBar extends Vue {
    @Prop({ required: true })
    private openContracts!: OpenContract[]

    @Prop({ default: null })
    private activeContractId!: number | null

    @Prop({ default: () => new Set() })
    private pinnedTabs!: Set<number>

    get sortedContracts(): OpenContract[] {
        const pinned = this.openContracts.filter(c => this.pinnedTabs.has(c.id))
        const unpinned = this.openContracts.filter(c => !this.pinnedTabs.has(c.id))
        return [...pinned, ...unpinned]
    }

    isPinned(id: number): boolean {
        return this.pinnedTabs.has(id)
    }

    selectTab(id: number) {
        this.$emit('select-tab', id)
    }

    closeTab(id: number) {
        this.$emit('close-tab', id)
    }

    pinTab(id: number) {
        this.$emit('pin-tab', id)
    }

    unpinTab(id: number) {
        this.$emit('unpin-tab', id)
    }
}
</script>

<style lang="css" scoped>
.tab-bar {
    display: flex;
    align-items: center;
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
    height: 48px;
    flex-shrink: 0;
}

.tabs-container {
    display: flex;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
}

.tabs-container::-webkit-scrollbar {
    height: 4px;
}

.tabs-container::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
}

.tabs-container::-webkit-scrollbar-thumb:hover {
    background: var(--text-color-light);
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-right: 1px solid var(--border-color);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s;
    position: relative;
    flex-shrink: 0;
}

.tab-item:hover {
    background: var(--body-background-alt);
}

.tab-item.is-active {
    background: var(--body-background-alt);
    border-bottom: 2px solid var(--primary-color);
}

.tab-item.is-pinned {
    background: var(--body-background-alt);
}

.tab-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tab-item.is-active .tab-name {
    color: var(--primary-color);
    font-weight: 600;
}

.tab-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
}

.tab-item:hover .tab-actions {
    opacity: 1;
}

.tab-pin,
.tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    color: var(--text-color-light);
}

.tab-pin.pinned {
    opacity: 1;
    color: var(--primary-color);
}

.tab-pin:hover {
    background: var(--primary-color);
    color: white;
}

.tab-close:hover {
    background: var(--danger-color);
    color: white;
}

.tab-count {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-light);
    background: var(--body-background-alt);
    border-left: 1px solid var(--border-color);
    height: 100%;
    min-width: 48px;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
    .tab-item {
        padding: 0.5rem 0.75rem;
        font-size: 0.8rem;
    }

    .tab-name {
        max-width: 100px;
        font-size: 0.8rem;
    }

    .tab-count {
        min-width: 40px;
        padding: 0 0.5rem;
        font-size: 0.7rem;
    }
}

@media (max-width: 480px) {
    .tab-item {
        padding: 0.4rem 0.6rem;
    }

    .tab-name {
        max-width: 80px;
        font-size: 0.75rem;
    }

    .tab-pin,
    .tab-close {
        width: 18px;
        height: 18px;
    }
}
</style>

