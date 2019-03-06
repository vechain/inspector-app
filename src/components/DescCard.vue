<template>
  <Panel :title="$attrs.title">
    <template slot="panel-content">
      <pre style="max-height: 500px; overflow: auto">{{item}}</pre>
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
export default class DescCard extends Vue {
  @Prop({ default: null })
  item!: ABI.EventItem | ABI.FunctionItem
}
</script>
