<template>
  <section class="section">
    <div v-if="contract" class="container">
      <Contract :isShort="false" :item="contract"/>
      <section class="section">
        <b-tabs type="is-centered" v-model="tabIndex" class="block">
          <b-tab-item v-for="(item, index) in tabs" :key="index">
            <span slot="header">
              {{item.text}}
              <span class="is-size-7" v-if="item.count">({{item.count}})</span>
            </span>
          </b-tab-item>
        </b-tabs>
        <div v-show="tabIndex === 0">
          <FunctionCard
            v-for="(item, index) in readList"
            :key="index"
            :address="contract.address"
            style="margin-bottom: 20px"
            :item="item"
          />
        </div>
        <div v-show="tabIndex === 1">
          <FunctionCard
            v-for="(item, index) in writeList"
            :key="index"
            :address="contract.address"
            style="margin-bottom: 20px"
            :item="item"
          />
        </div>
        <div v-show="tabIndex === 2">
          <DescCard style="margin-bottom: 20px" :item="abi" title="ABI"/>
          <DescCard
            class="code-pre"
            v-if="code"
            style="margin-bottom: 20px"
            :item="code"
            title="Code"
          />
        </div>
        <div v-show="tabIndex === 3">
          <EventCard
            :address="contract.address"
            v-for="(item, index) in eventList"
            :key="index"
            style="margin-bottom: 20px"
            :item="item"
            :title="item.name"
          />
        </div>
        <div v-show="tabIndex === 4">
          <FallbackCard :fb="fb"/>
        </div>
      </section>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Contract from '../components/Contract.vue'
import FunctionCard from '../components/FunctionCard.vue'
import FallbackCard from '../components/FallbackCard.vue'
import EventCard from '../components/EventCard.vue'
import DescCard from '../components/DescCard.vue'
import DB, { Entities } from '../database'
@Component({
  components: {
    Contract,
    FunctionCard,
    FallbackCard,
    DescCard,
    EventCard
  }
})
export default class ContractDetail extends Vue {
  private contract: Entities.Contract | null = null
  private tabIndex: number = 0
  private tabs: { text: string; count: number | '' }[] = []
  private abi = []
  private code?: string = ''

  private async created() {
    await this.getDetail(parseInt(this.$route.params.id))
    this.tabs = [
      { text: 'Read', count: this.readList.length },
      { text: 'Write', count: this.writeList.length },
      { text: 'Code & ABI', count: '' },
      { text: 'Events', count: this.eventList.length },
      { text: 'Fallback', count: '' }
    ]
  }

  get readList() {
    return this.abi.filter((item: ABI.FunctionItem) => {
      return item.type === 'function' && item.constant
    })
  }
  get writeList() {
    return this.abi.filter((item: ABI.FunctionItem) => {
      return item.type === 'function' && !item.constant
    })
  }

  get eventList() {
    return this.abi.filter((item: ABI.EventItem) => {
      return item.type === 'event'
    })
  }
  get fb() {
    return this.abi.find((item: ABI.EventItem) => {
      return item.type === 'fallback'
    })
  }
  async getDetail(id: number) {
    this.contract =
      (await DB.contracts
        .where('id')
        .equals(id)
        .first()) || null

    this.abi = JSON.parse(this.contract!.abi!)
    await this.getCode(this.contract!.address || '')
  }

  async getCode(address: string) {
    if (address) {
      const temp = await connex.thor.account(address).getCode()
      this.code = temp.code
    }
  }
}
</script>

<style scope>
.code-pre pre {
  word-wrap: break-word;
  white-space: pre-wrap;
}
</style>
