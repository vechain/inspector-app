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
    mounted() {
        if (!this.$connex) {
            this.$router.push({name: 'notSupport'})
        }
    }
}
</script>
<style>
html {
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: var(--body-background);
}
body {
    height: 100vh;
    margin: 0;
    padding: 0 !important;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: var(--body-background);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
}
.router-view {
    flex: 1;
    overflow: hidden;
    background-color: var(--body-background);
}
</style>



