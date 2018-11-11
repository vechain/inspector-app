<template>
  <Panel>
    <strong slot="title">Fallback</strong>
    <template slot="panel-content">
      <pre>{{fb}}</pre>
    </template>
  </Panel>
</template>
<script lang="ts">
import Panel from './Panel.vue'
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component({
  components: {
    Panel
  }
})
export default class FallbackCard extends Vue {
  @Prop({ default: null })
  fb!: ABI.Item
}
</script>
