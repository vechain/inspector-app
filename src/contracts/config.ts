import { erc20Abi } from "./erc20-abi";
import { erc721Abi } from "./erc721-abi";

type ContractConfig = {
  name: string;
  abi: string | object;
};

const authority: ContractConfig = {
  name: "Authority (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/authority.json",
};

const vtho: ContractConfig = {
  name: "VTHO (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/energy.json",
};

const executor: ContractConfig = {
  name: "Executor (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/executor.json",
};

const staker: ContractConfig = {
  name: "Staker (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/staker.json",
};

const extension: ContractConfig = {
  name: "Extension (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/extension.json",
};

const params: ContractConfig = {
  name: "Params (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/params.json",
};

const prototype: ContractConfig = {
  name: "Prototype (Built-in)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/prototype.json",
};

const b3tr: ContractConfig = {
  name: "VeBetter - B3TR",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-b3tr.json",
};

const b3trGovernor: ContractConfig = {
  name: "VeBetter - Governor",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-b3tr-governor.json",
};

const b3trEmissions: ContractConfig = {
  name: "VeBetter - Emissions",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-emissions.json",
};

const b3trGalaxyMember: ContractConfig = {
  name: "VeBetter - Galaxy Member",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-galaxy-member.json",
};

const b3trTimeLock: ContractConfig = {
  name: "VeBetter - TimeLock",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-timelock.json",
};

const b3trTreasury: ContractConfig = {
  name: "VeBetter - Treasury",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-treasury.json",
};

const b3trVot3: ContractConfig = {
  name: "VeBetter - VOT3",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-vot3.json",
};

const b3trVoterRewards: ContractConfig = {
  name: "VeBetter - VoterRewards",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-voter-rewards.json",
};

const b3trX2EarnApps: ContractConfig = {
  name: "VeBetter - X2EarnApps",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-2-earn-apps.json",
};

const b3trX2EarnRewardsPool: ContractConfig = {
  name: "VeBetter - X2EarnRewardsPool",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-2-earn-rewards-pool.json",
};

const b3trXAllocationPool: ContractConfig = {
  name: "VeBetter - XAllocationPool",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-allocation-pool.json",
};

const b3trXAllocationVoting: ContractConfig = {
  name: "VeBetter - XAllocationVoting",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-allocations-voting.json",
};

const b3trVeBetterPassport: ContractConfig = {
  name: "VeBetter - VeBetterPassport",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-ve-better-passport.json",
};

const b3trDBAPool: ContractConfig = {
  name: "VeBetter - DBAPool",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-dynamic-base-allocations-pool.json",
};

const b3trRelayersRewardsPool: ContractConfig = {
  name: "VeBetter - RelayersRewardsPool",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-relayer-rewards-pool.json",
};

const b3trCreatorNFT: ContractConfig = {
  name: "VeBetter - Creator NFT",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-2-earn-creator.json",
};

const b3trGrantsManager: ContractConfig = {
  name: "VeBetter - GrantsManager",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-grants-manager.json",
};

const stargateNFT: ContractConfig = {
  name: "StarGate NFT",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/StargateNFT.json",
};

const stargate: ContractConfig = {
  name: "StarGate",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/Stargate.json",
};

const smartAccountsFactory: ContractConfig = {
  name: "Smart Account Factory",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/social-login-smart-account-factory.json",
};

const smartAccount: ContractConfig = {
  name: "Smart Account",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/social-login-smart-account.json",
};

const legacyVeChainNodes: ContractConfig = {
  name: "Legacy VeChain Nodes",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/thornode-tokenauction.json",
};

const oracleVeChainEnergy: ContractConfig = {
  name: "Oracle (vechain.energy)",
  abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/oracle.vechain.energy.json",
};

const common = {
  "Enter ERC20 Address": {
    name: "ERC20",
    abi: erc20Abi,
  },
  "Enter ERC721 Address": {
    name: "ERC721",
    abi: erc721Abi,
  },
  "0x0000000000000000000000417574686f72697479": authority,
  "0x0000000000000000000000000000456e65726779": vtho,
  "0x0000000000000000000000004578656375746f72": executor,
  "0x0000000000000000000000457874656e73696f6e": extension,
  "0x0000000000000000000000000000506172616d73": params,
  "0x000000000000000000000050726f746f74797065": prototype,
  "0x00000000000000000000000000005374616b6572": staker,
};

