declare namespace ABI {
  type InputItem = {
    name: string
    type: string
  }
  type EventInputItem = {
    name: string
    type: string
    indexed?: boolean
  }
  type FunctionItem = {
    type: 'function' | 'constructor'
    name: string
    inputs: InputItem[]
    outputs: InputItem[]
    payable: boolean
    stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
    constant: boolean
  }

  type EventItem = {
    type: 'fallback' | 'event'
    name: string
    inputs: EventInputItem[]
    anonymous?: boolean
  }
}
