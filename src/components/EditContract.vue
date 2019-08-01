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
  import { isAddress } from 'thor-devkit/es6/cry'

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
        result.btn = 'Edit'
      }

      return result
    }

    get isEdit() {
      return this.item && this.item.id
    }
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
      abi: null || ''
    }

    created() {
      this.initForm()
    }
    close() {
      this.$emit('cancel')
    }

    initForm() {
      const val = this.item
      if (val && val.address) {
        this.form.name = val.name || ''
        this.form.address = val.address || ''
        this.form.abi = val.abi ? JSON.stringify(val.abi) : ''
        this.form.id = val.id || 0
      } else {
        this.form = {
          name: '',
          address: '',
          abi: '',
          id: 0
        }
      }
    }

    async submit() {
      if (!this.checkform()) {
        return
      }
      const obj: Entities.Contract = {
        name: this.form.name,
        address: this.form.address.toLowerCase(),
        abi: JSON.parse(this.form.abi),
        createdTime: Date.now()
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
        } catch (error) {
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
        if (!isAddress(this.form.address)) {
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

