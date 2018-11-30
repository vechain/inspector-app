<template>
  <div>
    <div
      class="box log-list-card is-shadowless is-radiusless"
      :data="++i"
      v-for="(item, i) in list"
      :key="i"
    >
      <b-field class="log-label" horizontal v-for="(key, index) in keys" :key="index" :label="key">
        <transition
          mode="out-in"
          enter-active-class="animated faster textChange"
          leave-active-class="animated faster textOut"
        >
          <span :key="item.decoded[key]" class="is-fixed-font">{{item.decoded[key]}}</span>
        </transition>
      </b-field>

      <b-field
        class="log-label"
        horizontal
        v-for="(key, index) in blockKeys"
        :key="index+'blockKeys'"
        :label="key"
      >
        <transition
          mode="out-in"
          enter-active-class="animated faster textChange"
          leave-active-class="animated faster textOut"
        >
          <span :key="item.meta[key]" class="is-fixed-font">{{item.meta[key]}}</span>
        </transition>
      </b-field>
    </div>
    <div v-if="!list.length" class="box log-list-card is-shadowless is-radiusless">
      <div>No items!</div>
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
  list!: Array<Connex.Thor.Log<'decoded-event'>>

  @Prop({ default: false })
  metadata!: boolean

  get blockKeys() {
    if (this.metadata) {
      return ['blockNumber', 'blockID', 'txID', 'blockTimestamp']
    } else {
      return []
    }
  }
}
</script>
<style scope>
.log-list-card {
  border-bottom: 1px solid #eee;
  position: relative;
}
.log-list-card::before {
  position: absolute;
  z-index: 0;
  top: 0;
  display: block;
  content: attr(data);
  /* text-align: center; */
  font-size: 40px;
  color: #b5b5b5;
}
.log-label label {
  font-weight: lighter;
}
</style>



