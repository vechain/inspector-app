import { keccak256 } from 'thor-devkit'

/**
 * Known OpenZeppelin AccessControl roles with their keccak256 hashes.
 * DEFAULT_ADMIN_ROLE is 0x00...00 (32 zero bytes).
 * Other roles are computed as keccak256(ROLE_NAME).
 */

// Role names that will be hashed
const ROLE_NAMES = [
  'MINTER_ROLE',
  'PAUSER_ROLE',
  'PROPOSAL_EXECUTOR_ROLE',
  'GOVERNOR_FUNCTIONS_SETTINGS_ROLE',
  'CONTRACTS_ADDRESS_MANAGER_ROLE',
  'DECAY_SETTINGS_MANAGER_ROLE',
  'Proposer',
  'Executor',
  'GOVERNANCE_ROLE',
  'VOTE_REGISTRAR_ROLE',
  'ROUND_STARTER_ROLE',
  'IMPACT_KEY_MANAGER_ROLE',
  'SETTINGS_MANAGER_ROLE',
  'WHITELISTER_ROLE',
  'ACTION_REGISTRAR_ROLE',
  'ACTION_SCORE_MANAGER_ROLE',
  'SIGNALER_ROLE',
  'ROLE_GRANTER',
  'BURNER_ROLE',
  'GRANTS_APPROVER_ROLE',
  'GRANTS_REJECTOR_ROLE',
  'LEVEL_OPERATOR_ROLE',
  'UPGRADER_ROLE',
  'DISTRIBUTOR_ROLE',
  'MANAGER_ROLE',
  'POOL_ADMIN_ROLE',
  'TOKEN_MANAGER_MIGRATOR_ROLE',
  'OPERATOR_ROLE',
  'LOST_REWARDS_WHITELISTER_ROLE',
  'WHITELISTED_ROLE',
  'WHITELIST_ADMIN_ROLE',
  'NODE_WEIGHT_MANAGER_ROLE',
  'EXECUTOR_ROLE',
  'PROPOSAL_STATE_MANAGER_ROLE'
] as const

type RoleName = typeof ROLE_NAMES[number] | 'DEFAULT_ADMIN_ROLE'

/**
 * Computes the keccak256 hash of a role name and returns it as a hex string.
 * @param name The role name (e.g., 'MINTER_ROLE')
 * @returns The bytes32 hash as a hex string with 0x prefix
 */
export function getRoleHash(name: string): string {
  const hash = keccak256(name)
  return '0x' + hash.toString('hex')
}

// Build the KNOWN_ROLES mapping: role name -> bytes32 hash
function buildKnownRoles(): Map<RoleName, string> {
  const roles = new Map<RoleName, string>()

  // DEFAULT_ADMIN_ROLE is special: it's 32 zero bytes
  roles.set('DEFAULT_ADMIN_ROLE', '0x' + '0'.repeat(64))

  // Hash all other role names
  for (const name of ROLE_NAMES) {
    roles.set(name, getRoleHash(name))
  }

  return roles
}

/**
 * Map of known role names to their keccak256 hashes.
 * Use this to display human-readable role names in the UI.
 */
export const KNOWN_ROLES: Map<RoleName, string> = buildKnownRoles()

// Build a reverse mapping: hash -> role name for lookups
function buildHashToNameMap(): Map<string, RoleName> {
  const hashToName = new Map<string, RoleName>()
  for (const [name, hash] of KNOWN_ROLES.entries()) {
    hashToName.set(hash.toLowerCase(), name)
  }
  return hashToName
}

const HASH_TO_NAME: Map<string, RoleName> = buildHashToNameMap()

/**
 * Looks up the human-readable name for a role hash.
 * @param hash The bytes32 role hash (with or without 0x prefix)
 * @returns The role name if known, or null if unknown
 */
export function getRoleName(hash: string): string | null {
  const normalizedHash = hash.toLowerCase().startsWith('0x')
    ? hash.toLowerCase()
    : '0x' + hash.toLowerCase()
  return HASH_TO_NAME.get(normalizedHash) ?? null
}

/**
 * Get all known role names as an array.
 */
export function getAllKnownRoleNames(): RoleName[] {
  return ['DEFAULT_ADMIN_ROLE', ...ROLE_NAMES]
}

/**
 * Get all known roles as an array of {name, hash} objects.
 */
export function getAllKnownRoles(): Array<{ name: RoleName; hash: string }> {
  return Array.from(KNOWN_ROLES.entries()).map(([name, hash]) => ({ name, hash }))
}
