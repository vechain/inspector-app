<template>
  <b-collapse :open="false" class="card">
    <div slot="trigger" slot-scope="props" class="is-shadowless card-header">
      <p class="card-header-title">{{title}}</p>
      <a class="card-header-icon">
        <b-icon :icon="props.open ? 'caret-up' : 'caret-down'"></b-icon>
      </a>
    </div>
    <div v-if="type === 'function'" class="card-content">
      <b-field horizontal :label="v.name" v-for="(v, k) in item.inputs" :key="k">
        <b-input></b-input>
      </b-field>
      <pre>{{item}}</pre>
    </div>
    <div v-else>
      <pre>{{item}}</pre>
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class AbiItemCard extends Vue {
  @Prop({ default: null })
  private item: ABI.Item | any

  @Prop({ default: 'function' })
  private type!: 'function' | 'code' | 'abi'

  get title() {
    const type = this.type
    let result = ''
    switch (type) {
      case 'function':
        result = this.item ? this.item.name : ''
        break
      case 'code':
        result = 'Code'
        break
      case 'abi':
        result = 'ABI'
        break
    }

    return result
  }
}
</script>
