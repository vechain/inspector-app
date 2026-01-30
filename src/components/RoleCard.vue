<template>
  <b-collapse class="panel role-card" :open="expanded" @update:open="onToggle">
    <div slot="trigger" slot-scope="props" class="panel-heading" @click="$emit('toggle')">
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
      <div class="admin-role-info">
        <span class="admin-label">Admin role:</span>
        <span class="admin-value">{{ displayAdminRoleName }}</span>
        <code class="is-size-7 admin-hash">{{ truncatedAdminHash }}</code>
      </div>
      <div class="holders-section" v-if="holders.length > 0">
        <p class="holders-title">Holders:</p>
        <div class="holders-list">
          <div v-for="(holder, index) in holders" :key="index" class="holder-item">
            <code class="holder-address">{{ holder }}</code>
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
    </div>
  </b-collapse>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class RoleCard extends Vue {
  @Prop({ required: true })
  roleHash!: string

  @Prop({ default: null })
  roleName!: string | null

  @Prop({ default: () => [] })
  holders!: string[]

  @Prop({ required: true })
  adminRoleHash!: string

  @Prop({ default: null })
  adminRoleName!: string | null

  @Prop({ default: false })
  expanded!: boolean

  get displayRoleName(): string {
    return this.roleName || 'Unknown role'
  }

  get displayAdminRoleName(): string {
    return this.adminRoleName || 'Unknown role'
  }

  get truncatedHash(): string {
    return this.truncateHash(this.roleHash)
  }

  get truncatedAdminHash(): string {
    return this.truncateHash(this.adminRoleHash)
  }

  private truncateHash(hash: string): string {
    if (!hash) return ''
    if (hash.length <= 16) return hash
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`
  }

  private onToggle(open: boolean) {
    this.$emit('toggle', open)
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

  .admin-role-info {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background-color: var(--admin-bg, #f9f9f9);
    border-radius: 4px;

    .admin-label {
      font-weight: 600;
      margin-right: 0.5rem;
      color: var(--text-color);
    }

    .admin-value {
      color: var(--text-color);
      margin-right: 0.5rem;
    }

    .admin-hash {
      background-color: var(--code-bg, #f0f0f0);
      padding: 0.15rem 0.3rem;
      border-radius: 3px;
      color: var(--code-color, #666);
    }
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

      .holder-address {
        font-family: monospace;
        font-size: 0.85rem;
        flex: 1;
        color: var(--code-color, #333);
        word-break: break-all;
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
}

/* Dark mode support */
[data-theme="dark"] {
  .role-card {
    .panel-heading:hover {
      background-color: #2a2a2a;
    }

    .role-hash-display code,
    .admin-hash {
      background-color: #2a2a2a;
      color: #b0b0b0;
    }

    .admin-role-info {
      background-color: #1a1a1a;
    }

    .holder-item {
      border-bottom-color: #333;

      .holder-address {
        color: #e0e0e0;
      }
    }
  }
}
</style>
