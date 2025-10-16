// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ISTXNCallBreaker {
    struct CallObject {
        uint256 salt;
        uint256 amount;
        uint256 gas;
        address addr;
        bytes callvalue;
        bytes returnvalue;
        bool skippable;
        bool verifiable;
        bool exposeReturn;
    }
    
    struct UserObjective {
        bytes appId;
        uint256 nonce;
        uint256 tip;
        uint256 chainId;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        address sender;
        bytes signature;
        CallObject[] callObjects;
    }
    
    struct AdditionalData {
        bytes32 key;
        bytes value;
    }
    
    function pushUserObjective(
        UserObjective calldata userObjective,
        AdditionalData[] calldata additionalData
    ) external payable returns (bytes32 requestId);
}

contract ImprovedBaseDepositEscrow {
    event DepositRequested(
        bytes32 indexed depositId,
        address indexed user,
        uint256 amount,
        uint256 minReceive,
        uint256 feeCap,
        uint256 targetChainId,
        address targetToken
    );

    event SolverClaim(
        bytes32 indexed depositId,
        address indexed solver,
        uint256 amount,
        bytes32 proofHash
    );

    struct Deposit {
        address user;
        uint256 amount;
        uint256 minReceive;
        uint256 feeCap;
        uint256 targetChainId;
        address targetToken;
        bool claimed;
        uint256 timestamp;
    }

    IERC20 public immutable USDC;
    ISTXNCallBreaker public immutable STXN_CALLBREAKER;
    address public immutable OWNER;
    
    mapping(bytes32 => Deposit) public deposits;
    mapping(address => bool) public authorizedSolvers;
    
    uint256 public constant TIMEOUT_PERIOD = 24 hours;

    modifier onlyOwner() {
        require(msg.sender == OWNER, "Not owner");
        _;
    }

    modifier onlyAuthorizedSolver() {
        require(authorizedSolvers[msg.sender], "Not authorized solver");
        _;
    }

    constructor(address usdc, address stxnCallBreaker) {
        USDC = IERC20(usdc);
        STXN_CALLBREAKER = ISTXNCallBreaker(stxnCallBreaker);
        OWNER = msg.sender;
    }

    /// @notice Deposit USDC for cross-chain transfer
    function depositFor(
        address user,
        uint256 amount,
        uint256 minReceive,
        uint256 feeCap,
        uint256 targetChainId,
        address targetToken,
        bytes32 nonce
    ) external {
        // Transfer USDC to this contract (not VAULT!)
        require(USDC.transferFrom(user, address(this), amount), "Transfer failed");
        
        bytes32 depositId = keccak256(
            abi.encode(user, amount, minReceive, feeCap, targetChainId, targetToken, nonce, block.chainid, address(this))
        );
        
        deposits[depositId] = Deposit({
            user: user,
            amount: amount,
            minReceive: minReceive,
            feeCap: feeCap,
            targetChainId: targetChainId,
            targetToken: targetToken,
            claimed: false,
            timestamp: block.timestamp
        });

        emit DepositRequested(depositId, user, amount, minReceive, feeCap, targetChainId, targetToken);
        
        // Push objective to STXN CallBreaker
        _pushSTXNObjective(depositId, user, minReceive, targetChainId, targetToken);
    }

    /// @notice Solver claims deposit after providing cross-chain service
    function solverClaim(
        bytes32 depositId,
        bytes32 proofHash // Proof of cross-chain execution
    ) external onlyAuthorizedSolver {
        Deposit storage deposit = deposits[depositId];
        require(!deposit.claimed, "Already claimed");
        require(deposit.amount > 0, "Invalid deposit");
        
        // In production: Verify proof of cross-chain execution
        // For now: Trust authorized solvers
        
        deposit.claimed = true;
        
        // Transfer USDC to solver
        require(USDC.transfer(msg.sender, deposit.amount), "Transfer failed");
        
        emit SolverClaim(depositId, msg.sender, deposit.amount, proofHash);
    }

    /// @notice Emergency withdrawal after timeout
    function emergencyWithdraw(bytes32 depositId) external {
        Deposit storage deposit = deposits[depositId];
        require(deposit.user == msg.sender, "Not deposit owner");
        require(!deposit.claimed, "Already claimed");
        require(block.timestamp > deposit.timestamp + TIMEOUT_PERIOD, "Timeout not reached");
        
        deposit.claimed = true;
        
        // Return USDC to user
        require(USDC.transfer(deposit.user, deposit.amount), "Transfer failed");
    }

    /// @notice Add authorized solver
    function addSolver(address solver) external onlyOwner {
        authorizedSolvers[solver] = true;
    }

    /// @notice Remove authorized solver
    function removeSolver(address solver) external onlyOwner {
        authorizedSolvers[solver] = false;
    }

    /// @notice Push objective to STXN CallBreaker
    function _pushSTXNObjective(
        bytes32 depositId,
        address user,
        uint256 minReceive,
        uint256 targetChainId,
        address targetToken
    ) internal {
        // Create STXN objective for cross-chain execution
        // This would coordinate with solvers on target chain
        
        // For now: Log the objective (would be real STXN call in production)
        // STXN_CALLBREAKER.pushUserObjective(...);
    }

    /// @notice Get contract's USDC balance
    function getBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /// @notice Get deposit details
    function getDeposit(bytes32 depositId) external view returns (Deposit memory) {
        return deposits[depositId];
    }
}
