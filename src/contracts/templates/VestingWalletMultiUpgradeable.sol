// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// UUPS-upgradeable multi-beneficiary linear vesting. Same behaviour as
/// VestingWalletMulti, but the schedule and beneficiary list are set in
/// `initialize` (not the constructor) and the owner can authorize an upgrade.
contract VestingWalletMultiUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    IERC20 public token;
    uint64 public start;
    uint64 public duration;

    struct Schedule {
        uint128 amount;
        uint128 released;
    }
    mapping(address => Schedule) public schedules;
    address[] public beneficiaries;

    event Released(address indexed beneficiary, uint256 amount);

    error LengthMismatch();
    error BeneficiaryExists();
    error InvalidArgs();
    error NotABeneficiary();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IERC20 token_,
        uint64 startTimestamp,
        uint64 durationSeconds,
        address initialOwner,
        address[] memory beneficiaries_,
        uint256[] memory amounts_
    ) public initializer {
        if (address(token_) == address(0)) revert InvalidArgs();
        if (beneficiaries_.length != amounts_.length) revert LengthMismatch();
        if (beneficiaries_.length == 0) revert InvalidArgs();

        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        token = token_;
        start = startTimestamp;
        duration = durationSeconds;

        for (uint256 i = 0; i < beneficiaries_.length; i++) {
            address b = beneficiaries_[i];
            uint256 a = amounts_[i];
            if (b == address(0) || a == 0) revert InvalidArgs();
            if (schedules[b].amount != 0) revert BeneficiaryExists();
            require(a <= type(uint128).max, "amount overflow");
            schedules[b] = Schedule({amount: uint128(a), released: 0});
            beneficiaries.push(b);
        }
    }

    function scheduleOf(
        address beneficiary
    ) external view returns (uint256 amount, uint256 released) {
        Schedule memory s = schedules[beneficiary];
        return (uint256(s.amount), uint256(s.released));
    }

    function vestedAmount(
        address beneficiary,
        uint64 timestamp
    ) public view returns (uint256) {
        uint256 amt = uint256(schedules[beneficiary].amount);
        if (amt == 0 || timestamp < start) return 0;
        if (timestamp >= start + duration) return amt;
        return (amt * (timestamp - start)) / duration;
    }

    function releasable(address beneficiary) public view returns (uint256) {
        return
            vestedAmount(beneficiary, uint64(block.timestamp)) -
            uint256(schedules[beneficiary].released);
    }

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

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
