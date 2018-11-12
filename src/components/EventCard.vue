<template>
  <Panel v-model="activeTab" :tabs="tabs" :title="item.name">
    <template slot="panel-content">
      <div v-show="activeTab === tabs[0]">
        <b-field
          class="item-content"
          horizontal
          :label="v.name"
          v-for="(v, index) in filters"
          :key="index"
        >
          <b-input v-model="params[v.name]" :placeholder="v.type"></b-input>
        </b-field>
        <b-field class="item-content has-text-right">
          <button @click="getResult" class="button is-rounded is-primary is-outlined">execute</button>
        </b-field>
        <b-field v-if="resp">
          <pre>{{resp}}</pre>
        </b-field>
      </div>
      <div v-show="activeTab === tabs[1]">
        <pre>{{item}}</pre>
      </div>
      <div v-show="activeTab === tabs[2]">
        <LogList :keys="columns" :list="list"/>
      </div>
    </template>
  </Panel>
</template>
<script lang="ts">
import Panel from './Panel.vue'
import LogList from './LogList.vue'
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component({
  components: {
    Panel,
    LogList
  }
})
export default class EventCard extends Vue {
  @Prop({ default: null })
  private item: ABI.EventItem | any

  @Prop()
  private address!: string

  private resp: any = null

  private list: any[] = []

  private params: any = {}
  private tabs = ['Filters', 'Description', 'Datas']
  private activeTab = ''

  private event!: Connex.Thor.EventVisitor

  created() {
    this.filters.forEach((item: ABI.EventInputItem) => {
      this.params[item.name] = ''
    })
    this.activeTab = this.tabs[0]
    const account = connex.thor.account(this.address)
    this.event = account.event(this.item)
  }

  get filters() {
    return this.item.inputs.filter((item: ABI.EventInputItem) => {
      return item.indexed
    })
  }

  get columns() {
    return this.item.inputs.map((item: ABI.EventInputItem) => {
      return item.name
    })
  }

  private async getResult() {
    let params: any[] = []

    for (const key in this.params) {
      if (this.params.hasOwnProperty(key)) {
        const element = this.params[key]
        if (element) {
          params.push({
            [key]: element
          })
        }
      }
    }
    const result = await this.event
      .filter(params)
      .order('desc')
      .next(0, 5)

    this.list = result.map(item => {
      return item.decoded
    })
    this.activeTab = this.tabs[2]
  }
}
</script>
<style lang="scss" scoped>
.item-content {
  padding: 0.5rem 5rem 0 0;
}
</style>
