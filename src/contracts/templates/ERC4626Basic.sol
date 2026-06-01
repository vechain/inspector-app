// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// A standard ERC4626 tokenized vault that wraps an underlying ERC20 asset.
/// Depositors mint shares; redeemers burn shares for the asset. The
/// shares-to-assets ratio drifts as the vault's asset balance accrues yield
/// from any external source (e.g. interest, fees, manual transfers).
contract ERC4626Basic is ERC4626, Ownable {
    constructor(
        IERC20 asset_,
        string memory shareName,
        string memory shareSymbol,
        address initialOwner
    ) ERC20(shareName, shareSymbol) ERC4626(asset_) Ownable(initialOwner) {}
}
