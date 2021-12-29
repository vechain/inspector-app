import { Vue, Component } from 'vue-property-decorator'
import Router from 'vue-router'
import NotSupport from './views/NotSupport.vue'
import Contracts from './views/Contracts.vue'
import Deploy from './views/DeployContract.vue'
import ContractDetail from './views/ContractDetail.vue'
import FilterView from './views/FilterView.vue'
import FilterMgt from './views/FilterMgt.vue'
import ShortCuts from './views/ShortCuts.vue'

Vue.use(Router)

const router = new Router({
  mode: 'hash',
  routes: [
    {
      name: 'root',
      redirect: { name: 'contracts' },
      path: '/'
    },
    {
      name: 'notSupport',
      component: NotSupport,
      path: '/not-support'
    },
    {
      name: 'contracts',
      component: Contracts,
      path: '/contracts'
    },
    {
      name: 'deploy',
      component: Deploy,
      path: '/deploy'
    },
    {
      name: 'contract_detail',
      component: ContractDetail,
      path: '/contract/detail'
    },
    {
      name: 'filter_view',
      component: FilterView,
      path: '/view/:id/list'
    }, {
      name: 'filter_mgt',
      component: FilterMgt,
      path: '/view/mgt'
    }, {
      name: 'short_cuts',
      component: ShortCuts,
      path: '/view/scs'
    }, {
      path: '*',
      redirect: { name: 'contracts' }
    }
  ]
})

export default router
