import { abi } from 'thor-devkit'
import { ERC1967_PROXY_BYTECODE } from '@/utils/erc1967-proxy'

// Receipt-polling tuned to the same numbers used in AccountCall.ts:
// 5 blocks * 12s = 60s, polled at 1s intervals.
const RECEIPT_POLL_TIMEOUT_MS = 5 * 12000
const RECEIPT_POLL_INTERVAL_MS = 1000

export interface DeployArgs {
  name: string
  type: string
  /** Required when `type === 'tuple'` (or `tuple[]`) so the encoder can build a ParamType. */
  components?: DeployArgs[]
}

export interface DeployClause {
  to: null
  value: string
  data: string
  comment?: string
}

export interface DeployResult {
  txid: string
  receipt: Connex.Thor.Transaction.Receipt
  /** Lowercased contract addresses, one per clause in the order they were signed. */
  contractAddresses: string[]
}

/**
 * Encode the constructor (or initializer) args and append them to the bytecode.
 * Returns 0x-prefixed hex string ready to be used as the `data` field of a deploy clause.
 */
export function encodeConstructorData(
  bytecode: string,
  args: DeployArgs[],
  values: any[],
): string {
  const code = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`
  if (!args.length) {
    return code
  }
  const encoded = abi.encodeParameters(
    args.map((a) => ({ name: a.name, type: a.type, components: a.components })),
    values,
  )
  // encodeParameters returns 0x-prefixed hex
  return code + encoded.slice(2)
}

/**
 * Encode a function call (selector + args) — used for the proxy's initData.
 */
export function encodeFunctionCall(
  name: string,
  inputs: DeployArgs[],
  values: any[],
): string {
  const fn = new abi.Function({
    type: 'function',
    name,
    stateMutability: 'nonpayable',
    inputs: inputs.map((i) => ({
      name: i.name,
      type: i.type,
      components: i.components,
    })) as any,
    outputs: [],
  })
  return fn.encode(...values)
}

/**
 * Build the deploy clause for a regular (non-upgradeable) contract.
 */
export function buildRegularClause(
  bytecode: string,
  args: DeployArgs[],
  values: any[],
  hexValue: string,
  comment?: string,
): DeployClause {
  return {
    to: null,
    value: hexValue || '0x0',
    data: encodeConstructorData(bytecode, args, values),
    comment,
  }
}

/**
 * Build the clause that deploys an OZ-style ERC1967Proxy.
 *
 * Solidity signature: `constructor(address implementation, bytes memory _data)`.
 * The proxy delegate-calls `_data` to the implementation in its constructor — that
 * is how `initialize(...)` is invoked atomically with proxy deployment.
 */
export function buildProxyClause(
  implementationAddress: string,
  initData: string,
  hexValue: string,
  comment?: string,
): DeployClause {
  const encoded = abi.encodeParameters(
    [
      { name: 'implementation', type: 'address' },
      { name: '_data', type: 'bytes' },
    ],
    [implementationAddress, initData || '0x'],
  )
  const bytecode = ERC1967_PROXY_BYTECODE.startsWith('0x')
    ? ERC1967_PROXY_BYTECODE
    : `0x${ERC1967_PROXY_BYTECODE}`
  return {
    to: null,
    value: hexValue || '0x0',
    data: bytecode + encoded.slice(2),
    comment,
  }
}

/**
 * Sign one or more deploy clauses in a single wallet request and wait for the receipt.
 * Throws on user rejection / timeout / reverted tx. Returns deployed addresses.
 */
export async function signAndWait(
  connex: Connex,
  clauses: DeployClause[],
  signComment: string,
): Promise<DeployResult> {
  const resp = await connex.vendor
    .sign('tx', clauses)
    .comment(signComment)
    .request()

  if (!resp || !resp.txid) {
    throw new Error('Wallet returned no transaction id')
  }
  const receipt = await waitForReceipt(connex, resp.txid)
  if (receipt.reverted) {
    throw new Error('Transaction reverted')
  }
  const addresses = (receipt.outputs || []).map((o: any) =>
    (o.contractAddress || '').toLowerCase(),
  )
  return { txid: resp.txid, receipt, contractAddresses: addresses }
}

/**
 * Poll for a tx receipt with the same 60s budget / 1s cadence used elsewhere
 * (see mixin/AccountCall.ts:155). Rejects on timeout.
 */
export function waitForReceipt(
  connex: Connex,
  txid: string,
): Promise<Connex.Thor.Transaction.Receipt> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const tick = async () => {
      try {
        const r = await connex.thor.transaction(txid).getReceipt()
        if (r) {
          resolve(r)
          return
        }
      } catch {
        // swallow — receipt not yet available is the common case
      }
      if (Date.now() - startedAt > RECEIPT_POLL_TIMEOUT_MS) {
        reject(new Error(`Timed out waiting for receipt of ${txid}`))
        return
      }
      setTimeout(tick, RECEIPT_POLL_INTERVAL_MS)
    }
    tick()
  })
}

/**
 * Some wallets surface user rejection through error.message — match the same
 * heuristic used in mixin/AccountCall.ts so we can suppress alert UI.
 */
export function isUserRejection(error: any): boolean {
  const m = (error?.message || '').toLowerCase()
  const n = (error?.name || '').toLowerCase()
  return (
    m.includes('rejected') ||
    m.includes('cancelled') ||
    m.includes('cancel') ||
    m.includes('denied') ||
    n.includes('rejected') ||
    n.includes('cancelled') ||
    n.includes('cancel')
  )
}

/**
 * Quick sanity check: VeChain currently rejects bytecode containing the PUSH0
 * opcode (0x5f, introduced in Shanghai). Templates and source mode pin
 * evmVersion=paris, but we double-check the final runtime bytecode here.
 *
 * This is a conservative scan — it reports any 0x5f byte, which can also appear
 * inside PUSH data. We use it as a soft guard: if it triggers and the contract
 * compiled with evmVersion=paris, the user can override (future feature).
 */
export function containsPush0(bytecode: string): boolean {
  const hex = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode
  for (let i = 0; i < hex.length; i += 2) {
    if (hex.substr(i, 2).toLowerCase() === '5f') return true
  }
  return false
}
