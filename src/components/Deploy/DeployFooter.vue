<template>
    <div class="deploy-footer" :class="footerClass">
        <div class="footer-summary">
            <span class="summary-pill" :class="pillClass">
                <span class="summary-dot"></span>
                <span>{{ statusLabel }}</span>
            </span>
            <span v-if="statusAux" class="summary-aux">· {{ statusAux }}</span>
        </div>
        <div class="footer-actions">
            <button
                v-if="showCancel"
                type="button"
                class="button is-rounded"
                :disabled="cancelDisabled || primaryLoading"
                @click="$emit('cancel')"
            >
                {{ cancelLabel }}
            </button>
            <button
                v-if="showSecondary"
                type="button"
                class="button is-rounded"
                :disabled="secondaryDisabled"
                @click="$emit('secondary')"
            >
                <b-icon
                    v-if="secondaryLoading"
                    icon="circle-notch"
                    custom-class="fa-spin"
                    size="is-small"
                />
                <span>{{ secondaryLabel }}</span>
            </button>
            <button
                v-if="showPrimary"
                type="button"
                class="button is-rounded is-primary"
                :class="{ 'is-loading': primaryLoading }"
                :disabled="primaryDisabled"
                @click="$emit('primary')"
            >
                <b-icon
                    v-if="primaryIcon && !primaryLoading"
                    :icon="primaryIcon"
                    size="is-small"
                />
                <span>{{ primaryLabel }}</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

export type FooterStatus = 'idle' | 'pending' | 'ready' | 'busy' | 'success' | 'error'

@Component
export default class DeployFooter extends Vue {
    @Prop({ default: 'idle' }) status!: FooterStatus
    @Prop({ default: '' }) statusLabel!: string
    @Prop({ default: '' }) statusAux!: string

    @Prop({ default: 'Deploy' }) primaryLabel!: string
    @Prop({ default: 'rocket' }) primaryIcon!: string
    @Prop({ default: false }) primaryDisabled!: boolean
    @Prop({ default: false }) primaryLoading!: boolean
    @Prop({ default: true }) showPrimary!: boolean

    @Prop({ default: '' }) secondaryLabel!: string
    @Prop({ default: false }) secondaryDisabled!: boolean
    @Prop({ default: false }) secondaryLoading!: boolean
    @Prop({ default: false }) showSecondary!: boolean

    @Prop({ default: 'Cancel' }) cancelLabel!: string
    @Prop({ default: false }) cancelDisabled!: boolean
    @Prop({ default: false }) showCancel!: boolean

    get pillClass(): string {
        return `is-${this.status}`
    }

    get footerClass(): string {
        return `is-${this.status}`
    }
}
</script>

<style lang="scss" scoped>
.deploy-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    background: var(--card-background);
    border-top: 1px solid var(--border-color);
    gap: 0.75rem;
    flex-wrap: wrap;
}

.footer-summary {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
    flex: 1;
}

.summary-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.25rem 0.7rem;
    border-radius: 14px;
    font-size: 0.8rem;
    font-weight: 600;
    background: rgba(150, 150, 150, 0.12);
    color: var(--text-color-light);
}
.summary-pill.is-ready {
    background: rgba(50, 175, 50, 0.12);
    color: #228822;
}
.summary-pill.is-pending,
.summary-pill.is-busy {
    background: rgba(255, 165, 32, 0.12);
    color: #b88010;
}
.summary-pill.is-success {
    background: rgba(50, 175, 50, 0.18);
    color: #228822;
}
.summary-pill.is-error {
    background: rgba(255, 56, 96, 0.12);
    color: #c4264e;
}
.summary-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
}
.is-pending .summary-dot,
.is-busy .summary-dot {
    animation: pulse 1.4s ease-in-out infinite;
}
.summary-aux {
    font-size: 0.78rem;
    color: var(--text-color-light);
}

.footer-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.deploy-footer.is-ready {
    border-top-color: rgba(50, 175, 50, 0.3);
}
.deploy-footer.is-error {
    border-top-color: rgba(255, 56, 96, 0.3);
}
.deploy-footer.is-success {
    border-top-color: rgba(50, 175, 50, 0.5);
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

[data-theme='dark'] {
    .summary-pill.is-ready,
    .summary-pill.is-success {
        background: rgba(80, 220, 80, 0.18);
        color: #6be86b;
    }
    .summary-pill.is-pending,
    .summary-pill.is-busy {
        background: rgba(255, 180, 30, 0.18);
        color: #ffd766;
    }
    .summary-pill.is-error {
        background: rgba(255, 80, 110, 0.18);
        color: #ff7a8e;
    }
}
</style>
