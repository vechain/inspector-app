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

// VariantId is intentionally a free-form string so families can expose more
// than the standard / upgradeable axis (e.g. single / multi beneficiary).
export type VariantId = string

/**
 * Code provenance for a variant. Drives the audit-status badge and warning
 * banner shown when the user picks the variant.
 *   - 'oz'          : inherits standard OpenZeppelin contracts directly. Safe.
 *   - 'custom'      : written from scratch for this tool. Unaudited.
 *   - 'third-party' : pulled from an external (non-OZ, non-VeChain) repo.
 *                     Unaudited; needs explicit user trust.
 */
export type AuditStatus = 'oz' | 'custom' | 'third-party'

export interface TemplateVariant {
  id: VariantId
  label: string
  /** Short one-line description shown next to the toggle option. */
  blurb: string
  /** Underlying flat-template id resolved from `artifacts.templates`. */
  templateId: string
  /** Code provenance — controls the warning banner. Defaults to 'oz'. */
  audited?: AuditStatus
  /** Optional extra context shown inside the warning banner. */
  auditNote?: string
  /** Short tag rendered on the variant card (e.g. "Holds: VET + ERC20"). */
  holds?: string
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
  /**
   * Optional per-network pre-fill for the entry function's argument tree.
   * Returns the value tree solc/ParamInput expects (positional array
   * mirroring the constructor / initializer inputs). Returns null when the
   * family has no known defaults for that network — the user fills everything.
   */
  defaults?: (genesisId: string, variantId: VariantId) => any[] | null
  /**
   * Networks for which `defaults` is expected to pre-fill something — used
   * by the UI to render an informative banner ("Pre-filled for mainnet…").
   */
  defaultsNetworks?: string[]
}

/**
 * Genesis IDs we recognise by name.
 */
export const GENESIS = {
  MAIN: '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a',
  TEST: '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127',
} as const

/**
 * Canonical VeBetterDAO contract addresses on the public networks.
 * Source: src/contracts/config.ts (ContractConfig).
 */
