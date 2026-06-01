// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// Linear vesting vault for many beneficiaries sharing one ERC20 token and
/// one schedule (same start, same duration). Each beneficiary has their own
/// total allocation. Anyone can call `release(beneficiary)` to forward the
/// beneficiary's vested-but-unreleased portion.
///
/// Schedules are locked at construction — the deployer must enumerate every
/// beneficiary and their allocation upfront and fund the contract with at
/// least `sum(amounts)` tokens before tokens become releasable.
contract VestingWalletMulti {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint64 public immutable start;
    uint64 public immutable duration;

    struct Schedule {
        uint128 amount; // total allocation
        uint128 released; // already released portion
    }
    mapping(address => Schedule) public schedules;
    address[] public beneficiaries;

    event Released(address indexed beneficiary, uint256 amount);

    error LengthMismatch();
    error BeneficiaryExists();
    error InvalidArgs();
    error NotABeneficiary();

    constructor(
        IERC20 token_,
        uint64 startTimestamp,
        uint64 durationSeconds,
        address[] memory beneficiaries_,
        uint256[] memory amounts_
    ) {
        if (address(token_) == address(0)) revert InvalidArgs();
        if (beneficiaries_.length != amounts_.length) revert LengthMismatch();
        if (beneficiaries_.length == 0) revert InvalidArgs();

        token = token_;
        start = startTimestamp;
        duration = durationSeconds;

        for (uint256 i = 0; i < beneficiaries_.length; i++) {
            address b = beneficiaries_[i];
            uint256 a = amounts_[i];
            if (b == address(0) || a == 0) revert InvalidArgs();
            if (schedules[b].amount != 0) revert BeneficiaryExists();
            // safe: a fits in uint128 for any realistic token supply
            require(a <= type(uint128).max, "amount overflow");
            schedules[b] = Schedule({amount: uint128(a), released: 0});
            beneficiaries.push(b);
        }
    }

    /// Total schedule for a beneficiary (zero if not registered).
    function scheduleOf(
        address beneficiary
    ) external view returns (uint256 amount, uint256 released) {
        Schedule memory s = schedules[beneficiary];
        return (uint256(s.amount), uint256(s.released));
    }

    /// Cumulative vested amount at `timestamp` for `beneficiary`.
    function vestedAmount(
        address beneficiary,
        uint64 timestamp
    ) public view returns (uint256) {
        uint256 amt = uint256(schedules[beneficiary].amount);
        if (amt == 0 || timestamp < start) return 0;
        if (timestamp >= start + duration) return amt;
        return (amt * (timestamp - start)) / duration;
    }

    /// Releasable (vested - already released) for `beneficiary` right now.
    function releasable(address beneficiary) public view returns (uint256) {
        return
            vestedAmount(beneficiary, uint64(block.timestamp)) -
            uint256(schedules[beneficiary].released);
    }

    /// Forward the releasable portion to `beneficiary`. Anyone can call.
    function release(address beneficiary) external {
        Schedule storage s = schedules[beneficiary];
        if (s.amount == 0) revert NotABeneficiary();
        uint256 amount = vestedAmount(beneficiary, uint64(block.timestamp)) -
            uint256(s.released);
        if (amount == 0) return;
        s.released = uint128(uint256(s.released) + amount);
        token.safeTransfer(beneficiary, amount);
        emit Released(beneficiary, amount);
    }

    function beneficiariesCount() external view returns (uint256) {
        return beneficiaries.length;
    }
}
