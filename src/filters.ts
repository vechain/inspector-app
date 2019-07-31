import { Vue } from 'vue-property-decorator'
import { toChecksumAddress } from 'thor-devkit/es6/cry/address'
Vue.filter('addr', (v: string) => {
    const temp = v.startsWith('0x') ? v : `0x${v}`
    return temp.substring(0, 8) + '…' + temp.substring(temp.length - 8, temp.length)
})

Vue.filter('datetime', (v: number) => {
    return new Date(v).toLocaleString()
})

Vue.filter('toChecksumAddress', (val: string) => {
    return toChecksumAddress(val)
})
