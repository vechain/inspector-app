import './database'
import Vue from 'vue'
import Buefy from 'buefy'
import './custom.scss'
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App.vue'
import './filters'
import './directives'
import router from './Router'
import './overwrite.css'

Vue.use(Buefy, {
  defaultIconPack: 'fas'
})

Vue.config.productionTip = false

declare global {
  interface Window {
    readonly connex: Connex
    readonly isSyncEnv: boolean
  }
  const connex: Connex
  const isSyncEnv: boolean
}

Object.defineProperty(window, 'isSyncEnv', {
  value: true,
  enumerable: true,
  writable: false
})

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
