#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/*
 * Walk node_modules/@openzeppelin/{contracts,contracts-upgradeable} and emit
 * two JSON files under src/assets/oz/ that map each .sol path (relative to the
 * package root) to its source. These are bundled into the app and used by the
 * in-browser solc to resolve `import "@openzeppelin/..."` statements.
 *
 * Outputs:
 *   src/assets/oz/contracts-5.0.2.json
 *   src/assets/oz/contracts-upgradeable-5.0.2.json
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'oz')

function walk(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, base, out)
    } else if (entry.isFile() && entry.name.endsWith('.sol')) {
      const rel = path.relative(base, full).split(path.sep).join('/')
      out[rel] = fs.readFileSync(full, 'utf8')
    }
  }
}

function bundle(pkgName, outFile) {
  const pkgDir = path.join(ROOT, 'node_modules', pkgName)
  if (!fs.existsSync(pkgDir)) {
    console.error(`Skipping ${pkgName}: not installed`)
    return
  }
  const files = {}
  walk(pkgDir, pkgDir, files)
  fs.writeFileSync(path.join(OUT_DIR, outFile), JSON.stringify(files))
  console.log(
    `${pkgName} → ${outFile}: ${Object.keys(files).length} files, ${(fs.statSync(path.join(OUT_DIR, outFile)).size / 1024).toFixed(1)} KB`,
  )
}

fs.mkdirSync(OUT_DIR, { recursive: true })
bundle('@openzeppelin/contracts', 'contracts-5.0.2.json')
bundle('@openzeppelin/contracts-upgradeable', 'contracts-upgradeable-5.0.2.json')
