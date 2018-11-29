<template>
  <section class="section">
    <div class="container">
      <b-table detailed :data="list">
        <template slot-scope="props">
          <b-table-column centered label="ID">
            {{props.row.id}}
          </b-table-column>
          <b-table-column centered label="From Contract">
            <router-link
              :to="{
                name: 'contract_detail',
                query: {
                  address: props.row.address
                }
              }"
            >
            {{props.row.contractName}}
            </router-link>
          </b-table-column>
          <b-table-column centered label="Name">
            {{props.row.name}}
          </b-table-column>
          <b-table-column centered label="Address">
            <span class="is-fixed-font">{{props.row.address}}</span>
          </b-table-column>
          <b-table-column centered label="Operations">
            <div class="buttons has-addons is-centered">
              <button @click="edit(props.row)" class="button is-rounded control is-small">
                <b-icon size="is-small" icon="edit"></b-icon>
              </button>
              <button @click="remove(props.row)" class="button is-rounded control is-small">
                <b-icon size="is-small" icon="trash-alt"></b-icon>
              </button>
            </div>
          </b-table-column>
        </template>
        <template slot="detail" slot-scope="props">
          <pre>{{props.row.abi}}</pre>
        </template>
      </b-table>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from "vue-property-decorator"
import DB, { Entities } from "../database"

@Component
export default class ShortCuts extends Vue {
  private list: Entities.ShortCuts[] = []
  private count = 0

  private async getShortCuts() {
    this.list = await DB.shortCuts.toArray()
  }

  async created() {
    await this.getShortCuts()
    await this.countList()
  }

  private async countList() {
    this.count = await DB.shortCuts.count()
  }

  private edit() {}
  private remove() {}
}
</script>

