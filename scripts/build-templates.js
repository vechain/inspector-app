#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/*
 * Compile the 4 starter templates + OZ ERC1967Proxy with solc 0.8.20 +
 * evmVersion=paris (VeChain rejects PUSH0). Emit:
 *   src/contracts/templates/artifacts.json   (templates: ABI + bytecode + source files)
 *   src/utils/erc1967-proxy.ts               (proxy bytecode + ABI constant)
 */
const fs = require('fs')
const path = require('path')
const solc = require('solc')

const ROOT = path.resolve(__dirname, '..')
const TEMPLATES_DIR = path.join(ROOT, 'src', 'contracts', 'templates')
const NODE_MODULES = path.join(ROOT, 'node_modules')

function readSol(p) {
  return fs.readFileSync(p, 'utf8')
}

function makeResolver() {
  return {
    import(importPath) {
      // Resolve `@openzeppelin/...` and any other node_modules-style imports.
      try {
        const full = path.join(NODE_MODULES, importPath)
        if (fs.existsSync(full)) {
          return { contents: readSol(full) }
        }
      } catch (e) {
        // fallthrough
      }
      return { error: `File not found: ${importPath}` }
    },
  }
}

/**
 * Compile a template. Each template lives under TEMPLATES_DIR — either as a
 * single .sol file or as a directory containing the entry file plus any number
 * of sibling .sol files (e.g. an `interfaces/` subfolder).
 *
 * `dir` is the path relative to TEMPLATES_DIR. If null, the template is a
 * single file at TEMPLATES_DIR/<entryFile>.
 */
function compile(dir, entryFile, entryContractName) {
  const baseDir = dir ? path.join(TEMPLATES_DIR, dir) : TEMPLATES_DIR
  const files = dir ? collectSolFiles(baseDir) : { [entryFile]: readSol(path.join(baseDir, entryFile)) }
  const sources = {}
  for (const [rel, content] of Object.entries(files)) {
    sources[rel] = { content }
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: 'paris',
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] },
      },
    },
  }
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), makeResolver()),
  )
  const errors = (output.errors || []).filter((e) => e.severity === 'error')
  if (errors.length) {
    for (const e of errors) console.error(e.formattedMessage || e.message)
    throw new Error(`Compilation failed for ${entryFile}`)
  }
  const contracts = output.contracts[entryFile]
  if (!contracts || !contracts[entryContractName]) {
    throw new Error(
      `Contract ${entryContractName} not found in compiled output for ${entryFile}`,
    )
  }
  const c = contracts[entryContractName]
  return {
    abi: c.abi,
    bytecode: '0x' + c.evm.bytecode.object,
    files, // path → content
  }
}

function collectSolFiles(rootDir) {
  const out = {}
  function walk(dir, base) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full, base)
      else if (entry.isFile() && entry.name.endsWith('.sol')) {
        const rel = path.relative(base, full).split(path.sep).join('/')
        out[rel] = fs.readFileSync(full, 'utf8')
      }
    }
  }
  walk(rootDir, rootDir)
  return out
}

function compileFromOZ(packagePath, contractName) {
  // Used for ERC1967Proxy which lives in node_modules/@openzeppelin/contracts/...
  const fullPath = path.join(NODE_MODULES, packagePath)
  const sources = {
    [packagePath]: { content: readSol(fullPath) },
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: 'paris',
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] },
      },
    },
  }
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), makeResolver()),
  )
  const errors = (output.errors || []).filter((e) => e.severity === 'error')
  if (errors.length) {
    for (const e of errors) console.error(e.formattedMessage || e.message)
    throw new Error(`Compilation failed for ${packagePath}`)
  }
  const c = output.contracts[packagePath][contractName]
  return { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }
}

const COMPILER_VERSION = solc.version()