// All available contracts (for showing in built-in list even if not on current network)
export const AllBuiltInContracts: ContractConfig[] = [
  authority,
  vtho,
  executor,
  staker,
  extension,
  params,
  prototype,
  { name: "ERC20", abi: erc20Abi },
  { name: "ERC721", abi: erc721Abi },
  b3tr,
  b3trGovernor,
  b3trEmissions,
  b3trGalaxyMember,
  b3trTimeLock,
  b3trTreasury,
  b3trVot3,
  b3trVoterRewards,
  b3trX2EarnApps,
  b3trX2EarnRewardsPool,
  b3trXAllocationPool,
  b3trXAllocationVoting,
  b3trVeBetterPassport,
  b3trDBAPool,
  b3trRelayersRewardsPool,
  b3trCreatorNFT,
  b3trGrantsManager,
  stargateNFT,
  stargate,
  smartAccountsFactory,
  smartAccount,
  legacyVeChainNodes,
  oracleVeChainEnergy,
];

// genesis ID -> contract address -> ContractConfig
export const ContractConfig: Record<string, Record<string, ContractConfig>> = {
  "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a": {
    ...common,
    "0x5ef79995FE8a89e0812330E4378eB2660ceDe699": b3tr,
    "0x1c65C25fABe2fc1bCb82f253fA0C916a322f777C": b3trGovernor,
    "0xDf94739bd169C84fe6478D8420Bb807F1f47b135": b3trEmissions,
    "0x93B8cD34A7Fc4f53271b9011161F7A2B5fEA9D1F": b3trGalaxyMember,
    "0x7B7EaF620d88E38782c6491D7Ce0B8D8cF3227e4": b3trTimeLock,
    "0xD5903BCc66e439c753e525F8AF2FeC7be2429593": b3trTreasury,
    "0x76Ca782B59C74d088C7D2Cce2f211BC00836c602": b3trVot3,
    "0x838A33AF756a6366f93e201423E1425f67eC0Fa7": b3trVoterRewards,
    "0x8392B7CCc763dB03b47afcD8E8f5e24F9cf0554D": b3trX2EarnApps,
    "0x6Bee7DDab6c99d5B2Af0554EaEA484CE18F52631": b3trX2EarnRewardsPool,
    "0x4191776F05f4bE4848d3f4d587345078B439C7d3": b3trXAllocationPool,
    "0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7": b3trXAllocationVoting,
    "0x35a267671d8EDD607B2056A9a13E7ba7CF53c8b3": b3trVeBetterPassport,
    "0x98c1d097c39969bb5de754266f60d22bd105b368": b3trDBAPool,
    "0x34b56f892c9e977b9ba2e43ba64c27d368ab3c86": b3trRelayersRewardsPool,
    "0xe8e96a768ffd00417d4bd985bec9EcfC6F732a7f": b3trCreatorNFT,
    "0x055d20914657834c914d7c44bf65b566ab4b45a2": b3trGrantsManager,
    "0x1856c533ac2d94340aaa8544d35a5c1d4a21dee7": stargateNFT,
    "0x03c557be98123fdb6fad325328ac6eb77de7248c": stargate,
    "0xc06ad8573022e2be416ca89da47e8c592971679a": smartAccountsFactory,
    "0xb81e9c5f9644dec9e5e3cac86b4461a222072302": legacyVeChainNodes,
    "0x49eC7192BF804Abc289645ca86F1eD01a6C17713": oracleVeChainEnergy,
  },
  "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127": {
    ...common,
    "0x95761346d18244bb91664181bf91193376197088": b3tr,
    "0xc30b4d0837f7e3706749655d8bde0c0f265dd81b": b3trGovernor,
    "0x66898f98409db20ed6a1bf0021334b7897eb0688": b3trEmissions,
    "0x38a59fa7fd7039884465a0ff285b8c4b6fe394ca": b3trGalaxyMember,
    "0x835509222aa67c333a1cbf29bd341e014aba86c9": b3trTimeLock,
    "0x3d531a80c05099c71b02585031f86a2988e0caca": b3trTreasury,
    "0x6e8b4a88d37897fc11f6ba12c805695f1c41f40e": b3trVot3,
    "0x851ef91801899a4e7e4a3174a9300b3e20c957e8": b3trVoterRewards,
    "0x0b54a094b877a25bdc95b4431eaa1e2206b1ddfe": b3trX2EarnApps,
    "0x2d2a2207c68a46fc79325d7718e639d1047b0d8b": b3trX2EarnRewardsPool,
    "0x6f7b4bc19b4dc99005b473b9c45ce2815bbe7533": b3trXAllocationPool,
    "0x8800592c463f0b21ae08732559ee8e146db1d7b2": b3trXAllocationVoting,
    "0x887d9102f0003f1724d8fd5d4fe95a11572fcd77": stargateNFT,
    "0x1E02B2953AdEfEC225cF0Ec49805b1146a4429C1": stargate,
    "0x713b908Bcf77f3E00EFEf328E50b657a1A23AeaF": smartAccountsFactory,
    "0x8dbce5de4c1f1840a47ab10c682aee48e9d06c20": legacyVeChainNodes,
    "0xdcCAaBd81B38e0dEEf4c202bC7F1261A4D9192C6": oracleVeChainEnergy,
  },
};
