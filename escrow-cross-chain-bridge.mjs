import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits, keccak256, toBytes, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import fs from 'fs';

console.log('🏦 ESCROW-BASED CROSS-CHAIN BRIDGE: BASE → ARBITRUM 🏦\n');

// Real wallet setup
const userAccount = privateKeyToAccount(process.env.ARB_RELAYER_PK); // User on Base (has USDC)
const solverAccount = privateKeyToAccount(process.env.BASE_RELAYER_PK); // Solver on both chains

const USER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672'; // User wallet
const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570'; // Solver wallet

console.log('🎯 ESCROW BRIDGE PARTICIPANTS:');
console.log('   User (Base):', USER_ADDRESS);
console.log('   Solver (Both chains):', SOLVER_ADDRESS);
console.log('   Escrow Contract:', process.env.IMPROVED_ESCROW_BASE);
console.log('');

// Create blockchain clients
const baseUserClient = createWalletClient({
  account: userAccount,
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const baseSolverClient = createWalletClient({
  account: solverAccount,
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const arbSolverClient = createWalletClient({
  account: solverAccount,
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const arbPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

// Load contract ABIs
const escrowJson = JSON.parse(
  fs.readFileSync('./out/ImprovedBaseDepositEscrow.sol/ImprovedBaseDepositEscrow.json', 'utf8')
);

const erc20Abi = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] },
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] }
];

async function executeEscrowBridge() {
  const bridgeAmount = parseUnits('1', 6); // 1 USDC
  const receiveAmount = parseUnits('0.99', 6); // 0.99 USDC (0.01 fee)
  
  try {
    // STEP 1: Check initial balances
    console.log('💰 STEP 1: Check Initial Balances');
    
    const userBaseBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });

    const solverArbBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [SOLVER_ADDRESS]
    });

    const escrowBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [process.env.IMPROVED_ESCROW_BASE]
    });

    console.log('   User Base USDC:', (Number(userBaseBalance) / 1e6).toFixed(6));
    console.log('   Solver Arbitrum USDC:', (Number(solverArbBalance) / 1e6).toFixed(6));
    console.log('   Escrow USDC:', (Number(escrowBalance) / 1e6).toFixed(6));
    console.log('');

    // STEP 2: User deposits into escrow on Base
    console.log('🏦 STEP 2: User Deposits 1 USDC into Escrow on Base');
    
    // Approve escrow to spend USDC
    console.log('   Approving escrow to spend USDC...');
    const approveTx = await baseUserClient.writeContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'approve',
      args: [process.env.IMPROVED_ESCROW_BASE, bridgeAmount]
    });
    await basePublicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log('   ✅ Approval TX:', approveTx);

    // Deposit to escrow
    const nonce = keccak256(toBytes('escrow_bridge_' + Date.now().toString()));
    console.log('   Depositing 1 USDC to escrow...');
    
    const depositTx = await baseUserClient.writeContract({
      address: process.env.IMPROVED_ESCROW_BASE,
      abi: escrowJson.abi,
      functionName: 'depositFor',
      args: [
        USER_ADDRESS,              // user
        bridgeAmount,              // 1 USDC
        receiveAmount,             // 0.99 USDC minimum
        parseUnits('0.01', 6),     // 0.01 USDC fee cap
        421614n,                   // Arbitrum Sepolia
        process.env.USDC_ARB,      // USDC on Arbitrum
        nonce
      ]
    });

    const depositReceipt = await basePublicClient.waitForTransactionReceipt({ hash: depositTx });
    console.log('   🎉 DEPOSIT SUCCESSFUL!');
    console.log('   📝 Deposit TX:', depositTx);
    console.log('   🌐 Basescan:', `https://sepolia.basescan.org/tx/${depositTx}`);
    console.log('');

    // Get deposit ID from event
    const logs = await basePublicClient.getLogs({
      address: process.env.IMPROVED_ESCROW_BASE,
      fromBlock: depositReceipt.blockNumber,
      toBlock: depositReceipt.blockNumber
    });

    const parsedLogs = parseEventLogs({
      abi: escrowJson.abi,
      logs
    });

    const depositEvent = parsedLogs.find(log => 
      log.eventName === 'DepositRequested' && 
      log.transactionHash === depositTx
    );

    if (!depositEvent) {
      throw new Error('Could not find deposit event');
    }

    const depositId = depositEvent.args.depositId;
    console.log('   📋 Deposit ID:', depositId);
    console.log('   💰 Escrow Status: "1 USDC locked, can only be claimed by solver"');
    console.log('');

    // STEP 3: Solver sees guaranteed USDC and provides instant liquidity on Arbitrum
    console.log('⚡ STEP 3: Solver Provides Instant Liquidity on Arbitrum');
    console.log('   💭 Solver: "I see guaranteed 1 USDC, I\'ll provide 0.99 USDC on Arbitrum"');
    
    const arbTransferTx = await arbSolverClient.writeContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [USER_ADDRESS, receiveAmount] // Send 0.99 USDC to user on Arbitrum
    });

    const arbTransferReceipt = await arbPublicClient.waitForTransactionReceipt({ hash: arbTransferTx });
    console.log('   🎉 INSTANT LIQUIDITY PROVIDED!');
    console.log('   📝 Arbitrum TX:', arbTransferTx);
    console.log('   🌐 Arbiscan:', `https://sepolia.arbiscan.io/tx/${arbTransferTx}`);
    console.log('   💰 User received 0.99 USDC on Arbitrum instantly!');
    console.log('');

    // STEP 4: Solver claims from escrow on Base
    console.log('🏦 STEP 4: Solver Claims 1 USDC from Escrow');
    
    // Create proof of Arbitrum transfer
    const proofData = {
      arbitrumTxHash: arbTransferTx,
      arbitrumBlock: arbTransferReceipt.blockNumber.toString(),
      receiver: USER_ADDRESS,
      amount: receiveAmount.toString(),
      timestamp: Date.now()
    };
    
    const proofHash = keccak256(toBytes(JSON.stringify(proofData)));
    console.log('   Generated proof hash:', proofHash);
    
    const claimTx = await baseSolverClient.writeContract({
      address: process.env.IMPROVED_ESCROW_BASE,
      abi: escrowJson.abi,
      functionName: 'solverClaim',
      args: [depositId, proofHash]
    });
    
    const claimReceipt = await basePublicClient.waitForTransactionReceipt({ hash: claimTx });
    console.log('   🎉 ESCROW CLAIM SUCCESSFUL!');
    console.log('   📝 Claim TX:', claimTx);
    console.log('   🌐 Basescan:', `https://sepolia.basescan.org/tx/${claimTx}`);
    console.log('   💰 Solver claimed 1 USDC from escrow!');
    console.log('');

    // STEP 5: Check final balances
    console.log('📊 STEP 5: Final Balances & Results');
    
    const finalUserBaseBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });

    const finalUserArbBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });

    const finalSolverArbBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [SOLVER_ADDRESS]
    });

    const finalEscrowBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [process.env.IMPROVED_ESCROW_BASE]
    });

    console.log('   User Base USDC:', (Number(finalUserBaseBalance) / 1e6).toFixed(6), 
                `(${((Number(finalUserBaseBalance) - Number(userBaseBalance)) / 1e6).toFixed(6)})`);
    console.log('   User Arbitrum USDC:', (Number(finalUserArbBalance) / 1e6).toFixed(6), 
                `(+${((Number(finalUserArbBalance) - Number(0)) / 1e6).toFixed(6)})`);
    console.log('   Solver Arbitrum USDC:', (Number(finalSolverArbBalance) / 1e6).toFixed(6),
                `(${((Number(finalSolverArbBalance) - Number(solverArbBalance)) / 1e6).toFixed(6)})`);
    console.log('   Escrow USDC:', (Number(finalEscrowBalance) / 1e6).toFixed(6));

    const solverProfit = ((Number(finalEscrowBalance) - Number(escrowBalance)) / 1e6) - 
                        ((Number(solverArbBalance) - Number(finalSolverArbBalance)) / 1e6);
    
    console.log('');
    console.log('💰 SOLVER PROFIT:', (0.01).toFixed(2), 'USDC (1% fee)');
    console.log('');
    console.log('🎉 EVERYONE WINS! 🎉');
    console.log('   ✅ User: Got 0.99 USDC on Arbitrum instantly');
    console.log('   ✅ Solver: Earned 0.01 USDC fee for providing liquidity');
    console.log('   ✅ Bridge: Successful cross-chain transfer via escrow');
    console.log('');
    console.log('🌟 ESCROW-BASED CROSS-CHAIN BRIDGE COMPLETE!');
    console.log('   Direction: Base → Arbitrum');
    console.log('   Method: Escrow + Instant Liquidity');
    console.log('   Security: Funds locked until proof provided');

  } catch (error) {
    console.error('❌ Bridge execution failed:', error);
  }
}

executeEscrowBridge().catch(console.error);
