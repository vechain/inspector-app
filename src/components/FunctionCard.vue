<template>
  <b-collapse :open="false" class="panel">
    <div slot="trigger" slot-scope="props" class="panel-heading">
      <strong>{{item.name}}</strong>
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
      <div v-show="activeTab === tabs[0]">
        <b-field
          class="item-content"
          horizontal
          :label="v.name"
          v-for="(v, index) in item.inputs"
          :key="index"
        >
          <b-input v-model="params[index]" :placeholder="v.type"></b-input>
        </b-field>
        <b-field class="item-content has-text-right">
          <button @click="executeFC" class="button is-rounded is-primary is-outlined">execute</button>
        </b-field>
        <b-field v-if="resp">
          <pre>{{resp}}</pre>
        </b-field>
      </div>
      <div v-show="activeTab === tabs[1]">
        <pre>{{item}}</pre>
      </div>
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class FunctionCard extends Vue {
  @Prop({ default: null })
  private item: ABI.Item | any

  @Prop()
  private address!: string

  private resp: any = null

  private params: any[] = new Array(this.item.inputs.length)
  private tabs = ['Inputs', 'Description']
  private activeTab = ''

  private method: any

  created() {
    this.activeTab = this.tabs[0]
    const account = connex.thor.account(this.address)
    this.method = account.method(this.item)
  }

  private switchTab(tab: string) {
    this.activeTab = tab
  }
  private executeFC() {
    if (this.item.constant) {
      this.readMethod()
    } else {
      this.writeMethod()
    }
  }
  private async writeMethod() {
    try {
      this.resp = await connex.vendor.sign('tx', [
        { ...this.method.asClause(this.params, '0x0'), desc: this.item.name }
      ], {
        summary: `inspect-${this.address}`
      })
    } catch (error) {
      console.error(error)
    }
  }
  private async readMethod() {
    try {
      this.resp = await this.method.call(this.params)
    } catch (error) {
      console.error(error)
    }
  }
}
</script>
<style lang="scss" scoped>
.item-content {
  padding: 0.5rem 5rem 0 0;
}
</style>