const templates = [
  {
    id: 'erc20-basic',
    label: 'ERC20 (mintable, burnable, ownable)',
    description:
      'Standard ERC20 with owner-controlled mint and holder burn. Non-upgradeable.',
    dir: null,
    file: 'ERC20Basic.sol',
    contractName: 'ERC20Basic',
    upgradeable: false,
    entryFn: 'constructor',
  },
  {
    id: 'erc20-upgradeable',
    label: 'ERC20 Upgradeable (UUPS)',
    description:
      'UUPS-upgradeable ERC20 with owner mint/burn. Deploys implementation + ERC1967Proxy.',
    dir: null,
    file: 'ERC20Upgradeable.sol',
    contractName: 'ERC20UpgradeableTemplate',
    upgradeable: true,
    entryFn: 'initialize',
  },
  {
    id: 'erc721-basic',
    label: 'ERC721 (mintable, ownable)',
    description:
      'Standard ERC721 collection with owner mint and shared baseURI. Non-upgradeable.',
    dir: null,
    file: 'ERC721Basic.sol',
    contractName: 'ERC721Basic',
    upgradeable: false,
    entryFn: 'constructor',
  },
  {
    id: 'erc721-upgradeable',
    label: 'ERC721 Upgradeable (UUPS)',
    description:
      'UUPS-upgradeable ERC721 collection. Deploys implementation + ERC1967Proxy.',
    dir: null,
    file: 'ERC721Upgradeable.sol',
    contractName: 'ERC721UpgradeableTemplate',
    upgradeable: true,
    entryFn: 'initialize',
  },
  {
    id: 'erc4626-basic',
    label: 'ERC4626 Vault (standard)',
    description:
      'Standard tokenized vault wrapping an underlying ERC20. Yields accrue when the vault\'s asset balance grows externally.',
    dir: null,
    file: 'ERC4626Basic.sol',
    contractName: 'ERC4626Basic',
    upgradeable: false,
    entryFn: 'constructor',
  },
  {
    id: 'erc4626-upgradeable',
    label: 'ERC4626 Vault (UUPS)',
    description:
      'UUPS-upgradeable tokenized vault. Deploys implementation + ERC1967Proxy.',
    dir: null,
    file: 'ERC4626Upgradeable.sol',
    contractName: 'ERC4626UpgradeableTemplate',
    upgradeable: true,
    entryFn: 'initialize',
  },
  {
    id: 'conditional-escrow',
    label: 'Conditional Escrow (standard)',
    description:
      'Holds native VET between a payer and a beneficiary. Arbiter releases before deadline; payer can reclaim after deadline.',
    dir: null,
    file: 'ConditionalEscrow.sol',
    contractName: 'ConditionalEscrow',
    upgradeable: false,
    entryFn: 'constructor',
  },
  {
    id: 'conditional-escrow-upgradeable',
    label: 'Conditional Escrow (UUPS)',
    description:
      'UUPS-upgradeable conditional escrow.',
    dir: null,
    file: 'ConditionalEscrowUpgradeable.sol',
    contractName: 'ConditionalEscrowUpgradeable',
    upgradeable: true,
    entryFn: 'initialize',
  },
  {
    id: 'vesting-single',
    label: 'Vesting Wallet (single beneficiary)',
    description:
      'Linear vesting for one beneficiary (VET + any ERC20). Wraps OZ VestingWallet.',
    dir: null,
    file: 'VestingWalletSingle.sol',
    contractName: 'VestingWalletSingle',
    upgradeable: false,
    entryFn: 'constructor',
  },
  {
    id: 'vesting-single-upgradeable',
    label: 'Vesting Wallet (single beneficiary, UUPS)',
    description:
      'UUPS-upgradeable single-beneficiary linear vesting wallet.',
    dir: null,
    file: 'VestingWalletSingleUpgradeable.sol',
    contractName: 'VestingWalletSingleUpgradeable',
    upgradeable: true,
    entryFn: 'initialize',
  },
  {
    id: 'vesting-multi',
    label: 'Vesting Wallet (multi-beneficiary)',
    description:
      'Linear vesting for many beneficiaries sharing one ERC20 and one schedule.',
    dir: null,
    file: 'VestingWalletMulti.sol',
    contractName: 'VestingWalletMulti',
    upgradeable: false,
    entryFn: 'constructor',
  },
  {
    id: 'vesting-multi-upgradeable',
    label: 'Vesting Wallet (multi-beneficiary, UUPS)',
    description:
      'UUPS-upgradeable multi-beneficiary linear vesting.',
    dir: null,
    file: 'VestingWalletMultiUpgradeable.sol',
    contractName: 'VestingWalletMultiUpgradeable',
    upgradeable: true,
    entryFn: 'initialize',
  },
  {
    id: 'endorsers-reward-distributor',
    label: 'VeBetterDAO Endorsers Reward Distributor',
    description:
      'UUPS-upgradeable X2Earn endorsers reward distributor (VeBetterDAO). Distributes a percentage of round earnings to X-Node endorsers via X2EarnRewardsPool.',
    dir: 'EndorsersRewardDistributor',
    file: 'EndorsersRewardDistributor.sol',
    contractName: 'EndorsersRewardDistributor',
    upgradeable: true,
    entryFn: 'initialize',
  },
]

const artifacts = { compilerVersion: COMPILER_VERSION, templates: {} }
for (const t of templates) {
  console.log(`Compiling ${t.dir ? t.dir + '/' : ''}${t.file} :: ${t.contractName} ...`)
  const out = compile(t.dir, t.file, t.contractName)
  artifacts.templates[t.id] = {
    id: t.id,
    label: t.label,
    description: t.description,
    file: t.file,
    contractName: t.contractName,
    upgradeable: t.upgradeable,
    entryFn: t.entryFn,
    source: out.files[t.file],
    files: out.files, // all .sol files (path → content) for the contract row
    abi: out.abi,
    bytecode: out.bytecode,
  }
  console.log(`  bytecode: ${out.bytecode.length / 2 - 1} bytes`)
}

fs.writeFileSync(
  path.join(TEMPLATES_DIR, 'artifacts.json'),
  JSON.stringify(artifacts, null, 2),
)
console.log(`Wrote ${path.relative(ROOT, path.join(TEMPLATES_DIR, 'artifacts.json'))}`)

console.log('Compiling ERC1967Proxy ...')
const proxy = compileFromOZ(
  '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol',
  'ERC1967Proxy',
)
const proxyOut = `// Auto-generated by scripts/build-templates.js — do not edit.
// Source: @openzeppelin/contracts@5.0.2 ERC1967Proxy.sol
// Compiler: ${COMPILER_VERSION}, evmVersion=paris, optimizer={enabled:true,runs:200}
export const ERC1967_PROXY_BYTECODE = ${JSON.stringify(proxy.bytecode)} as const

export const ERC1967_PROXY_ABI = ${JSON.stringify(proxy.abi, null, 2)} as const
`
fs.writeFileSync(path.join(ROOT, 'src', 'utils', 'erc1967-proxy.ts'), proxyOut)
console.log(`Wrote src/utils/erc1967-proxy.ts (bytecode: ${proxy.bytecode.length / 2 - 1} bytes)`)
