import 'dotenv/config';
import { createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('🤖 CHECKING SOLVER REQUIREMENTS 🤖\n');

  const account = privateKeyToAccount(process.env.ARB_RELAYER_PK);
  
  const arbPublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const basePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  console.log('👤 Solver Address:', account.address);

  // Check current balances
  console.log('\n📊 Current Solver Balances:');
  
  // ETH balances
  const arbEth = await arbPublicClient.getBalance({ address: account.address });
  const baseEth = await basePublicClient.getBalance({ address: account.address });
  
  // USDC balances
  const arbUsdc = await arbPublicClient.readContract({
    address: process.env.USDC_ARB,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  });

  const baseUsdc = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  });

  // Escrow balance
  const escrowUsdc = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [process.env.BASE_DEPOSIT_ESCROW]
  });

  console.log(`   Arbitrum ETH: ${Number(arbEth) / 1e18} ETH`);
  console.log(`   Base ETH: ${Number(baseEth) / 1e18} ETH`);
  console.log(`   Arbitrum USDC: ${Number(arbUsdc) / 1e6} USDC`);
  console.log(`   Base USDC: ${Number(baseUsdc) / 1e6} USDC`);
  console.log(`   Escrow USDC: ${Number(escrowUsdc) / 1e6} USDC`);

  // Check requirements
  console.log('\n✅ Solver Requirements Check:');
  
  const minGasArb = parseEther('0.001'); // 0.001 ETH for Arbitrum gas
  const minGasBase = parseEther('0.0001'); // 0.0001 ETH for Base gas
  const minUsdcArb = 10000000n; // 10 USDC (6 decimals)

  console.log('\n🔍 Requirements:');
  console.log(`   Arbitrum ETH: ${arbEth >= minGasArb ? '✅' : '❌'} (need ≥0.001 ETH)`);
  console.log(`   Base ETH: ${baseEth >= minGasBase ? '✅' : '❌'} (need ≥0.0001 ETH)`);
  console.log(`   Arbitrum USDC: ${arbUsdc >= minUsdcArb ? '✅' : '❌'} (need ≥10 USDC)`);
  console.log(`   Escrow USDC: ${escrowUsdc > 0 ? '✅' : '❌'} (need >0 USDC)`);

  // What's missing
  console.log('\n🎯 Missing Requirements:');
  
  if (arbEth < minGasArb) {
    console.log(`   ❌ Need ${Number(minGasArb - arbEth) / 1e18} more ETH on Arbitrum`);
  }
  
  if (baseEth < minGasBase) {
    console.log(`   ❌ Need ${Number(minGasBase - baseEth) / 1e18} more ETH on Base`);
  }
  
  if (arbUsdc < minUsdcArb) {
    console.log(`   ❌ Need ${Number(minUsdcArb - arbUsdc) / 1e6} more USDC on Arbitrum`);
  }

  if (escrowUsdc === 0n) {
    console.log(`   ❌ Need user deposits in escrow`);
  }

  // Solutions
  console.log('\n💡 How to Get Missing Assets:');
  
  if (arbUsdc < minUsdcArb) {
    console.log('\n   🔗 Get Arbitrum USDC:');
    console.log('   • Circle Faucet: https://faucet.circle.com/');
    console.log('   • Arbitrum Faucet: https://faucet.arbitrum.io/');
    console.log('   • Bridge from another chain');
    console.log('   • Swap ETH for USDC on Arbitrum DEX');
  }

  if (arbEth < minGasArb) {
    console.log('\n   🔗 Get Arbitrum ETH:');
    console.log('   • Arbitrum Faucet: https://faucet.arbitrum.io/');
    console.log('   • Bridge ETH from mainnet');
  }

  if (baseEth < minGasBase) {
    console.log('\n   🔗 Get Base ETH:');
    console.log('   • Base Faucet: https://faucet.quicknode.com/base/sepolia');
    console.log('   • Alchemy Faucet: https://www.alchemy.com/faucets/base-sepolia');
  }

  // Bridge readiness
  console.log('\n🌉 Bridge Readiness:');
  
  const canExecute = arbEth >= minGasArb && baseEth >= minGasBase && arbUsdc >= minUsdcArb && escrowUsdc > 0;
  
  if (canExecute) {
    console.log('   🎉 READY TO EXECUTE BRIDGE! All requirements met.');
  } else {
    console.log('   ⏳ Not ready yet - missing requirements above.');
  }

  console.log('\n📋 Summary:');
  console.log('   • Solver = Your wallet with liquidity on both chains');
  console.log('   • No special contract needed');
  console.log('   • You pay gas for solver transactions');
  console.log('   • Solver + CallBreaker CallBreaker gas already funded ✅');
  console.log('   • Profit from bridge fees covers gas costs');
}

main().catch(console.error);
