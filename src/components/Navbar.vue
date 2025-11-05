<template>
    <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
        <div class="navbar-content">
        <div class="navbar-brand is-marginless">
            <div class="brand-logo">
                <div class="logo-icon">
                    <b-icon icon="bolt" size="is-small"></b-icon>
                </div>
                <div class="logo-text">
                    <h1 class="logo-title">Inspector</h1>
                    <p class="logo-subtitle">Smart Contract Explorer</p>
                </div>
            </div>
            <a role="button" class="navbar-burger" @click="burgerActive = !burgerActive" :class="{'is-active': burgerActive}">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>
        <div class="navbar-menu" :class="{'is-active': burgerActive}">
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
                <a class="navbar-item" href="https://github.com/vechain/inspector-app" target="_blank">GitHub</a>
            </div>
            <div class="navbar-end">
                <b-tag v-if="networks.length === 1" size="is-medium" type="is-warning" style="margin: auto 0px;"  >{{networks[0].label}}</b-tag>
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

.navbar {
  height: 3.25rem;
  position: relative;
  margin: 0;
  padding: 0;
}

.navbar-content {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  height: 100%;
}

.navbar-content .navbar-brand {
  margin: 0;
  display: flex;
  align-items: center;
  height: 3.25rem;
  padding-right: 1rem;
}

.navbar-content .navbar-menu {
  margin: 0;
  flex: 1;
  padding: 0;
}

.navbar-item {
  padding: 0.5rem 1rem;
}

.navbar-end {
  padding-right: 0.5rem;
}

/* Brand Logo Styling */
.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.logo-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.logo-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  margin: 0;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .navbar-content {
    padding: 0 0.75rem;
  }

  .navbar-content .navbar-brand {
    width: 100%;
  }

  .logo-icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .logo-title {
    font-size: 1.1rem;
  }

  .logo-subtitle {
    display: none;
  }

  .navbar-item {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .navbar-menu {
    background-color: #363636;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
  }

  .navbar-menu.is-active {
    display: block;
  }

  .navbar-burger {
    color: white;
  }
  
  .navbar-burger:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

@media (max-width: 480px) {
  .navbar-content {
    padding: 0 0.5rem;
  }

  .brand-logo {
    gap: 0.5rem;
  }

  .logo-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .logo-title {
    font-size: 1rem;
  }
}
</style> 
