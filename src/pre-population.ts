import DB, {Entities} from '@/database'

export type Contract = {
  address: string
  abi: object
  name: string
  genesisId: string
}

const importContract = async (contract: Contract) => {

  const {address, genesisId, name, abi} = contract

  await DB.contracts.filter((obj) =>
    obj.address.toLowerCase() === address.toLowerCase()
  ).delete()

  const entity: Entities.Contract = {
    abi,
    address: address.toLowerCase(),
    name,
    createdTime: Date.now(),
    network: genesisId
  }

  await DB.contracts.add(entity)
}


export const prePopulate = async () => {

  const request = await fetch('/abis/pre-population.json')

  if (!request.ok) {
    return
  }

  const contracts: Contract[] = await request.json()

  for (const contract of contracts) {
    await importContract(contract)
  }
}
