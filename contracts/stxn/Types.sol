// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct CallObject {
    uint256 salt;
    uint256 amount;
    uint256 gas;
    address addr;
    bytes   callvalue;
    bytes   returnvalue;
    bool    skippable;
    bool    verifiable;
    bool    exposeReturn;
}

struct UserObjective {
    bytes    appId;
    uint256  nonce;
    uint256  tip;
    uint256  chainId;
    uint256  maxFeePerGas;
    uint256  maxPriorityFeePerGas;
    address  sender;
    CallObject[] callObjects;
}

struct AdditionalData {
    bytes32 key;
    bytes   value;
}

interface IApprover {
    function preapprove(UserObjective calldata _userObjective)
        external payable returns (bool);

    function postapprove(
        UserObjective[] calldata _userObjective,
        bytes[] calldata _returnData
    ) external returns (bool);
}
