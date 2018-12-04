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
    readonly isSyncEnv: boolean
    readonly BUS: Vue
  }
  const isSyncEnv: boolean
  const BUS: Vue
}

Object.defineProperty(window, 'isSyncEnv', {
  value: !!window.connex,
  enumerable: true,
  writable: false
})

Object.defineProperty(window, 'BUS', {
  // tslint:disable-next-line:new-parens
  value: new Vue,
  enumerable: true,
  writable: false
})

new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app')
