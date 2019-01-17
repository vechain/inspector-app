<template>
    <div v-if="isShow">
        <b-modal :active="show" :canCancel="[]">
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-head-title is-size-4">
                        Connex
                        <strong>not detected</strong>
                    </p>
                </header>
                <div class="modal-card-body">
                    <div class="is-size-6">
                        It's recommended to open in
                        <strong class="has-text-primary">VeChain Sync</strong>.
                    </div>
                </div>
                <footer class="modal-card-foot" style="flex-direction: row-reverse">
                    <p>
                        <a @click="openWithSync" class="button is-small is-primary">Open in</a>or
                        <a :href="syncReleaseUrl">Download</a> VeChain Sync
                    </p>
                </footer>
            </div>
        </b-modal>
    </div>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
// import customProtocolDetection from 'custom-protocol-detection'
@Component
export default class EnvInspect extends Vue {
    @Prop(Boolean)
    private isShow!: false

    private show!: boolean

    private syncReleaseUrl = `https://github.com/vechain/thor-sync.electron/releases`

    created() {
        this.show = this.isShow
    }

    openWithSync() {
        const customProtocolDetection = require('custom-protocol-detection')
        const vechainAppUrl = 'vechain-app:///' + encodeURIComponent(window.location.href)
        const gotoDownload = () => {
            window.location.href = this.syncReleaseUrl
        }
        customProtocolDetection(vechainAppUrl, () => {
            gotoDownload()
        }, () => {
            // TODO Open with sync
        }, () => {
            gotoDownload()
        })
    }
}
</script>

