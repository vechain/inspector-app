<template>
  <div class="role-activity-list">
    <div class="activity-header">
      <h5 class="activity-title">Activity</h5>
      <b-field>
        <b-select v-model="selectedEventType" size="is-small" placeholder="All events">
          <option :value="null">All events</option>
          <option value="granted">Granted</option>
          <option value="revoked">Revoked</option>
        </b-select>
      </b-field>
    </div>

    <div v-if="filteredEvents.length === 0" class="no-events">
      <p class="has-text-grey is-size-7">No activity found</p>
    </div>

    <div v-else class="events-list">
      <div
        v-for="(event, index) in paginatedEvents"
        :key="`${event.txId}-${event.account}-${index}`"
        class="event-item"
      >
        <span :class="['event-action', event.type === 'granted' ? 'is-success' : 'is-danger']">
          {{ event.type === 'granted' ? 'Granted' : 'Revoked' }}
        </span>
        <span class="event-text">to</span>
        <a
          :href="`${$explorerAccount}${event.account}`"
          target="_blank"
          class="address-link"
          :title="event.account"
        >{{ event.account | addr }}</a>
        <span class="event-text">by</span>
        <a
          :href="`${$explorerAccount}${event.sender}`"
          target="_blank"
          class="address-link"
          :title="event.sender"
        >{{ event.sender | addr }}</a>
        <span
          v-if="event.timestamp"
          class="event-time"
          :title="formatFullDate(event.timestamp)"
        >{{ formatRelativeTime(event.timestamp) }}</span>
        <a
          :href="`${$explorerTx}${event.txId}`"
          target="_blank"
          class="tx-link"
          title="View transaction"
        >
          <b-icon icon="external-link-alt" size="is-small"></b-icon>
        </a>
      </div>

      <div v-if="hasMoreEvents" class="load-more-container">
        <b-button
          type="is-text"
          size="is-small"
          @click="loadMore"
        >
          Load more ({{ filteredEvents.length - paginatedEvents.length }} remaining)
        </b-button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { RoleEvent } from '../services/access-control-service'

@Component
export default class RoleActivityList extends Vue {
  @Prop({ default: () => [] })
  events!: RoleEvent[]

  private selectedEventType: 'granted' | 'revoked' | null = null
  private displayCount = 5

  get filteredEvents(): RoleEvent[] {
    if (!this.selectedEventType) {
      return this.events
    }
    return this.events.filter(e => e.type === this.selectedEventType)
  }

  get paginatedEvents(): RoleEvent[] {
    return this.filteredEvents.slice(0, this.displayCount)
  }

  get hasMoreEvents(): boolean {
    return this.filteredEvents.length > this.displayCount
  }

  @Watch('selectedEventType')
  onFilterChange() {
    this.displayCount = 5
  }

  private loadMore() {
    this.displayCount += 5
  }

  private copyAddress(address: string) {
    navigator.clipboard.writeText(address).then(() => {
      this.$buefy.toast.open({
        message: 'Address copied to clipboard',
        type: 'is-success',
        duration: 2000
      })
    }).catch(() => {
      this.$buefy.toast.open({
        message: 'Failed to copy address',
        type: 'is-danger',
        duration: 2000
      })
    })
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp

    if (diff < 0) return 'just now'

    const minutes = Math.floor(diff / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    if (diff < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    if (months < 12) return `${months}mo ago`
    return `${years}y ago`
  }

  private formatFullDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString()
  }
}
</script>
<style lang="scss" scoped>
.role-activity-list {
  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;

    .activity-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-color);
      margin: 0;
    }
  }

  .no-events {
    padding: 0.5rem 0;
    text-align: center;
  }

  .events-list {
    .event-item {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--border-color, #eee);
      font-size: 0.8rem;

      &:last-of-type {
        border-bottom: none;
      }

      .event-action {
        font-weight: 600;

        &.is-success { color: #48c78e; }
        &.is-danger { color: #f14668; }
      }

      .event-text {
        color: var(--text-color-light, #888);
      }

      .address-link {
        font-family: monospace;
        font-size: 0.75rem;
        color: var(--primary-color, #3273dc);

        &:hover { text-decoration: underline; }
      }

      .event-time {
        color: var(--text-color-light, #888);
        cursor: help;
        border-bottom: 1px dotted currentColor;
        margin-left: auto;
      }

      .tx-link {
        color: var(--text-color-light, #888);
        opacity: 0.6;

        &:hover { opacity: 1; }
      }
    }

    .load-more-container {
      text-align: center;
      margin-top: 0.5rem;
    }
  }
}

[data-theme="dark"] {
  .role-activity-list {
    .activity-header {
      .activity-title {
        color: #ccc;
      }
    }

    .no-events p {
      color: #888;
    }

    .event-item {
      border-bottom-color: #333;

      .event-text {
        color: #888;
      }

      .address-link {
        color: #64b5f6;

        &:hover {
          color: #90caf9;
        }
      }

      .event-time {
        color: #888;
      }

      .tx-link {
        color: #888;

        &:hover {
          color: #64b5f6;
        }
      }
    }

    .load-more-container {
      ::v-deep .button.is-text {
        color: #64b5f6;

        &:hover {
          background-color: rgba(100, 181, 246, 0.1);
        }
      }
    }

    /* Dark mode for select dropdown */
    ::v-deep .select select {
      background-color: #2a2a2a;
      border-color: #444;
      color: #e0e0e0;

      &:hover {
        border-color: #555;
      }

      option {
        background-color: #2a2a2a;
        color: #e0e0e0;
      }
    }
  }
}
</style>
