<template>
  <section class="section">
    <div v-if="item" class="container">
      <Contract :isShort="false" :item="item"/>
      <section class="section">
        <b-tabs type="is-toggle" expanded v-model="tabIndex" class="block">
          <b-tab-item v-for="(item, index) in tabs" :key="index">
            <span slot="header">
              {{item}}
              <!-- <b-tag rounded> 3 </b-tag> -->
            </span>
          </b-tab-item>
        </b-tabs>
        <div v-show="tabIndex === 0">
          <AbiItemCard
            v-for="(item, index) in readList"
            :key="index"
            style="margin-bottom: 20px"
            :item="item"
          />
        </div>
        <div v-show="tabIndex === 1">
          <AbiItemCard
            v-for="(item, index) in writeList"
            :key="index"
            style="margin-bottom: 20px"
            :item="item"
          />
        </div>
        <div v-show="tabIndex === 2">
          <AbiItemCard style="margin-bottom: 20px" type="abi" :item="abi"/>
        </div>
        <div v-show="tabIndex === 3">
          <AbiItemCard
            v-for="(item, index) in eventList"
            :key="index"
            style="margin-bottom: 20px"
            type="event"
            :item="item"
          />
        </div>
        <div v-show="tabIndex === 4">
          <FallbackCard :list="fbList"/>
        </div>
      </section>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Contract from '../components/Contract.vue'
import AbiItemCard from '../components/AbiItemCard.vue'
import FallbackCard from '../components/FallbackCard.vue'
import DB, { Entities } from '../database'
@Component({
  components: {
    Contract,
    AbiItemCard,
    FallbackCard
  }
})
export default class ContractDetail extends Vue {
  private item: Entities.Contract | null = null
  private tabIndex: number = 0
  private tabs = ['Read', 'Write', 'Code & ABI', 'Event', 'Fallbacks']
  private abi = []

  private created() {
    this.getDetail(parseInt(this.$route.params.id))
  }

  get readList() {
    return this.abi.filter((item: ABI.Item) => {
      return item.type === 'function' && item.constant
    })
  }
  get writeList() {
    return this.abi.filter((item: ABI.Item) => {
      return item.type === 'function' && !item.constant
    })
  }

  get eventList() {
    return this.abi.filter((item: ABI.Item) => {
      return item.type === 'event'
    })
  }
  get fbList() {
    return this.abi.filter((item: ABI.Item) => {
      return item.type === 'fallback'
    })
  }
  async getDetail(id: number) {
    this.item =
      (await DB.contracts
        .where('id')
        .equals(id)
        .first()) || null

    this.abi = JSON.parse(this.item!.abi!)
  }
}
</script>

