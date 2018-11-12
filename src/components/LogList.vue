<template>
  <div>
    <div class="box log-list-card is-shadowless is-radiusless" v-for="(item, i) in list" :key="i">
      <!-- <div class="card-content"> -->
        <b-field horizontal v-for="(key, index) in keys" :key="index" :label="key">
          <span class="is-fixed-font has-text-grey is-size-7">{{item[key]}}</span>
        </b-field>
      <!-- </div> -->
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class LogList extends Vue {
  @Prop(Array)
  keys!: any[]

  @Prop(Array)
  list!: any[]
}
</script>
<style scope>
.log-list-card {
  border-bottom: 1px solid #eee
}
</style>


