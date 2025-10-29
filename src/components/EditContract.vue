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
          <b-autocomplete
            @blur="checkName"
            @select="onSelectContract"
            v-model="nameInput"
            :data="filteredContracts"
            field="name"
            @typing="filterContractsByName"
            :clearable="true"
            open-on-focus
          >
            <template #default="{ option }">
              <div class="media">
                <div class="media-content">
                  <p>{{ option.name }}</p>
                  <p class="is-size-7 has-text-grey-light">{{ option.address }}</p>
                </div>
              </div>
            </template>
          </b-autocomplete>
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
        <b-field>
          <button 
            class="button is-info is-light is-fullwidth" 
            type="button" 
            @click="fetchABIFromSourcify"
            :disabled="!form.address || fetchingABI"
            :class="{ 'is-loading': fetchingABI }"
          >
            <b-icon v-if="!fetchingABI" icon="download" size="is-small"></b-icon>
            <span>{{ fetchingABI ? fetchStatus : 'Fetch Latest ABI from Sourcify' }}</span>
          </button>
        </b-field>
        <b-field label="Category (optional)">
          <b-autocomplete
            v-model="form.category"
            :data="filteredCategories"
            placeholder="Select or create a category"
            @typing="getFilteredCategories"
            open-on-focus
            clearable
            append-to-body
            max-height="200"
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
  import { ContractConfig } from '../contracts/config'

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

    private nameInput = ''
    private filteredContracts: Array<{name: string, address: string}> = []
    private allContracts: Array<{name: string, address: string}> = []
    private categories: string[] = []
    private filteredCategories: string[] = []
    private fetchingABI: boolean = false
    private fetchStatus: string = ''

    async created() {
      await this.loadCategories()
      this.initForm()
      this.loadBuiltinContracts()
    }
    
    loadBuiltinContracts() {
      const genesisId = this.$connex.thor.genesis.id
      const contracts = ContractConfig[genesisId] || {}
      
      this.allContracts = Object.entries(contracts).map(([address, config]) => ({
        name: config.name,
        address
      }))
    }
    
    async onSelectContract(option: {name: string, address: string} | null) {
      if (!option) return
      
      this.form.name = option.name
      this.nameInput = option.name
      this.form.address = option.address
      
      // Load ABI for the selected contract from built-in configs only
      const genesisId = this.$connex.thor.genesis.id
      const contracts = ContractConfig[genesisId] || {}
      const contractConfig = contracts[option.address]
      
      if (contractConfig && contractConfig.abi) {
        if (typeof contractConfig.abi !== 'string') {
          this.form.abi = JSON.stringify(contractConfig.abi, null, 2)
          return
        }
        try {
          const abiResponse = await fetch(contractConfig.abi)
          if (abiResponse.ok) {
            const abiJson = await abiResponse.json()
            this.form.abi = JSON.stringify(abiJson, null, 2)
          }
        } catch (error) {
          console.error("Failed to load ABI from URL", error)
        }
      }
      // Don't auto-fetch from Sourcify - user can use the manual button
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
        this.nameInput = val.name || ''
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
        this.nameInput = ''
      }
    }

    @Watch('nameInput')
    private onNameInputChange(value: string) {
      this.form.name = value
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
    
    filterContractsByName(text: string) {
      if (!text) {
        this.filteredContracts = []
        return
      }
      
      const lowerText = text.toLowerCase()
      this.filteredContracts = this.allContracts.filter(contract => 
        contract.name.toLowerCase().includes(lowerText)
      )
    }

    async submit() {
      // Prevent using reserved default category label
      if (this.form.category && this.form.category.trim().toLowerCase() === 'uncategorized') {
        this.$buefy.toast.open({
          message: 'Category name "Uncategorized" is reserved. Please choose another name.',
          type: 'is-danger',
          duration: 2500,
          position: 'is-bottom'
        })
        return
      }

      if (!this.checkform()) {
        return
      }

      // Calculate order for new contracts or when category changes
      let order: number | undefined
      const categoryChanged = this.isEdit && (this.item?.category || '') !== (this.form.category || '')
      
      if (!this.isEdit || categoryChanged) {
        // New contract or category changed - calculate new order in target category
        const network = this.$connex.thor.genesis.id
        const categoryContracts = await DB.contracts
          .filter((item) => 
            ((item.network === network) || (item.network === undefined)) &&
            ((item.category || '') === (this.form.category || '')) &&
            (categoryChanged ? item.id !== this.item?.id : true) // Exclude current item when moving categories
          )
          .toArray()
        
        const maxOrder = categoryContracts.reduce((max, c) => 
          Math.max(max, c.order || 0), -1)
        order = maxOrder + 1
      } else {
        // Editing without category change - preserve existing order
        order = this.item?.order
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

    /**
     * Manually fetch ABI from Sourcify with proxy detection
     */
    async fetchABIFromSourcify() {
      if (!this.form.address) {
        return
      }

      // Check if we have a valid chain ID for Sourcify
      const chainID = this.getSourcifyChainID()
      if (!chainID) {
        this.$buefy.toast.open({
          message: 'Sourcify is not supported for this network (Solo/Local)',
          type: 'is-warning',
          duration: 3000,
          position: 'is-bottom'
        })
        return
      }

      this.fetchingABI = true
      this.fetchStatus = 'Checking for proxy...'
      
      try {
        const addressToFetch = this.form.address.toLowerCase()
        
        // First, try to detect if this is a proxy contract
        let implementationAddress: string | null = null
        try {
          implementationAddress = await this.getImplementationAddress(addressToFetch)
        } catch (proxyError) {
          console.warn('Proxy detection failed, continuing with original address:', proxyError)
          // Continue anyway - not a critical error
        }
        
        if (implementationAddress) {
          this.fetchStatus = `Proxy detected! Fetching implementation ABI...`
          console.log(`Proxy detected! Implementation address: ${implementationAddress}`)
          
          // Try to fetch the implementation ABI
          const success = await this.loadABI(implementationAddress)
          if (success) {
            this.$buefy.toast.open({
              message: 'ABI loaded successfully!',
              type: 'is-success',
              duration: 2500,
              position: 'is-bottom'
            })
            return
          } else {
            this.fetchStatus = 'Implementation not found, trying proxy address...'
          }
        }
        
        // If not a proxy or implementation fetch failed, fetch the original address
        this.fetchStatus = 'Fetching ABI from Sourcify...'
        const success = await this.loadABI(addressToFetch)
        
        if (success) {
          this.$buefy.toast.open({
            message: 'ABI loaded successfully!',
            type: 'is-success',
            duration: 2500,
            position: 'is-bottom'
          })
        } else {
          this.$buefy.toast.open({
            message: 'Could not find ABI on Sourcify for this contract',
            type: 'is-warning',
            duration: 3000,
            position: 'is-bottom'
          })
        }
      } catch (error) {
        console.error('Error fetching ABI:', error)
        this.$buefy.toast.open({
          message: `Error fetching ABI: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'is-danger',
          duration: 3000,
          position: 'is-bottom'
        })
      } finally {
        this.fetchingABI = false
        this.fetchStatus = ''
      }
    }

    /**
     * Detect if the contract is a proxy and return the implementation address
     * Supports EIP-1967, EIP-1822, and OpenZeppelin proxies
     */
    private async getImplementationAddress(address: string): Promise<string | null> {
      try {
        // EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1
        const eip1967Slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
        
        // EIP-1822 proxiable slot: keccak256("PROXIABLE")
        const eip1822Slot = '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7'
        
        // Try EIP-1967 first
        try {
          const storage = await this.$connex.thor.account(address).getStorage(eip1967Slot)
          if (storage && storage.value && storage.value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Extract address from storage (last 20 bytes)
            const implAddress = '0x' + storage.value.slice(-40)
            if (implAddress !== '0x0000000000000000000000000000000000000000') {
              return implAddress
            }
          }
        } catch (e) {
          console.warn('EIP-1967 check failed:', e)
        }
        
        // Try EIP-1822
        try {
          const storage = await this.$connex.thor.account(address).getStorage(eip1822Slot)
          if (storage && storage.value && storage.value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const implAddress = '0x' + storage.value.slice(-40)
            if (implAddress !== '0x0000000000000000000000000000000000000000') {
              return implAddress
            }
          }
        } catch (e) {
          console.warn('EIP-1822 check failed:', e)
        }
        
        // Try calling implementation() method (common in OpenZeppelin proxies)
        try {
          const implMethodABI = {
            "constant": true,
            "inputs": [],
            "name": "implementation",
            "outputs": [{"name": "", "type": "address"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
          }
          
          const result = await this.$connex.thor.account(address).method(implMethodABI).call()
          if (result && !result.reverted && result.decoded && result.decoded[0]) {
            const implAddress = result.decoded[0].toLowerCase()
            if (implAddress !== '0x0000000000000000000000000000000000000000') {
              return implAddress
            }
          }
        } catch (e) {
          console.warn('implementation() method check failed:', e)
        }
        
        return null
      } catch (error) {
        console.error('Error detecting proxy:', error)
        return null
      }
    }

    /**
     * Get the Sourcify chain ID for the current network
     * Returns null if Sourcify is not supported for this network
     */
    private getSourcifyChainID(): string | null {
      const genesisId = this.$connex.thor.genesis.id
      
      // VeChain Mainnet
      if (genesisId === '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a') {
        return '100009'
      }
      // VeChain Testnet
      if (genesisId === '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127') {
        return '100010'
      }
      
      // Solo/Local network - not supported
      return null
    }

    /**
     * Load ABI from Sourcify for a given address
     * Returns true if successful, false otherwise
     */
    private async loadABI(address: string): Promise<boolean> {
      const chainID = this.getSourcifyChainID()
        
      if (!chainID) {
        return false
      }

      try {
        const res = await fetch(`https://sourcify.dev/server/repository/contracts/full_match/${chainID}/${address}/metadata.json`)
        if (res.status === 200) {
          const data = await res.json()
          this.form.abi = JSON.stringify(data.output.abi, null, 2)
          return true
        }
      } catch (error) {
        console.error('Error loading ABI from Sourcify:', error)
      }
      return false
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

