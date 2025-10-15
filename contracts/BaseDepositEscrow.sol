// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract BaseDepositEscrow {
    event DepositRequested(
        bytes32 indexed depositId,
        address indexed user,
        uint256 amount,        // USDC (6dp)
        uint256 minReceive,    // 9_800_000 for 9.8 USDC
        uint256 feeCap         // 200_000 for 0.2 USDC
    );

    IERC20 public immutable USDC;
    address public immutable VAULT;

    /// @dev Safe transfer function that handles tokens that don't return a value
    function _safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        bytes memory data = abi.encodeWithSelector(token.transferFrom.selector, from, to, amount);
        
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "Transfer failed");
        
        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "Transfer returned false");
        }
    }

    constructor(address usdc, address vault) {
        USDC = IERC20(usdc);
        VAULT = vault;
    }

    /// @notice Pull-based deposit on behalf of `user`.
    /// Anyone can call if the user has approved this contract to spend their USDC.
    function depositFor(
        address user,
        uint256 amount,
        uint256 minReceive,
        uint256 feeCap,
        bytes32 nonce
    ) external {
        _safeTransferFrom(USDC, user, VAULT, amount);
        bytes32 depositId = keccak256(
            abi.encode(user, amount, minReceive, feeCap, nonce, block.chainid, address(this))
        );
        emit DepositRequested(depositId, user, amount, minReceive, feeCap);
    }
}
