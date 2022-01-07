import { Vue } from 'vue-property-decorator'
import { picasso } from '@vechain/picasso'
import { VNode } from 'vue'

function getImg(el: HTMLElement, address: string): string {
  const svg = picasso(address.toLowerCase())
  if (el.nodeName === 'IMG') {
    return `data:image/svg+xml;utf8,${svg}`
  } else {
    return `no-repeat url('data:image/svg+xml;utf8,${svg}')`
  }
}

Vue.directive('ident', {
  update(el: HTMLElement, binding: any) {
    if (binding.value !== binding.oldValue) {
      if (el.nodeName === 'IMG') {
        const temp = el as HTMLImageElement
        temp.src = getImg(el, binding.value)
      } else {
        el.style.background = getImg(el, binding.value)
        el.style.backgroundSize = 'cover'
      }
    }
  },
  inserted(el: HTMLElement, binding: any) {
    if (binding.value !== binding.oldValue) {
      if (el.nodeName === 'IMG') {
        const temp = el as HTMLImageElement
        temp.src = getImg(el, binding.value)
      } else {
        el.style.background = getImg(el, binding.value)
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
    SE.onscroll = (event: any) => {
      window.clearTimeout(scrollEnd)
      scrollEnd = window.setTimeout(() => {
        const top = event.target.scrollTop
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
