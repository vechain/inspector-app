// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// UUPS-upgradeable variant of the conditional escrow. The escrow owner
/// (set at initialize) controls upgrades; the arbiter still controls release
/// and refund.
contract ConditionalEscrowUpgradeable is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    enum State {
        Active,
        Released,
        Refunded
    }

    address public payer;
    address public beneficiary;
    address public arbiter;
    uint256 public deadline;
    State public state;

    event Funded(address indexed from, uint256 amount);
    event Released(uint256 amount);
    event Refunded(uint256 amount);

    error WrongState();
    error NotArbiter();
    error NotPayerOrArbiter();
    error DeadlineReached();
    error DeadlineNotReached();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address payer_,
        address beneficiary_,
        address arbiter_,
        uint256 deadline_,
        address initialOwner
    ) public initializer {
        require(payer_ != address(0), "payer=0");
        require(beneficiary_ != address(0), "beneficiary=0");
        require(arbiter_ != address(0), "arbiter=0");
        require(deadline_ > block.timestamp, "deadline in past");
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        payer = payer_;
        beneficiary = beneficiary_;
        arbiter = arbiter_;
        deadline = deadline_;
        state = State.Active;
    }

    receive() external payable {
        if (state != State.Active) revert WrongState();
        emit Funded(msg.sender, msg.value);
    }

    function release() external nonReentrant {
        if (msg.sender != arbiter) revert NotArbiter();
        if (state != State.Active) revert WrongState();
        if (block.timestamp > deadline) revert DeadlineReached();
        state = State.Released;
        uint256 bal = address(this).balance;
        (bool ok, ) = payable(beneficiary).call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit Released(bal);
    }

    function refund() external nonReentrant {
        if (state != State.Active) revert WrongState();
        if (msg.sender == arbiter) {
            // ok any time
        } else if (msg.sender == payer) {
            if (block.timestamp <= deadline) revert DeadlineNotReached();
        } else {
            revert NotPayerOrArbiter();
        }
        state = State.Refunded;
        uint256 bal = address(this).balance;
        (bool ok, ) = payable(payer).call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit Refunded(bal);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
