import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';

console.log('🏦 ESCROW CROSS-CHAIN BRIDGE CONCEPT 🏦\n');

const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const arbPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

const erc20Abi = [
  { 'type':'function', 'name':'balanceOf', 'stateMutability':'view', 'inputs':[{'name':'account','type':'address'}], 'outputs':[{'name':'','type':'uint256'}] }
];

// Addresses
const USER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672';
const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570';
const ESCROW_ADDRESS = '0xc1e96b02e2e1d6bcf0d77c97df369fe8e9da1816';

console.log('🎯 ESCROW BRIDGE FLOW:');
console.log('   1. User deposits 1 USDC into escrow on Base');
console.log('   2. Escrow: "1 USDC locked, can only be claimed by solver"');
console.log('   3. Solver: "I see guaranteed 1 USDC, I\'ll provide 0.99 USDC on Arbitrum"');
console.log('   4. Solver claims the 1 USDC from escrow');
console.log('   5. Everyone wins! 🎉');
console.log('');

try {
  // Check current balances
  console.log('💰 CURRENT BALANCES:');
  
  const userBaseBalance = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [USER_ADDRESS]
  });

  const userArbBalance = await arbPublicClient.readContract({
    address: process.env.USDC_ARB,
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
    args: [ESCROW_ADDRESS]
  });

  console.log('   User Base USDC:', (Number(userBaseBalance) / 1e6).toFixed(6));
  console.log('   User Arbitrum USDC:', (Number(userArbBalance) / 1e6).toFixed(6));
  console.log('   Solver Arbitrum USDC:', (Number(solverArbBalance) / 1e6).toFixed(6));
  console.log('   Escrow USDC:', (Number(escrowBalance) / 1e6).toFixed(6));
  console.log('');

  console.log('✅ ESCROW BRIDGE READY!');
  console.log('   🌐 Web app: http://localhost:3000');
  console.log('   📱 Go to "Bridge Interface" tab');
  console.log('   💰 Enter amount (e.g., 0.1 USDC)');
  console.log('   🏦 Click "Execute Real Solver + CallBreaker Bridge"');
  console.log('');
  console.log('🎯 WHAT WILL HAPPEN:');
  console.log('   1. User deposits USDC into escrow on Base');
  console.log('   2. Solver provides instant USDC on Arbitrum');
  console.log('   3. Solver claims deposited USDC from escrow');
  console.log('   4. Real transactions on both chains!');
  console.log('');
  console.log('🏦 ESCROW MODEL BENEFITS:');
  console.log('   ✅ User funds are secured in escrow');
  console.log('   ✅ Solver has guaranteed reimbursement');
  console.log('   ✅ No trust required between parties');
  console.log('   ✅ Instant cross-chain transfers');
  console.log('   ✅ 1% fee for solver service');

} catch (error) {
  console.error('❌ Error:', error.message);
}
