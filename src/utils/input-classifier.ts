// Classifies a raw user-supplied string for the Debugger page.
//
// Sync stage detects shape only. A 32-byte 0x string is ambiguous between
// a tx hash and a topic0 — callers should run `resolveTxOrTopic0` against
// the current Connex instance to disambiguate.

export type DebuggerInputKind =
  | 'tx_or_topic0'
  | 'selector'
  | 'address'
  | 'calldata'
  | 'tx'
  | 'topic0'
  | 'unknown'

export interface ClassifiedInput {
  kind: DebuggerInputKind
  value: string
}

const HEX_PREFIX = /^0x/i

function isHexString(input: string): boolean {
  if (!HEX_PREFIX.test(input)) return false
  return /^0x[0-9a-fA-F]*$/.test(input)
}

export function normalize(input: string): string {
  return input.trim()
}

export function classify(raw: string): ClassifiedInput {
  const value = normalize(raw)
  if (!value) return { kind: 'unknown', value }
  if (!isHexString(value)) return { kind: 'unknown', value }

  const hexLen = value.length - 2

  if (hexLen === 64) {
    return { kind: 'tx_or_topic0', value: value.toLowerCase() }
  }
  if (hexLen === 40) {
    return { kind: 'address', value: value.toLowerCase() }
  }
  if (hexLen === 8) {
    return { kind: 'selector', value: value.toLowerCase() }
  }
  if (hexLen > 8 && hexLen % 2 === 0) {
    return { kind: 'calldata', value: value.toLowerCase() }
  }
  return { kind: 'unknown', value }
}

// Disambiguates a 32-byte hex string by checking whether it corresponds to
// an actual transaction on the connected node. Falls back to topic0 otherwise.
export async function resolveTxOrTopic0(
  connex: Connex,
  value: string
): Promise<'tx' | 'topic0'> {
  try {
    const tx = await connex.thor.transaction(value).get()
    return tx ? 'tx' : 'topic0'
  } catch {
    return 'topic0'
  }
}
