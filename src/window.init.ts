import { Connex } from '@vechain/connex'
import Vue from 'vue'
// tslint:disable-next-line:no-var-requires
const BN = require('bignumber.js')
declare global {
  interface Window {
    readonly BUS: Vue | any,
    readonly BN: any
  }
  const BUS: Vue | any
  const BN: any
}

Object.defineProperty(window, 'BUS', {
  // tslint:disable-next-line:new-parens
  value: new Vue(),
  enumerable: true,
  writable: false
})
window.BUS.$alert = (msg: string) => {
  BUS.$buefy.dialog.confirm({
    title: 'Error',
    type: 'is-danger',
    message: `${msg}`,
    hasIcon: true,
    cancelText: 'Close',
    confirmText: 'Open an issue',
    onConfirm: () => {
      window.open('https://github.com/vechain/inspector-app/issues', '_blank')
    }
  })
}
Object.defineProperty(window, 'BN', {
  value: BN,
  enumerable: true,
  writable: false
})
