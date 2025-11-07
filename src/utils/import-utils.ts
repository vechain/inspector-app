import { Entities } from '../database'

export interface ParseResult {
    success: boolean
    contract?: Entities.Contract
    errors: string[]
    filename: string
    isHardhatArtifact?: boolean
    skipped?: boolean
    skipReason?: string
}

export interface ValidationError {
    field: string
    message: string
    fix: string
}

export function isHardhatArtifact(json: any): boolean {
    return json && 
           typeof json === 'object' && 
           json._format && 
           json._format.startsWith('hh-sol-artifact')
}

export function isInterfaceOrLibrary(json: any): boolean {
    if (!json || typeof json !== 'object') {
        return false
    }

    // Check if it's a Hardhat artifact
    if (isHardhatArtifact(json)) {
        // Check if contract name starts with "I" followed by uppercase (interface convention)
        const contractName = json.contractName || ''
        if (/^I[A-Z]/.test(contractName)) {
            return true
        }

        // Check source path for interfaces, libraries, deprecated, or mock folders
        const sourceName = json.sourceName || ''
        const pathsToSkip = [
            '/interfaces/',
            '/libraries/',
            '/deprecated/',
            '/mock/',
            '/mocks/',
            'interfaces/',
            'libraries/',
            'deprecated/',
            'mock/',
            'mocks/'
        ]
        
        if (pathsToSkip.some(path => sourceName.includes(path))) {
            return true
        }

        // Check if bytecode is empty or minimal (interfaces/abstract contracts have no bytecode)
        const bytecode = json.bytecode || ''
        if (!bytecode || bytecode === '0x' || bytecode.length < 10) {
            return true
        }
    }

    return false
}

export function isStandardFormat(json: any): boolean {
    return json && 
           typeof json === 'object' && 
           !json._format &&
           (json.address || json.abi || json.name)
}

export function validateContract(data: any, isHardhat: boolean = false): ValidationError[] {
    const errors: ValidationError[] = []

    // Check for name
    if (!data.name && !data.contractName) {
        errors.push({
            field: 'name',
            message: 'Missing contract name',
            fix: 'Add a "name" field with the contract name'
        })
    }

    // Check for ABI
    if (!data.abi) {
        errors.push({
            field: 'abi',
            message: 'Missing ABI field',
            fix: 'Add an "abi" field containing the contract ABI as a JSON array'
        })
    } else if (typeof data.abi === 'string') {
        try {
            JSON.parse(data.abi)
        } catch (e) {
            errors.push({
                field: 'abi',
                message: 'Invalid ABI format - not valid JSON',
                fix: 'Ensure the ABI is valid JSON. It should be an array of function/event definitions'
            })
        }
    } else if (!Array.isArray(data.abi) && typeof data.abi !== 'object') {
        errors.push({
            field: 'abi',
            message: 'Invalid ABI format - must be an array or object',
            fix: 'The ABI should be a JSON array of function/event definitions'
        })
    }

    // Check for address (optional for Hardhat)
    if (!isHardhat && !data.address) {
        errors.push({
            field: 'address',
            message: 'Missing contract address',
            fix: 'Add an "address" field with the deployed contract address (e.g., "0x...")'
        })
    } else if (data.address && typeof data.address !== 'string') {
        errors.push({
            field: 'address',
            message: 'Invalid address format',
            fix: 'The address must be a string in hexadecimal format (e.g., "0x1234...")'
        })
    } else if (data.address && !data.address.startsWith('0x')) {
        errors.push({
            field: 'address',
            message: 'Address must start with "0x"',
            fix: 'Prepend "0x" to the address'
        })
    }

    return errors
}

export function parseContractFile(content: string, filename: string, isFromFolder: boolean = false): ParseResult {
    const result: ParseResult = {
        success: false,
        errors: [],
        filename
    }

    // Skip .dbg.json files
    if (filename.endsWith('.dbg.json')) {
        result.skipped = true
        result.skipReason = 'Debug file'
        return result
    }

    // Parse JSON
    let json: any
    try {
        json = JSON.parse(content)
    } catch (e) {
        result.errors.push(`Invalid JSON format: ${(e as Error).message}`)
        return result
    }

    // Only auto-exclude interfaces/libraries/etc when importing from folder
    // If user manually selected files, they want those specific files
    if (isFromFolder && isInterfaceOrLibrary(json)) {
        result.skipped = true
        
        // Determine skip reason based on source path or contract name
        const sourceName = json.sourceName || ''
        const contractName = json.contractName || ''
        
        if (sourceName.includes('/deprecated/') || sourceName.startsWith('deprecated/')) {
            result.skipReason = 'Deprecated'
        } else if (sourceName.includes('/mock') || sourceName.startsWith('mock')) {
            result.skipReason = 'Mock'
        } else if (sourceName.includes('/libraries/') || sourceName.startsWith('libraries/')) {
            result.skipReason = 'Library'
        } else if (sourceName.includes('/interfaces/') || sourceName.startsWith('interfaces/') || /^I[A-Z]/.test(contractName)) {
            result.skipReason = 'Interface'
        } else {
            result.skipReason = 'Non-deployable'
        }
        
        result.contract = {
            name: json.contractName || json.name || 'Unknown',
            address: '',
            abi: []
        }
        return result
    }

    // Detect format
    const isHardhat = isHardhatArtifact(json)
    const isStandard = isStandardFormat(json)

    if (!isHardhat && !isStandard) {
        result.errors.push(
            'Unrecognized file format. Expected either a standard contract JSON ' +
            '(with address, name, abi fields) or a Hardhat artifact (with _format field)'
        )
        return result
    }

    result.isHardhatArtifact = isHardhat

    // Extract contract data
    let contractData: any = {}
    
    if (isHardhat) {
        // Hardhat artifact format
        contractData = {
            name: json.contractName || '',
            abi: json.abi,
            address: '' // Will be filled by user
        }
    } else {
        // Standard format
        contractData = {
            name: json.name || '',
            address: json.address || '',
            abi: json.abi,
            category: json.category,
            network: json.network
        }
    }

    // Validate
    const validationErrors = validateContract(contractData, isHardhat)
    
    if (validationErrors.length > 0) {
        result.errors = validationErrors.map(e => e.message)
        result.contract = contractData as Entities.Contract
        return result
    }

    // Success
    result.success = true
    result.contract = contractData as Entities.Contract
    return result
}

export function parseMultipleFiles(files: File[], isFromFolder: boolean = false): Promise<ParseResult[]> {
    return Promise.all(
        files
            .filter(file => file.name.endsWith('.json') && !file.name.endsWith('.dbg.json'))
            .map(file => {
                return new Promise<ParseResult>((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        const content = reader.result as string || ''
                        resolve(parseContractFile(content, file.name, isFromFolder))
                    }
                    reader.onerror = () => {
                        resolve({
                            success: false,
                            errors: ['Failed to read file'],
                            filename: file.name
                        })
                    }
                    reader.readAsText(file)
                })
            })
    )
}

