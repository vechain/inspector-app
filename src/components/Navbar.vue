<template>
  <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
    <div class="container">
      <div class="navbar-brand">
        <h2 class="subtitle has-text-white is-2" style="font-family: Bradley Hand, Ink Free">Inspect</h2>
      </div>
      <div class="navbar-menu">
        <div style="width: 60px"></div>
        <div class="navbar-start">
          <router-link
            v-for="(item, index) in routes"
            :key="index"
            exact
            active-class="has-background-grey-dark"
            :to="{name: item.name}"
            class="navbar-item"
          >{{item.text}}</router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
@Component
export default class Navbar extends Vue {
  private routes = [
    { name: 'home', text: 'Home' },
    { name: 'contracts', text: 'Contracts' }
  ]
}
</script>

