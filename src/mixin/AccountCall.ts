import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class AccountCall extends Vue {
  @Prop({ default: null })
  public item: ABI.FunctionItem | any
  @Prop() public address!: string

  public value: string | null = null
  public resp: any = null
  public method: any = null
  public params: any[] = new Array(this.item.inputs.length)

  public caller?: string = ''

  public callFC() {
    if (this.validate()) {
      this.readMethod()
    }
  }
  public reset() {
    const inputs = this.$refs.input as any[]
    inputs.forEach((element) => {
      element.$parent.newType = ''
      element.$parent.newMessage = ''
    })
    this.params.forEach((item, index) => {
      this.$set(this.params, index, '')
    })

    this.resp = null
  }
  public executeFC() {
    if (this.validate()) {
      this.writeMethod()
    }
  }

  private validate() {
    const inputs = this.$refs.input as any[]
    inputs.forEach((element) => {
      element.checkHtml5Validity()
    })
    return !inputs.some((item) => {
      return item.isValid === false
    })
  }
  private async readMethod() {
    try {
      this.resp = await this.method.call(this.params, this.value || 0, {
        caller: this.caller || '0x0000000000000000000000000000000000000000'
      })
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(error)
    }
  }
  private async writeMethod() {
    try {
      const params: any[] = []
      this.params.forEach((item: string) => {
        if (item) {
          return params.push(item)
        }
      })
      this.resp = await connex.vendor.sign(
        'tx',
        [{ ...this.method.asClause(this.params, '0x0'), desc: this.item.name }],
        {
          summary: `inspect-${this.address}`
        }
      )
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(error)
    }
  }
}
