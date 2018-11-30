declare namespace ABI {
  interface InputItem {
    name: string
    type: string
  }
  interface EventInputItem {
    name: string
    type: string
    indexed?: boolean
  }
  interface FunctionItem {
    type: 'function' | 'constructor'
    name: string
    inputs: InputItem[]
    outputs: InputItem[]
    payable: boolean
    stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
    constant: boolean
  }

  interface EventItem {
    type: 'fallback' | 'event'
    name: string
    inputs: EventInputItem[]
    anonymous?: boolean
  }
}
