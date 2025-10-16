import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { erc20Abi } from './web-app/scripts/utils/abi.mjs';

const arbPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const solverAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';
const receiverAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';

console.log('🔍 Checking Solver + CallBreaker Bridge Status...\n');
console.log('📋 Transaction Hash: 0x1702d05857cda813d29360adba14e54018963bd2e3655de06a04229bb86e0541');
console.log('⏰ Time since push: ~3 minutes\n');

try {
  const arbBalance = await arbPublicClient.readContract({
    address: process.env.USDC_ARB,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [solverAddress]
  });

  const baseBalance = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [receiverAddress]
  });

  console.log('💰 Current Balances:');
  console.log('   Solver Arbitrum USDC:', (Number(arbBalance) / 1e6).toFixed(6));
  console.log('   Receiver Base USDC:', (Number(baseBalance) / 1e6).toFixed(6));

  // Check if transfer happened (initial: Arb=12.99, Base=13.8)
  const arbDecrease = 12.99 - (Number(arbBalance) / 1e6);
  const baseIncrease = (Number(baseBalance) / 1e6) - 13.8;

  console.log('\n📊 Changes from initial:');
  console.log('   Arbitrum decrease:', arbDecrease.toFixed(6), 'USDC');
  console.log('   Base increase:', baseIncrease.toFixed(6), 'USDC');

  if (arbDecrease >= 0.5) {
    console.log('\n🎉 Solver + CallBreaker EXECUTION SUCCESSFUL!');
    console.log('   ✅ Solver transferred 0.5 USDC on Arbitrum');
    
    if (baseIncrease >= 0.4) {
      console.log('   🌉 CROSS-CHAIN BRIDGE COMPLETE!');
      console.log('   ✅ Receiver got USDC on Base');
      console.log('   🚀 True Arbitrum → Base bridge working!');
    } else {
      console.log('   ⏳ Cross-chain settlement to Base pending');
      console.log('   💡 Solver + CallBreaker coordinating Base delivery');
    }
  } else if (arbDecrease > 0) {
    console.log('\n⚡ PARTIAL EXECUTION DETECTED');
    console.log('   🔄 Solver + CallBreaker solvers are processing...');
  } else {
    console.log('\n⏳ Solver + CallBreaker execution still pending...');
    console.log('   💡 Objective in solver mempool');
    console.log('   🔍 Solvers may need more time to execute');
    console.log('   📡 Or waiting for optimal execution conditions');
  }

  // Check transaction status
  console.log('\n🔗 Next Steps:');
  console.log('   1. Monitor Arbitrum transaction for USDC transfer');
  console.log('   2. Check Base network for cross-chain settlement');
  console.log('   3. Solver + CallBreaker solvers handle execution automatically');

} catch (error) {
  console.error('❌ Error checking balances:', error.message);
}
