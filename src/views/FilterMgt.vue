<template>
  <sectoin class="container">
    <pre>{{list}}</pre>
  </sectoin>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component
export default class FilterMgt extends Vue {
  private list: Entities.Filter[] = []
  private created() {
    this.initList()
  }

  private async initList() {
    this.list = await DB.filters.offset(0).limit(5).toArray()
  }
}
</script>
