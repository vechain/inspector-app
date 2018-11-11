<template>
  <Panel>
    <strong slot="title">{{$attrs.title}}</strong>
    <template slot="panel-content">
      <pre>{{item}}</pre>
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
  item!: ABI.Item | null
}
</script>
