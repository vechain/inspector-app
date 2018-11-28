<template>
  <section class="section">
    <div class="level container">
      <div class="level-left">
        <h1 class="title level-item">Contracts</h1>
      </div>
      <div class="level-right">
        <button @click="addItem" class="button is-primary is-outlined">
          <b-icon icon="plus"></b-icon>
        </button>
      </div>
    </div>
    <div v-if="contracts.length" class="columns section is-variable is-1 is-multiline">
      <div
        class="column is-3-fullhd is-4-desktop is-6-tablet"
        v-for="(item, index) in contracts"
        :key="index"
      >
        <Contract @select="onSelect(item.id)" :item="item" class="contract-box">
          <slot>
            <p class="buttons buttons-slot">
              <button @click.stop="remove(item)" class="button is-danger is-inverted">
                <b-icon icon="trash-alt" size="is-small"></b-icon>
              </button>
              <button @click.stop="edit(item)" class="button is-primary is-inverted">
                <b-icon icon="edit" size="is-small"></b-icon>
              </button>
            </p>
          </slot>
        </Contract>
      </div>
    </div>
    <div v-if="!isloading && !contracts.length" class="section">
      <div class="container">
        <div class="card">
          <div
            class="card-content has-text-centered is-size-2 has-text-grey-light"
          >No contracts here!</div>
          <div class="card-footer">
            <a @click="addItem" class="card-footer-item">Add</a>
          </div>
        </div>
      </div>
    </div>
    <b-modal :canCancel="['outside']" :active.sync="isModalActive">
      <EditContract @cancel="onCancel" @finished="reload" :item="currentItem"/>
    </b-modal>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import EditContract from '../components/EditContract.vue'
import Contract from '../components/Contract.vue'
import DB, { Entities } from '../database'
@Component({
  components: {
    Contract,
    EditContract
  }
})
export default class Contracts extends Vue {
  private isloading = true

  private isModalActive = false
  private currentItem: Entities.Contract | null = null
  private contracts: Entities.Contract[] = []

  private remove(item: any) {
    this.$dialog.confirm({
      title: 'Remove',
      message: `Are you sure want to remove ${item.name} contract`,
      cancelText: 'Cancel',
      confirmText: 'YES',
      type: 'is-danger',
      scroll: 'clip',
      onConfirm: () => {
        console.log(item)
        DB.contracts.delete(item.id).then(() => {
          this.reload()
        })
      }
    })
  }

  onSelect(id: number) {
    this.$router.push({
      name: 'contract_detail',
      query: { id: id.toString() }
    })
  }

  async created() {
    const loading = this.$loading.open({
      container: null
    })
    await this.list()
    loading.close()
  }

  reload() {
    this.currentItem = null
    this.list()
    this.isModalActive = false
  }
  private open() {
    this.isModalActive = true
  }
  private close() {
    this.isModalActive = false
  }
  private async list() {
    this.contracts = await DB.contracts.toArray()
    this.isloading = false
  }
  private addItem() {
    this.currentItem = null
    this.open()
  }
  private onCancel() {
    this.currentItem = null
    this.close()
  }
  private edit(item: Entities.Contract) {
    this.currentItem = item
    this.open()
  }
}
</script>
<style lang="css" scoped>
.column:last-child {
  margin-bottom: 1.5rem;
}
.buttons-slot {
  opacity: 0.3;
  transition: opacity .2s ease-in-out;
}
.contract-box {
  max-width: 400px;
  min-width: 370px;
}
.contract-box:hover .buttons-slot {
  opacity: 1;
}
</style>


