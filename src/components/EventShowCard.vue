<template>
    <div class="box">
        <div>
            <div
                class="level has-background-light"
                style="margin-bottom: 10px; padding: 5px 10px; border-radius: 5px;"
            >
                <div class="level-left">
                    <span
                        class="is-family-secondary display-6 has-text-black-ter has-text-weight-semibold"
                    >
                        <slot name="title"></slot>
                    </span>
                    <span
                        style="margin-left: 20px"
                        class="is-family-secondary display-6 has-text-black-ter has-text-weight-semibold"
                    >
                        #Block
                        <a
                            target="_blank"
                            :href="`https://insight.vecha.in/#/blocks/${item.meta.blockID}`"
                        >{{item.meta.blockNumber}}</a>
                    </span>
                    <span
                        style="margin-left: 20px"
                        class="is-family-secondary display-6"
                    >{{item.meta.blockTimestamp * 1000 | datetime}}</span>
                </div>
                <div class="level-right">
                    <a
                        class="is-family-monospace display-6 has-text-weight-semibold"
                        target="_blank"
                        :href="`https://insight.vecha.in/#/txs/${item.meta.txID}`"
                    >{{item.meta.txID | addr}}</a>
                </div>
            </div>
            <b-tabs
                class="my-content"
                :animated="false"
                v-model="tabIndex"
                size="is-small"
                type="is-toggle"
            >
                <b-tab-item label="Raw">
                    <div>
                        <b-field
                            custom-class="my-label"
                            label-position="inside"
                            horizontal
                            label="Topics"
                        >
                            <ul>
                                <li
                                    class="is-family-monospace display-6 has-text-grey has-text-weight-semibold"
                                    v-for="(topic, i) in item.topics"
                                    :key="i"
                                >
                                    <span>[{{i}}]</span>
                                    {{topic}}
                                </li>
                            </ul>
                        </b-field>
                        <b-field
                            custom-class="my-label"
                            label-position="on-border"
                            horizontal
                            label="Data"
                        >
                            <p
                                style="word-break: break-all;"
                                class="has-text-weight-semibold has-text-grey display-6 is-family-monospace"
                            >{{item.data}}</p>
                        </b-field>
                    </div>
                </b-tab-item>
                <b-tab-item label="Decoded">
                    <b-table :data="data">
                        <template slot-scope="props">
                            <b-table-column width="70" label="#" field="id">{{props.row.id}}</b-table-column>
                            <b-table-column width="170" label="Name" field="name">{{props.row.name}}</b-table-column>
                            <b-table-column width="220" label="Type" field="type">
                                {{props.row.type}}
                                <sup
                                    style="padding: 2px 5px; border-radius: 3px; font-size: 11px"
                                    class="has-background-primary has-text-light"
                                    v-if="props.row.indexed"
                                >indexed</sup>
                            </b-table-column>
                            <b-table-column label="Data" field="value">
                                <a
                                    v-if="props.row.type === 'address'"
                                    target="_blank"
                                    class="has-text-weight-semibold is-family-monospace display-6"
                                    :href="`https://insight.vecha.in/#/accounts/${props.row.value}`"
                                >{{props.row.value | toChecksumAddress}}</a>
                                <span
                                    v-else
                                    class="has-text-weight-semibold is-family-monospace display-6 has-text-grey"
                                >{{props.row.value}}</span>
                            </b-table-column>
                        </template>
                    </b-table>
                </b-tab-item>
            </b-tabs>
        </div>
    </div>
</template>
<script lang="ts">
import { Vue, Prop, Component, Watch } from 'vue-property-decorator'
import { lab } from 'color-convert/conversions'

@Component
export default class EventShowCard extends Vue {
    @Prop(Object)
    item?: Connex.Thor.Event
    @Prop(Array)
    params?: ABI.EventInputItem[]

    private tabIndex = 0
    private data?: any[]

    private columns = [
        {
            label: 'ID',
            field: 'index'
        },
        {
            label: 'Name',
            field: 'name'
        },
        {
            label: 'Type',
            field: 'type'
        },
        {
            label: 'Data',
            field: 'value'
        }
    ]

    @Watch('item')
    @Watch('params')
    onItemChange() {
        this.data = this.params!.map((item, i) => {
            return {
                id: i,
                name: item.name,
                type: item.type,
                indexed: item.indexed,
                value: (this.item!.decoded as any)[item.name]
            }
        })
    }

    created() {
        this.onItemChange()
    }
}
</script>
<style>
.my-label {
    display: block;
    width: 50px;
    flex-grow: unset;
    font-size: 14px;
}
.my-content .tab-content {
    padding: 20px 0;
}
</style>
