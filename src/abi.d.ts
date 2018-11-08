declare namespace ABI {
  type InputItem = {
    name: string
    type: string
  }
  type EventInputItem = {
    name: string
    type: string
    indexed: boolean
  }
  type Item = {
    type: 'function' | 'constructor' | 'fallback' | 'event'
    name: string
    inputs: InputItem[] | EventInputItem[]
    outputs?: InputItem[]
    payable: boolean
    stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable'
    constant?: boolean
    anonymous?: boolean
  }
}
