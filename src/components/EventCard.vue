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
          <b-input ref="input" v-model="params[v.name]" :placeholder="v.type"></b-input>
        </b-field>
        <b-field class="item-content" horizontal>
          <div class="buttons has-addons is-pulled-right">
            <button
              type="button"
              @click="addFilter(item.name)"
              class="button is-rounded is-primary is-outlined"
            >As a view</button>
            <button
              type="button"
              @click="getResult"
              class="button is-rounded is-primary is-outlined"
            >Execute</button>
            <button
              v-if="filters.length"
              type="button"
              @click="reset"
              class="button is-rounded is-primary is-outlined"
            >Reset</button>
          </div>
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
  import DB from '../database'
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

    private addFilter(name: string) {
      this.$dialog.prompt({
        title: 'Add quick view',
        message: 'Input a filter name',
        inputAttrs: {
          placeholder: 'Filter name',
          value: name,
          maxlength: 30,
          required: true
        },
        onConfirm: (value: string) => {
          this.saveFilter(value)
        }
      })
    }

    private reset() {
      this.params = {}
    }

    private async saveFilter(name: string) {
      const contract =
        (await DB.contracts
          .where('address')
          .equals(this.address)
          .first()) || null

      await DB.filters.add({
        name,
        address: contract!.address,
        contractName: contract!.name,
        createdTime: Date.now(),
        abi: this.item
      })
      BUS.$emit('added-filter')
      this.$toast.open({
        message: 'Added success!',
        type: 'is-success'
      })
    }

    private async getResult() {
      const params: any[] = []

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

      this.list = await this.event
        .filter(params)
        .desc()
        .apply(0, 5)
      this.activeTab = this.tabs[2]
    }
  }
</script>
<style lang="scss" scoped>
  .item-content {
    padding: 0.5rem 5rem 0 0;
  }
</style>
