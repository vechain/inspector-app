<template>
  <form>
    <div class="modal-card">
      <header class="modal-card-head">
        <span class="modal-card-title">{{context.title}}</span>
      </header>
      <section class="modal-card-body">
        <b-field
          :type="formMessage.name.isError ? 'is-danger' : ''"
          :message="formMessage.name.message"
          label="name"
        >
          <b-input @blur="checkName" v-model="form.name" type="text"></b-input>
        </b-field>
        <b-field
          :type="formMessage.address.isError ? 'is-danger' : ''"
          :message="formMessage.address.message"
          label="address"
        >
          <b-input
            @blur="checkAddress"
            custom-class="is-family-monospace has-text-weight-semibold"
            :message="formMessage.address.message"
            v-model="form.address"
            type="text"
          ></b-input>
        </b-field>
        <b-field
          :type="formMessage.abi.isError ? 'is-danger' : ''"
          :message="formMessage.abi.message"
          label="ABI"
        >
          <b-input
            @blur="checkABI"
            :message="formMessage.abi.message"
            v-model="form.abi"
            type="textarea"
          ></b-input>
        </b-field>
        <b-field label="Category (optional)">
          <b-autocomplete
            v-model="form.category"
            :data="filteredCategories"
            placeholder="Select or create a category"
            @typing="getFilteredCategories"
            open-on-focus
            clearable
          >
            <template slot="empty">Type to create new category</template>
          </b-autocomplete>
        </b-field>
        <b-message v-if="isImport && isEdit" type="is-warning">
            The contract exists, are you sure to override it?
        </b-message>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click.stop="close">Cancel</button>
        <button class="button is-primary" type="button" @click.prevent="submit">{{context.btn}}</button>
      </footer>
    </div>
  </form>
