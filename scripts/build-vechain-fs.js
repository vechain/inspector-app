#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/*
 * Build virtual FS bundles for VeChain contract packages that ship only
 * Hardhat artifacts (no .sol sources): @vechain/vebetterdao-contracts and
 * @vechain/stargate-contracts-artifacts.
 *
 * For each `Foo.sol/Foo.json` artifact under the package's `artifacts/contracts/`
 * directory, we synthesize a Solidity interface stub from the ABI and write it
 * into the virtual FS at the same import path the user would write:
 *     "@vechain/vebetterdao-contracts/contracts/B3TR.sol"
 *     "@vechain/stargate-contracts-artifacts/contracts/Stargate.sol"
 *
 * Limitations:
 *   - Stubs are interfaces only — no inheritance, no implementation. Users can
 *     call deployed instances via `IFoo(addr).method(...)` but cannot inherit
 *     from these contracts.
 *   - Struct types whose `internalType` we cannot extract fall back to
 *     positional `(...)` tuples (Solidity allows this with abicoder v2).
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const NODE_MODULES = path.join(ROOT, 'node_modules')
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'oz') // shared chunked-FS dir

const PACKAGES = [
  {
    name: '@vechain/vebetterdao-contracts',
    artifactsRoot: 'artifacts/contracts',
    outFile: 'vebetterdao-contracts.json',
    /** virtual FS prefix that aligns with the import path the user writes */
    virtualPrefix: 'contracts/',
  },
  {
    name: '@vechain/stargate-contracts-artifacts',
    artifactsRoot: 'artifacts/contracts',
    outFile: 'stargate-contracts.json',
    virtualPrefix: 'contracts/',
  },
]

// ─── ABI → interface stub ────────────────────────────────────────────────

const SOLIDITY_HEAD = `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.20;\n\n`

/**
 * Parse `internalType` strings the hardhat ABI exporter produces:
 *   "struct ContractName.StructName"  → "StructName"
 *   "struct StructName"               → "StructName"
 *   "contract IFoo" / "enum X.Y"      → null (treated as primitive)
 * Anything else → null.
 */
function extractStructName(internalType) {
  if (!internalType || typeof internalType !== 'string') return null
  const m = /^struct\s+([A-Za-z_][\w]*\.)?([A-Za-z_][\w]*)/.exec(internalType)
  return m ? m[2] : null
}

/**
 * Walk an ABI param tree and collect every unique struct definition,
 * keyed by extracted struct name. Returns Map<name, components>.
 */
function collectStructs(items, into) {
  if (!items) return
  for (const it of items) {
    if (it.type === 'tuple' || it.type === 'tuple[]') {
      const name = extractStructName(it.internalType)
      if (name && !into.has(name)) {
        into.set(name, it.components || [])
      }
      collectStructs(it.components, into)
    }
  }
}

/** Render a single parameter type for use in a function signature. */
function renderType(it) {
  if (it.type === 'tuple' || it.type === 'tuple[]') {
    const name = extractStructName(it.internalType)
    if (name) {
      return it.type === 'tuple[]' ? `${name}[]` : name
    }
    // Fallback to inline tuple notation (abicoder v2)
    const inner = (it.components || []).map(renderType).join(',')
    return it.type === 'tuple[]' ? `(${inner})[]` : `(${inner})`
  }
  // contract / enum internalTypes use a plain abi type; passthrough.
  return it.type
}

function needsDataLocation(it) {
  const t = it.type
  return (
    t === 'string' ||
    t === 'bytes' ||
    t.endsWith(']') ||
    t === 'tuple' ||
    t === 'tuple[]'
  )
}

function renderParam(it, withName = true) {
  const type = renderType(it)
  const loc = needsDataLocation(it) ? ' memory' : ''
  const name = withName && it.name ? ' ' + it.name : ''
  return type + loc + name
}

function renderStruct(name, components) {
  const lines = components.map((c) => {
    const t = renderType(c)
    return `    ${t} ${c.name || '_'};`
  })
  return `struct ${name} {\n${lines.join('\n')}\n}`
}

