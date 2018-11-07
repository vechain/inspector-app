<template>
<body class="has-navbar-fixed-top">
  <EnvInspect :isShow="!isSync"/>
  <Navbar v-if="isSync" class="is-fixed-top"/>
  <router-view v-if="isSync" class="router-view section"></router-view>
</body>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Navbar from './components/Navbar.vue'
import EnvInspect from './components/EnvInspect.vue'
@Component({
  components: {
    Navbar,
    EnvInspect
  }
})
export default class App extends Vue {
  private isSync = isSyncEnv
}
</script>
<style>
html {
  height: 100vh;
}
body {
  height: 100%;
}
.router-view {
  height: 100%;
  overflow: auto;
}

</style>



