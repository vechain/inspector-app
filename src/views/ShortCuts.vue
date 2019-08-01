<template>
  <section class="section">
    <div class="container">
      <b-field grouped>
        <!-- <b-field expanded>
          <b-input type="text" v-model="caller" placeholder="Caller: Address"/>
        </b-field> -->
        <b-field expanded>
          <b-field class="is-pulled-right">
            <b-input icon="search" type="text" placeholder="Name"></b-input>
            <p class="control">
              <button class="button is-primary">Search</button>
            </p>
          </b-field>
        </b-field>
      </b-field>
      <b-table
        detailed
        :per-page="perPage"
        :current-page.sync="currentPage"
        :data="list"
        paginated
        backend-pagination
        :total="count"
        @page-change="onPageChange"
      >
        <template slot-scope="props">
          <b-table-column centered label="ID">{{props.row.id}}</b-table-column>
          <b-table-column label="Name">{{props.row.name}}</b-table-column>
          <b-table-column label="Contract">
            <router-link
              :to="{
                name: 'contract_detail',
                query: {
                  address: props.row.address
                }
              }"
            >{{props.row.contractName}}</router-link>
            <b-tooltip label="Prototype">
              <b-icon style="margin-left: 5px" v-if="props.row.fromPrototype" icon="code-branch" size="is-small"></b-icon>
            </b-tooltip>
          </b-table-column>
          <b-table-column label="Type">{{props.row.type}}</b-table-column>
          <b-table-column label="Address">
            <b-tooltip :label="props.row.address | toChecksumAddress">
            <span class="is-family-monospace has-text-weight-semibold">{{props.row.address | toChecksumAddress | addr}}</span>
            </b-tooltip>
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
          <SampleFuncCard caller="caller" :prototype="props.row.fromPrototype" :item="props.row.abi" :address="props.row.address"/>
        </template>
      </b-table>
    </div>
  </section>
</template>
<script lang="ts">
  import { Vue, Component } from 'vue-property-decorator'
  import SampleFuncCard from '../components/SampleFuncCard.vue'
  import DB, { Entities } from '../database'

  @Component({
    components: {
      SampleFuncCard
    }
  })
  export default class ShortCuts extends Vue {
    private list: Entities.ShortCuts[] = []
    private count = 0
    private perPage = 10
    private currentPage = 1
    private caller = ''
    async created() {
      this.$ga.page('/view/scs')
      await this.onPageChange(1)
      await this.countList()
    }

    private async countList() {
      this.count = await DB.shortCuts.count()
    }

    private async onPageChange(page: number) {
      this.list = await DB.shortCuts
        .offset((page - 1) * this.perPage)
        .limit(this.perPage)
        .toArray()
    }

    private edit(row: any) {
      this.$dialog.prompt({
        title: 'Edit Shortcut',
        message: 'Edit shortcut name',
        inputAttrs: {
          placeholder: 'Shortcut name',
          value: row.name,
          maxlength: 30,
          required: true
        },
        onConfirm: (value: string) => {
          DB.shortCuts.update(row.id, { name: value }).then(() => {
            this.onPageChange(this.currentPage)
          })
        }
      })
    }
    private remove(row: any) {
      this.$dialog.confirm({
        title: 'Remove',
        message: `Are you sure want to remove '${row.name}' contract`,
        cancelText: 'Cancel',
        confirmText: 'YES',
        type: 'is-danger',
        scroll: 'clip',
        onConfirm: () => {
          DB.shortCuts.delete(row.id).then(() => {
            this.onPageChange(this.currentPage)
          })
        }
      })
    }
  }
</script>

