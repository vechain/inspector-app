import { Vue } from 'vue-property-decorator'
import { generate } from './ident-svg'
import { VNode } from 'vue'

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

Vue.directive('inview', {
  update(el: HTMLElement, binding: any, vnode: VNode) {
    const SE = document.querySelector(binding.value)
    let scrollEnd: number
    const offsetTop = el.offsetTop
    const elHeight = el.clientHeight
    el.style.transition = 'margin-top 0.15s'
    SE.onscroll = function(event: any) {
      window.clearTimeout(scrollEnd)
      scrollEnd = window.setTimeout(function() {
        let top = event.target.scrollTop
        if (top > offsetTop) {
          const temp = top - (offsetTop - elHeight)
          el.style.marginTop = (temp > 0 ? temp : 0) + 'px'
        } else {
          el.style.marginTop = '0px'
        }
      }, 100)
    }
  }
})
