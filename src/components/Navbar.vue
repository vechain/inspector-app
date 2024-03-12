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
                <b-badge v-if="networks.length === 1" size="sm" variant="warning" style="margin: auto 0px;"  >{{networks[0].label}}</b-badge>
                <b-dropdown
                v-if="networks.length > 1"
                size="sm"
                :text="network"
                toggle-class="py-0 px-1"
                style="vertical-align:top"
                >
                <template slot="trigger">
                        <b-button class="navbar-item" type="is-dark" :label="network" icon-right="caret-down"/>
                    </template>
                        <b-dropdown-item
                            v-for="(n, i) in switchableNetworks"
                            :key="i"
                            :value="n.name"
                            @click="onChange(n.name)"
                        >{{n.label}}</b-dropdown-item>
                    </b-dropdown>
                <a class="navbar-item " href="https://github.com/vechain/inspector-app" target="_blank">GitHub</a>
            </div>
        </div>
        </div>
    </nav>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import DB, { Entities } from '../database'
import { isSoloNode } from '@/create-connex'
import { networkToGenesisId, genesisIdToNetwork } from '@/utils'

@Component
export default class Navbar extends Vue {
    private routes = [
        { name: 'contracts', text: 'Contracts' },
        { name: 'deploy', text: 'Deploy' }
    ]

    private burgerActive = false

    private views: Entities.Filter[] = []
    private shortCuts: number = 0
    private node = localStorage.getItem('custom-node')
    private genesis = localStorage.getItem('custom-network')

    get hasConnex() {
        return !!window.connex
    }

    get hasCustom() {
        return !!this.node && !!this.genesis
    }


    get network() {
            switch (genesisIdToNetwork(this.$connex.thor.genesis.id)) {
                case 'main': return 'Mainnet'
                case 'test': return 'Testnet'
                case 'solo': return 'Solonet'
                default: return 'Custom'
            }
        }

    get networks(): Array<{ name: string, label: string }> {
            if(isSoloNode) return [ {
                name: 'solo',
                label: 'SoloNet',
                }]
            return [
                { name: 'main',label: 'Mainnet',  },
                { name: 'test',label: 'Testnet', },
                ...(isSoloNode ? [{ name:'solo',label: 'Solonet', }] : []),
            ]
        }
    get switchableNetworks(): Array<{ name: string, label: string }> {
        return this.networks.filter(i =>  this.$connex.thor.genesis.id !== networkToGenesisId(i.name))
    }
        
    onChange(type: 'main' | 'test' | 'solo' | 'custom') {
        localStorage.setItem('last-net', type)
        window.location.href = window.location.origin
    }
    private async getList() {
        this.views = await DB.filters
            .filter((item) => (item.network === this.network) || (item.network === undefined)).limit(5).toArray()
    }

    private async countShortCuts() {
        this.shortCuts = await DB.shortCuts
            .filter((item) => (item.network === this.network) || (item.network === undefined)).count()
    }

}
</script>

<style scoped>
.navbar-brand.is-marginless .subtitle:not(:last-child) {
  margin-bottom: 0;
}
</style>import { isSoloNode } from '@/create-connex'
import { isSoloNode } from '@/create-connex'
import { isSoloNode } from '@/create-connex'
genesisIdToNetwork, 
