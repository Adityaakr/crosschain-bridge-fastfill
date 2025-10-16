import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('💰 CHECKING REAL ON-CHAIN BALANCES - NO MOCKS 💰\n');
  console.log('🔍 Reading directly from blockchain contracts\n');

  const arbPublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const basePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  const userAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';

  console.log('👤 User/Solver Address:', userAddress);
  console.log('🌐 Base RPC:', process.env.BASE_RPC_URL);
  console.log('🌐 Arbitrum RPC:', process.env.ARB_RPC_URL);

  // Contract addresses
  console.log('\n📋 Contract Addresses:');
  console.log('   Base USDC:', process.env.USDC_BASE);
  console.log('   Arbitrum USDC:', process.env.USDC_ARB);
  console.log('   BaseDepositEscrow:', process.env.BASE_DEPOSIT_ESCROW);
  console.log('   Solver + CallBreaker CallBreaker:', process.env.CALLBREAKER_ARB);

  try {
    // === BASE CHAIN BALANCES ===
    console.log('\n🟦 BASE SEPOLIA REAL BALANCES:');
    
    // User ETH balance on Base
    const baseUserEth = await basePublicClient.getBalance({
      address: userAddress
    });
    console.log(`   User ETH: ${Number(baseUserEth) / 1e18} ETH`);

    // User USDC balance on Base
    const baseUserUsdc = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress]
    });
    console.log(`   User USDC: ${Number(baseUserUsdc) / 1e6} USDC`);

    // BaseDepositEscrow USDC balance
    const escrowUsdc = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [process.env.BASE_DEPOSIT_ESCROW]
    });
    console.log(`   Escrow USDC: ${Number(escrowUsdc) / 1e6} USDC`);

    // BaseDepositEscrow ETH balance
    const escrowEth = await basePublicClient.getBalance({
      address: process.env.BASE_DEPOSIT_ESCROW
    });
    console.log(`   Escrow ETH: ${Number(escrowEth) / 1e18} ETH`);

    // === ARBITRUM CHAIN BALANCES ===
    console.log('\n🔴 ARBITRUM SEPOLIA REAL BALANCES:');
    
    // User ETH balance on Arbitrum
    const arbUserEth = await arbPublicClient.getBalance({
      address: userAddress
    });
    console.log(`   User ETH: ${Number(arbUserEth) / 1e18} ETH`);

    // User USDC balance on Arbitrum
    const arbUserUsdc = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress]
    });
    console.log(`   User USDC: ${Number(arbUserUsdc) / 1e6} USDC`);

    // Solver + CallBreaker CallBreaker balance check
    const callbreakerEth = await arbPublicClient.getBalance({
      address: process.env.CALLBREAKER_ARB
    });
    console.log(`   CallBreaker ETH: ${Number(callbreakerEth) / 1e18} ETH`);

    // Check user's balance in CallBreaker
    try {
      const userCallbreakerBalance = await arbPublicClient.readContract({
        address: process.env.CALLBREAKER_ARB,
        abi: [
          {
            "type": "function",
            "name": "senderBalances",
            "stateMutability": "view",
            "inputs": [{"name": "sender", "type": "address"}],
            "outputs": [{"name": "", "type": "uint256"}]
          }
        ],
        functionName: 'senderBalances',
        args: [userAddress]
      });
      console.log(`   User CallBreaker Balance: ${Number(userCallbreakerBalance) / 1e18} ETH`);
    } catch (e) {
      console.log(`   User CallBreaker Balance: Error reading (${e.message.slice(0, 50)}...)`);
    }

    // === BRIDGE READINESS CHECK ===
    console.log('\n🌉 BRIDGE READINESS - REAL REQUIREMENTS:');
    
    const minArbEth = 0.001; // 0.001 ETH for Arbitrum gas
    const minBaseEth = 0.0001; // 0.0001 ETH for Base gas
    const minArbUsdc = 10; // 10 USDC on Arbitrum to send
    
    console.log('\n✅ Requirements Check:');
    console.log(`   Base User ETH: ${Number(baseUserEth) / 1e18 >= minBaseEth ? '✅' : '❌'} (${Number(baseUserEth) / 1e18} ≥ ${minBaseEth})`);
    console.log(`   Arbitrum User ETH: ${Number(arbUserEth) / 1e18 >= minArbEth ? '✅' : '❌'} (${Number(arbUserEth) / 1e18} ≥ ${minArbEth})`);
    console.log(`   Arbitrum User USDC: ${Number(arbUserUsdc) / 1e6 >= minArbUsdc ? '✅' : '❌'} (${Number(arbUserUsdc) / 1e6} ≥ ${minArbUsdc})`);
    console.log(`   Base Escrow USDC: ${Number(escrowUsdc) / 1e6 > 0 ? '✅' : '❌'} (${Number(escrowUsdc) / 1e6} > 0)`);

    // === WHAT'S MISSING ===
    console.log('\n❌ MISSING FOR BRIDGE EXECUTION:');
    
    let canExecute = true;
    
    if (Number(baseUserEth) / 1e18 < minBaseEth) {
      console.log(`   • Need ${minBaseEth - Number(baseUserEth) / 1e18} more ETH on Base`);
      canExecute = false;
    }
    
    if (Number(arbUserEth) / 1e18 < minArbEth) {
      console.log(`   • Need ${minArbEth - Number(arbUserEth) / 1e18} more ETH on Arbitrum`);
      canExecute = false;
    }
    
    if (Number(arbUserUsdc) / 1e6 < minArbUsdc) {
      console.log(`   • Need ${minArbUsdc - Number(arbUserUsdc) / 1e6} more USDC on Arbitrum`);
      canExecute = false;
    }
    
    if (Number(escrowUsdc) / 1e6 === 0) {
      console.log(`   • Need user deposits in Base escrow`);
      canExecute = false;
    }

    // === FINAL STATUS ===
    console.log('\n🎯 BRIDGE EXECUTION STATUS:');
    
    if (canExecute) {
      console.log('   🎉 READY TO EXECUTE! All real funds available.');
      console.log('   💰 Can perform real Base → Arbitrum transfer');
    } else {
      console.log('   ⏳ NOT READY - Missing requirements listed above');
      console.log('   💡 Get missing assets from faucets/bridges');
    }

    // === TRANSACTION POTENTIAL ===
    console.log('\n💸 POTENTIAL TRANSACTION FLOW:');
    console.log(`   1. Send ${Math.min(Number(escrowUsdc) / 1e6 * 0.98, Number(arbUserUsdc) / 1e6)} USDC to user on Arbitrum`);
    console.log(`   2. Claim ${Number(escrowUsdc) / 1e6} USDC from Base escrow`);
    console.log(`   3. Solver profit: ${Number(escrowUsdc) / 1e6 * 0.02} USDC`);

  } catch (error) {
    console.log('❌ Error reading real balances:', error.message);
    console.log('🔍 Check RPC connections and contract addresses');
  }

  console.log('\n📊 REAL BALANCE CHECK COMPLETE - NO MOCKS USED');
  console.log('🔗 Verify on block explorers:');
  console.log(`   Base: https://sepolia.basescan.org/address/${userAddress}`);
  console.log(`   Arbitrum: https://sepolia.arbiscan.io/address/${userAddress}`);
}

main().catch(console.error);
