<template>
  <b-collapse :open="false" class="panel">
    <div slot="trigger" slot-scope="props" class="panel-heading">
      <strong>{{title}}</strong>
    </div>
    <p class="panel-tabs" style="justify-content: left">
      <a
        v-for="(item, index) in tabs"
        :key="index"
        @click.stop="switchTab(item)"
        :class="{'is-active': activeTab === item}"
      >{{item}}</a>
    </p>
    <div class="panel-block is-block">
      <div v-if="isRender(allTabs[0])" v-show="activeTab === allTabs[0]">
        <b-field
          class="item-content"
          horizontal
          :label="v.name"
          v-for="(v, k) in item.inputs"
          :key="k"
        >
          <b-input :placeholder="v.type"></b-input>
        </b-field>
        <b-field class="item-content has-text-right">
          <button class="button is-rounded is-primary is-outlined">excute</button>
        </b-field>
      </div>
      <div v-if="isRender(allTabs[1])" v-show="activeTab === allTabs[1]">
        <pre>{{item}}</pre>
      </div>
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class AbiItemCard extends Vue {
  @Prop({ default: null })
  private item: ABI.Item | any

  @Prop({ default: 'function' })
  private type!: 'function' | 'code' | 'abi' | 'event'
  private allTabs = ['Inputs', 'Description']
  private activeTab = ''
  private tabs: string[] = []

  created() {
    const allTabs = this.allTabs
    this.tabs = this.type !== 'function' ? allTabs.slice(1) : allTabs
    this.activeTab = this.tabs[0]
  }

  private isRender(tab: string) {
    return this.tabs.includes(tab)
  }

  get title() {
    const type = this.type
    let result = ''
    switch (type) {
      case 'function':
        result = this.item ? this.item.name : ''
        break
      case 'code':
        result = 'Code'
        break
      case 'abi':
        result = 'ABI'
        break
      case 'event':
        result = this.item ? this.item.name : ''
        break
    }

    return result
  }

  private switchTab(type: string) {
    this.activeTab = type
  }
}
</script>
<style lang="scss" scoped>
.item-content {
  padding: 0.5rem 5rem 0 0;
}
</style>
