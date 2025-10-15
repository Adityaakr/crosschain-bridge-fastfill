import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('📊 CHECKING BASEDEPOSIT ESCROW BALANCE 📊\n');

  const basePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  const escrowAddress = '0x0737c4a886b8898718881fd4e2fe9141abec1244';
  const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

  console.log('🏗️ BaseDepositEscrow:', escrowAddress);
  console.log('💰 USDC Contract:', usdcAddress);

  try {
    // Check USDC balance of the escrow contract
    const escrowBalance = await basePublicClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [escrowAddress]
    });

    console.log('\n💰 Current Balances:');
    console.log(`   Escrow USDC Balance: ${Number(escrowBalance) / 1e6} USDC`);
    
    if (escrowBalance > 0) {
      console.log('   ✅ Escrow has USDC deposits!');
      console.log('   💡 This USDC is waiting for solver execution');
    } else {
      console.log('   📝 No USDC currently in escrow');
      console.log('   💡 Either no deposits made or all have been processed');
    }

    // Also check ETH balance
    const ethBalance = await basePublicClient.getBalance({
      address: escrowAddress
    });

    console.log(`   Escrow ETH Balance: ${Number(ethBalance) / 1e18} ETH`);

  } catch (e) {
    console.log('❌ Failed to check balance:', e.message);
  }

  console.log('\n📋 Contract Info:');
  console.log('   Network: Base Sepolia');
  console.log('   Explorer: https://sepolia.basescan.org/address/' + escrowAddress);
  console.log('   USDC Explorer: https://sepolia.basescan.org/token/' + usdcAddress + '?a=' + escrowAddress);
}

main().catch(console.error);
