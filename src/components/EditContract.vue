<template>
  <form>
    <div class="modal-card">
      <header class="modal-card-head">
        <span class="modal-card-title">{{context.title}}</span>
      </header>
      <section class="modal-card-body">
        <b-field label="name">
          <b-input v-model="form.name" type="text"></b-input>
        </b-field>
        <b-field label="address">
          <b-input v-model="form.address" type="text"></b-input>
        </b-field>
        <b-field label="ABI">
          <b-input v-model="form.abi" type="textarea"></b-input>
        </b-field>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click="close">Cancel</button>
        <button class="button is-primary" @click="submit">{{context.btn}}</button>
      </footer>
    </div>
  </form>
</template>
<script lang="ts">
import { Vue, Prop, Component, Watch } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component
export default class EditContract extends Vue {
  @Prop({ default: null })
  private item!: Entities.Contract | null

  private form = {
    id: 0,
    name: '',
    address: '',
    abi: ''
  }

  created() {
    this.initForm()
  }

  get context() {
    let result = {
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
    return this.item && this.item.address
  }
  close() {
    this.$emit('cancel')
  }

  initForm() {
    const val = this.item
    if (val && val.address) {
      this.form.name = val.name || ''
      this.form.address = val.address || ''
      this.form.abi = val.abi || ''
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
    const obj = {
      name: this.form.name,
      address: this.form.address,
      abi: this.form.abi
    }
    try {
      if (!this.isEdit) {
        await DB.contracts.add(obj)
      } else {
        await DB.contracts.where('id').equals(this.form.id).modify(obj)
      }
    } catch (error) {
      console.error(error)
    } finally {
      this.$emit('finished')
    }
  }
}
</script>

