<template>
    <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
        <div class="container">
        <div class="navbar-brand is-marginless">
            <h2 class="subtitle has-text-white is-2" style="padding-left: 20px">Inspector</h2>
            <a role="button" class="navbar-burger" @click="burgerActive = !burgerActive" :class="{'is-active': burgerActive}">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>
        <div class="navbar-menu" :class="{'is-active': burgerActive}">
            <div style="width: 40px"></div>
            <div class="navbar-start">
                <router-link
                    v-for="(item, index) in routes"
                    :key="index"
                    exact
                    :to="{name: item.name}"
                    class="navbar-item"
                >{{item.text}}</router-link>
                <div v-if="views.length" class="navbar-item has-dropdown is-hoverable">
                    <a class="navbar-link">Views</a>
                    <div class="navbar-dropdown">
                        <router-link
                            class="navbar-item"
                            :to="{
                name: 'filter_mgt'
              }"
                        >All</router-link>
                        <hr class="navbar-divider">
                        <router-link
                            class="navbar-item"
                            :to="{
                name: 'filter_view',
                params: {
                  id: view.id
                }
              }"
                            v-for="(view, index) in views"
                            :key="index"
                        >{{view.name}}</router-link>
                    </div>
                </div>
                <router-link
                    v-if="shortCuts"
                    class="navbar-item"
                    active-class="has-background-grey-dark"
                    :to="{name: 'short_cuts'}"
                >Shortcuts</router-link>
            </div>
            <div class="navbar-end" style="padding-right: 20px">
                <template v-if="!unknownNet" >
                    <a class="navbar-item" v-if="isTest" href="https://inspector.vecha.in/" target="_self">Mainnet</a>
                    <a class="navbar-item"  v-else href="https://inspector-testnet.vecha.in/" target="_self">Testet</a>
                </template>
                <a class="navbar-item" href="https://github.com/vechain/inspector-app" target="_blank">GitHub</a>
            </div>
        </div>
        </div>
    </nav>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component
export default class Navbar extends Vue {
    private routes = [
        { name: 'contracts', text: 'Contracts' },
        { name: 'deploy', text: 'Deploy' }
    ]

    private burgerActive = false

    private views: Entities.Filter[] = []
    private shortCuts: number = 0

    private async getList() {
        this.views = await DB.filters.limit(5).toArray()
    }

    private async countShortCuts() {
        this.shortCuts = await DB.shortCuts.count()
    }

    get unknownNet() {
        return !['0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a', '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127'].includes(this.$connex.thor.genesis.id)
    }

    get isTest() {
        return window.location.host.includes('test')
    }

    private async created() {
        await this.getList()
        await this.countShortCuts()

        DB.subscribe('filters', () => {
            this.getList()
        })

        DB.subscribe('shortCuts', () => {
            this.countShortCuts()
        })
    }
}
</script>

<style scoped>
.navbar-brand.is-marginless .subtitle:not(:last-child) {
  margin-bottom: 0;
}
</style>
