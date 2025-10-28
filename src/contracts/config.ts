import { erc20Abi } from "./erc20-abi"
import { erc721Abi } from "./erc721-abi"

type ContractConfig = {
    name: string
    abi: string | object
}

const authority: ContractConfig = {
    name: "Authority (Built-in)",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/authority.json"
}

const vtho: ContractConfig = {
    name: "VTHO (Built-in)",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/energy.json"
}

const executor: ContractConfig = {
    name: "Executor (Built-in)",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/executor.json"
}

const extension: ContractConfig = {
    name: "Extension (Built-in)",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/extension.json"
}

const params: ContractConfig = {
    name: "Params (Built-in)",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/params.json"
}

const prototype: ContractConfig = {
    name: "Prototype (Built-in)",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/prototype.json"
}

const b3tr: ContractConfig = {
    name: "B3TR",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-b3tr.json"
}

const b3trGovernor: ContractConfig = {
    name: "B3TR - Governor",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-b3tr-governor.json"
}

const b3trEmissions: ContractConfig = {
    name: "B3TR - Emissions",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-emissions.json"
}

const b3trGalaxyMember: ContractConfig = {
    name: "B3TR - Galaxy Member",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-galaxy-member.json"
}

const b3trTimeLock: ContractConfig = {
    name: "B3TR - TimeLock",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-timelock.json"
}

const b3trTreasury: ContractConfig = {
    name: "B3TR - Treasury",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-treasury.json"
}

const b3trVot3: ContractConfig = {
    name: "VOT3",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-vot3.json"
}

const b3trVoterRewards: ContractConfig = {
    name: "B3TR - VoterRewards",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-voter-rewards.json"
}

const b3trX2EarnApps: ContractConfig = {
    name: "B3TR - X2EarnApps",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-2-earn-apps.json"
}

const b3trX2EarnRewardsPool: ContractConfig = {
    name: "B3TR - X2EarnRewardsPool",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-2-earn-rewards-pool.json"
}

const b3trXAllocationPool: ContractConfig = {
    name: "B3TR - XAllocationPool",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-allocation-pool.json"
}

const b3trXAllocationVoting: ContractConfig = {
    name: "B3TR - XAllocationVoting",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-x-allocations-voting.json"
}

const b3trVeBetterPassport: ContractConfig = {
    name: "B3TR - VeBetterPassport",
    abi: "https://raw.githubusercontent.com/vechain/b32/refs/heads/master/ABIs/VeBetterDAO-ve-better-passport.json"
}

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
}

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
    },
    "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127": {
        ...common,
        "0xbf64cf86894Ee0877C4e7d03936e35Ee8D8b864F": b3tr,
        "0xDF5E114D391CAC840529802fe8D01f6bdeBE41eC": b3trGovernor,
        "0x148d21032F4a7b4aeF236E2E9C0c5bF62d10f8EB": b3trEmissions,
        "0xCf73039913e05aa1838d5869E72290d2b454C1E8": b3trGalaxyMember,
        "0x30ee94F303643902a68aD8A7A6456cA69d763192": b3trTimeLock,
        "0x039893EBe092A2D22B08E2b029735D211bfF7F50": b3trTreasury,
        "0xa704c45971995467696EE9544Da77DD42Bc9706E": b3trVot3,
        "0x2E47fc4aabB3403037fB5E1f38995E7a91Ce8Ed2": b3trVoterRewards,
        "0xcB23Eb1bBD5c07553795b9538b1061D0f4ABA153": b3trX2EarnApps,
        "0x5F8f86B8D0Fa93cdaE20936d150175dF0205fB38": b3trX2EarnRewardsPool,
        "0x9B9CA9D0C41Add1d204f90BA0E9a6844f1843A84": b3trXAllocationPool,
        "0x5859ff910d8b0c127364c98E24233b0af7443c1c": b3trXAllocationVoting,
    }
}