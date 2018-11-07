import { Vue } from 'vue-property-decorator'
import { generate } from './ident-svg'

Vue.directive('ident', {
  inserted(el: HTMLElement, binding: any) {
    if (binding.value !== binding.oldValue) {
      const svg = generate(binding.value)
      if (el.nodeName === 'IMG') {
        const temp = el as HTMLImageElement
        temp.src = `data:image/svg+xml;utf8,${svg}`
      } else {
        el.style.background = `no-repeat url('data:image/svg+xml;utf8,${svg}')`
        el.style.backgroundSize = 'cover'
      }
    }
  }
})
