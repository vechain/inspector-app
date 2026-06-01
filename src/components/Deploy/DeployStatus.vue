<template>
    <ol v-if="stages.length" class="deploy-status">
        <li
            v-for="(s, i) in stages"
            :key="i"
            class="stage"
            :class="`stage-${s.state}`"
        >
            <span class="dot">
                <b-icon v-if="s.state === 'done'" icon="check" size="is-small" />
                <b-icon
                    v-else-if="s.state === 'active'"
                    icon="circle-notch"
                    custom-class="fa-spin"
                    size="is-small"
                />
                <b-icon v-else-if="s.state === 'error'" icon="times" size="is-small" />
                <span v-else class="dot-pending">{{ i + 1 }}</span>
            </span>
            <span class="label">{{ s.label }}</span>
        </li>
    </ol>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

interface Stage {
    label: string
    state: 'pending' | 'active' | 'done' | 'error'
}

@Component
export default class DeployStatus extends Vue {
    @Prop({ default: () => [] }) stages!: Stage[]
}
</script>

<style lang="scss" scoped>
.deploy-status {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}
.stage {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.85rem;
}
.dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    background: var(--border-color, #dbdbdb);
    color: var(--text-color, #363636);
    flex-shrink: 0;
}
.dot-pending {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-light, #7a7a7a);
}
.stage-active .dot {
    background: var(--primary-color, #485fc7);
    color: white;
}
.stage-done .dot {
    background: #48c78e;
    color: white;
}
.stage-error .dot {
    background: #ff3860;
    color: white;
}
.stage-pending .label {
    color: var(--text-color-light, #7a7a7a);
}
</style>
