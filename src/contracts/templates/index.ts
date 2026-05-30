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
