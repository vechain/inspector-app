import artifacts from './artifacts.json'

export interface TemplateAbiInput {
  name: string
  type: string
  internalType?: string
  components?: TemplateAbiInput[]
}

export interface TemplateAbiItem {
  type: string
  name?: string
  inputs?: TemplateAbiInput[]
  outputs?: TemplateAbiInput[]
  stateMutability?: string
}

export interface DeployTemplate {
  id: string
  label: string
  description: string
  file: string
  contractName: string
  upgradeable: boolean
  /** 'constructor' for regular templates, 'initialize' (or similar) for upgradeable ones. */
  entryFn: string
  /** Entry file source (kept for backward compat — for multi-file templates prefer `files`). */
  source: string
  /** All .sol files belonging to this template, keyed by their relative path. */
  files: Record<string, string>
  abi: TemplateAbiItem[]
  /** 0x-prefixed creation bytecode (no constructor args appended). */
  bytecode: string
}

const TEMPLATES = artifacts.templates as Record<string, DeployTemplate>

export const COMPILER_VERSION: string = artifacts.compilerVersion

export function listTemplates(): DeployTemplate[] {
  return Object.values(TEMPLATES)
}

export function getTemplate(id: string): DeployTemplate | undefined {
  return TEMPLATES[id]
}

/**
 * Return the ABI fragment users need to fill in for the given template:
 * - non-upgradeable → the `constructor` fragment
 * - upgradeable    → the `initialize` fragment (matched by name from `entryFn`)
 */
export function getEntryFragment(t: DeployTemplate): TemplateAbiItem | undefined {
  if (t.upgradeable) {
    return t.abi.find((i) => i.type === 'function' && i.name === t.entryFn)
  }
  return t.abi.find((i) => i.type === 'constructor')
}

// ─────────────────────────────────────────────────────────────────────────────
// Template families
// ─────────────────────────────────────────────────────────────────────────────
//
// A "family" groups variants of the same logical contract under one sidebar
// entry. e.g. ERC20 has a Standard variant (immutable) and an Upgradeable (UUPS)
// variant; the user picks the family from the sidebar, then toggles the variant
// (and any future feature flags) from the main view.

export type VariantId = 'standard' | 'upgradeable'

export interface TemplateVariant {
  id: VariantId
  label: string
  /** Short one-line description shown next to the toggle option. */
  blurb: string
  /** Underlying flat-template id resolved from `artifacts.templates`. */
  templateId: string
}

export interface TemplateFamily {
  id: string
  label: string
  /** One-line summary used in the sidebar row. */
  shortDescription: string
  /** Multi-paragraph description shown in the main view. */
  longDescription: string
  /** Free-form list of "what's included" bullets shown under the description. */
  features: string[]
  /** All variants this family exposes; first entry is the default. */
  variants: TemplateVariant[]
}

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  {
    id: 'erc20',
    label: 'ERC20 Token',
    shortDescription: 'Fungible token (mintable, burnable, ownable)',
    longDescription:
      'A fungible token contract following the ERC20 standard. Use it for utility tokens, governance tokens, in-app currencies, or any value-bearing asset that should be interchangeable and divisible. The deploy ships with owner-controlled minting and holder-driven burning on top of the standard OpenZeppelin v5.0.2 implementation.',
    features: [
      'Standard ERC20 surface: transfer, approve, allowance, transferFrom, balanceOf, totalSupply',
      'Optional initial supply minted to the owner at deploy time',
      'Owner-only mint(address, amount) for issuing new supply later',
      'Holder burn(amount) and burnFrom(addr, amount) (ERC20Burnable)',
      'Ownership via OpenZeppelin Ownable (transferable / renounceable)',
    ],
    variants: [
      {
        id: 'standard',
        label: 'Standard',
        blurb: 'One-shot deployment. Logic immutable after deploy.',
        templateId: 'erc20-basic',
      },
      {
        id: 'upgradeable',
        label: 'Upgradeable (UUPS)',
        blurb: 'Deploys impl + ERC1967Proxy. Owner can upgrade later.',
        templateId: 'erc20-upgradeable',
      },
    ],
  },
  {
    id: 'erc721',
    label: 'ERC721 NFT',
    shortDescription: 'Non-fungible collection (sequential mint, ownable)',
    longDescription:
      'A non-fungible token contract following the ERC721 standard. Use it for collectibles, membership passes, in-game items, or any asset whose individual identity matters. The deploy ships with owner-controlled minting that auto-assigns sequential token IDs from 0, and a shared baseURI you can update.',
    features: [
      'Standard ERC721 surface: ownerOf, safeTransferFrom, approve, getApproved, setApprovalForAll, isApprovedForAll',
      'Auto-incrementing token IDs starting at 0',
      'Owner-only mint(address to) — returns the new token id',
      'Updatable baseURI (setBaseURI) — tokenURI returns baseURI + tokenId',
      'Ownership via OpenZeppelin Ownable (transferable / renounceable)',
    ],
    variants: [
      {
        id: 'standard',
        label: 'Standard',
        blurb: 'One-shot deployment. Logic immutable after deploy.',
        templateId: 'erc721-basic',
      },
      {
        id: 'upgradeable',
        label: 'Upgradeable (UUPS)',
        blurb: 'Deploys impl + ERC1967Proxy. Owner can upgrade later.',
        templateId: 'erc721-upgradeable',
      },
    ],
  },
  {
    id: 'endorsers-reward-distributor',
    label: 'VeBetterDAO Endorsers Reward Distributor',
    shortDescription: 'Distribute round earnings to X-Node endorsers',
    longDescription:
      "A VeBetterDAO-specific contract that lets an X2Earn app share a configurable percentage of each round's earnings with the X-Node holders endorsing the app. Payouts are weighted by each endorser's X-Node tier score and routed through the X2EarnRewardsPool. Distribution is permissionless once the round closes — any caller can trigger it, and storage prevents double-payment. The contract is always UUPS-upgradeable; the upgrader role is set at initialize time.",
    features: [
      'Per-round, permissionless distributeRewards() — anyone can trigger after the round closes',
      'Configurable rewardsPercentage (0–100) — owner-controlled at runtime via setRewardsPercentage',
      'Tier-weighted payout: endorsers receive a share proportional to their X-Node tier score',
      'AccessControl roles: admin, upgrader, vetDomainOwner — set at initialize',
      'ReentrancyGuardUpgradeable on distribution paths',
      'Integrates with XAllocationPool, XAllocationVotingGovernor, X2EarnApps, X2EarnRewardsPool',
    ],
    variants: [
      {
        id: 'upgradeable',
        label: 'Upgradeable (UUPS)',
        blurb: 'Deploys impl + ERC1967Proxy. Upgrader role can upgrade later.',
        templateId: 'endorsers-reward-distributor',
      },
    ],
  },
]

export function listFamilies(): TemplateFamily[] {
  return TEMPLATE_FAMILIES
}

export function getFamily(id: string): TemplateFamily | undefined {
  return TEMPLATE_FAMILIES.find((f) => f.id === id)
}

/** Returns true when the family exposes more than one variant (so a toggle is meaningful). */
export function familyHasChoice(f: TemplateFamily): boolean {
  return f.variants.length > 1
}
