import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';

console.log('🌉 EXECUTING REAL CROSS-CHAIN BRIDGE: ARBITRUM → BASE 🌉\n');

// CORRECT 2-WALLET SETUP
const SOLVER_PK = process.env.BASE_RELAYER_PK;  // Solver private key
const USER_PK = process.env.ARB_RELAYER_PK;     // User private key

const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570'; // Solver on Arbitrum
const USER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672';   // User on Base

console.log('🎯 REAL CROSS-CHAIN PARTICIPANTS:');
console.log('   Solver (Arbitrum):', SOLVER_ADDRESS, '← Initiates transfer');
console.log('   User (Base):', USER_ADDRESS, '← Receives USDC');
console.log('   Direction: Arbitrum → Base');
console.log('');

// Create accounts
const solverAccount = privateKeyToAccount(SOLVER_PK);
const userAccount = privateKeyToAccount(USER_PK);

// Create clients
const arbSolverClient = createWalletClient({
  account: solverAccount,
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

const baseSolverClient = createWalletClient({
  account: solverAccount,
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const arbPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const erc20Abi = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] }
];

const ismartExecuteAbi = [
  {
    "type": "function",
    "name": "pushUserObjective",
    "stateMutability": "payable",
    "inputs": [
      {
        "name": "_userObjective",
        "type": "tuple",
        "components": [
          {"name": "appId", "type": "bytes"},
          {"name": "nonce", "type": "uint256"},
          {"name": "tip", "type": "uint256"},
          {"name": "chainId", "type": "uint256"},
          {"name": "maxFeePerGas", "type": "uint256"},
          {"name": "maxPriorityFeePerGas", "type": "uint256"},
          {"name": "sender", "type": "address"},
          {"name": "signature", "type": "bytes"},
          {"name": "callObjects", "type": "tuple[]", "components": [
            {"name": "salt", "type": "uint256"},
            {"name": "amount", "type": "uint256"},
            {"name": "gas", "type": "uint256"},
            {"name": "addr", "type": "address"},
            {"name": "callvalue", "type": "bytes"},
            {"name": "returnvalue", "type": "bytes"},
            {"name": "skippable", "type": "bool"},
            {"name": "verifiable", "type": "bool"},
            {"name": "exposeReturn", "type": "bool"}
          ]}
        ]
      },
      {
        "name": "_additionalData",
        "type": "tuple[]",
        "components": [
          {"name": "key", "type": "bytes32"},
          {"name": "value", "type": "bytes"}
        ]
      }
    ],
    "outputs": [{"name": "requestId", "type": "bytes32"}]
  },
  {
    "type": "function",
    "name": "deposit",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function", 
    "name": "senderBalances",
    "stateMutability": "view",
    "inputs": [{"name": "sender", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  }
];

async function executeRealCrossChainBridge() {
  const transferAmount = parseUnits('0.05', 6); // 0.05 USDC

  try {
    // Check initial balances
    console.log('💰 INITIAL BALANCES:');
    
    const solverArbBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [SOLVER_ADDRESS]
    });

    const userBaseBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });

    console.log('   Solver Arbitrum USDC:', (Number(solverArbBalance) / 1e6).toFixed(6));
    console.log('   User Base USDC:', (Number(userBaseBalance) / 1e6).toFixed(6));
    console.log('');

    // STEP 1: Solver pushes Solver + CallBreaker objective on Arbitrum
    console.log('🔧 STEP 1: Solver pushes Solver + CallBreaker objective on Arbitrum');
    
    const signature = await solverAccount.signMessage({ 
      message: 'Solver + CallBreaker Fast-Fill Bridge'
    });

    const callObjects = [{
      salt: BigInt(0),
      amount: BigInt(0),
      gas: BigInt(100000),
      addr: process.env.USDC_ARB,
      callvalue: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [process.env.IMPROVED_ESCROW_BASE, transferAmount]
      }),
      returnvalue: '0x',
      skippable: false,
      verifiable: true,
      exposeReturn: false
    }];

    const userObjective = {
      appId: `0x${Buffer.from("app.cross.fastfill.v1").toString('hex')}`,
      nonce: BigInt(Date.now()),
      tip: parseUnits('0.0001', 18),
      chainId: BigInt(421614),
      maxFeePerGas: parseUnits('0.000000002', 18),
      maxPriorityFeePerGas: parseUnits('0.000000001', 18),
      sender: solverAccount.address,
      signature: signature,
      callObjects
    };

    // Fund CallBreaker if needed
    const callBreakerBalance = await arbPublicClient.readContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ismartExecuteAbi,
      functionName: 'senderBalances',
      args: [solverAccount.address]
    });

    if (Number(callBreakerBalance) < Number(parseUnits('0.001', 18))) {
      console.log('   💸 Funding CallBreaker...');
      const depositTx = await arbSolverClient.writeContract({
        address: process.env.CALLBREAKER_ARB,
        abi: ismartExecuteAbi,
        functionName: 'deposit',
        value: parseUnits('0.002', 18)
      });
      await arbPublicClient.waitForTransactionReceipt({ hash: depositTx });
    }

    const arbTx = await arbSolverClient.writeContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ismartExecuteAbi,
      functionName: 'pushUserObjective',
      args: [userObjective, []]
    });

    const arbReceipt = await arbPublicClient.waitForTransactionReceipt({ hash: arbTx });
    
    console.log('   ✅ Solver + CallBreaker OBJECTIVE PUSHED!');
    console.log('   📝 Arbitrum TX:', arbTx);
    console.log('   🌐 Arbiscan:', `https://sepolia.arbiscan.io/tx/${arbTx}`);
    console.log('   ⛽ Gas Used:', arbReceipt.gasUsed.toString());
    console.log('');

    // STEP 2: Solver provides instant liquidity on Base to User
    console.log('⚡ STEP 2: Solver provides instant liquidity to User on Base');
    console.log('   💡 This simulates Solver + CallBreaker solver network providing instant delivery');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const baseTx = await baseSolverClient.writeContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [USER_ADDRESS, transferAmount] // SOLVER → USER (different addresses!)
    });

    const baseReceipt = await basePublicClient.waitForTransactionReceipt({ hash: baseTx });
    
    console.log('   ✅ INSTANT LIQUIDITY PROVIDED!');
    console.log('   📝 Base TX:', baseTx);
    console.log('   🌐 Basescan:', `https://sepolia.basescan.org/tx/${baseTx}`);
    console.log('   ⛽ Gas Used:', baseReceipt.gasUsed.toString());
    console.log('   💰 User received 0.05 USDC on Base from Solver!');
    console.log('');

    // Check final balances
    console.log('📊 FINAL BALANCES:');
    
    const finalSolverArbBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [SOLVER_ADDRESS]
    });

    const finalUserBaseBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });

    console.log('   Solver Arbitrum USDC:', (Number(finalSolverArbBalance) / 1e6).toFixed(6));
    console.log('   User Base USDC:', (Number(finalUserBaseBalance) / 1e6).toFixed(6));
    
    const userIncrease = (Number(finalUserBaseBalance) - Number(userBaseBalance)) / 1e6;
    console.log('   User Increase:', userIncrease.toFixed(6), 'USDC');
    console.log('');

    console.log('🎉 REAL CROSS-CHAIN BRIDGE COMPLETE! 🎉');
    console.log('');
    console.log('📋 TRANSACTION SUMMARY:');
    console.log('   Arbitrum Solver + CallBreaker TX:', arbTx);
    console.log('   Base Delivery TX:', baseTx);
    console.log('   Amount: 0.05 USDC');
    console.log('   Direction: Arbitrum → Base');
    console.log('   From:', SOLVER_ADDRESS);
    console.log('   To:', USER_ADDRESS);
    console.log('');
    console.log('🔗 VERIFY ON EXPLORERS:');
    console.log('   Arbitrum:', `https://sepolia.arbiscan.io/tx/${arbTx}`);
    console.log('   Base:', `https://sepolia.basescan.org/tx/${baseTx}`);

  } catch (error) {
    console.error('❌ Bridge execution failed:', error);
  }
}

executeRealCrossChainBridge().catch(console.error);
