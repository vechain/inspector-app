// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// A simple conditional escrow holding native VET between a payer and a
/// beneficiary. An arbiter controls release; after `deadline`, the payer can
/// reclaim funds permissionlessly.
///
/// Lifecycle:
///   - Anyone can fund the escrow by sending VET to it (typically the payer).
///   - Arbiter calls `release()` before deadline to forward funds to beneficiary.
///   - Arbiter (any time) or payer (after deadline) calls `refund()` to return
///     funds to payer.
contract ConditionalEscrow is ReentrancyGuard {
    enum State {
        Active,
        Released,
        Refunded
    }

    address public immutable payer;
    address public immutable beneficiary;
    address public immutable arbiter;
    uint256 public immutable deadline;
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

    constructor(
        address payer_,
        address beneficiary_,
        address arbiter_,
        uint256 deadline_
    ) {
        require(payer_ != address(0), "payer=0");
        require(beneficiary_ != address(0), "beneficiary=0");
        require(arbiter_ != address(0), "arbiter=0");
        require(deadline_ > block.timestamp, "deadline in past");
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

    /// Arbiter forwards the full balance to the beneficiary.
    /// Must be called before the deadline.
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

    /// Arbiter can refund any time; payer can refund only after deadline.
    function refund() external nonReentrant {
        if (state != State.Active) revert WrongState();
        if (msg.sender == arbiter) {
            // Arbiter may refund at any time.
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
}
