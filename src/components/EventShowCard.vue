<template>
    <div class="box">
        <div>
            <div
                class="level event-header"
                style="margin-bottom: 10px; padding: 5px 10px; border-radius: 5px;"
            >
                <div class="level-left">
                    <span
                        class="is-family-secondary display-6 has-text-weight-semibold event-text"
                    >
                        <slot name="title"></slot>
                    </span>
                    <span
                        style="margin-left: 20px"
                        class="is-family-secondary display-6 has-text-weight-semibold event-text"
                    >
                        #Block
                        <a
                            target="_blank"
                            :href="`${$explorerBlock}${item.meta.blockID}`"
                        >{{item.meta.blockNumber}}</a>
                    </span>
                    <span
                        style="margin-left: 20px"
                        class="is-family-secondary display-6 event-text"
                    >{{item.meta.blockTimestamp * 1000 | datetime}}</span>
                </div>
                <div class="level-right">
                    <a
                        class="is-family-monospace display-6 has-text-weight-semibold"
                        target="_blank"
                        :href="`${$explorerTx}${item.meta.txID}`"
                    >{{item.meta.txID | addr}}</a>
                </div>
            </div>
            <b-tabs
                class="my-content event-tabs"
                :animated="false"
                v-model="tabIndex"
                size="is-small"
            >
                <b-tab-item label="Decoded">
                    <b-table :data="data">
                        <template slot-scope="props">
                            <b-table-column width="20" label="#" field="id">{{props.row.id}}</b-table-column>
                            <b-table-column width="170" label="Name" field="name">{{props.row.name}}</b-table-column>
                            <b-table-column width="220" label="Type" field="type">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span>{{props.row.type}}</span>
                                    <span
                                        v-if="props.row.indexed"
                                        class="indexed-badge"
                                    >indexed</span>
                                </div>
                            </b-table-column>
                            <b-table-column
                                label="Data"
                                field="value"
                                style="max-width: 380px;word-wrap: break-word;"
                            >
                                <a
                                    v-if="props.row.type === 'address'"
                                    target="_blank"
                                    class="has-text-weight-semibold is-family-monospace display-6"
                                    :href="`${$explorerAccount}${props.row.value}`"
                                >{{ props.row.value | toChecksumAddress}}</a>
                                <span
                                    v-else
                                    class="has-text-weight-semibold is-family-monospace display-6 event-data-text"
                                >{{props.row.value}}</span>
                            </b-table-column>
                        </template>
                    </b-table>
                </b-tab-item>
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
                                    class="is-family-monospace display-6 has-text-weight-semibold event-data-text"
                                    v-for="(topic, i) in item.topics"
                                    :key="item.meta.blockID + i"
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
                                class="has-text-weight-semibold display-6 is-family-monospace event-data-text"
                            >{{item.data}}</p>
                        </b-field>
                    </div>
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
    item?: Connex.Thor.Account.WithDecoded
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
    color: var(--text-color);
}
.my-content .tab-content {
    padding: 20px 0;
}

/* Event header styling */
.event-header {
    background-color: var(--body-background-alt);
    color: var(--text-color);
}

.event-text {
    color: var(--text-color-strong);
}

.event-data-text {
    color: var(--text-color-light);
}

/* Indexed badge styling */
.indexed-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    background-color: var(--body-background-alt);
    color: var(--text-color-light);
    border: 1px solid var(--border-color);
}

/* Event tabs styling - only active tab is blue */
.event-tabs >>> .tabs li.is-active a {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}

.event-tabs >>> .tabs li:not(.is-active) a {
    color: var(--text-color);
}

.event-tabs >>> .tabs li a:hover {
    border-bottom-color: #6bb6ff;
}

/* Smooth hover for event data links */
.event-header a {
    transition: color 0.2s ease;
}

.event-header a:hover {
    color: var(--primary-color);
    text-decoration: underline;
}

/* Smooth hover for address links in table */
.box a.is-family-monospace {
    transition: color 0.2s ease;
}

.box a.is-family-monospace:hover {
    color: var(--primary-color);
    text-decoration: underline;
}
</style>
