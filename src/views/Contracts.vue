<template>
  <section class="section">
    <div class="level container">
      <div class="level-left">
        <h1 class="title level-item">Contracts</h1>
      </div>
      <div class="level-right">
        <router-link :to="{name: 'deploy'}" class="button is-primary is-outlined">
          <b-icon icon="plus"></b-icon>
        </router-link>
      </div>
    </div>
    <div class="columns section is-variable is-1 is-multiline">
      <div class="column is-3-fullhd is-4-desktop is-6-tablet" v-for="(t, i) in 7" :key="i">
        <Contract :item="item" style="max-width: 400px">
          <slot>
            <p class="buttons">
              <button @click="remove(item)" class="button is-danger is-inverted">
                <b-icon icon="trash-alt" size="is-small"></b-icon>
              </button>
              <button @click="edit" class="button is-primary is-inverted">
                <b-icon icon="edit" size="is-small"></b-icon>
              </button>
            </p>
          </slot>
        </Contract>
      </div>
    </div>
    <b-modal :canCancel="['outside']" :active.sync="isModalActive">
      <EditContract/>
    </b-modal>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import EditContract from '../components/EditContract.vue'
import Contract from '../components/Contract.vue'
@Component({
  components: {
    Contract,
    EditContract
  }
})
export default class Contracts extends Vue {
  private item = { name: 'adf', address: 'adf' }
  private isModalActive = false
  private remove(item: any) {
    this.$dialog.confirm({
      title: 'Remove',
      message: `Are you sure want to remove ${item.name} contract`,
      cancelText: 'Cancel',
      confirmText: 'YES',
      type: 'is-warning',
      scroll: 'clip',
      onConfirm: () => {
        console.log('confirmed')
      }
    })
  }
  private edit() {
    this.isModalActive = true
  }
}
</script>
<style lang="sass" scoped>
  .column:last-child 
    margin-bottom: 1.5rem;
  
</style>


