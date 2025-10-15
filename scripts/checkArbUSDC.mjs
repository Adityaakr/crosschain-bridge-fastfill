import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('🔍 CHECKING ARBITRUM USDC BALANCE - REAL CHECK 🔍\n');

  const arbPublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const userAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';

  console.log('👤 Address:', userAddress);
  console.log('🔴 Arbitrum USDC Contract:', process.env.USDC_ARB);
  console.log('🌐 RPC:', process.env.ARB_RPC_URL);

  try {
    // Check USDC balance on Arbitrum
    const arbUsdcBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    console.log('\n💰 REAL ARBITRUM USDC BALANCE:');
    console.log(`   Balance: ${Number(arbUsdcBalance) / 1e6} USDC`);

    if (arbUsdcBalance > 0) {
      console.log('   ✅ You have USDC on Arbitrum!');
      console.log(`   💡 Can use ${Number(arbUsdcBalance) / 1e6} USDC for bridge`);
      
      // Check if it's enough for a 5 USDC transfer
      const transferAmount = 5000000n; // 5 USDC in 6 decimals
      
      if (arbUsdcBalance >= transferAmount) {
        console.log('\n🎯 BRIDGE READY WITH 5 USDC:');
        console.log('   ✅ Can send 4.9 USDC to user on Arbitrum');
        console.log('   ✅ Can claim 5 USDC from Base escrow');
        console.log('   ✅ Solver profit: 0.1 USDC');
      } else {
        console.log('\n⚠️ INSUFFICIENT FOR 5 USDC BRIDGE:');
        console.log(`   Need: 5 USDC`);
        console.log(`   Have: ${Number(arbUsdcBalance) / 1e6} USDC`);
        console.log(`   Missing: ${5 - Number(arbUsdcBalance) / 1e6} USDC`);
      }
    } else {
      console.log('   ❌ No USDC on Arbitrum');
      console.log('   💡 Need to get USDC from faucet or bridge');
    }

    // Also check ETH for gas
    const arbEthBalance = await arbPublicClient.getBalance({
      address: userAddress
    });

    console.log(`\n⛽ Arbitrum ETH: ${Number(arbEthBalance) / 1e18} ETH`);
    console.log(`   Gas Ready: ${Number(arbEthBalance) / 1e18 > 0.001 ? '✅' : '❌'}`);

  } catch (error) {
    console.log('❌ Error checking balance:', error.message);
  }

  console.log('\n🔗 Verify on Arbiscan:');
  console.log(`   https://sepolia.arbiscan.io/token/${process.env.USDC_ARB}?a=${userAddress}`);
}

main().catch(console.error);
