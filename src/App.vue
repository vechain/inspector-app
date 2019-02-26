<template>
<body class="has-navbar-fixed-top">
    <Navbar class="is-fixed-top"/>
    <router-view class="router-view"></router-view>
</body>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Navbar from './components/Navbar.vue'

@Component({
    components: {
        Navbar
    }
})
export default class App extends Vue {
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



