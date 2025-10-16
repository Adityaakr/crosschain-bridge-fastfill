import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

async function main() {
  console.log('💸 TRANSFERRING SMALL AMOUNT OF BASE SEPOLIA ETH 💸\n');

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

  // Check current balance
  const senderBalance = await basePublicClient.getBalance({
    address: account.address
  });

  console.log(`\n💰 Current Balance: ${Number(senderBalance) / 1e18} ETH`);

  // Try to transfer a very small amount, leaving some for gas
  const gasEstimate = parseEther('0.00002'); // Reserve for gas
  const transferAmount = senderBalance - gasEstimate;

  if (transferAmount <= 0) {
    console.log('❌ Not enough ETH even for gas fees');
    console.log('\n🔗 Get Base Sepolia ETH from faucets:');
    console.log('   • https://www.alchemy.com/faucets/base-sepolia');
    console.log('   • https://docs.base.org/tools/network-faucets');
    console.log('   • https://faucet.quicknode.com/base/sepolia');
    return;
  }

  console.log(`\n💸 Attempting to transfer: ${Number(transferAmount) / 1e18} ETH`);
  console.log(`   (Keeping ${Number(gasEstimate) / 1e18} ETH for gas)`);

  try {
    const transferTx = await baseClient.sendTransaction({
      to: escrowAddress,
      value: transferAmount,
      gasLimit: 21000n // Standard ETH transfer gas limit
    });

    console.log('   📝 Transaction hash:', transferTx);
    
    const receipt = await basePublicClient.waitForTransactionReceipt({ 
      hash: transferTx 
    });
    
    console.log('   ✅ Transfer successful!');
    console.log('   ⛽ Gas used:', receipt.gasUsed.toString());

    // Check new balances
    const newEscrowBalance = await basePublicClient.getBalance({
      address: escrowAddress
    });

    console.log(`\n📊 New Escrow Balance: ${Number(newEscrowBalance) / 1e18} ETH`);

    if (newEscrowBalance > 0) {
      console.log('✅ Escrow now has some ETH!');
    }

  } catch (e) {
    console.log('   ❌ Transfer failed:', e.message);
    
    console.log('\n💡 Solutions:');
    console.log('   1. Get more Base Sepolia ETH from faucets');
    console.log('   2. The escrow contract may not need ETH for Solver + CallBreaker operations');
    console.log('   3. Solvers typically provide their own gas');
  }

  console.log('\n🔗 Base Sepolia Faucets:');
  console.log('   • https://www.alchemy.com/faucets/base-sepolia');
  console.log('   • https://docs.base.org/tools/network-faucets');
  console.log('   • https://faucet.quicknode.com/base/sepolia');
}

main().catch(console.error);
