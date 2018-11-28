<template>
  <div class="box" :class="{'img-hover': $listeners.select}">
    <article class="media">
      <div class="media-left">
        <figure :class="{'could-hover': $listeners.select}" class="image is-64x64">
          <img @click.stop="$emit('select')" class="is-rounded" v-ident="item.address" alt="Image">
        </figure>
      </div>
      <div class="media-content">
        <div class="content">
          <p>
            <strong>{{item.name || ''}}</strong>
          </p>
          <p class="is-fixed-font is-size-7" v-if="isShort">{{item.address | addr}}</p>
          <p class="is-fixed-font is-size-6" v-else>{{item.address}}</p>
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
<style lang="css" scoped>
.box {
  margin: auto;
}

.img-hover .could-hover {
  cursor: pointer;
  transition: transform .2s, filter .2s ease-in-out;
}
.img-hover:hover .could-hover {
  transform: scale(1.1);
  filter: brightness(1.2);
}
</style>

