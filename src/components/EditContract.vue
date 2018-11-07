<template>
  <form>
    <div class="modal-card">
      <header class="modal-card-head">
        <span class="modal-card-title">Edit Contract</span>
      </header>
      <section class="modal-card-body">
        <b-field label="name">
          <b-input type="text"></b-input>
        </b-field>
        <b-field label="address">
          <b-input type="text"></b-input>
        </b-field>
        <b-field label="ABI">
          <b-input type="textarea"></b-input>
        </b-field>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click="$parent.close()">Cancel</button>
        <button class="button is-primary">Edit</button>
      </footer>
    </div>
  </form>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
@Component
export default class EditContract extends Vue {
  @Prop(String)
  private address!: string
}
</script>

