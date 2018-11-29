<template>
  <Panel v-model="activeTab" :tabs="tabs" :title="item.name">
    <template slot="panel-content">
      <form
        ref="form"
        @reset.stop="$refs['form'].reset()"
        @submit.self.stop="executeFC"
        v-show="activeTab === tabs[0]"
      >
        <b-field
          class="item-content"
          horizontal
          :label="v.name"
          v-for="(v, index) in item.inputs"
          :key="index"
        >
          <b-input required v-model="params[index]" :placeholder="v.type"></b-input>
        </b-field>
        <b-field v-if="item.payable" class="item-content" horizontal label="value">
          <b-input type="number" placeholder="number" v-model="value"></b-input>
        </b-field>
        <b-field class="item-content" horizontal>
          <div class="buttons has-addons is-pulled-right">
            <button
              type="button"
              @click="addShortCut(item.name)"
              class="button is-rounded is-primary is-outlined"
            >Short Cut</button>
            <button type="submit" class="button is-rounded is-primary is-outlined">Execute</button>
            <button
              v-if="params.length"
              type="reset"
              class="button is-rounded is-primary is-outlined"
            >Reset</button>
          </div>
        </b-field>
        <b-field v-if="resp">
          <pre>{{resp}}</pre>
        </b-field>
      </form>
      <div v-show="activeTab === tabs[1]">
        <pre>{{item}}</pre>
      </div>
    </template>
  </Panel>
</template>
<script lang="ts">
import Panel from "./Panel.vue"
import { Vue, Component, Prop } from "vue-property-decorator"
import DB from "../database"
@Component({
  components: {
    Panel
  }
})
export default class FunctionCard extends Vue {
  @Prop({ default: null })
  private item: ABI.FunctionItem | any

  @Prop()
  private address!: string

  private resp: any = null
  private value: string | null = null

  private params: any[] = new Array(this.item.inputs.length)
  private tabs = ["Inputs", "Description"]
  private activeTab = "Inputs"

  private method: any

  created () {
    this.activeTab = this.tabs[0]
    const account = connex.thor.account(this.address)
    this.method = account.method(this.item)
  }

  private executeFC () {
    if (this.item.constant) {
      this.readMethod()
    } else {
      this.writeMethod()
    }
  }
  private async writeMethod () {
    try {
      let params: any[] = []
      this.params.forEach(item => {
        if (item) {
          return params.push(item)
        }
      })
      this.resp = await connex.vendor.sign(
        "tx",
        [{ ...this.method.asClause(this.params, "0x0"), desc: this.item.name }],
        {
          summary: `inspect-${this.address}`
        }
      )
    } catch (error) {
      console.error(error)
    }
  }

  private addShortCut (name: string) {
    this.$dialog.prompt({
      title: "Add Short Cut",
      message: "Input a short cut",
      inputAttrs: {
        placeholder: "Filter name",
        value: name,
        maxlength: 30,
        required: true
      },
      onConfirm: (value: string) => {
        this.saveShortCut(value)
      }
    })
  }

  private async saveShortCut (name: string) {
    const contract =
      (await DB.contracts
        .where("address")
        .equals(this.address)
        .first()) || null

    await DB.shortCuts.add({
      name: name,
      address: contract!.address,
      contractName: contract!.name,
      createdTime: Date.now(),
      abi: this.item,
      type: this.item.constant ? 'read' : 'write'
    })

    BUS.$emit("added-shortcut")
    this.$toast.open({
      message: "Added success!",
      type: "is-success"
    })
  }
  private async readMethod () {
    try {
      this.resp = await this.method.call(this.params, this.value || 0)
    } catch (error) {
      console.error(error)
    }
  }
}
</script>
<style lang="scss" scoped>
.item-content {
  padding: 0.5rem 5rem 0 0;
}
</style>
