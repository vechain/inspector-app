/*
 * Resolves third-party Solidity imports against bundled virtual filesystems.
 *
 * Each JSON map under src/assets/oz/ is keyed by the path *relative to the
 * package root*, e.g. for OZ:
 *   "access/Ownable.sol" → "// SPDX..."
 * and for VeChain packages (where the package itself uses an `contracts/`
 * prefix so user imports look like
 * `@vechain/vebetterdao-contracts/contracts/B3TR.sol`):
 *   "contracts/B3TR.sol" → "// SPDX..."
 *
 * For OZ we ship the real Solidity sources (full implementations + interfaces).
 * For VeChain packages we ship synthesized interface stubs generated from the
 * Hardhat artifacts (the npm packages don't include .sol sources) — see
 * scripts/build-vechain-fs.js.
 *
 * The JSON files are loaded lazily on first use; webpack code-splits them into
 * their own chunks so they only ship to the browser when source mode is used.
 */

interface PackageDescriptor {
  prefix: string
  loader: () => Promise<Record<string, string>>
}

let ozContracts: Record<string, string> | null = null
let ozUpgradeable: Record<string, string> | null = null
let veBetterDao: Record<string, string> | null = null
let stargate: Record<string, string> | null = null

async function loadOzContracts() {
  if (!ozContracts) {
    const mod = await import(
      /* webpackChunkName: "oz-contracts" */ '@/assets/oz/contracts-5.0.2.json'
    )
    ozContracts = (mod as any).default || (mod as any)
  }
  return ozContracts!
}
async function loadOzUpgradeable() {
  if (!ozUpgradeable) {
    const mod = await import(
      /* webpackChunkName: "oz-upgradeable" */ '@/assets/oz/contracts-upgradeable-5.0.2.json'
    )
    ozUpgradeable = (mod as any).default || (mod as any)
  }
  return ozUpgradeable!
}
async function loadVeBetterDao() {
  if (!veBetterDao) {
    const mod = await import(
      /* webpackChunkName: "vebetterdao-contracts" */ '@/assets/oz/vebetterdao-contracts.json'
    )
    veBetterDao = (mod as any).default || (mod as any)
  }
  return veBetterDao!
}
async function loadStargate() {
  if (!stargate) {
    const mod = await import(
      /* webpackChunkName: "stargate-contracts" */ '@/assets/oz/stargate-contracts.json'
    )
    stargate = (mod as any).default || (mod as any)
  }
  return stargate!
}

const PACKAGES: PackageDescriptor[] = [
  { prefix: '@openzeppelin/contracts/', loader: loadOzContracts },
  { prefix: '@openzeppelin/contracts-upgradeable/', loader: loadOzUpgradeable },
  { prefix: '@vechain/vebetterdao-contracts/', loader: loadVeBetterDao },
  { prefix: '@vechain/stargate-contracts-artifacts/', loader: loadStargate },
]

/**
 * Resolve a single import path. Returns the file contents, or null if the path
 * is outside the supported package set or not found within it.
 */
export async function resolveOZ(importPath: string): Promise<string | null> {
  for (const pkg of PACKAGES) {
    if (importPath.startsWith(pkg.prefix)) {
      const fs = await pkg.loader()
      return fs[importPath.slice(pkg.prefix.length)] || null
    }
  }
  return null
}

/** Returns the list of import-path prefixes the resolver can handle. */
export function supportedPrefixes(): string[] {
  return PACKAGES.map((p) => p.prefix)
}

/** Pre-warm every bundled package so the first compile doesn't pay the network. */
export async function warmOZ(): Promise<void> {
  await Promise.all(PACKAGES.map((p) => p.loader()))
}
