<template>
  <div class="box">
    <article class="media">
      <div class="media-left">
        <figure class="image is-64x64">
          <img @click.stop="$emit('select')" class="is-rounded" v-ident="item.address" alt="Image">
        </figure>
      </div>
      <div class="media-content">
        <div class="content">
          <p>
            <strong>{{item.name || ''}}</strong>
          </p>
          <!-- <b-tooltip position="is-bottom" type="is-dark" size="is-large" :label="item.address + '  click to clip'"> -->
            <p class="is-family-monospace" v-if="isShort">{{item.address | addr}}</p>
            <p class="is-family-monospace" v-else>{{item.address}}</p>
          <!-- </b-tooltip> -->
        </div>
      </div>
      <div class="media-right">
        <div class="content">
          <slot/>
        </div>
      </div>
    </article>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class Contract extends Vue {
  @Prop()
  private item!: Contract.Item

  @Prop({ default: true })
  private isShort!: boolean
}
</script>
<style lang="sass" scoped>
  .box
    margin: auto
</style>

