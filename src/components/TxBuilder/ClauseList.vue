<template>
    <div class="clause-list">
        <div class="clause-list__header">
            <span class="clause-list__title">Clauses</span>
            <span class="clause-list__count">{{ clauses.length }}</span>
        </div>

        <div
            v-for="(clause, index) in clauses"
            :key="clause.id"
            class="clause-card"
            :class="{ 'is-active': clause.id === activeId, 'is-invalid': encoded[index] && !encoded[index].isValid }"
            @click="$emit('select', clause.id)"
        >
            <div class="clause-card__index">{{ index + 1 }}</div>
            <div class="clause-card__body">
                <div class="clause-card__title">
                    {{ clauseTitle(clause) }}
                </div>
                <div class="clause-card__sub">
                    <span v-if="clause.contractName" class="contract-tag">{{ clause.contractName }}</span>
                    <span v-if="clause.contractAddress" class="addr is-family-monospace">
                        {{ clause.contractAddress | addr }}
                    </span>
                </div>
            </div>
            <div class="clause-card__status">
                <b-icon
                    v-if="encoded[index] && encoded[index].isValid"
                    icon="check-circle"
                    size="is-small"
                    class="has-text-success"
                ></b-icon>
                <span v-else class="dot dot--pending" :title="encoded[index] && encoded[index].error || 'Incomplete'"></span>
            </div>
            <div class="clause-card__actions">
                <button
                    type="button"
                    class="icon-btn"
                    title="Move up"
                    :disabled="index === 0"
                    @click.stop="$emit('move', { id: clause.id, delta: -1 })"
                >
                    <b-icon icon="arrow-up" size="is-small"></b-icon>
                </button>
                <button
                    type="button"
                    class="icon-btn"
                    title="Move down"
                    :disabled="index === clauses.length - 1"
                    @click.stop="$emit('move', { id: clause.id, delta: 1 })"
                >
                    <b-icon icon="arrow-down" size="is-small"></b-icon>
                </button>
                <button
                    type="button"
                    class="icon-btn icon-btn--danger"
                    title="Remove"
                    @click.stop="$emit('remove', clause.id)"
                >
                    <b-icon icon="times" size="is-small"></b-icon>
                </button>
            </div>
        </div>

        <button type="button" class="add-clause-btn" @click="$emit('add')">
            <b-icon icon="plus" size="is-small"></b-icon>
            <span>Add clause</span>
        </button>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Entities } from '../../database'

interface EncodedClause {
    isValid: boolean
    error?: string
}

@Component
export default class ClauseList extends Vue {
    @Prop({ required: true }) clauses!: Entities.TxBuilderClause[]
    @Prop({ default: null }) activeId!: string | null
    @Prop({ required: true }) encoded!: EncodedClause[]

    private clauseTitle(c: Entities.TxBuilderClause): string {
        if (!c.contractAddress) return 'Pick a contract…'
        if (!c.selectedFunction) return 'Pick a function…'
        return this.humanize(c.selectedFunction.name)
    }

    private humanize(name: string): string {
        if (!name) return ''
        const split = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
        return split.charAt(0).toUpperCase() + split.slice(1)
    }
}
</script>

<style lang="scss" scoped>
.clause-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    height: 100%;
    overflow-y: auto;
}

.clause-list__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}
.clause-list__title {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-color-light);
    font-weight: 600;
}
.clause-list__count {
    font-size: 0.75rem;
    color: var(--text-color-light);
    background: var(--body-background-alt);
    padding: 0.1rem 0.5rem;
    border-radius: 8px;
}

.clause-card {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--card-background);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
}
.clause-card:hover {
    border-color: var(--primary-color);
}
.clause-card.is-active {
    border-color: var(--primary-color);
    background: rgba(50, 115, 220, 0.04);
}
.clause-card.is-invalid {
    border-left: 3px solid #ffb020;
}

.clause-card__index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--body-background-alt);
    color: var(--text-color);
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
}
.clause-card.is-active .clause-card__index {
    background: var(--primary-color);
    color: white;
}

.clause-card__body {
    flex: 1;
    min-width: 0;
}
.clause-card__title {
    font-size: 0.9rem;
    color: var(--text-color-strong);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.clause-card__sub {
    margin-top: 0.2rem;
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
}
.contract-tag {
    font-size: 0.7rem;
    color: var(--text-color-light);
    background: var(--body-background-alt);
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
}
.addr {
    font-size: 0.7rem;
    color: var(--text-color-light);
}

.clause-card__status {
    align-self: center;
}
.dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
}
.dot--pending {
    background: #ffb020;
}

.clause-card__actions {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    display: none;
    gap: 0.15rem;
}
.clause-card:hover .clause-card__actions,
.clause-card.is-active .clause-card__actions {
    display: flex;
}
.icon-btn {
    border: none;
    background: transparent;
    color: var(--text-color-light);
    cursor: pointer;
    padding: 0.15rem;
    border-radius: 4px;
}
.icon-btn:hover:not(:disabled) {
    color: var(--text-color-strong);
    background: var(--body-background-alt);
}
.icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
.icon-btn--danger:hover:not(:disabled) {
    color: #ff3860;
}

.add-clause-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem;
    border: 1px dashed var(--border-color);
    background: transparent;
    border-radius: 8px;
    color: var(--text-color-light);
    cursor: pointer;
    margin-top: 0.5rem;
    font-size: 0.85rem;
}
.add-clause-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
}

[data-theme="dark"] {
    .clause-card.is-active {
        background: rgba(74, 158, 255, 0.08);
    }
}
</style>
