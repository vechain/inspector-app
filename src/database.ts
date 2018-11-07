import Dexie from 'dexie'

export namespace Entities {
  export interface Contract {
    id?: number
    name?: string
    address?: string
    createdTime?: number
    abi?: string
  }
}

export default class Database extends Dexie {
  public readonly contracts!: Dexie.Table<Entities.Contract, string>
  constructor() {
    super('inspect')
    this.version(1).stores({
      contracts: '++id, &address, name'
    })
    this.open().catch(err => console.error(err))
  }
}
