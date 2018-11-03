import {Vue} from 'vue-property-decorator'
Vue.filter('addr', (v: string) => {
    const temp = v.startsWith('0x') ? v : `0x${v}`
    return temp.substring(0, 10) + '....' + temp.substring(temp.length - 8, temp.length)
})
