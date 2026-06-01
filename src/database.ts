import Dexie from "dexie";
import "dexie-observable";
import { IDatabaseChange } from "dexie-observable/api";

export namespace Entities {
  export interface ContractSource {
    files: Record<string, string>;
    entry: string; // path of the file containing the deployed contract
    contractName: string;
    compiler: {
      version: string; // e.g. "0.8.20+commit.a1b79de6"
      evmVersion: string; // e.g. "paris"
      optimizer: { enabled: boolean; runs: number };
    };
  }

  export interface Contract {
    id?: number;
    name?: string;
    address: string;
    createdTime?: number;
    abi?: object | [];
    network?: string;
    category?: string;
    order?: number;
    source?: ContractSource;
  }

  export interface Filter extends Contract {
    contractName?: string;
    fromPrototype?: boolean;
  }

  export interface ShortCuts extends Contract {
    contractName?: string;
    type: "read" | "write";
    fromPrototype?: boolean;
  }

  export interface Network {
    id?: number;
    name: string;
    genesisId: string;
    nodeUrl: string;
    createdTime: number;
  }

  export interface CustomRole {
    id?: number;
    contractAddress: string;
    network: string; // genesis ID
    roleName: string;
    roleHash: string; // bytes32
    createdTime: number;
  }

  export interface TxBuilderClause {
    id: string;
    contractAddress: string;
    contractName: string;
    abi: any[];
    selectedFunction: ABI.FunctionItem | null;
    params: string[];
    value: string | null;
    note?: string;
  }

  export interface TxBuilderDraft {
    id?: number;
    name: string;
    network: string; // genesis ID
    clauses: TxBuilderClause[];
    createdTime: number;
    updatedTime: number;
  }

  // A saved Deploy "Source" workspace: a set of .sol files + entry. Compiles
  // on any network so we don't scope by genesis id (unlike TxBuilder drafts).
  export interface SourceProject {
    id?: number;
    name: string;
    files: Record<string, string>;
    entry: string;
    createdTime: number;
    updatedTime: number;
  }

  export interface SourcedAbi {
    id?: number;
    genesisId: string;
    address: string; // lowercase; the address users see (proxy if applicable)
    abi: any[];
    source: string; // 'sourcify' for now
    fetchedTime: number;
    contractName?: string;
    implAddress?: string; // populated when we resolved this address as a proxy
  }

  // Single ABI item keyed by its keccak hash (4-byte selector for functions,
  // 32-byte topic0 for events). Source: vechain/b32 keccak directory.
  // `miss` records 404s so we don't refetch repeatedly.
  export interface B32Signature {
    id?: number;
    hash: string; // 0x... lowercase
    item: any | null;
    miss?: boolean;
    fetchedTime: number;
  }

  // Canonical signature from OpenChain (api.openchain.xyz). For events we
  // store the signature string and rebuild an ABI item with a best-guess
  // indexed pattern at decode time. `miss` records 404s.
  export interface OpenChainSignature {
    id?: number;
    hash: string; // 0x... lowercase
    kind: 'function' | 'event';
    canonicalSignature: string | null;
    miss?: boolean;
    fetchedTime: number;
  }
}

class Database extends Dexie {
  public readonly contracts!: Dexie.Table<Entities.Contract, number>;
  public readonly filters!: Dexie.Table<Entities.Filter, number>;
  public readonly shortCuts!: Dexie.Table<Entities.ShortCuts, number>;
  public readonly networks!: Dexie.Table<Entities.Network, number>;
  public readonly customRoles!: Dexie.Table<Entities.CustomRole, number>;
  public readonly txBuilderDrafts!: Dexie.Table<Entities.TxBuilderDraft, number>;
  public readonly sourcedAbis!: Dexie.Table<Entities.SourcedAbi, number>;
  public readonly b32Signatures!: Dexie.Table<Entities.B32Signature, number>;
  public readonly openchainSignatures!: Dexie.Table<Entities.OpenChainSignature, number>;
  public readonly sourceProjects!: Dexie.Table<Entities.SourceProject, number>;

  constructor() {
    super("inspect");

    this.version(2).stores({
      contracts: "++id, &address, name",
      filters: "++id, address, name, contractName",
      shortCuts: "++id, address, name, contractName",
    });
    this.version(3).stores({
      shortCuts: "++id, address, name, contractName, fromPrototype",
      filters: "++id, address, name, contractName, fromPrototype",
    });

    this.version(4).stores({
      contracts: "++id, &address, name, network",
    });
    this.version(5).stores({
      contracts: "++id, address, name, network",
    });
    this.version(6).stores({
      contracts: "++id, address, name, network, category, order",
    });
    this.version(7).stores({
      networks: "++id, genesisId, name, nodeUrl",
    });
    this.version(8).stores({
      customRoles: "++id, contractAddress, network",
    });
    this.version(9).stores({
      txBuilderDrafts: "++id, name, network, updatedTime",
    });
    this.version(10).stores({
      sourcedAbis: "++id, &[genesisId+address], genesisId, address",
    });
    this.version(11).stores({
      b32Signatures: "++id, &hash",
    });
    this.version(12).stores({
      openchainSignatures: "++id, &[hash+kind], hash, kind",
    });
    this.version(13).stores({
      sourceProjects: "++id, name, updatedTime",
    });
    this.open().catch((err) => {
      // tslint:disable-next-line:no-console
      console.error(err);
    });
  }

  public subscribe(
    tableName: string,
    onChange: (changes: IDatabaseChange[]) => void
  ) {
    const ev = this.on("changes");
    const fn = (changes: IDatabaseChange[]) => {
      changes = changes.filter((c) => c.table === tableName);
      if (changes.length > 0) {
        onChange(changes);
      }
    };
    ev.subscribe(fn);
    return {
      unsubscribe: () => ev.unsubscribe(fn),
    };
  }
}

const DB = new Database();

export default DB;
