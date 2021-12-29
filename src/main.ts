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
  // For sync1
  const genesis = window.connex.thor.genesis.id
  const main = '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a'
  const test = '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127'

  if (genesis === main) {
    Vue.prototype.$connex = new Connex({
      network: 'main',
      node: 'https://sync-mainnet.veblocks.net'
    })
  } else if (genesis === test) {
    Vue.prototype.$connex = new Connex({
      network: 'test',
      node: 'https://sync-testnet.veblocks.net'
    })
  } else {
    // If you want customize network, please reset the options
    // More https://docs.vechain.org/connex/#setup
    // Vue.prototype.$connex = new Connex({
    //   node: '',
    //   network: JSON.parse(
    //     `{"beneficiary":"0x0000000000000000000000000000000000000000","gasLimit":10000000,"gasUsed":0,"id":"0x00000000c05a20fbca2bf6ae3affba6af4a74b800b585bf7a4988aba7aea69f6","isTrunk":true,"number":0,"parentID":"0xffffffff00000000000000000000000000000000000000000000000000000000","receiptsRoot":"0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0","signer":"0x0000000000000000000000000000000000000000","size":170,"stateRoot":"0x93de0ffb1f33bc0af053abc2a87c4af44594f5dcb1cb879dd823686a15d68550","timestamp":1526400000,"totalScore":0,"transactions":[],"txsFeatures":0,"txsRoot":"0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0"}`
    //   ),
    //   noV1Compat: false
    // })
  }
} else {
  // Default is testnet for sync2
  // If you want customize network, please reset the options
  // More https://docs.vechain.org/connex/#setup
  Vue.prototype.$connex = new Connex({
    network: 'test',
    node: 'https://sync-testnet.veblocks.net'
  })
}

new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app')
