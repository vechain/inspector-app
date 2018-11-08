<template>
  <section class="section">
    <div v-if="item" class="container">
      <Contract :isShort="false" :item="item"/>
      <section class="section">
        <b-tabs type="is-toggle" expanded v-model="tabIndex" class="block">
          <b-tab-item label="Read"></b-tab-item>
          <b-tab-item label="Write"></b-tab-item>
          <b-tab-item label="Code & ABI"></b-tab-item>
        </b-tabs>
        <div v-show="tabIndex === 0">
          <div v-for="(item, index) in readList" :key="index">
            <AbiItemCard style="margin-bottom: 20px" :item="item"/>
          </div>
        </div>
        <div v-show="tabIndex === 1">
          <div v-for="(item, index) in writeList" :key="index">
            <AbiItemCard style="margin-bottom: 20px" :item="item"/>
          </div>
        </div>
        <div v-show="tabIndex === 2">
          <AbiItemCard style="margin-bottom: 20px" type="abi" :item="abi"/>
        </div>
      </section>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Contract from '../components/Contract.vue'
import AbiItemCard from '../components/AbiItemCard.vue'
import DB, { Entities } from '../database'
@Component({
  components: {
    Contract,
    AbiItemCard
  }
})
export default class ContractDetail extends Vue {
  private item: Entities.Contract | null = null
  private tabIndex: number = 0

  private abi = []

  private created() {
    this.getDetail(parseInt(this.$route.params.id))
  }

  get readList() {
    return this.abi.filter((item: ABI.Item) => {
      return item.type !== 'constructor' && item.constant
    })
  }
  get writeList() {
    return this.abi.filter((item: ABI.Item) => {
      return item.type !== 'constructor' && !item.constant
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

