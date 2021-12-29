<template>
  <div style="width: 500px; margin: 140px auto; font-size: 25px">
    Inspector only supported for the <strong style="color: #26a69a">Main</strong> or <strong style="color: #26a69a">Test</strong> net.
    if you need other networks, please check on 
    <a target="_blank" href="https://github.com/vechain/inspector-app">
      <strong>GitHub</strong>
    </a>
  </div>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
@Component
export default class Home extends Vue {
}
</script>
