<template>
  <div class="section">
    <div class="container">
      <form>
        <b-field label="Byte Code">
          <b-input rows="10" v-model="code" type="textarea"/>
        </b-field>
        <b-field label="Value">
          <b-input v-model="value" placeholder="number" type="number"/>
        </b-field>
        <b-field class="is-clearfix">
          <button type="button" @click="sendCode" class="is-pulled-right button is-primary">Send</button>
        </b-field>
      </form>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
@Component
export default class DeployContract extends Vue {
  code: string = ""
  value: number | null = null
  sendCode() {
    connex.vendor.sign("tx", [
      { value: this.value || 0, data: this.code, to: null }
    ], {
      summary: 'Inspector deploy CT'
    }).then(r => {
      console.log(r)
    })
  }
}
</script>

