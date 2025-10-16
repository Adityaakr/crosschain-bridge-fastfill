// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UserObjective} from "./Solver + CallBreaker/Types.sol";

/// @notice Minimal post-approve that enforces (after - before) >= minReceive (6dp).
contract ArbPostApprove {
    uint256 public immutable minReceive; // e.g., 9_800_000 for 9.8 USDC

    constructor(uint256 _minReceive) {
        minReceive = _minReceive;
    }

    /// @dev ret[0] = before balance (bytes-encoded uint256)
    ///      ret[last] = after balance
    ///      If there are intermediate calls, they are ignored here.
    function postapprove(UserObjective[] calldata, bytes[] calldata ret) external view returns (bool) {
        require(ret.length >= 2, "insufficient return data");
        uint256 beforeBal = abi.decode(ret[0], (uint256));
        uint256 afterBal  = abi.decode(ret[ret.length - 1], (uint256));
        return (afterBal - beforeBal) >= minReceive;
    }
}
