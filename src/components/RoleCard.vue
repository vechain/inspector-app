<template>
  <b-collapse class="panel role-card" :open="expanded" :aria-id="'role-' + roleHash">
    <div slot="trigger" slot-scope="props" class="panel-heading" @click.prevent.stop="$emit('toggle')">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <strong class="role-name">{{ displayRoleName }}</strong>
          </div>
          <div class="level-item">
            <b-tag type="is-info" rounded>{{ holders.length }} holder{{ holders.length !== 1 ? 's' : '' }}</b-tag>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item role-hash-display">
            <code class="is-size-7">{{ truncatedHash }}</code>
          </div>
          <div class="level-item">
            <b-icon
              size="is-small"
              :icon="props.open ? 'caret-up' : 'caret-down'"
            ></b-icon>
          </div>
        </div>
      </div>
    </div>
    <div class="panel-block is-block role-content">
      <div class="holders-section" v-if="holders.length > 0">
        <p class="holders-title">Holders:</p>
        <div class="holders-list">
          <div v-for="(holder, index) in holders" :key="index" class="holder-item">
            <a
              :href="`${$explorerAccount}${holder}`"
              target="_blank"
              class="holder-address-link"
              @click.stop
            >
              <code class="holder-address">{{ holder }}</code>
            </a>
            <b-button
              type="is-text"
              size="is-small"
              icon-left="copy"
              class="copy-btn"
              @click.stop="copyAddress(holder)"
            ></b-button>
          </div>
        </div>
      </div>
      <div v-else class="no-holders">
        <p class="has-text-grey">No current holders for this role</p>
      </div>

      <!-- Activity History for this role -->
      <RoleActivityList
        v-if="events.length > 0"
        :events="events"
        class="role-activity"
      />
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import RoleActivityList from './RoleActivityList.vue'
import { RoleEvent } from '../services/access-control-service'

@Component({
  components: {
    RoleActivityList
  }
})
export default class RoleCard extends Vue {
  @Prop({ required: true })
  roleHash!: string

  @Prop({ default: null })
  roleName!: string | null

  @Prop({ default: () => [] })
  holders!: string[]

  @Prop({ default: () => [] })
  events!: RoleEvent[]

  @Prop({ default: false })
  expanded!: boolean

  get displayRoleName(): string {
    return this.roleName || 'Unknown role'
  }

  get truncatedHash(): string {
    return this.truncateHash(this.roleHash)
  }

  private truncateHash(hash: string): string {
    if (!hash) return ''
    if (hash.length <= 16) return hash
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`
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
.role-card {
  margin-bottom: 0.75rem;

  .panel-heading {
    cursor: pointer;
    padding: 0.75rem 1rem;

    &:hover {
      background-color: var(--hover-bg, #f5f5f5);
    }
  }

  .role-name {
    color: var(--text-color);
  }

  .role-hash-display {
    code {
      background-color: var(--code-bg, #f0f0f0);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      color: var(--code-color, #666);
    }
  }

  .role-content {
    padding: 1rem;
  }

  .holders-section {
    .holders-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-color);
    }

    .holders-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .holder-item {
      display: flex;
      align-items: center;
      padding: 0.35rem 0;
      border-bottom: 1px solid var(--border-color, #eee);

      &:last-child {
        border-bottom: none;
      }

      .holder-address-link {
        flex: 1;
        text-decoration: none;

        &:hover .holder-address {
          text-decoration: underline;
          background-color: var(--code-hover-bg, #e8e8e8);
        }
      }

      .holder-address {
        font-family: monospace;
        font-size: 0.85rem;
        display: inline-block;
        color: var(--primary-color, #3273dc);
        word-break: break-all;
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
        background-color: var(--code-bg, #f0f0f0);
        transition: background-color 0.15s ease;
      }

      .copy-btn {
        margin-left: 0.5rem;
        opacity: 0.6;

        &:hover {
          opacity: 1;
        }
      }
    }
  }

  .no-holders {
    padding: 0.5rem 0;
  }

  .role-activity {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #eee);
  }
}

/* Dark mode support */
[data-theme="dark"] {
  .role-card {
    .panel-heading:hover {
      background-color: #2a2a2a;
    }

    .role-hash-display code {
      background-color: #2a2a2a;
      color: #b0b0b0;
    }

    .holder-item {
      border-bottom-color: #333;

      .holder-address-link:hover .holder-address {
        background-color: #3a3a3a;
      }

      .holder-address {
        color: #64b5f6;
        background-color: #2a2a2a;
      }
    }
  }
}
</style>
