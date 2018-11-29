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
            >{{props.row.contractName}}</router-link>
          </b-table-column>
          <b-table-column centered label="Name">{{props.row.name}}</b-table-column>
          <b-table-column centered label="Type">{{props.row.type}}</b-table-column>
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
          <SampleFuncCard :item="props.row.abi" :address="props.row.address"/>
        </template>
      </b-table>
    </div>
  </section>
</template>
<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import SampleFuncCard from "../components/SampleFuncCard.vue";
import DB, { Entities } from "../database";

@Component({
  components: {
    SampleFuncCard
  }
})
export default class ShortCuts extends Vue {
  private list: Entities.ShortCuts[] = [];
  private count = 0;
  private perPage = 10;
  private currentPage = 1;
  async created() {
    await this.onPageChange(1);
    await this.countList();
  }

  private async countList() {
    this.count = await DB.shortCuts.count();
  }

  private async onPageChange(page: number) {
    this.list = await DB.shortCuts
      .offset((page - 1) * this.perPage)
      .limit(this.perPage)
      .toArray();
  }

  private edit(row: any) {
    this.$dialog.prompt({
      title: "Edit Shortcut",
      message: "Edit shortcut name",
      inputAttrs: {
        placeholder: "Shortcut name",
        value: row.name,
        maxlength: 30,
        required: true
      },
      onConfirm: (value: string) => {
        DB.shortCuts.update(row.id, { name: value }).then(() => {
          this.onPageChange(this.currentPage);
        });
      }
    });
  }
  private remove(row: any) {
    this.$dialog.confirm({
      title: "Remove",
      message: `Are you sure want to remove '${row.name}' contract`,
      cancelText: "Cancel",
      confirmText: "YES",
      type: "is-danger",
      scroll: "clip",
      onConfirm: () => {
        DB.shortCuts.delete(row.id).then(() => {
          this.onPageChange(this.currentPage);
        });
      }
    });
  }
}
</script>

