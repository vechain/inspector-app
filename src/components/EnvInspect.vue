<template>
  <div v-if="isShow">
    <noscript class="notification is-info">
      <strong>We're sorry but Inspect doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>
    <div class="notification is-warning">
        No connex environment detacted, please <a href="https://github.com/vechain/thor-sync.electron/releases"> download VeChain Sync </a>!
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class EnvInspect extends Vue {
  @Prop(Boolean)
  private isShow!: false
}
</script>

