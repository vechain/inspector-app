import './database'
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


Vue.use(Buefy, {
  defaultIconPack: 'fas'
})

Vue.use(VeeValidate, {
  events: 'blur',
  validity: true
})

Vue.config.productionTip = false

new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app')
