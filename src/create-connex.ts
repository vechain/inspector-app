import Connex from "@vechain/connex/esm";

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
  main: "https://explore-mainnet.veblocks.net",
  test: "https://explore-testnet.veblocks.net",
  solo: soloUrlNode() || "http://localhost:8669",
  custom: "",
};

const soloGenesis = {
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

export function createConnex(net?: "main" | "test" | "solo") {
  if (net) {
    // net specified
    const url = nodeUrls[net];
    if (net == "solo") {
      return new Connex({ node: url, network: soloGenesis });
}
    return new Connex({ node: url, network: net });
  } else {
    const injected = (window as any).connex;
    // net unspecified
    if (injected) {
      return new Connex({ node: "", network: injected.thor.genesis });
    } else {
      // defaults to main net, or soloUrl if solo is provided
      if (isSoloNode) {
        return new Connex({ node: nodeUrls.solo, network: soloGenesis });
      }
      return new Connex({ node: nodeUrls.main });
    }
  }
}
