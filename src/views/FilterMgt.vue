<template>
  <section class="section">
    <div class="container">
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
            <router-link
              :to="{
                name: 'filter_view',
                params: {
                  id: props.row.id
                }
              }"
            >{{props.row.name}}</router-link>
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
          <pre>{{ props.row.abi }}</pre>
        </template>
      </b-table>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import DB, { Entities } from '../database'
@Component
export default class FilterMgt extends Vue {
  private list: Entities.Filter[] = []
  private perPage = 10
  private currentPage = 1
  private count = 0
  private columns = [
    {
      label: 'ID',
      field: 'id',
      centered: true
    },
    {
      label: 'From Contract',
      field: 'contractName',
      centered: true
    },
    {
      label: 'Name',
      field: 'name',
      centered: true
    },
    {
      label: 'Address',
      field: 'address',
      centered: true
    }
  ]
  private async created() {
    this.onPageChange(1)
    this.count = await DB.filters.count()
  }
  edit(row: any) {
    this.$dialog.prompt({
      title: 'Edit quick view',
      message: 'Edit filter name',
      inputAttrs: {
        placeholder: 'Filter name',
        value: row.name,
        maxlength: 30,
        required: true
      },
      onConfirm: (value: string) => {
        // this.saveFilter(value)
        DB.filters.update(row.id, { name: value }).then(() => {
          this.onPageChange(this.currentPage)
        })
      }
    })
  }
  remove(row: any) {
    this.$dialog.confirm({
      title: 'Remove',
      message: `Are you sure want to remove ${row.name} contract`,
      cancelText: 'Cancel',
      confirmText: 'YES',
      type: 'is-danger',
      scroll: 'clip',
      onConfirm: () => {
        DB.filters.delete(row.id).then(() => {
          this.onPageChange(this.currentPage)
        })
      }
    })
  }

  private async onPageChange(page: number) {
    this.list = await DB.filters
      .offset((page - 1) * this.perPage)
      .limit(this.perPage)
      .toArray()
  }
}
</script>
