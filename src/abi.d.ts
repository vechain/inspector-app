declare namespace ABI {
  type InputItem ={
    name: string
    type: string
  }
  type Item = {
    type: 'function' | 'constructor' | 'fallback'
    name: string
    inputs: InputItem[]
    outputs: InputItem[]
    payable: boolean,
    stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
    constant: boolean
  }
}
