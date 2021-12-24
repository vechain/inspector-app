import { Vue, Component } from 'vue-property-decorator'
import prototype from '../abis/prototype'
import prototypeEvent from '../abis/prototypeEvent'
@Component
export default class Prototype extends Vue {
  public protoTabs: Array<{ text: string; count: number | '', visible: boolean }> = [{
    text: 'Prototype-Read',
    count: 10,
    visible: true
  },
  {
    text: 'Prototype-Write',
    count: 7,
    visible: true
  },
  {
    text: 'Prototype-Event',
    count: 4,
    visible: true
  }]

  private _abi?: ABI.FunctionItem[]
  private _abiEvent?: ABI.EventItem[]

  get prList() {
    return this._abi!.filter((item: ABI.FunctionItem) => {
      return item.type === 'function' && item.constant
    })
  }

  get pwList() {
    return this._abi!.filter((item: ABI.FunctionItem) => {
      return item.type === 'function' && !item.constant
    })
  }

  get peList() {
    return this._abiEvent
  }

  public initAbi() {
    this._abi = prototype as ABI.FunctionItem[]
    this._abiEvent = prototypeEvent as ABI.EventItem[]
  }
}
