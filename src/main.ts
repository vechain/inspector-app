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

if (window.connex) {
    // sync1
    Vue.prototype.$connex = new Connex({
      network: window.connex.thor.genesis,
      node: '',
      noV1Compat: false
    })
} else {
  // Default is main net for sync2
  const net = localStorage.getItem('last-net') || 'main'

  if (net === 'test') {
    Vue.prototype.$connex = new Connex({
      network: 'test',
      node: 'https://sync-testnet.veblocks.net'
    })
  } else if (net === 'main') {
    Vue.prototype.$connex = new Connex({
      network: 'main',
      node: 'https://sync-mainnet.veblocks.net'
    })
  } else if (net === 'custom') {
    const node = localStorage.getItem('custom-node')
    const network = JSON.parse(localStorage.getItem('custom-network') || '') // genesis block json string

    if (node && network) {
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
