<template>
  <div class="func-card">
    <p class="panel-tabs" style="justify-content: left">
      <a
        v-for="(item, index) in tabs"
        :key="index"
        @click.stop="switchTab(item)"
        :class="{'is-active': activeTab === item}"
      >{{item}}</a>
    </p>
    <div class="card-content">
      <form
        ref="form"
        @reset.prevent="$refs['form'].reset()"
        @submit.prevent="executeFC"
        v-show="activeTab === tabs[0]"
      >
        <b-field
          class="item-content"
          horizontal
          :label="v.name"
          v-for="(v, index) in item.inputs"
          :key="index"
        >
          <b-input required v-model="params[index]" :placeholder="v.type"></b-input>
        </b-field>
        <b-field v-if="item.payable" class="item-content" horizontal label="value">
          <b-input type="number" placeholder="number" v-model="value"></b-input>
        </b-field>
        <b-field class="item-content">
          <div class="buttons has-addons">
            <button type="submit" class="button is-rounded is-primary is-outlined">Execute</button>
            <button
              v-if="params.length"
              type="reset"
              class="button is-rounded is-primary is-outlined"
            >Reset</button>
          </div>
        </b-field>
        <b-field v-if="resp">
          <pre>{{resp}}</pre>
        </b-field>
      </form>
      <div v-show="activeTab === tabs[1]">
        <pre>{{item}}</pre>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import Panel from './Panel.vue'
import { Vue, Component, Prop } from 'vue-property-decorator'
import DB from '../database'
@Component({
  components: {
    Panel
  }
})
export default class SampleFuncCard extends Vue {
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

  private switchTab(tab: string) {
    this.activeTab = tab
    // this.$emit('input', tab)
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
      const params: any[] = []
      this.params.forEach((item) => {
        if (item) {
          return params.push(item)
        }
      })
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
.func-card .card-content {
  border-left: 1px solid #dbdbdb;
  border-right: 1px solid #dbdbdb;
  border-bottom: 1px solid #dbdbdb;
  padding-bottom: 20px;
}
</style>

