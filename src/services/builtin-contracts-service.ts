import { ContractConfig } from '../contracts/config'
import { ParseResult } from '../utils/import-utils'
import { Entities } from '../database'

// Cache for fetched ABIs
const abiCache = new Map<string, any>()

export class BuiltInContractsService {
    /**
     * Fetch ABI from URL or return cached version
     */
    static async fetchAbi(url: string): Promise<any> {
        if (abiCache.has(url)) {
            return abiCache.get(url)
        }

        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch ABI: ${response.statusText}`)
            }
            const abi = await response.json()
            abiCache.set(url, abi)
            return abi
        } catch (error) {
            console.error('Error fetching ABI from', url, error)
            throw error
        }
    }

    /**
     * Get all built-in contracts for the current network
     */
    static async getBuiltInContracts(currentNetwork: string): Promise<ParseResult[]> {
        const networkContracts = ContractConfig[currentNetwork]
        
        if (!networkContracts) {
            return []
        }

        const results: ParseResult[] = []
        const entries = Object.entries(networkContracts)

        for (const [address, config] of entries) {
            try {
                let abi: any

                // Check if ABI is a URL or an object
                if (typeof config.abi === 'string') {
                    // It's a URL, fetch it
                    abi = await this.fetchAbi(config.abi)
                } else {
                    // It's already an object
                    abi = config.abi
                }

                // Check if this is a template (ERC20, ERC721) that needs address input
                const isTemplate = address.startsWith('Enter ')
                
                const result: ParseResult = {
                    success: true,
                    errors: [],
                    filename: `${config.name}.json`,
                    contract: {
                        name: config.name,
                        address: isTemplate ? '' : address,
                        abi: abi
                    }
                }

                results.push(result)
            } catch (error) {
                // If ABI fetch fails, add as error
                results.push({
                    success: false,
                    errors: [`Failed to fetch ABI: ${(error as Error).message}`],
                    filename: `${config.name}.json`,
                    contract: {
                        name: config.name,
                        address: address.startsWith('Enter ') ? '' : address,
                        abi: []
                    }
                })
            }
        }

        return results
    }

    /**
     * Check if an address is from a different network
     */
    static isAddressForDifferentNetwork(address: string, currentNetwork: string): boolean {
        // Check all networks to see if this address exists in a different one
        const allNetworks = Object.keys(ContractConfig)
        
        for (const networkId of allNetworks) {
            if (networkId === currentNetwork) continue
            
            const networkContracts = ContractConfig[networkId]
            if (networkContracts[address]) {
                return true
            }
        }
        
        return false
    }

    /**
     * Get network name for a genesis ID
     */
    static getNetworkName(genesisId: string): string {
        const knownNetworks: Record<string, string> = {
            '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a': 'Mainnet',
            '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127': 'Testnet'
        }
        
        return knownNetworks[genesisId] || 'Custom Network'
    }
}

