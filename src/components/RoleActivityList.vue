<template>
  <div class="role-activity-list">
    <div class="activity-header">
      <h4 class="activity-title">Role Activity History</h4>
      <div class="filters">
        <b-field grouped>
          <b-field label="Role" label-position="on-border">
            <b-select v-model="selectedRole" size="is-small" placeholder="All roles">
              <option :value="null">All roles</option>
              <option v-for="role in uniqueRoles" :key="role" :value="role">
                {{ getRoleDisplayName(role) }}
              </option>
            </b-select>
          </b-field>
          <b-field label="Event" label-position="on-border">
            <b-select v-model="selectedEventType" size="is-small" placeholder="All events">
              <option :value="null">All events</option>
              <option value="granted">Granted</option>
              <option value="revoked">Revoked</option>
            </b-select>
          </b-field>
        </b-field>
      </div>
    </div>

    <div v-if="filteredEvents.length === 0" class="no-events">
      <p class="has-text-grey">No role activity found</p>
    </div>

    <div v-else class="events-list">
      <div
        v-for="(event, index) in paginatedEvents"
        :key="`${event.txId}-${event.roleHash}-${event.account}-${index}`"
        class="event-item"
      >
        <div class="event-header">
          <div class="event-type">
            <b-icon
              :icon="event.type === 'granted' ? 'plus-circle' : 'minus-circle'"
              :type="event.type === 'granted' ? 'is-success' : 'is-danger'"
              size="is-small"
            ></b-icon>
            <span :class="['event-type-text', event.type === 'granted' ? 'is-success' : 'is-danger']">
              {{ event.type === 'granted' ? 'Granted' : 'Revoked' }}
            </span>
          </div>
          <div class="event-block">
            <span class="block-label">Block</span>
            <a
              :href="`${$explorerBlock}${event.blockNumber}`"
              target="_blank"
              class="block-link"
            >
              #{{ event.blockNumber }}
            </a>
          </div>
        </div>

        <div class="event-details">
          <div class="detail-row">
            <span class="detail-label">Role:</span>
            <span class="detail-value role-value">
              <strong>{{ getRoleDisplayName(event.roleHash) }}</strong>
              <code class="role-hash">{{ truncateHash(event.roleHash) }}</code>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Account:</span>
            <span class="detail-value">
              <a
                :href="`${$explorerAccount}${event.account}`"
                target="_blank"
                class="address-link"
              >{{ event.account | addr }}</a>
              <b-button
                type="is-text"
                size="is-small"
                icon-left="copy"
                class="copy-btn"
                @click="copyAddress(event.account)"
              ></b-button>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Sender:</span>
            <span class="detail-value">
              <a
                :href="`${$explorerAccount}${event.sender}`"
                target="_blank"
                class="address-link"
              >{{ event.sender | addr }}</a>
              <b-button
                type="is-text"
                size="is-small"
                icon-left="copy"
                class="copy-btn"
                @click="copyAddress(event.sender)"
              ></b-button>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Transaction:</span>
            <span class="detail-value">
              <a
                :href="`${$explorerTx}${event.txId}`"
                target="_blank"
                class="tx-link"
              >{{ event.txId | addr }}</a>
            </span>
          </div>
        </div>
      </div>

      <div v-if="hasMoreEvents" class="load-more-container">
        <b-button
          type="is-primary"
          outlined
          @click="loadMore"
          :loading="loading"
        >
          Load more
        </b-button>
        <span class="events-count">
          Showing {{ paginatedEvents.length }} of {{ filteredEvents.length }} events
        </span>
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

  @Prop({ default: () => new Map<string, string>() })
  knownRoles!: Map<string, string>

  private selectedRole: string | null = null
  private selectedEventType: 'granted' | 'revoked' | null = null
  private displayCount = 20
  private loading = false

  get uniqueRoles(): string[] {
    const roles = new Set<string>()
    for (const event of this.events) {
      roles.add(event.roleHash)
    }
    return Array.from(roles)
  }

  get filteredEvents(): RoleEvent[] {
    let result = [...this.events]

    if (this.selectedRole) {
      result = result.filter(e => e.roleHash.toLowerCase() === this.selectedRole!.toLowerCase())
    }

    if (this.selectedEventType) {
      result = result.filter(e => e.type === this.selectedEventType)
    }

    return result
  }

  get paginatedEvents(): RoleEvent[] {
    return this.filteredEvents.slice(0, this.displayCount)
  }

  get hasMoreEvents(): boolean {
    return this.filteredEvents.length > this.displayCount
  }

  @Watch('selectedRole')
  @Watch('selectedEventType')
  onFilterChange() {
    this.displayCount = 20
  }

  getRoleDisplayName(roleHash: string): string {
    const normalizedHash = roleHash.toLowerCase()
    for (const [hash, name] of this.knownRoles.entries()) {
      if (hash.toLowerCase() === normalizedHash) {
        return name
      }
    }
    return this.truncateHash(roleHash)
  }

  private truncateHash(hash: string): string {
    if (!hash) return ''
    if (hash.length <= 16) return hash
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`
  }

  private loadMore() {
    this.loading = true
    setTimeout(() => {
      this.displayCount += 20
      this.loading = false
    }, 100)
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
}
</script>
<style lang="scss" scoped>
.role-activity-list {
  margin-top: 1.5rem;

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;

    .activity-title {
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--text-color);
      margin: 0;
    }

    .filters {
      ::v-deep .field.is-grouped {
        gap: 0.75rem;
      }

      ::v-deep .label {
        color: var(--text-color);
      }
    }
  }

  .no-events {
    padding: 2rem;
    text-align: center;
  }

  .events-list {
    .event-item {
      background-color: var(--body-background-alt, #f9f9f9);
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      border: 1px solid var(--border-color, #eee);

      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border-color, #eee);

        .event-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .event-type-text {
            font-weight: 600;
            font-size: 0.9rem;

            &.is-success {
              color: #48c78e;
            }

            &.is-danger {
              color: #f14668;
            }
          }
        }

        .event-block {
          font-size: 0.85rem;
          color: var(--text-color-light, #666);

          .block-label {
            margin-right: 0.25rem;
          }

          .block-link {
            font-weight: 600;
            color: var(--primary-color, #3273dc);

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .event-details {
        .detail-row {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;

          &:last-child {
            margin-bottom: 0;
          }

          .detail-label {
            min-width: 90px;
            font-weight: 500;
            color: var(--text-color-light, #666);
          }

          .detail-value {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;

            &.role-value {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.25rem;
            }

            .role-hash {
              font-size: 0.8rem;
              background-color: var(--code-bg, #f0f0f0);
              padding: 0.1rem 0.3rem;
              border-radius: 3px;
              color: var(--code-color, #666);
            }

            .address-link,
            .tx-link {
              font-family: monospace;
              color: var(--primary-color, #3273dc);

              &:hover {
                text-decoration: underline;
              }
            }

            .copy-btn {
              opacity: 0.6;
              padding: 0;
              height: auto;

              &:hover {
                opacity: 1;
              }
            }
          }
        }
      }
    }

    .load-more-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;

      .events-count {
        font-size: 0.85rem;
        color: var(--text-color-light, #666);
      }
    }
  }
}

/* Dark mode support */
[data-theme="dark"] {
  .role-activity-list {
    .event-item {
      background-color: #1a1a1a;
      border-color: #333;

      .event-header {
        border-bottom-color: #333;
      }

      .role-hash {
        background-color: #2a2a2a;
        color: #b0b0b0;
      }
    }
  }
}
</style>
