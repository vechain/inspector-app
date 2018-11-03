<template>
  <div class="box">
    <article class="media">
      <div class="media-left">
        <figure class="image is-64x64">
          <img alt="Image">
        </figure>
      </div>
      <div class="media-content">
        <div class="content">
          <p>
            <strong>{{item.name || ''}}</strong>
          </p>
          <p>{{item.address | addr}}</p>
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
  item!: Contract.Item
}
</script>
<style lang="sass" scoped>
  .box
    margin: auto
</style>

