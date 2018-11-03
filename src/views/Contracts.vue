<template>
  <section class="section">
    <div class="level container">
      <div class="level-left">
        <h1 class="title level-item">Contracts</h1>
      </div>
      <div class="level-right">
        <button class="button is-primary">
          <b-icon icon="plus"></b-icon>
        </button>
      </div>
    </div>
    <div class="columns section is-variable is-1 is-multiline">
      <div class="column is-3-fullhd is-4-desktop is-6-tablet" v-for="item in 7" :key="item">
        <Contract :item="{name: 'adf', address: 'adf'}" style="max-width: 400px"/>
      </div>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Contract from '../components/Contract.vue'
@Component({
  components: {
    Contract
  }
})
export default class Contracts extends Vue {}
</script>
<style lang="sass" scoped>
  .column:last-child 
    margin-bottom: 1.5rem;
  
</style>


