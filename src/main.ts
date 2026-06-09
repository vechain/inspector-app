
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
import { createConnex, createConnexForNetwork, isSoloNode, nodeUrls } from './create-connex'
import { prePopulate } from '@/pre-populate'
import { getNetworkById } from './services/network-service'
import { isCustomNetwork, getCustomNetworkId } from './utils'
declare module 'vue/types/vue' {
  interface Vue {
    $connex: Connex
    $explorerAccount: (id: string) => string
    $explorerBlock: (id: string) => string
    $explorerTx: (id: string) => string
    $nodeUrl: string
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


function setExplorerUrl(path: 'main' | 'test' | 'solo') {
  if (path === 'solo') {
    Vue.prototype.$explorerAccount = (id: string) => `https://insight.vecha.in/#/solo/accounts/${id}`
    Vue.prototype.$explorerBlock = (id: string) => `https://insight.vecha.in/#/solo/blocks/${id}`
    Vue.prototype.$explorerTx = (id: string) => `https://insight.vecha.in/#/solo/txs/${id}`
    return
  }
  const network = path === 'main' ? 'mainnet' : 'testnet'
  const query = `?network=${network}`
  Vue.prototype.$explorerAccount = (id: string) => `https://explore.vechain.org/address/${id}${query}`
  Vue.prototype.$explorerBlock = (id: string) => `https://explore.vechain.org/block/${id}${query}`
  Vue.prototype.$explorerTx = (id: string) => `https://explore.vechain.org/transactions/${id}${query}`
}

function setExplorerUrlForCustomNode(nodeUrl: string) {
  const host = nodeUrl.endsWith('/') ? nodeUrl : (nodeUrl + '/')
  Vue.prototype.$explorerAccount = (id: string) => `${host}accounts/${id}`
  Vue.prototype.$explorerBlock = (id: string) => `${host}blocks/${id}`
  Vue.prototype.$explorerTx = (id: string) => `${host}transactions/${id}`
}

async function initApp() {
  // Default is main net for sync2/VeWorld
  const defaultNetwork = isSoloNode ? 'solo' : 'main'
  const net = localStorage.getItem('last-net') || defaultNetwork
  console.log("net", net)

  if (['test', 'main', 'solo'].includes(net)) {
    setExplorerUrl(net as "test" | "main" | "solo")
    Vue.prototype.$connex = createConnex(net as "test" | "main" | "solo")
    Vue.prototype.$nodeUrl = nodeUrls[net as "test" | "main" | "solo"]
  } else if (isCustomNetwork(net)) {
      const networkId = getCustomNetworkId(net)
      if (networkId) {
        try {
          const customNetwork = await getNetworkById(networkId)
          if (customNetwork) {
            const genesisBlock = {
              number: 0,
              id: customNetwork.genesisId,
              size: 0,
              parentID: "0x0000000000000000000000000000000000000000000000000000000000000000",
              timestamp: 0,
              gasLimit: 0,
              beneficiary: "0x0000000000000000000000000000000000000000",
              gasUsed: 0,
              totalScore: 0,
              txsRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
              txsFeatures: 0,
              stateRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
              receiptsRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
              signer: "0x0000000000000000000000000000000000000000",
              isTrunk: true,
              transactions: []
            }

            setExplorerUrlForCustomNode(customNetwork.nodeUrl)

            Vue.prototype.$connex = createConnexForNetwork(customNetwork.nodeUrl, genesisBlock, genesisBlock.id)
            Vue.prototype.$nodeUrl = customNetwork.nodeUrl
          } else {
            console.error('Custom network not found, falling back to mainnet')
            localStorage.setItem('last-net', 'main')
            setExplorerUrl('main')
            Vue.prototype.$connex = createConnex('main')
            Vue.prototype.$nodeUrl = nodeUrls.main
          }
        } catch (error) {
          console.error('Failed to load custom network:', error)
          localStorage.setItem('last-net', 'main')
          setExplorerUrl('main')
          Vue.prototype.$connex = createConnex('main')
          Vue.prototype.$nodeUrl = (await import('./create-connex')).nodeUrls.main
        }
      }
    } else {
      const node = localStorage.getItem('custom-node')
      const network = JSON.parse(localStorage.getItem('custom-network') || '') as any // genesis block

      if (node && network) {
        if (network.id === '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127') {
          // test
          setExplorerUrl('test')
        } else if (network.id === '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a') {
          // main
          setExplorerUrl('main')
        } else {
          setExplorerUrlForCustomNode(node)
        }
        Vue.prototype.$connex = createConnexForNetwork(node, network, network.id)
        Vue.prototype.$nodeUrl = node
      }
    }

  prePopulate()

  new Vue({
    router,
    render: (h) => h(App)
  }).$mount('#app')
}

initApp()
