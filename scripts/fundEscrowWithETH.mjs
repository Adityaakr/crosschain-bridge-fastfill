import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

async function main() {
  console.log('💸 FUNDING ESCROW WITH BASE SEPOLIA ETH 💸\n');

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

  const escrowAddress = '0x0737c4a886b8898718881fd4e2fe9141abec1244';

  console.log('👤 From Address:', account.address);
  console.log('🏗️ To Address (Escrow):', escrowAddress);

  // Step 1: Check current balances
  console.log('\n📊 Step 1: Current Balances...');
  
  try {
    const senderBalance = await basePublicClient.getBalance({
      address: account.address
    });

    const escrowBalance = await basePublicClient.getBalance({
      address: escrowAddress
    });

    console.log(`   Sender ETH Balance: ${Number(senderBalance) / 1e18} ETH`);
    console.log(`   Escrow ETH Balance: ${Number(escrowBalance) / 1e18} ETH`);

    if (senderBalance < parseEther('0.01')) {
      console.log('   ❌ Insufficient ETH balance for transfer');
      return;
    }

  } catch (e) {
    console.log('   ❌ Balance check failed:', e.message);
    return;
  }

  // Step 2: Transfer ETH to escrow
  console.log('\n💸 Step 2: Transferring ETH to Escrow...');
  
  try {
    const transferAmount = parseEther('0.005'); // 0.005 ETH
    
    console.log(`   💰 Transferring: ${Number(transferAmount) / 1e18} ETH`);
    console.log('   🎯 Purpose: Gas for cross-chain transactions');

    const transferTx = await baseClient.sendTransaction({
      to: escrowAddress,
      value: transferAmount
    });

    console.log('   📝 Transaction hash:', transferTx);
    
    // Wait for confirmation
    const receipt = await basePublicClient.waitForTransactionReceipt({ 
      hash: transferTx 
    });
    
    console.log('   ✅ Transfer confirmed!');
    console.log('   📊 Block number:', receipt.blockNumber);
    console.log('   ⛽ Gas used:', receipt.gasUsed.toString());

  } catch (e) {
    console.log('   ❌ Transfer failed:', e.message);
    return;
  }

  // Step 3: Verify new balances
  console.log('\n📊 Step 3: New Balances...');
  
  try {
    const newSenderBalance = await basePublicClient.getBalance({
      address: account.address
    });

    const newEscrowBalance = await basePublicClient.getBalance({
      address: escrowAddress
    });

    console.log(`   Sender ETH Balance: ${Number(newSenderBalance) / 1e18} ETH`);
    console.log(`   Escrow ETH Balance: ${Number(newEscrowBalance) / 1e18} ETH`);

    if (newEscrowBalance > 0) {
      console.log('   ✅ Escrow now has ETH for gas!');
    }

  } catch (e) {
    console.log('   ⚠️ Balance verification failed:', e.message);
  }

  console.log('\n🎉 ETH TRANSFER COMPLETE! 🎉');
  console.log('\n📋 Summary:');
  console.log('   ✅ BaseDepositEscrow funded with ETH');
  console.log('   ✅ Ready for cross-chain transactions');
  console.log('   ✅ Can now execute bridge operations');
  
  console.log('\n🚀 Next Steps:');
  console.log('   • Escrow has both USDC (10) and ETH (0.005)');
  console.log('   • Ready for solver execution');
  console.log('   • Can initiate cross-chain transfers');
}

main().catch(console.error);
