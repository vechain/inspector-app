/*
 * Minimal Solidity stream-based highlighter for CodeMirror 6.
 *
 * Implemented against @codemirror/language's `StreamLanguage` — a thin
 * token-by-token tokenizer is enough to highlight keywords, types,
 * operators, comments, strings, and numbers without pulling in a full Lezer
 * grammar. Highlighting only (no folding / autocompletion / diagnostics).
 */

import { StreamLanguage, StreamParser } from '@codemirror/language'

const KEYWORDS = new Set([
  'abstract', 'after', 'alias', 'anonymous', 'apply', 'as', 'assembly',
  'async', 'auto', 'await', 'break', 'calldata', 'case', 'catch',
  'constant', 'constructor', 'continue', 'contract', 'copyof', 'default',
  'define', 'delete', 'do', 'else', 'emit', 'enum', 'error', 'event',
  'external', 'fallback', 'final', 'for', 'from', 'function', 'global',
  'hex', 'if', 'immutable', 'implements', 'import', 'in', 'indexed',
  'inline', 'interface', 'internal', 'is', 'let', 'library', 'macro',
  'mapping', 'match', 'memory', 'modifier', 'mutable', 'new', 'null',
  'of', 'override', 'partial', 'payable', 'pragma', 'private',
  'promise', 'public', 'pure', 'receive', 'reference', 'relocatable',
  'return', 'returns', 'sealed', 'sizeof', 'static', 'storage', 'struct',
  'super', 'supports', 'switch', 'this', 'throw', 'try', 'type',
  'typedef', 'typeof', 'ufixed', 'unchecked', 'unicode', 'using',
  'var', 'view', 'virtual', 'while', 'years',
])

const TYPE_KEYWORDS = new Set([
  'address', 'bool', 'byte', 'bytes', 'fixed', 'int', 'string', 'uint',
])

const ATOMS = new Set(['true', 'false', 'null', 'wei', 'gwei', 'ether', 'seconds', 'minutes', 'hours', 'days', 'weeks'])

const BUILTINS = new Set([
  'msg', 'block', 'tx', 'abi', 'now', 'super', 'this',
  'require', 'assert', 'revert', 'selfdestruct', 'suicide',
  'keccak256', 'sha256', 'sha3', 'ripemd160', 'ecrecover',
  'addmod', 'mulmod', 'gasleft', 'blockhash', 'type',
])

function isTypeWord(word: string): boolean {
  if (TYPE_KEYWORDS.has(word)) return true
  // uintN, intN, bytesN, fixedN, ufixedN (with optional Mx for fixed)
  return /^(u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?|bytes(0?[1-9]|[12][0-9]|3[0-2])?|u?fixed(\d+x\d+)?)$/.test(word)
}

interface SolState {
  inBlockComment: boolean
}

const parser: StreamParser<SolState> = {
  name: 'solidity',
  startState: () => ({ inBlockComment: false }),
  token(stream, state) {
    // Block comments span multiple lines.
    if (state.inBlockComment) {
      while (!stream.eol()) {
        const ch = stream.next()
        if (ch === '*' && stream.peek() === '/') {
          stream.next()
          state.inBlockComment = false
          return 'comment'
        }
      }
      return 'comment'
    }

    if (stream.eatSpace()) return null

    // Line comment
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'comment'
    }
    // Block comment open
    if (stream.match('/*')) {
      state.inBlockComment = true
      return 'comment'
    }
    // Strings
    const ch = stream.peek()
    if (ch === '"' || ch === '\'') {
      const quote = stream.next()
      while (!stream.eol()) {
        const c = stream.next()
        if (c === '\\') { stream.next(); continue }
        if (c === quote) break
      }
      return 'string'
    }
    // Hex literal
    if (stream.match(/^0x[0-9a-fA-F_]+/)) return 'number'
    // Decimal / underscore-separated number, optional exponent
    if (stream.match(/^\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?/)) return 'number'

    // Identifier / keyword
    if (stream.match(/^[A-Za-z_$][\w$]*/)) {
      const word = (stream.current() as string)
      if (KEYWORDS.has(word)) return 'keyword'
      if (isTypeWord(word)) return 'typeName'
      if (ATOMS.has(word)) return 'atom'
      if (BUILTINS.has(word)) return 'variableName.special'
      return 'variableName'
    }

    // Single non-ident char (punctuation / operator)
    stream.next()
    return null
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    indentOnInput: /^\s*[}\])]$/,
    closeBrackets: { brackets: ['(', '[', '{', '\'', '"'] },
  },
}

export const solidity = StreamLanguage.define(parser)
