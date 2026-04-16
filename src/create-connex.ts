import Connex from "@vechain/connex/esm";

type VeWorldConnexWindow = Window & {
  vechain?: {
    newConnexVendor: (genesisId: string) => any
  }
}

export const soloUrlNode = () => {
    //Used to support docker runtime env variables. This string is overrided on container startup using the injected env
    if(process.env.VUE_APP_IS_DOCKER) {
        const soloUrlPlaceholder = 'VUE_APP_SOLO_URL_PLACEHOLDER';
        return soloUrlPlaceholder;
    }
    return process.env.VUE_APP_SOLO_URL;
}

//Needed to support runtime env variables
export const isSoloNode = !!soloUrlNode();
export const nodeUrls = {
  main: "https://mainnet.vechain.org",
  test: "https://testnet.vechain.org",
  solo: soloUrlNode() || "http://localhost:8669",
  custom: "",
};

const genesisIds = {
  main: "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a",
  test: "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127",
  solo: "0x00000000c05a20fbca2bf6ae3affba6af4a74b800b585bf7a4988aba7aea69f6",
}

export const soloGenesis = {
  number: 0,
  id: "0x00000000c05a20fbca2bf6ae3affba6af4a74b800b585bf7a4988aba7aea69f6",
  size: 170,
  parentID:
    "0xffffffff53616c757465202620526573706563742c20457468657265756d2100",
  timestamp: 1530316800,
  gasLimit: 10000000,
  beneficiary: "0x0000000000000000000000000000000000000000",
  gasUsed: 0,
  totalScore: 0,
  txsRoot: "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
  txsFeatures: 0,
  stateRoot:
    "0x93de0ffb1f33bc0af053abc2a87c4af44594f5dcb1cb879dd823686a15d68550",
  receiptsRoot:
    "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
  signer: "0x0000000000000000000000000000000000000000",
  isTrunk: true,
  transactions: [],
};

export const isVeWorldAvailable = !!(window as VeWorldConnexWindow).vechain

// Use runtime casts here because the extension API surface is ahead of the published TS types.
function buildConnex(nodeUrl: string, network: any, genesisId: string): any {
  const vechain = (window as VeWorldConnexWindow).vechain
  if (vechain) {
    const thor = new (Connex as any).Thor({ node: nodeUrl, network })
    const vendor = vechain.newConnexVendor(genesisId)
    return { thor, vendor }
  }
  return new (Connex as any)({ node: nodeUrl, network, signer: 'sync2' })
}

export function createConnexForNetwork(nodeUrl: string, network: any, genesisId: string): any {
  return buildConnex(nodeUrl, network, genesisId)
}

export function createConnex(net: "main" | "test" | "solo"): any {
  const url = nodeUrls[net]
  const network = net === 'solo' ? soloGenesis : net
  const genesisId = genesisIds[net]
  return buildConnex(url, network, genesisId)
}
