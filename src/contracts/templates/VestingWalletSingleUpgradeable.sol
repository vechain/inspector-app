// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {VestingWalletUpgradeable} from "@openzeppelin/contracts-upgradeable/finance/VestingWalletUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// UUPS-upgradeable linear vesting vault for a single beneficiary.
/// Same behaviour as VestingWalletSingle (releases VET + any ERC20s linearly
/// to one beneficiary), but the beneficiary is also the upgrader: only the
/// beneficiary can authorise an upgrade.
contract VestingWalletSingleUpgradeable is
    Initializable,
    VestingWalletUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address beneficiary_,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) public initializer {
        __VestingWallet_init(beneficiary_, startTimestamp, durationSeconds);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
