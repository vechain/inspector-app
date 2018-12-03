<template>
  <section class="section contract-detail">
    <div v-if="contract" class="container">
      <Contract :isShort="false" :item="contract"/>
      <section class="section">
        <b-field grouped>
          <b-field expanded>
            <b-field class="is-pulled-right">
              <b-autocomplete
                rounded
                v-model="name"
                :data="filterList"
                placeholder="Func/Event Name"
                @select="onSearchSelect"
              >
                <template slot-scope="props">
                  <div>
                    <span class="is-size-6">{{props.option.name}}</span>
                  </div>
                  <span class="has-text-grey">{{props.option.type}}</span>
                </template>
                <template slot="empty">No results found</template>
              </b-autocomplete>
            </b-field>
          </b-field>
        </b-field>
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
            :id="item.name"
            :ref="item.name"
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
            :ref="item.name"
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
    get filterList() {
      const temp: any[] = [
        { name: 'Code', type: 'cb' },
        { name: 'ABI', type: 'cb' },
        { name: 'Fallback', type: 'fb' }
      ].concat(this.abi)

      return temp.filter((item: ABI.FunctionItem | ABI.EventItem) => {
        return (
          item.name &&
          this.name &&
          item.name
            .toString()
            .toLowerCase()
            .indexOf(this.name.toLowerCase()) >= 0
        )
      })
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
    private contract: Entities.Contract | null = null
    private tabIndex: number = 0
    private tabs: Array<{ text: string; count: number | '' }> = []
    private abi: any = []
    private code?: string = ''
    private name: string = ''
    private caller: string = ''
    async getDetail(idOrAddress: string) {
      this.contract =
        (await DB.contracts
          .where('id')
          .equals(parseInt(idOrAddress, 10))
          .or('address')
          .equals(idOrAddress)
          .first()) || null

      this.abi = this.contract!.abi!
      await this.getCode(this.contract!.address || '')
    }

    async getCode(address: string) {
      try {
        if (address) {
          const temp = await connex.thor.account(address).getCode()
          this.code = temp.code
        }
      } catch (error) {
        // tslint:disable-next-line:no-console
        console.error(error)
      }
    }

    private async created() {
      const idOrAddress: string =
        this.$route.query.id || this.$route.query.address

      await this.getDetail(idOrAddress)
      this.tabs = [
        { text: 'Read', count: this.readList.length },
        { text: 'Write', count: this.writeList.length },
        { text: 'Code & ABI', count: '' },
        { text: 'Events', count: this.eventList.length },
        { text: 'Fallback', count: '' }
      ]
    }

    private onSearchSelect(item: any) {
      const types = {
        cb: 2,
        fb: 4,
        read: 0,
        write: 1,
        event: 3
      }

      let type: 'cb' | 'fb' | 'read' | 'write' | 'event' | 'function' = item.type
      if (type === 'function') {
        type = item.constant ? 'read' : 'write'
      }
      this.tabIndex = types[type]
      const temp = this.$refs[item.name] as any[]
      temp[0].$children[0].toggle(true)
      temp[0].$el.scrollIntoView()
    }
  }
</script>

<style scope>
  .code-pre pre {
    word-wrap: break-word;
    white-space: pre-wrap;
  }
</style>
