<template>
  <b-collapse class="panel">
    <div class="panel-heading">
      <strong>Fallback</strong>
    </div>
    <div v-for="(item, index) in list" :key="index" class="panel-block is-block">
      <pre>{{item}}</pre>
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class FallbackCard extends Vue {
  @Prop({ default: [] })
  list!: ABI.Item[]
}
</script>
