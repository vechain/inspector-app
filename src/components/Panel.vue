<template>
  <b-collapse :open="false" class="panel">
    <div slot="trigger" slot-scope="props" class="panel-heading">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <strong>{{title}}</strong>
          </div>
          <div class="level-item"></div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <b-icon
              type="is-primary"
              size="is-small"
              :icon="props.open ? 'caret-up' : 'caret-down'"
            ></b-icon>
          </div>
        </div>
      </div>
    </div>
    <p v-if="tabs.length > 1" class="panel-tabs" style="justify-content: left">
      <a
        v-for="(item, index) in tabs"
        :key="index"
        @click.stop="switchTab(item)"
        :class="{'is-active': activeTab === item}"
      >{{item}}</a>
    </p>
    <div class="panel-block is-block">
      <slot name="panel-content"></slot>
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
@Component
export default class Panel extends Vue {
  @Prop({ default: 0 })
  value!: string

  @Prop({ default: Array })
  tabs!: string[]

  @Prop({ default: '' })
  title!: string

  @Watch('value')
  onchange(val: string) {
    this.activeTab = val
  }

  private activeTab: string = this.value

  private switchTab(tab: string) {
    this.activeTab = tab
    this.$emit('input', tab)
  }
}
</script>
