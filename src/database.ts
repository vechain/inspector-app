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

class Database extends Dexie {
  public readonly contracts!: Dexie.Table<Entities.Contract, string>
  constructor() {
    super('inspect')
    this.version(1).stores({
      contracts: '++id, &address, name'
    })
    this.open().catch(err => console.error(err))
  }
}

const DB = new Database()

export default DB
