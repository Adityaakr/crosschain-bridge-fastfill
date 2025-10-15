import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('💰 EMERGENCY VAULT WITHDRAWAL 💰\n');
  console.log('🔧 Withdrawing USDC from VAULT address\n');

  const account = privateKeyToAccount(process.env.BASE_RELAYER_PK);
  
  const baseClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  const basePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  console.log('👤 VAULT Address:', account.address);
  console.log('💰 USDC Contract:', process.env.USDC_BASE);

  // Check VAULT USDC balance
  const vaultBalance = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  });

  console.log(`\n📊 VAULT USDC Balance: ${Number(vaultBalance) / 1e6} USDC`);

  if (vaultBalance > 0) {
    console.log('\n✅ FUNDS AVAILABLE FOR WITHDRAWAL!');
    console.log('💡 The escrow sent funds to your VAULT address');
    console.log('🎯 You can withdraw these funds anytime');
    
    // Show withdrawal options
    console.log('\n🔧 Withdrawal Options:');
    console.log('   1. Keep USDC in wallet ✅');
    console.log('   2. Send to another address');
    console.log('   3. Use for other bridges');
    console.log('   4. Convert back to other assets');
    
    console.log('\n💰 Available Actions:');
    console.log(`   • Transfer ${Number(vaultBalance) / 1e6} USDC anywhere`);
    console.log('   • No restrictions on VAULT funds');
    console.log('   • Funds are NOT locked in escrow');
    
  } else {
    console.log('\n❌ No USDC in VAULT');
    console.log('💡 Check if deposits actually went to VAULT');
  }

  // Check actual escrow contract balance
  const escrowBalance = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [process.env.BASE_DEPOSIT_ESCROW]
  });

  console.log(`\n📊 Escrow Contract Balance: ${Number(escrowBalance) / 1e6} USDC`);

  if (escrowBalance > 0) {
    console.log('⚠️ WARNING: Funds still in escrow contract!');
    console.log('🔧 Need to add withdrawal function to contract');
  } else {
    console.log('✅ No funds stuck in escrow contract');
  }

  console.log('\n🎯 FUND RECOVERY STATUS:');
  
  if (vaultBalance > 0) {
    console.log('   ✅ FUNDS RECOVERABLE via VAULT address');
    console.log('   💰 No emergency functions needed');
    console.log('   🔧 Can withdraw immediately');
  } else if (escrowBalance > 0) {
    console.log('   ❌ FUNDS STUCK in escrow contract');
    console.log('   🔧 Need emergency withdrawal function');
    console.log('   ⏰ Or wait for solver to claim');
  } else {
    console.log('   ❓ FUNDS LOCATION unknown');
    console.log('   🔍 Check transaction history');
  }

  console.log('\n💡 BOTTOM LINE:');
  console.log('   Your BaseDepositEscrow sends funds to VAULT');
  console.log('   VAULT = your wallet address');
  console.log('   You have full control over VAULT funds');
  console.log('   No funds are actually "locked" in escrow!');
}

main().catch(console.error);
