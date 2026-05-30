/*
 * Pre-resolve Solidity imports.
 *
 * Solc's standard-JSON `sources` map can hold every file the compilation needs;
 * if we populate it fully up-front, we avoid the emscripten function-pointer
 * dance required to install an import callback inside soljson. This module
 * walks every `import "..."` statement reachable from the user's entry file
 * and emits a flat { [path]: { content } } map ready for solc.
 *
 * Path semantics:
 *   - imports starting with `@openzeppelin/contracts/...` or
 *     `@openzeppelin/contracts-upgradeable/...` resolve against the bundled
 *     virtual FS (oz-resolver.ts) — paths in the solc input keep their full
 *     `@openzeppelin/...` form so error messages remain readable.
 *   - everything else is treated as relative to the importing file and
 *     resolved against the userFiles map.
 */

import { resolveOZ, supportedPrefixes } from './oz-resolver'

const IMPORT_RE = /import\s+(?:\{[^}]*\}\s+from\s+|[a-zA-Z_$][\w$]*\s+from\s+|)["']([^"']+)["']/g

export interface ResolvedSources {
  [path: string]: { content: string }
}

export interface ResolverError {
  path: string
  importedFrom?: string
  message: string
}

export class ImportResolveError extends Error {
  constructor(public errors: ResolverError[]) {
    super(errors.map((e) => `${e.path}: ${e.message}`).join('\n'))
    this.name = 'ImportResolveError'
  }
}

/** Pull import paths out of a source file. Comments are ignored heuristically. */
export function extractImports(source: string): string[] {
  // Strip line comments and block comments before regex to avoid false hits.
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const noLine = noBlock.replace(/\/\/.*$/gm, '')
  const out: string[] = []
  let m: RegExpExecArray | null
  IMPORT_RE.lastIndex = 0
  while ((m = IMPORT_RE.exec(noLine)) !== null) {
    out.push(m[1])
  }
  return out
}

/** Normalize a `./foo/../bar.sol`-style relative path against an importer. */
export function normalizeRelative(importer: string, target: string): string {
  if (!target.startsWith('.')) return target
  const importerDir = importer.includes('/')
    ? importer.slice(0, importer.lastIndexOf('/'))
    : ''
  const parts = (importerDir ? importerDir.split('/') : []).concat(
    target.split('/'),
  )
  const stack: string[] = []
  for (const p of parts) {
    if (p === '' || p === '.') continue
    if (p === '..') stack.pop()
    else stack.push(p)
  }
  return stack.join('/')
}

/**
 * Walk imports starting from `entryFile`, gathering every transitively reachable
 * source. Throws ImportResolveError listing all unresolved imports at once.
 */
export async function resolveAllImports(
  entryFile: string,
  userFiles: Record<string, string>,
): Promise<ResolvedSources> {
  const out: ResolvedSources = {}
  const errors: ResolverError[] = []
  const queue: { path: string; importedFrom?: string }[] = [{ path: entryFile }]

  while (queue.length) {
    const { path, importedFrom } = queue.shift()!
    if (out[path]) continue

    const source = await loadSource(path, userFiles)
    if (source === null) {
      errors.push({
        path,
        importedFrom,
        message: importedFrom
          ? `imported from ${importedFrom} but not found`
          : 'not found',
      })
      continue
    }
    out[path] = { content: source }

    for (const imp of extractImports(source)) {
      const resolved = isPackagePath(imp) ? imp : normalizeRelative(path, imp)
      if (!out[resolved]) {
        queue.push({ path: resolved, importedFrom: path })
      }
    }
  }

  if (errors.length) {
    throw new ImportResolveError(errors)
  }
  return out
}

function isPackagePath(p: string): boolean {
  return supportedPrefixes().some((prefix) => p.startsWith(prefix))
}

async function loadSource(
  path: string,
  userFiles: Record<string, string>,
): Promise<string | null> {
  if (userFiles[path] !== undefined) return userFiles[path]
  if (isPackagePath(path)) return await resolveOZ(path)
  return null
}
