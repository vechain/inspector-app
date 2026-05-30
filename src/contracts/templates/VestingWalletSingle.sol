// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";

/// Linear vesting vault for a single beneficiary.
/// Holds VET (native) and any number of ERC20 tokens; releases linearly between
/// `startTimestamp` and `startTimestamp + durationSeconds`. The beneficiary is
/// also the contract's owner (per OpenZeppelin's VestingWallet design).
///
/// Public surface:
///   - release() / release(address token) — anyone calls; forwards vested
///     funds to the beneficiary.
///   - releasable() / releasable(address token) — preview the claimable amount.
///   - vestedAmount(uint64) / vestedAmount(address, uint64) — schedule preview
///     at an arbitrary timestamp.
contract VestingWalletSingle is VestingWallet {
    constructor(
        address beneficiary_,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) VestingWallet(beneficiary_, startTimestamp, durationSeconds) {}
}