function renderEvent(item) {
  const params = (item.inputs || [])
    .map((i) => {
      const t = renderType(i)
      const indexed = i.indexed ? ' indexed' : ''
      const name = i.name ? ' ' + i.name : ''
      return t + indexed + name
    })
    .join(', ')
  const anon = item.anonymous ? ' anonymous' : ''
  return `    event ${item.name}(${params})${anon};`
}

function renderError(item) {
  const params = (item.inputs || []).map((i) => renderParam(i, false)).join(', ')
  return `    error ${item.name}(${params});`
}

function renderFunction(item) {
  const ins = (item.inputs || []).map((i) => renderParam(i, true)).join(', ')
  const mut =
    item.stateMutability === 'pure'
      ? ' pure'
      : item.stateMutability === 'view'
      ? ' view'
      : item.stateMutability === 'payable'
      ? ' payable'
      : ''
  const outs = (item.outputs || []).map((i) => renderParam(i, false))
  const rets = outs.length ? ` returns (${outs.join(', ')})` : ''
  return `    function ${item.name}(${ins}) external${mut}${rets};`
}

function abiToInterface(contractName, abi) {
  if (!Array.isArray(abi)) return null
  const structs = new Map()
  for (const item of abi) {
    collectStructs(item.inputs, structs)
    collectStructs(item.outputs, structs)
  }

  const events = []
  const errors = []
  const functions = []

  for (const item of abi) {
    if (item.type === 'event') events.push(renderEvent(item))
    else if (item.type === 'error') errors.push(renderError(item))
    else if (item.type === 'function') functions.push(renderFunction(item))
  }

  // Nothing to expose? Skip — likely a library or an empty interface.
  if (!events.length && !errors.length && !functions.length && !structs.size) {
    return null
  }

  let body = ''
  for (const [name, components] of structs.entries()) {
    body += renderStruct(name, components) + '\n\n'
  }

  body += `interface ${contractName} {\n`
  if (events.length) body += events.join('\n') + '\n'
  if (errors.length) body += (events.length ? '\n' : '') + errors.join('\n') + '\n'
  if (functions.length)
    body += (events.length || errors.length ? '\n' : '') + functions.join('\n') + '\n'
  body += '}\n'

  return SOLIDITY_HEAD + body
}

// ─── Walk artifacts ──────────────────────────────────────────────────────

function walkArtifacts(rootDir, prefix, out) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const full = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.sol')) {
        // Hardhat lays out FooBar.sol as a directory containing FooBar.json
        const contractName = entry.name.slice(0, -'.sol'.length)
        const artifactPath = path.join(full, `${contractName}.json`)
        if (fs.existsSync(artifactPath)) {
          try {
            const art = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
            const stub = abiToInterface(art.contractName || contractName, art.abi)
            if (stub) {
              const virtualPath = (prefix + entry.name).split(path.sep).join('/')
              out[virtualPath] = stub
            }
          } catch (e) {
            console.warn(`  skip ${artifactPath}: ${e.message}`)
          }
        }
      } else {
        // Nested directory (e.g. "ve-better-passport/")
        walkArtifacts(full, prefix + entry.name + '/', out)
      }
    }
  }
}

function bundle(pkg) {
  const pkgDir = path.join(NODE_MODULES, pkg.name)
  if (!fs.existsSync(pkgDir)) {
    console.error(`Skipping ${pkg.name}: not installed`)
    return
  }
  const artifactsDir = path.join(pkgDir, pkg.artifactsRoot)
  if (!fs.existsSync(artifactsDir)) {
    console.error(`Skipping ${pkg.name}: ${pkg.artifactsRoot} missing`)
    return
  }
  const files = {}
  walkArtifacts(artifactsDir, pkg.virtualPrefix, files)
  const outPath = path.join(OUT_DIR, pkg.outFile)
  fs.writeFileSync(outPath, JSON.stringify(files))
  console.log(
    `${pkg.name} → ${pkg.outFile}: ${Object.keys(files).length} interfaces, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`,
  )
}

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const pkg of PACKAGES) bundle(pkg)