const VEBETTERDAO_ADDRESSES: Record<string, {
  XAllocationVoting: string
  X2EarnRewardsPool: string
  X2EarnApps: string
  XAllocationPool: string
}> = {
  [GENESIS.MAIN]: {
    XAllocationVoting: '0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7',
    X2EarnRewardsPool: '0x6Bee7DDab6c99d5B2Af0554EaEA484CE18F52631',
    X2EarnApps: '0x8392B7CCc763dB03b47afcD8E8f5e24F9cf0554D',
    XAllocationPool: '0x4191776F05f4bE4848d3f4d587345078B439C7d3',
  },
  [GENESIS.TEST]: {
    XAllocationVoting: '0x8800592c463f0b21ae08732559ee8e146db1d7b2',
    X2EarnRewardsPool: '0x2d2a2207c68a46fc79325d7718e639d1047b0d8b',
    X2EarnApps: '0x0b54a094b877a25bdc95b4431eaa1e2206b1ddfe',
    XAllocationPool: '0x6f7b4bc19b4dc99005b473b9c45ce2815bbe7533',
  },
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
        audited: 'oz',
      },
      {
        id: 'upgradeable',
        label: 'Upgradeable (UUPS)',
        blurb: 'Deploys impl + ERC1967Proxy. Owner can upgrade later.',
        templateId: 'erc20-upgradeable',
        audited: 'oz',
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
        audited: 'oz',
      },
      {
        id: 'upgradeable',
        label: 'Upgradeable (UUPS)',
        blurb: 'Deploys impl + ERC1967Proxy. Owner can upgrade later.',
        templateId: 'erc721-upgradeable',
        audited: 'oz',
      },
    ],
  },
  {
    id: 'erc4626',
    label: 'ERC4626 Vault',
    shortDescription: 'Tokenized vault for an underlying ERC20 (yield-bearing)',
    longDescription:
      "A tokenized vault following the ERC4626 standard. Depositors transfer an underlying ERC20 asset to the vault and receive vault shares (themselves ERC20-compatible) in return; redeeming the shares pulls back the asset plus any accrued yield. The shares-to-assets ratio drifts upward whenever the vault's asset balance grows — from interest accrued by an external strategy, protocol fees routed back, manual top-ups, or any other on-chain mechanism. The template ships the canonical OpenZeppelin v5.0.2 implementation; you provide the underlying asset address and the share metadata at deploy time.",
    features: [
      'Full ERC4626 surface: deposit, mint, withdraw, redeem, totalAssets, convertToShares, convertToAssets',
      'Preview functions (previewDeposit / previewMint / previewWithdraw / previewRedeem) for off-chain quoting',
      'maxDeposit / maxMint / maxWithdraw / maxRedeem limit hooks (default: unlimited)',
      'Inherits ERC20 — shares are themselves transferable, approvable tokens',
      'Decimal offset handling per OZ 5.0.2 (mitigates first-deposit donation attack)',
      'Ownable so you can add governance or fee-collection hooks via inheritance later',
    ],
    variants: [
      {
        id: 'standard',
        label: 'Standard',
        blurb: 'One-shot deployment. Logic immutable after deploy.',
        templateId: 'erc4626-basic',
        audited: 'oz',
      },
      {
        id: 'upgradeable',
        label: 'Upgradeable (UUPS)',
        blurb: 'Deploys impl + ERC1967Proxy. Owner can upgrade later.',
        templateId: 'erc4626-upgradeable',
        audited: 'oz',
      },
    ],
  },
  {
    id: 'vesting-wallet',
    label: 'Vesting Wallet',
    shortDescription: 'Hold an asset and release it linearly over time',
    longDescription:
      "A vault that holds an asset and releases it gradually over time on a linear schedule. Pick the single-beneficiary variant to vest VET and/or any ERC20 to one address (wraps OpenZeppelin's VestingWallet) — the beneficiary is also the owner. Pick the multi-beneficiary variant to vest a single ERC20 across many addresses with the same start/duration but individual allocations; schedules are locked at deploy and anyone can call `release(beneficiary)` to forward each beneficiary's vested-but-unreleased share.",
    features: [
      'Linear vesting between `start` and `start + duration` — no cliff (vests proportionally from t=0)',
      'Single mode: holds VET + any ERC20 (release() / release(token))',
      'Multi mode: one ERC20, many beneficiaries with individual allocations, all on the same schedule',
      'Permissionless release — anyone can trigger a payout (single: msg.sender ignored; multi: pass the beneficiary)',
      'View helpers: vestedAmount, releasable, scheduleOf — for off-chain UIs',
      'Multi mode locks schedules at construction; fund the contract for the sum of all allocations before any vested amount can release',
    ],
    variants: [
      {
        id: 'single',
        label: 'Single beneficiary',
        blurb: 'One recipient. Beneficiary owns the wallet.',
        templateId: 'vesting-single',
        audited: 'oz',
        holds: 'Holds: VET + any ERC20',
      },
      {
        id: 'single-uups',
        label: 'Single beneficiary (UUPS)',
        blurb: 'Same as above + ERC1967Proxy. Beneficiary controls upgrades.',
        templateId: 'vesting-single-upgradeable',
        audited: 'oz',
        holds: 'Holds: VET + any ERC20',
      },
      {
        id: 'multi',
        label: 'Multi-beneficiary',
        blurb: 'Many recipients on one schedule. Schedules locked at deploy.',
        templateId: 'vesting-multi',
        audited: 'custom',
        auditNote:
          'Multi-beneficiary vesting is a custom contract written for this tool — not inherited from OpenZeppelin and not formally audited. Review the source before deploying real funds.',
        holds: 'Holds: ERC20 only',
      },
      {
        id: 'multi-uups',
        label: 'Multi-beneficiary (UUPS)',
        blurb: 'Same as above + ERC1967Proxy. Owner controls upgrades.',
        templateId: 'vesting-multi-upgradeable',
        audited: 'custom',
        auditNote:
          'Multi-beneficiary vesting (UUPS) is a custom contract written for this tool — not inherited from OpenZeppelin and not formally audited. Review the source before deploying real funds.',
        holds: 'Holds: ERC20 only',
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
        audited: 'third-party',
        auditNote:
          'Source pulled from github.com/Agilulfo1820/endorsers-reward-contract (a personal repo, not an official VeChain or VeBetterDAO organisation repo). Not audited by us. Verify the source matches what you expect — click "Open in Source" to inspect — before deploying.',
      },
    ],
    defaults: (genesisId) => {
      const addrs = VEBETTERDAO_ADDRESSES[genesisId]
      // initialize(InitParams memory _params) — one positional arg whose value
      // is the 10-field InitParams tuple. Order MUST match the struct:
      //   upgrader, admin, vetDomainOwner, appId,
      //   allocationVotingGovernor, rewardsPool, x2earnApps, allocationPool,
      //   startRound, rewardsPercentage
      return [
        [
          '',                                         // upgrader
          '',                                         // admin
          '',                                         // vetDomainOwner
          '',                                         // appId
          addrs ? addrs.XAllocationVoting : '',       // allocationVotingGovernor
          addrs ? addrs.X2EarnRewardsPool : '',       // rewardsPool
          addrs ? addrs.X2EarnApps : '',              // x2earnApps
          addrs ? addrs.XAllocationPool : '',         // allocationPool
          '',                                         // startRound
          '',                                         // rewardsPercentage
        ],
      ]
    },
    defaultsNetworks: [GENESIS.MAIN, GENESIS.TEST],
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

/**
 * Worst-case audit status across all variants of a family — drives the
 * sidebar's unaudited indicator. Order: third-party > custom > oz.
 */
export function familyWorstAuditStatus(f: TemplateFamily): AuditStatus {
  const order: AuditStatus[] = ['third-party', 'custom', 'oz']
  for (const status of order) {
    if (f.variants.some((v) => (v.audited || 'oz') === status)) return status
  }
  return 'oz'
}
