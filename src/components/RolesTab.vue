<template>
  <div class="roles-tab">
    <!-- Add Custom Role Section -->
    <AddCustomRoleInput @add="onAddCustomRole" />

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <b-loading :is-full-page="false" :active="true"></b-loading>
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
      <h4 class="roles-title">Roles ({{ roles.length }})</h4>
      <RoleCard
        v-for="role in roles"
        :key="role.roleHash"
        :roleHash="role.roleHash"
        :roleName="role.roleName"
        :holders="role.holders"
        :adminRoleHash="role.adminRoleHash"
        :adminRoleName="role.adminRoleName"
        :expanded="expandedRoles.has(role.roleHash)"
        @toggle="toggleRole(role.roleHash)"
      />
    </div>

    <!-- Activity History -->
    <RoleActivityList
      v-if="events.length > 0"
      :events="events"
      :knownRoles="knownRolesMap"
    />
  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import RoleCard from './RoleCard.vue'
import RoleActivityList from './RoleActivityList.vue'
import AddCustomRoleInput from './AddCustomRoleInput.vue'
import DB, { Entities } from '../database'
import {
  fetchRoleEvents,
  checkHasRole,
  getRoleAdmin,
  RoleEvent
} from '../services/access-control-service'
import { getRoleName, KNOWN_ROLES } from '../contracts/access-control-roles'

interface RoleInfo {
  roleHash: string
  roleName: string | null
  holders: string[]
  adminRoleHash: string
  adminRoleName: string | null
}

@Component({
  components: {
    RoleCard,
    RoleActivityList,
    AddCustomRoleInput
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
  private customRoles: Entities.CustomRole[] = []
  private loading = false
  private error: string | null = null
  private expandedRoles: Set<string> = new Set()

  get knownRolesMap(): Map<string, string> {
    // Combine built-in known roles with custom roles
    const map = new Map<string, string>()

    // Add built-in roles
    for (const [name, hash] of KNOWN_ROLES.entries()) {
      map.set(hash.toLowerCase(), name)
    }

    // Add custom roles for this contract
    for (const customRole of this.customRoles) {
      if (!map.has(customRole.roleHash.toLowerCase())) {
        map.set(customRole.roleHash.toLowerCase(), customRole.roleName)
      }
    }

    return map
  }

  async mounted() {
    await this.loadData()
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
      // Load custom roles from database
      await this.loadCustomRoles()

      // Fetch role events
      this.events = await fetchRoleEvents(this.$connex, this.contractAddress)

      // Extract unique roles and their potential holders from events
      const roleHolderCandidates = this.extractRoleHolderCandidates()

      // Also include all known roles that might not have events yet
      const allRoleHashes = new Set([
        ...roleHolderCandidates.keys(),
        ...Array.from(KNOWN_ROLES.values()).map(h => h.toLowerCase()),
        ...this.customRoles.map(r => r.roleHash.toLowerCase())
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
          const adminRoleHash = await getRoleAdmin(
            this.$connex,
            this.contractAddress,
            this.abi,
            roleHash
          )

          rolesData.push({
            roleHash,
            roleName: this.lookupRoleName(roleHash),
            holders,
            adminRoleHash,
            adminRoleName: this.lookupRoleName(adminRoleHash)
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

  private async loadCustomRoles() {
    this.customRoles = await DB.customRoles
      .where('contractAddress')
      .equals(this.contractAddress.toLowerCase())
      .and(role => role.network === this.network)
      .toArray()
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
    const normalizedHash = hash.toLowerCase()

    // Check known roles first
    const knownName = getRoleName(normalizedHash)
    if (knownName) return knownName

    // Check custom roles
    const customRole = this.customRoles.find(
      r => r.roleHash.toLowerCase() === normalizedHash
    )
    if (customRole) return customRole.roleName

    return null
  }

  private toggleRole(roleHash: string) {
    if (this.expandedRoles.has(roleHash)) {
      this.expandedRoles.delete(roleHash)
    } else {
      this.expandedRoles.add(roleHash)
    }
    // Force reactivity update
    this.expandedRoles = new Set(this.expandedRoles)
  }

  private async onAddCustomRole(data: { name: string; hash: string }) {
    try {
      // Check if role already exists for this contract
      const existing = await DB.customRoles
        .where('contractAddress')
        .equals(this.contractAddress.toLowerCase())
        .and(role =>
          role.network === this.network &&
          role.roleHash.toLowerCase() === data.hash.toLowerCase()
        )
        .first()

      if (existing) {
        this.$buefy.toast.open({
          message: 'This role already exists for this contract',
          type: 'is-warning',
          duration: 3000
        })
        return
      }

      // Save to database
      await DB.customRoles.add({
        contractAddress: this.contractAddress.toLowerCase(),
        network: this.network,
        roleName: data.name,
        roleHash: data.hash.toLowerCase(),
        createdTime: Date.now()
      })

      this.$buefy.toast.open({
        message: 'Custom role added successfully',
        type: 'is-success',
        duration: 2000
      })

      // Reload data to reflect the new custom role
      await this.loadData()
    } catch (err) {
      console.error('Error adding custom role:', err)
      this.$buefy.toast.open({
        message: 'Failed to add custom role',
        type: 'is-danger',
        duration: 3000
      })
    }
  }
}
</script>
<style lang="scss" scoped>
.roles-tab {
  padding: 1rem 0;

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

    .roles-title {
      font-weight: 600;
      font-size: 1.1rem;
      margin-bottom: 0.75rem;
      color: var(--text-color);
    }
  }
}

/* Dark mode support */
[data-theme="dark"] {
  .roles-tab {
    .roles-title {
      color: #e0e0e0;
    }
  }
}
</style>
