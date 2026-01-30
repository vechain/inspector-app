import Connex from '@vechain/connex'
import { getRoleHash } from '../contracts/access-control-roles'

/**
 * Represents a role grant or revoke event from an AccessControl contract.
 */
export interface RoleEvent {
  type: 'granted' | 'revoked'
  roleHash: string
  account: string
  sender: string
  blockNumber: number
  txId: string
}

/**
 * ABI for the RoleGranted event.
 * event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
 */
const RoleGrantedEventABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'role', type: 'bytes32' },
    { indexed: true, name: 'account', type: 'address' },
    { indexed: true, name: 'sender', type: 'address' }
  ],
  name: 'RoleGranted',
  type: 'event'
}

/**
 * ABI for the RoleRevoked event.
 * event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
 */
const RoleRevokedEventABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'role', type: 'bytes32' },
    { indexed: true, name: 'account', type: 'address' },
    { indexed: true, name: 'sender', type: 'address' }
  ],
  name: 'RoleRevoked',
  type: 'event'
}

/**
 * ABI for the hasRole function.
 * function hasRole(bytes32 role, address account) public view returns (bool)
 */
const hasRoleFunctionABI = {
  inputs: [
    { name: 'role', type: 'bytes32' },
    { name: 'account', type: 'address' }
  ],
  name: 'hasRole',
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'view',
  type: 'function'
}

/**
 * ABI for the getRoleAdmin function.
 * function getRoleAdmin(bytes32 role) public view returns (bytes32)
 */
const getRoleAdminFunctionABI = {
  inputs: [{ name: 'role', type: 'bytes32' }],
  name: 'getRoleAdmin',
  outputs: [{ name: '', type: 'bytes32' }],
  stateMutability: 'view',
  type: 'function'
}

/**
 * Fetches RoleGranted and RoleRevoked events from a contract.
 * @param connex The Connex instance
 * @param contractAddress The address of the contract to query
 * @param fromBlock Optional starting block number (defaults to 0)
 * @returns Array of RoleEvent objects sorted by block number descending
 */
export async function fetchRoleEvents(
  connex: Connex,
  contractAddress: string,
  fromBlock?: number
): Promise<RoleEvent[]> {
  const account = connex.thor.account(contractAddress)
  const currentBlock = connex.thor.status.head.number

  const range: Connex.Thor.Filter.Range = {
    unit: 'block',
    from: fromBlock ?? 0,
    to: currentBlock
  }

  // Fetch RoleGranted events
  const grantedEvent = account.event(RoleGrantedEventABI)
  const grantedFilter = grantedEvent.filter([{}])
  grantedFilter.range(range).order('desc')

  // Fetch RoleRevoked events
  const revokedEvent = account.event(RoleRevokedEventABI)
  const revokedFilter = revokedEvent.filter([{}])
  revokedFilter.range(range).order('desc')

  // Fetch both event types in parallel
  // We fetch in batches to avoid hitting limits
  const batchSize = 256
  const events: RoleEvent[] = []

  // Fetch granted events
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const batch = await grantedFilter.apply(offset, batchSize)
    for (const log of batch) {
      events.push({
        type: 'granted',
        roleHash: log.decoded['role'] as string,
        account: log.decoded['account'] as string,
        sender: log.decoded['sender'] as string,
        blockNumber: log.meta.blockNumber,
        txId: log.meta.txID
      })
    }
    hasMore = batch.length === batchSize
    offset += batchSize
  }

  // Fetch revoked events
  offset = 0
  hasMore = true
  while (hasMore) {
    const batch = await revokedFilter.apply(offset, batchSize)
    for (const log of batch) {
      events.push({
        type: 'revoked',
        roleHash: log.decoded['role'] as string,
        account: log.decoded['account'] as string,
        sender: log.decoded['sender'] as string,
        blockNumber: log.meta.blockNumber,
        txId: log.meta.txID
      })
    }
    hasMore = batch.length === batchSize
    offset += batchSize
  }

  // Sort by block number descending (most recent first)
  events.sort((a, b) => b.blockNumber - a.blockNumber)

  return events
}

/**
 * Checks if an account has a specific role on a contract.
 * @param connex The Connex instance
 * @param contractAddress The address of the contract
 * @param abi The contract ABI (used for type checking, actual call uses standard ABI)
 * @param roleHash The bytes32 role hash to check
 * @param account The address to check for the role
 * @returns true if the account has the role, false otherwise
 */
export async function checkHasRole(
  connex: Connex,
  contractAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _abi: object[],
  roleHash: string,
  account: string
): Promise<boolean> {
  const contractAccount = connex.thor.account(contractAddress)
  const method = contractAccount.method(hasRoleFunctionABI)

  try {
    const result = await method.call(roleHash, account)
    if (result.reverted) {
      return false
    }
    return result.decoded['0'] as boolean
  } catch {
    return false
  }
}

/**
 * Gets the admin role for a specific role.
 * @param connex The Connex instance
 * @param contractAddress The address of the contract
 * @param abi The contract ABI (used for type checking, actual call uses standard ABI)
 * @param roleHash The bytes32 role hash to query
 * @returns The admin role hash as a bytes32 string
 */
export async function getRoleAdmin(
  connex: Connex,
  contractAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _abi: object[],
  roleHash: string
): Promise<string> {
  const contractAccount = connex.thor.account(contractAddress)
  const method = contractAccount.method(getRoleAdminFunctionABI)

  try {
    const result = await method.call(roleHash)
    if (result.reverted) {
      // Default to DEFAULT_ADMIN_ROLE (all zeros)
      return '0x' + '0'.repeat(64)
    }
    return result.decoded['0'] as string
  } catch {
    // Default to DEFAULT_ADMIN_ROLE (all zeros)
    return '0x' + '0'.repeat(64)
  }
}

/**
 * Detects if a contract ABI implements OpenZeppelin AccessControl.
 * Checks for the presence of hasRole function and RoleGranted/RoleRevoked events.
 * @param abi The contract ABI array
 * @returns true if the contract appears to implement AccessControl
 */
export function detectAccessControl(abi: object[]): boolean {
  if (!Array.isArray(abi)) {
    return false
  }

  let hasHasRole = false
  let hasRoleGrantedEvent = false
  let hasRoleRevokedEvent = false

  for (const item of abi) {
    const entry = item as { type?: string; name?: string; inputs?: { type: string }[] }

    if (entry.type === 'function' && entry.name === 'hasRole') {
      // Verify it has the expected signature: hasRole(bytes32, address)
      if (
        entry.inputs &&
        entry.inputs.length === 2 &&
        entry.inputs[0].type === 'bytes32' &&
        entry.inputs[1].type === 'address'
      ) {
        hasHasRole = true
      }
    }

    if (entry.type === 'event' && entry.name === 'RoleGranted') {
      hasRoleGrantedEvent = true
    }

    if (entry.type === 'event' && entry.name === 'RoleRevoked') {
      hasRoleRevokedEvent = true
    }
  }

  // A contract implements AccessControl if it has hasRole function and both events
  return hasHasRole && hasRoleGrantedEvent && hasRoleRevokedEvent
}

/**
 * Gets the timestamp of a specific block.
 * @param connex The Connex instance
 * @param blockNumber The block number to query
 * @returns The block timestamp in seconds since Unix epoch, or null if block not found
 */
export async function getBlockTimestamp(
  connex: Connex,
  blockNumber: number
): Promise<number | null> {
  const block = await connex.thor.block(blockNumber).get()
  return block ? block.timestamp : null
}

// Re-export getRoleHash for convenience
export { getRoleHash }
