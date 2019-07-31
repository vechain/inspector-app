<template>
<body class="has-navbar-fixed-top">
    <Navbar class="is-fixed-top" />
    <div class="router-view">
        <router-view></router-view>
    </div>
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
    public created() {
        this.$ga.page('/inspector')
    }
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



