<template>
  <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
    <div class="container">
      <div class="navbar-brand is-marginless">
        <h2
          class="subtitle has-text-white is-2"
          style="font-family: Noteworthy,Bradley Hand, Ink Free"
        >Inspector</h2>
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
          <div v-if="views.length" class="navbar-item has-dropdown is-hoverable">
            <a class="navbar-link">Views</a>
            <div class="navbar-dropdown">
              <router-link
                class="navbar-item"
                :to="{
                name: 'filter_view',
                params: {
                  id: view.id
                }
              }"
                v-for="(view, index) in views"
                :key="index"
              >{{view.name}}</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component
export default class Navbar extends Vue {
  private routes = [
    { name: 'home', text: 'Home' },
    { name: 'contracts', text: 'Contracts' }
  ]

  private views: Entities.Filter[] = []

  private async created() {
    this.views = await DB.filters.toArray()
  }
}
</script>

