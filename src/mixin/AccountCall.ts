import { Vue, Component, Prop } from "vue-property-decorator";
@Component
export default class AccountCall extends Vue {
  @Prop({ default: null })
  public item!: ABI.FunctionItem | any;
  @Prop() public address!: string;

  @Prop({ default: false })
  public prototype?: boolean;

  public value: string | null = null;
  public resp: any = null;
  public request: any = null;
  public method: Connex.Thor.Account.Method | null = null;
  public params: string[] = new Array(this.item.inputs.length);

  public caller?: string = "";
  public receipt: Connex.Thor.Transaction.Receipt | null = null;
  public txid: string | null = null;
  public receiptStatus: "pending" | "completed" | "error" | null = null;
  private receiptPollingInterval: number | null = null;
  private receiptPollingTimeout: number | null = null;

  public callFC() {
    this.resetOutputs();
    if (this.validate()) {
      this.readMethod();
    }
  }
  public reset() {
    const inputs = (this.$refs.input as any[]) || [];
    inputs.forEach((element) => {
      element.$parent.newType = "";
      element.$parent.newMessage = "";
    });
    this.params.forEach((item, index) => {
      if (!(this.prototype && this.item.inputs[index].name === "_self")) {
        this.$set(this.params, index, "");
      }
    });

    this.resetOutputs();
  }
  public resetOutputs() {
    this.request = null;
    this.resp = null;
    this.receipt = null;
    this.txid = null;
    this.receiptStatus = null;
    this.stopReceiptPolling();
  }
  public executeFC() {
    this.resetOutputs();
    if (this.validate()) {
      this.writeMethod();
    }
  }

  public initMethod(address: string, abi: object) {
    const account = this.$connex.thor.account(
      this.prototype
        ? "0x000000000000000000000050726f746f74797065"
        : address.toLowerCase()
    );
    this.method = account.method(abi);
  }

  private validate() {
    const inputs = (this.$refs.input as any[]) || [];
    inputs.forEach((element) => {
      element.checkHtml5Validity();
    });
    return !inputs.some((item) => {
      return item.isValid === false;
    });
  }

  get payable() {
    return this.item.payable || this.item.stateMutability === "payable";
  }

  public get hexValue() {
    return BN(this.payable ? this.value || 0 : 0)
      .multipliedBy(1e18)
      .toFixed(0)
      .toString(16);
  }

  private async readMethod() {
    try {
      const params: any[] = this.params.map((item: string, index: number) => {
        return this.item.inputs[index].type.endsWith("]")
          ? JSON.parse(item)
          : item;
      });
      this.request = this.method!.value(this.hexValue).asClause(...params);
      if (this.caller) {
        this.resp = await this.method!.value(this.hexValue)
          .caller(this.caller)
          .call(...params);
      } else {
        this.resp = await this.method!.value(this.hexValue).call(...params);
      }
    } catch (error: any) {
      BUS.$alert(error.message);
    }
  }
  private async writeMethod() {
    try {
      const params: any[] = this.params.map((item: string, index: number) => {
        return this.item.inputs[index].type.endsWith("]")
          ? JSON.parse(item)
          : item;
      });
      const clause = this.method!.value(this.hexValue).asClause(...params);
      this.request = clause;

      const resp = await this.$connex.vendor
        .sign("tx", [
          {
            ...clause,
            comment: this.item.name,
          },
        ])
        .comment(`inspect-${this.address}`)
        .request();

      if (resp && resp.txid) {
        this.txid = resp.txid;
        this.receiptStatus = "pending";
        this.startReceiptPolling(resp.txid);
      }
    } catch (error: any) {
      // Check if error is a user rejection/cancellation
      const errorMessage = error.message || "";
      const errorName = error.name || "";
      const isUserRejection =
        errorMessage.toLowerCase().includes("rejected") ||
        errorMessage.toLowerCase().includes("cancelled") ||
        errorMessage.toLowerCase().includes("cancel") ||
        errorMessage.toLowerCase().includes("denied") ||
        errorName.toLowerCase().includes("rejected") ||
        errorName.toLowerCase().includes("cancelled") ||
        errorName.toLowerCase().includes("cancel");

      // Only show error for actual failures, not user rejections
      if (!isUserRejection) {
        BUS.$alert(error.message);
        this.receiptStatus = "error";
      }
      // Silently handle user rejections - don't show error or set status
    }
  }

  private startReceiptPolling(txid: string) {
    // Stop any existing polling
    this.stopReceiptPolling();

    // Set timeout to 60 seconds (5 blocks * 12 seconds per block)
    // This gives enough time for mainnet transactions which can take longer
    const timeoutMs = 5 * 12000;
    const startTime = Date.now();

    // Poll every 1000ms
    this.receiptPollingInterval = window.setInterval(async () => {
      try {
        const receipt = await this.$connex.thor.transaction(txid).getReceipt();

        if (receipt) {
          this.receipt = receipt;
          this.receiptStatus = "completed";
          this.stopReceiptPolling();
          return;
        }

        // Receipt not available yet - check timeout
        if (Date.now() - startTime > timeoutMs) {
          this.receiptStatus = "error";
          this.stopReceiptPolling();
        }
      } catch (error: any) {
        // Error getting receipt (transaction may not be included yet)
        // Continue polling unless timeout
        if (Date.now() - startTime > timeoutMs) {
          this.receiptStatus = "error";
          this.stopReceiptPolling();
        }
      }
    }, 1000);

    // Set overall timeout
    this.receiptPollingTimeout = window.setTimeout(() => {
      if (this.receiptStatus === "pending") {
        this.receiptStatus = "error";
        this.stopReceiptPolling();
      }
    }, timeoutMs);
  }

  private stopReceiptPolling() {
    if (this.receiptPollingInterval !== null) {
      clearInterval(this.receiptPollingInterval);
      this.receiptPollingInterval = null;
    }
    if (this.receiptPollingTimeout !== null) {
      clearTimeout(this.receiptPollingTimeout);
      this.receiptPollingTimeout = null;
    }
  }

  beforeDestroy() {
    this.stopReceiptPolling();
  }
}
