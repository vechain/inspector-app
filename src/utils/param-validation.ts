import { address as Address } from 'thor-devkit'

export interface ParamValidation {
    valid: boolean
    error?: string
}

const HEX_RE = /^0x[0-9a-fA-F]*$/
const UINT_RE = /^\d+$/
const INT_RE = /^-?\d+$/

export function validateParam(value: any, type: string): ParamValidation {
    if (value === null || value === undefined || value === '') {
        return { valid: false, error: 'Required' }
    }
    if (type === 'bool') {
        return value === true || value === false ? { valid: true } : { valid: false, error: 'Must be true or false' }
    }

    const v = String(value).trim()

    if (type === 'address') {
        return Address.test(v) ? { valid: true } : { valid: false, error: 'Invalid address' }
    }

    if (type.endsWith(']')) {
        try {
            const parsed = JSON.parse(v)
            return Array.isArray(parsed) ? { valid: true } : { valid: false, error: 'Must be a JSON array' }
        } catch {
            return { valid: false, error: 'Invalid JSON' }
        }
    }

    const uintMatch = /^uint(\d*)$/.exec(type)
    if (uintMatch) {
        if (!UINT_RE.test(v)) return { valid: false, error: 'Must be a non-negative integer' }
        const bits = uintMatch[1] ? parseInt(uintMatch[1], 10) : 256
        try {
            const max = BN(2).pow(bits).minus(1)
            const bn = BN(v)
            if (bn.isGreaterThan(max)) return { valid: false, error: `Exceeds uint${bits} max` }
        } catch {
            return { valid: false, error: 'Invalid number' }
        }
        return { valid: true }
    }

    const intMatch = /^int(\d*)$/.exec(type)
    if (intMatch) {
        if (!INT_RE.test(v)) return { valid: false, error: 'Must be an integer' }
        const bits = intMatch[1] ? parseInt(intMatch[1], 10) : 256
        try {
            const max = BN(2).pow(bits - 1).minus(1)
            const min = BN(2).pow(bits - 1).negated()
            const bn = BN(v)
            if (bn.isGreaterThan(max) || bn.isLessThan(min)) {
                return { valid: false, error: `Out of int${bits} range` }
            }
        } catch {
            return { valid: false, error: 'Invalid number' }
        }
        return { valid: true }
    }

    if (type === 'bytes') {
        if (!HEX_RE.test(v)) return { valid: false, error: 'Must be hex (0x…)' }
        if ((v.length - 2) % 2 !== 0) return { valid: false, error: 'Hex must have even length' }
        return { valid: true }
    }

    const bytesNMatch = /^bytes(\d+)$/.exec(type)
    if (bytesNMatch) {
        const n = parseInt(bytesNMatch[1], 10)
        if (!HEX_RE.test(v)) return { valid: false, error: 'Must be hex (0x…)' }
        const expectedLen = 2 + n * 2
        if (v.length !== expectedLen) {
            return { valid: false, error: `Expected ${n * 2} hex chars (${v.length - 2}/${n * 2})` }
        }
        return { valid: true }
    }

    if (type === 'string') {
        return { valid: true }
    }

    return { valid: true }
}
