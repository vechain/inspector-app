<template>
  <b-collapse @update:open="onupdate" :open="isOpen" class="panel">
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
              size="is-small"
              :icon="props.open ? 'caret-up' : 'caret-down'"
            ></b-icon>
          </div>
        </div>
      </div>
    </div>
    <p v-if="tabs.length > 1" class="panel-tabs custom-tabs" style="justify-content: left">
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
  isOpen = false
  @Prop({ default: 0 })
  value!: string

  @Prop({ default: Array })
  tabs!: string[]

  @Prop({ default: '' })
  title!: string

  private activeTab: string = this.value

  @Watch('value')
  onchange(val: string) {
    this.activeTab = val
  }

  toggle(open: boolean) {
    this.isOpen = (open === true || open === false) ? open : !this.isOpen
  }

  onupdate(value: boolean) {
    this.isOpen = value
  }

  private switchTab(tab: string) {
    this.activeTab = tab
    this.$emit('input', tab)
  }
}
</script>
<style scoped>
.custom-tabs a {
  color: var(--text-color);
}

.custom-tabs a.is-active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}
</style>