</template>
<script lang="ts">
  import { Vue, Prop, Component, Watch } from 'vue-property-decorator'
  import DB, { Entities } from '../database'
  import { address as Address } from 'thor-devkit'

  interface FormError {
    isError: boolean
    message: string
  }
  @Component
  export default class EditContract extends Vue {
    get context() {
      const result = {
        title: 'Add Contract',
        btn: 'Add'
      }

      if (this.isEdit) {
        result.title = 'Edit Contract'
        result.btn = this.isImport ? 'Override' : 'Save'
      }

      return result
    }

    get isEdit() {
      return this.item && this.item.id
    }

    @Prop({ default: false })
    private isImport!: boolean

    @Prop({ default: null })
    private item!: Entities.Contract | null

    private formMessage: {
      abi: FormError
      address: FormError
      name: FormError
    } = {
      abi: {
        isError: false,
        message: ''
      },
      address: {
        isError: false,
        message: ''
      },
      name: {
        isError: false,
        message: ''
      }
    }

    private form = {
      id: 0,
      name: '',
      address: '',
      abi: '',
      category: ''
    }

    private categories: string[] = []
    private filteredCategories: string[] = []

    async created() {
      await this.loadCategories()
      this.initForm()
    }
    close() {
      this.$emit('cancel')
    }

    async loadCategories() {
      const network = this.$connex.thor.genesis.id
      const contracts = await DB.contracts
        .filter((item) => (item.network === network) || (item.network === undefined))
        .toArray()
      
      const categorySet = new Set<string>()
      contracts.forEach(contract => {
        if (contract.category) {
          categorySet.add(contract.category)
        }
      })
      this.categories = Array.from(categorySet).sort()
      this.filteredCategories = this.categories
    }

    getFilteredCategories(text: string) {
      this.filteredCategories = this.categories.filter((category) => {
        return category.toLowerCase().indexOf(text.toLowerCase()) >= 0
      })
    }

    initForm() {
      const val = this.item
      if (val && val.address) {
        this.form.name = val.name || ''
        this.form.address = val.address || ''
        this.form.abi = val.abi ? JSON.stringify(val.abi, null, 2) : ''
        this.form.id = val.id || 0
        this.form.category = val.category || ''
      } else {
        this.form = {
          name: '',
          address: '',
          abi: '',
          id: 0,
          category: ''
        }
      }
    }

    @Watch('form.address')
    private async onAddressChange(newAddress: string) {
      const addrRegexp = /^0x[0-9a-fA-F]{40}$/
      if (addrRegexp.test(newAddress)) {
        await this.loadABI(newAddress)
      }
    }

    @Watch('form.abi')
    private async onAbiChange(abi: string) {
      if (this.form.name) {
        return
      }
      let json: any
      try {
        json = JSON.parse(abi)
      } catch(e) {
        return
      }
      if (this.form.address) {
        // if the contract implements the `name`, fetch it from chain
        const nameABI = json.filter((item: any) => item.name === "name")
        if (nameABI.length > 0) {
          const nameRes = await this.$connex.thor.account(this.form.address).method(nameABI[0]).call()
          if (!nameRes.reverted && !nameRes.vmError && nameRes.decoded) {
            this.form.name = nameRes.decoded[0]
          }
        }
      }
    }

    async submit() {
      if (!this.form.abi && this.form.address) {
        await this.loadABI(this.form.address)
      }

      if (!this.checkform()) {
        return
      }

      // Calculate order for new contracts
      let order: number | undefined
      if (!this.isEdit) {
        const network = this.$connex.thor.genesis.id
        const categoryContracts = await DB.contracts
          .filter((item) => 
            ((item.network === network) || (item.network === undefined)) &&
            ((item.category || '') === (this.form.category || ''))
          )
          .toArray()
        
        const maxOrder = categoryContracts.reduce((max, c) => 
          Math.max(max, c.order || 0), -1)
        order = maxOrder + 1
      }

      const obj: Entities.Contract = {
        name: this.form.name,
        address: this.form.address.toLowerCase(),
        abi: JSON.parse(this.form.abi),
        network: this.$connex.thor.genesis.id,
        createdTime: Date.now(),
        category: this.form.category || undefined,
        order: order
      }
      try {
        if (!this.isEdit) {
          await DB.contracts.add(obj)
        } else {
          await DB.contracts
            .where('id')
            .equals(this.form.id)
            .modify(obj)
        }
      } catch (error) {
        // tslint:disable-next-line:no-console
        console.error(error)
      } finally {
        this.$emit('finished')
      }
    }

    private async loadABI(address: string) {
      let chainID;
      if (this.$connex.thor.genesis.id === '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a') {
        chainID = '100009'
      } else if (this.$connex.thor.genesis.id === '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127'){
        chainID = '100010'
      }
        
      if (chainID) {
        const res = await fetch(`https://sourcify.dev/server/repository/contracts/full_match/${chainID}/${address}/metadata.json`)
        if (res.status === 200) {
          const data = await res.json()
          this.form.abi = JSON.stringify(data.output.abi, null, 2)
        }
      }
    }

    private checkform() {
      this.checkABI()
      this.checkAddress()
      this.checkName()
      return (
        !this.formMessage.name.isError &&
        !this.formMessage.address.isError &&
        !this.formMessage.abi.isError
      )
    }

    private checkABI() {
      if (this.form.abi) {
        try {
          JSON.parse(this.form.abi)
          this.formMessage.abi.isError = false
          this.formMessage.abi.message = ''
        } catch (error: any) {
          this.formMessage.abi.isError = true
          this.formMessage.abi.message = error.name + ': ' + error.message
        }
      } else {
        this.formMessage.abi.isError = true
        this.formMessage.abi.message = 'ABI is required'
      }
    }

    private checkAddress() {
      if (this.form.address) {
        if (!Address.test(this.form.address)) {
          this.formMessage.address.isError = true
          this.formMessage.address.message = 'Invalid address'
        } else {
          this.formMessage.address.isError = false
          this.formMessage.address.message = ''
        }
      } else {
        this.formMessage.address.isError = true
        this.formMessage.address.message = 'Address is required'
      }
    }

    private checkName() {
      if (this.form.name) {
        if (this.form.name.length < 1 || this.form.name.length > 20) {
          this.formMessage.name.isError = true
          this.formMessage.name.message = 'Requires between 1 - 20 characters'
        } else {
          this.formMessage.name.isError = false
          this.formMessage.name.message = ''
        }
      } else {
        this.formMessage.name.isError = true
        this.formMessage.name.message = 'Name is required'
      }
    }
  }
</script>

