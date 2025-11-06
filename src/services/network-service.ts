import DB, { Entities } from '../database'

export interface GenesisBlock {
  number: number
  id: string
  size: number
  parentID: string
  timestamp: number
  gasLimit: number
  beneficiary: string
  gasUsed: number
  totalScore: number
  txsRoot: string
  txsFeatures: number
  stateRoot: string
  receiptsRoot: string
  signer: string
  isTrunk?: boolean
  transactions: any[]
}

export const fetchGenesisBlock = async (nodeUrl: string): Promise<GenesisBlock> => {
  try {
    const url = nodeUrl.endsWith('/') ? nodeUrl : nodeUrl + '/'
    const response = await fetch(`${url}blocks/0`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const genesisBlock = await response.json()

    if (!genesisBlock || !genesisBlock.id) {
      throw new Error('Invalid genesis block response')
    }

    return genesisBlock
  } catch (error: any) {
    console.error('Failed to fetch genesis block:', error.message)
    throw new Error(`Could not connect to node: ${error.message}`)
  }
}

export const validateNodeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export const getCustomNetworks = async (): Promise<Entities.Network[]> => {
  return await DB.networks.toArray()
}

export const getNetworkByGenesisId = async (genesisId: string): Promise<Entities.Network | undefined> => {
  return await DB.networks.where('genesisId').equals(genesisId).first()
}

export const getNetworkById = async (id: number): Promise<Entities.Network | undefined> => {
  return await DB.networks.get(id)
}

export const saveNetwork = async (network: Omit<Entities.Network, 'id'>): Promise<number> => {
  const existing = await DB.networks.where('name').equals(network.name).first()
  if (existing) {
    throw new Error('A network with this name already exists')
  }
  
  return await DB.networks.add({
    ...network,
    createdTime: Date.now()
  })
}

export const updateNetwork = async (id: number, network: Partial<Entities.Network>): Promise<void> => {
  if (network.name) {
    const existing = await DB.networks
      .where('name')
      .equals(network.name)
      .and(n => n.id !== id)
      .first()
    if (existing) {
      throw new Error('A network with this name already exists')
    }
  }
  
  await DB.networks.update(id, network)
}

export const deleteNetwork = async (id: number): Promise<void> => {
  await DB.networks.delete(id)
}

