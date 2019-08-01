<template>
    <div class="box" :class="{'img-hover': $listeners.select}">
        <article class="media">
            <div class="media-left">
                <figure :class="{'could-hover': $listeners.select}" class="image is-64x64">
                    <img @click.stop="$emit('select')" v-ident="item.address" alt="Image" />
                </figure>
            </div>
            <div class="media-content">
                <div class="content">
                    <p>
                        <strong>{{item.name || ''}}</strong>
                    </p>
                    <p
                        class="is-family-monospace has-text-weight-semibold display-6"
                        v-if="isShort"
                    >{{item.address | addr}}</p>
                    <p class="is-family-monospace has-text-weight-semibold display-6" v-else>
                        <a
                            target="_blank"
                            :href="`https://insight.vecha.in/#/accounts/${item.address}`"
                        >{{item.address | toChecksumAddress}}</a>
                    </p>
                </div>
                <nav class="level">
                    <div class="level-left">
                        <div class="level-item">
                            <slot />
                            <!-- <a class="button is-info">Submit</a> -->
                        </div>
                    </div>
                </nav>
            </div>
            <div class="media-right">
                <div class="content">
                    <slot name="right" />
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
.image img {
    border-radius: 3px;
}

.img-hover .could-hover {
    cursor: pointer;
    transition: transform 0.2s, filter 0.2s ease-in-out;
}
.img-hover:hover .could-hover {
    transform: scale(1.1);
    filter: brightness(1.2);
}
</style>

