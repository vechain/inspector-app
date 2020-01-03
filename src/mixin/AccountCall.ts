import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class AccountCall extends Vue {
  @Prop({ default: null })
  public item: ABI.FunctionItem | any
  @Prop() public address!: string

  @Prop({ default: false })
  public prototype?: boolean

  public value: string | null = null
  public resp: any = null
  public request: any = null
  public method: Connex.Thor.Method | null = null
  public params: string[] = new Array(this.item.inputs.length)

  public caller?: string = ''

  public callFC() {
    this.resetOutputs()
    if (this.validate()) {
      this.readMethod()
    }
  }
  public reset() {
    const inputs = this.$refs.input as any[] || []
    inputs.forEach((element) => {
      element.$parent.newType = ''
      element.$parent.newMessage = ''
    })
    this.params.forEach((item, index) => {
      if (!(this.prototype && this.item.inputs[index].name === '_self')) {
        this.$set(this.params, index, '')
      }
    })

    this.resetOutputs()
  }
  public resetOutputs() {
    this.request = null
    this.resp = null
  }
  public executeFC() {
    this.resetOutputs()
    if (this.validate()) {
      this.writeMethod()
    }
  }

  public initMethod(address: string, abi: object) {
    const account = connex.thor.account(this.prototype
      ? '0x000000000000000000000050726f746f74797065'
      : address.toLowerCase())
    this.method = account.method(abi)
  }

  private validate() {
    const inputs = this.$refs.input as any[] || []
    inputs.forEach((element) => {
      element.checkHtml5Validity()
    })
    return !inputs.some((item) => {
      return item.isValid === false
    })
  }

  public get hexValue() {
    return BN(this.item.payable ? this.value || 0 : 0).multipliedBy(1e18).toFixed(0).toString(16)
  }

  private async readMethod() {
    const params: any[] = this.params.map((item: string, index: number) => {
      return this.item.inputs[index].type.endsWith('[]') ? JSON.parse(item) : item
    })

    this.request = this.method!.value(this.hexValue).asClause(...params)

    try {
      if (this.caller) {
        this.resp = await this.method!.value(this.hexValue).caller(this.caller).call(...params)
      } else {
        this.resp = await this.method!.value(this.hexValue).call(...params)
      }
    } catch (error) {
      BUS.$alert(error.message)
    }
  }
  private async writeMethod() {
    try {
      const params: any[] = this.params.map((item: string, index: number) => {
        return this.item.inputs[index].type.endsWith('[]') ? JSON.parse(item) : item
      })

      const clause = this.method!.value(this.hexValue).asClause(...params)
      this.request = clause

      connex.vendor
        .sign('tx')
        .comment(`inspect-${this.address}`)
        .request([
          {
            ...clause,
            comment: this.item.name
          }
        ])
    } catch (error) {
      BUS.$alert(error.message)
    }
  }
}
