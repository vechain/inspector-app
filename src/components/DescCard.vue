<template>
  <b-collapse :open="false" class="panel">
    <div slot="trigger" class="panel-heading">
      <strong>{{$attrs.title}}</strong>
    </div>
    <div class="panel-block is-block">
      <pre>{{item}}</pre>
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class DescCard extends Vue {
  @Prop({ default: null })
  item!: ABI.Item | null
}
</script>
