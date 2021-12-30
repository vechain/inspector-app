import DB from './database'
import './window.init'
import Vue from 'vue'
import Buefy from 'buefy'
import VeeValidate from 'vee-validate'
import './validator'
import './custom.scss'
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App.vue'
import './filters'
import './directives'
import router from './Router'
import './overwrite.css'
import VueAnalytics from 'vue-analytics'
import Connex from '@vechain/connex'
declare module 'vue/types/vue' {
  interface Vue {
    $connex: Connex
    $explorerAccount: string
    $explorerBlock: string
    $explorerTx: string
  }
}

Vue.use(Buefy, {
  defaultIconPack: 'fas'
})

Vue.use(VeeValidate, {
  events: 'blur',
  validity: true
})

Vue.use(VueAnalytics, {
  id: 'UA-132391998-2',
  disabled: process.env.NODE_ENV === 'production'
})

Vue.config.productionTip = false


function setExplorerUrl(path: string) {
  const temp = path ? (path + '/') : path
  Vue.prototype.$explorerAccount = `https://insight.vecha.in/#/${temp}accounts/`
  Vue.prototype.$explorerBlock = `https://insight.vecha.in/#/${temp}blocks/`
  Vue.prototype.$explorerTx = `https://insight.vecha.in/#/${temp}txs/`
}

if (window.connex) {
    // sync1
    Vue.prototype.$connex = new Connex({
      network: window.connex.thor.genesis,
      node: '',
      noV1Compat: false
    })
    setExplorerUrl('')
} else {
  // Default is main net for sync2
  const net = localStorage.getItem('last-net') || 'main'

  if (['test', 'main'].includes(net)) {
    setExplorerUrl(net)
    if (net === 'test') {
      Vue.prototype.$connex = new Connex({
        network: 'test',
        node: 'https://sync-testnet.veblocks.net'
      })
    } else {
      Vue.prototype.$connex = new Connex({
        network: 'main',
        node: 'https://sync-mainnet.veblocks.net'
      })
    }
  } else {
    const node = localStorage.getItem('custom-node')
    const network = JSON.parse(localStorage.getItem('custom-network') || '') as Connex.Thor.Block // genesis block

    if (node && network) {
      if (network.id === '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127') {
        // test
        setExplorerUrl('test')
      } else if (network.id === '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a') {
        // main
        setExplorerUrl('main')
      } else {
        const host = node.endsWith('/') ? node : (node + '/')
        Vue.prototype.$explorerAccount = `${host}accounts/`
        Vue.prototype.$explorerBlock = `${host}blocks/`
        Vue.prototype.$explorerTx = `${host}transactions/`
      }
      Vue.prototype.$connex = new Connex({
        network,
        node
      })
    }
  }
}

new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app')
