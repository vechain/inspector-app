import { ContractConfig, AllBuiltInContracts } from '../contracts/config'
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
     * Get all built-in contracts, showing all available contracts
     * Pre-fills addresses for current network, leaves empty for others
     */
    static async getBuiltInContracts(currentNetwork: string): Promise<ParseResult[]> {
        const results: ParseResult[] = []
        
        // Use AllBuiltInContracts list to show everything
        for (const config of AllBuiltInContracts) {
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

                // Find address for current network by searching all network configs
                let addressForCurrentNetwork = ''
                const currentNetworkContracts = ContractConfig[currentNetwork]
                
                if (currentNetworkContracts) {
                    // Search for this contract in current network
                    for (const [address, networkConfig] of Object.entries(currentNetworkContracts)) {
                        if (networkConfig.name === config.name && !address.startsWith('Enter ')) {
                            addressForCurrentNetwork = address
                            break
                        }
                    }
                }
                
                const result: ParseResult = {
                    success: true,
                    errors: [],
                    filename: `${config.name}.json`,
                    contract: {
                        name: config.name,
                        address: addressForCurrentNetwork,
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
                        address: '',
                        abi: []
                    }
                })
            }
        }

        // Sort alphabetically by name
        results.sort((a, b) => {
            const nameA = a.contract?.name || ''
            const nameB = b.contract?.name || ''
            return nameA.localeCompare(nameB)
        })

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

