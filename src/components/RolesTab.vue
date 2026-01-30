<template>
  <div class="roles-tab">
    <!-- Not AccessControl Warning -->
    <b-message v-if="!hasAccessControl" type="is-warning" class="access-control-warning">
      <p><strong>Limited AccessControl support</strong></p>
      <p class="is-size-7">This contract's ABI doesn't include the full AccessControl interface (hasRole, RoleGranted, RoleRevoked events).</p>
    </b-message>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <b-loading :is-full-page="false" :active="true" :can-cancel="false"></b-loading>
      <p class="has-text-grey">Loading roles...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <b-message type="is-danger">
        <p><strong>Error loading roles</strong></p>
        <p>{{ error }}</p>
        <b-button type="is-primary" size="is-small" @click="loadData">Retry</b-button>
      </b-message>
    </div>

    <!-- Empty State -->
    <div v-else-if="roles.length === 0 && !loading" class="empty-state">
      <b-message type="is-info">
        <p>No roles found for this contract.</p>
        <p class="is-size-7">This may be because no RoleGranted events have been emitted yet, or the roles have all been revoked.</p>
      </b-message>
    </div>

    <!-- Roles List -->
    <div v-else class="roles-list">
      <RoleCard
        v-for="role in roles"
        :key="role.roleHash"
        :roleHash="role.roleHash"
        :roleName="role.roleName"
        :holders="role.holders"
        :events="getEventsForRole(role.roleHash)"
        :expanded="!!expandedRoles[role.roleHash]"
        @toggle="toggleRole(role.roleHash)"
      />
    </div>

  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import RoleCard from './RoleCard.vue'
import {
  fetchRoleEvents,
  checkHasRole,
  detectAccessControl,
  RoleEvent
} from '../services/access-control-service'
import { getRoleName } from '../contracts/access-control-roles'

interface RoleInfo {
  roleHash: string
  roleName: string | null
  holders: string[]
}

@Component({
  components: {
    RoleCard
  }
})
export default class RolesTab extends Vue {
  @Prop({ required: true })
  contractAddress!: string

  @Prop({ required: true })
  abi!: object[]

  @Prop({ required: true })
  network!: string

  private roles: RoleInfo[] = []
  private events: RoleEvent[] = []
  private loading = false
  private error: string | null = null
  private expandedRoles: Record<string, boolean> = {}

  get hasAccessControl(): boolean {
    return detectAccessControl(this.abi)
  }

  async mounted() {
    // Delay loading to avoid reactivity issues during tab switch
    this.$nextTick(() => {
      this.loadData()
    })
  }

  @Watch('contractAddress')
  async onContractAddressChange() {
    await this.loadData()
  }

  private async loadData() {
    this.loading = true
    this.error = null
    this.roles = []
    this.events = []

    try {
      // Fetch role events
      this.events = await fetchRoleEvents(this.$connex, this.contractAddress)

      // Extract unique roles and their potential holders from events
      const roleHolderCandidates = this.extractRoleHolderCandidates()

      // Get all unique role hashes from events
      const allRoleHashes = new Set([
        ...roleHolderCandidates.keys()
      ])

      // Check each role/address combo to get current holders
      const rolesData: RoleInfo[] = []

      for (const roleHash of allRoleHashes) {
        const candidates = roleHolderCandidates.get(roleHash) || new Set<string>()
        const holders: string[] = []

        // Check each candidate to see if they still have the role
        for (const account of candidates) {
          const hasRole = await checkHasRole(
            this.$connex,
            this.contractAddress,
            this.abi,
            roleHash,
            account
          )
          if (hasRole) {
            holders.push(account)
          }
        }

        // Only include roles that have holders or have events
        if (holders.length > 0 || roleHolderCandidates.has(roleHash)) {
          rolesData.push({
            roleHash,
            roleName: this.lookupRoleName(roleHash),
            holders
          })
        }
      }

      // Sort roles: roles with holders first, then by name
      this.roles = rolesData.sort((a, b) => {
        // Roles with holders come first
        if (a.holders.length > 0 && b.holders.length === 0) return -1
        if (a.holders.length === 0 && b.holders.length > 0) return 1

        // Then sort by name (known roles before unknown)
        const aName = a.roleName || 'zzz' + a.roleHash
        const bName = b.roleName || 'zzz' + b.roleHash
        return aName.localeCompare(bName)
      })
    } catch (err) {
      console.error('Error loading roles:', err)
      this.error = err instanceof Error ? err.message : 'Failed to load roles'
    } finally {
      this.loading = false
    }
  }

  private extractRoleHolderCandidates(): Map<string, Set<string>> {
    // Extract all unique role/account combos from events
    // An account is a candidate if they were ever granted the role
    const candidates = new Map<string, Set<string>>()

    for (const event of this.events) {
      const roleHash = event.roleHash.toLowerCase()
      if (!candidates.has(roleHash)) {
        candidates.set(roleHash, new Set())
      }
      // Add account regardless of event type - we'll verify with hasRole
      candidates.get(roleHash)!.add(event.account.toLowerCase())
    }

    return candidates
  }

  private lookupRoleName(hash: string): string | null {
    return getRoleName(hash.toLowerCase())
  }

  private toggleRole(roleHash: string) {
    this.$set(this.expandedRoles, roleHash, !this.expandedRoles[roleHash])
  }

  private getEventsForRole(roleHash: string): RoleEvent[] {
    return this.events.filter(e => e.roleHash.toLowerCase() === roleHash.toLowerCase())
  }
}
</script>
<style lang="scss" scoped>
.roles-tab {
  padding: 1rem 0;

  .access-control-warning {
    margin-bottom: 1rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    position: relative;

    p {
      margin-top: 1rem;
    }
  }

  .error-state,
  .empty-state {
    margin: 1rem 0;
  }

  .roles-list {
    margin-top: 1rem;
  }
}

/* Dark mode support for alerts */
[data-theme="dark"] {
  .roles-tab {
    ::v-deep .message {
      background-color: #1a1a1a;

      .message-body {
        color: #e0e0e0;
        border-color: transparent;

        strong {
          color: #fff;
        }
      }

      &.is-warning {
        .message-body {
          background-color: rgba(255, 224, 138, 0.1);
          border-left: 4px solid #ffe08a;
        }
      }

      &.is-danger {
        .message-body {
          background-color: rgba(241, 70, 104, 0.1);
          border-left: 4px solid #f14668;
        }
      }

      &.is-info {
        .message-body {
          background-color: rgba(62, 142, 208, 0.1);
          border-left: 4px solid #3e8ed0;
        }
      }
    }

    .loading-state p {
      color: #aaa;
    }
  }
}
</style>
