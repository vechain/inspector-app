<template>
  <Panel v-model="activeTab" :tabs="tabs" :title="item.name">
    <template slot="panel-content">
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
        <b-field v-if="item.payable" class="item-content" horizontal label="value">
          <b-input type="number" placeholder="number" v-model="value"></b-input>
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
export default class FunctionCard extends Vue {
  @Prop({ default: null })
  private item: ABI.FunctionItem | any

  @Prop()
  private address!: string

  private resp: any = null
  private value: string | null = null

  private params: any[] = new Array(this.item.inputs.length)
  private tabs = ['Inputs', 'Description']
  private activeTab = ''

  private method: any

  created() {
    this.activeTab = this.tabs[0]
    const account = connex.thor.account(this.address)
    this.method = account.method(this.item)
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
      this.resp = await connex.vendor.sign(
        'tx',
        [{ ...this.method.asClause(this.params, '0x0'), desc: this.item.name }],
        {
          summary: `inspect-${this.address}`
        }
      )
    } catch (error) {
      console.error(error)
    }
  }
  private async readMethod() {
    try {
      this.resp = await this.method.call(this.params, this.value || 0)
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
