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

new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app')
