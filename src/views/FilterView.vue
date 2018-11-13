<template>
  <section>
    <div class="log-filter">
      <div class="box">
        <b-field :label="v.name" v-for="(v, index) in params" :key="index">
          <b-input v-model="conditions[v.name]" :placeholder="v.type"></b-input>
        </b-field>
        <b-field label="Order">
          <b-select expanded placeholder="Order" v-model="page.order">
            <option :value="true">ASC</option>
            <option :value="false">DESC</option>
          </b-select>
        </b-field>
        <b-field label="More info">
          <b-switch v-model="metadata"></b-switch>
        </b-field>
        <b-field class="has-text-right">
          <button @click="search" class="button is-primary is-outlined">Search</button>
        </b-field>
      </div>
      <div class="box">
        <b-field horizontal label="Count">
          <transition
            mode="out-in"
            enter-active-class="animated faster textChange"
            leave-active-class="animated faster textOut"
          >
            <span :key="list.length">{{list.length}} item(s)</span>
          </transition>
        </b-field>
        <b-field horizontal label="Page">
          <transition
            mode="out-in"
            enter-active-class="animated faster textChange"
            leave-active-class="animated faster textOut"
          >
            <span :key="currentPage">{{currentPage}}</span>
          </transition>
        </b-field>
        <b-field grouped position="is-centered">
          <p class="control">
            <button @click="prePage" :disabled="currentPage < 2" class="button">
              <b-icon icon="angle-left"></b-icon>
            </button>
          </p>
          <b-input
            expanded
            type="number"
            placeholder="5 <= number <=30"
            min="5"
            max="30"
            v-model.number="page.size"
          ></b-input>
          <p class="control">
            <button @click="nextPage" :disabled="list.length < page.size" class="button">
              <b-icon icon="angle-right"></b-icon>
            </button>
          </p>
        </b-field>
      </div>
    </div>
    <div class="box log-container">
      <LogList 
      :metadata="metadata" :keys="columns" :list="list"/>
    </div>
  </section>
</template>
<script lang="ts">
import LogList from '../components/LogList.vue'
import { Vue, Component, Watch } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component({
  components: {
    LogList
  }
})
export default class FilterView extends Vue {
  private filter!: Entities.Filter | null
  private event!: Connex.Thor.EventVisitor
  private abi!: any
  private conditions: any = {}
  private page = {
    num: -1,
    size: 10,
    order: true
  }
  private list: any[] = []
  private metadata: boolean = false
  private columns: string[] = []
  private params: ABI.EventInputItem[] = []

  setParams() {
    this.params = this.abi.inputs.filter((item: ABI.EventInputItem) => {
      return item.indexed
    })
  }

  setColumns() {
    this.columns = this.abi.inputs.map((item: ABI.EventInputItem) => {
      return item.name
    })
  }

  @Watch('conditions')
  onConditionChange() {
    this.search()
  }
  @Watch('page.size')
  onSizeChanged(value: number) {
    if (!value) {
      this.page.size = 5
    }
    this.search()
  }
  @Watch('page.order')
  onOrderChanged() {
    this.search()
  }
  get currentPage() {
    return this.page.num + 1
  }

  private async init() {
    this.filter =
      (await DB.filters
        .where('id')
        .equals(parseInt(this.$route.params.id))
        .first()) || null
    const account = connex.thor.account(this.filter!.address)
    this.abi = this.filter!.abi ? JSON.parse(this.filter!.abi) : ''
    this.event = account.event(this.abi)
    this.setParams()
    this.setColumns()
  }

  private search() {
    this.page.num = -1
    this.nextPage()
  }

  private prePage() {
    --this.page.num
    this.getList()
  }
  private nextPage() {
    ++this.page.num
    this.getList()
  }

  private async getList() {
    let params: any[] = []

    for (const key in this.conditions) {
      if (this.conditions.hasOwnProperty(key)) {
        const element = this.conditions[key]
        if (element) {
          params.push({
            [key]: element
          })
        }
      }
    }
    this.list = await this.event
      .filter(params)
      .order(this.page.order ? 'asc' : 'desc')
      .next(this.page.num * this.page.size, this.page.size)
  }

  private async created() {
    await this.init()
    this.nextPage()
  }
}
</script>
<style scoped>
.log-filter {
  width: 250px;
  right: 20px;
  /* height: 100%; */
  position: fixed;
}
.log-container {
  width: calc(100% - 270px);
  overflow-x: auto;
  margin-right: 20px;
  float: left;
  /* height: 100%; */
  /* overflow: hidden; */
}
</style>
