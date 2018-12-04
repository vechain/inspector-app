import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class AccountCall extends Vue {
  @Prop({ default: null })
  public item: ABI.FunctionItem | any
  @Prop() public address!: string

  public value: string | null = null
  public resp: any = null
  public method: Connex.Thor.Method | null = null
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
      this.resp = await this.method!.value(this.value || 0)
        .caller(this.caller || '0x0000000000000000000000000000000000000000')
        .call(...this.params)
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
      connex.vendor
        .sign('tx')
        .comment(`inspect-${this.address}`)
        .request([
          { ...this.method!.value('0x0').asClause(...this.params), comment: this.item.name }
        ])
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(error)
    }
  }
}
