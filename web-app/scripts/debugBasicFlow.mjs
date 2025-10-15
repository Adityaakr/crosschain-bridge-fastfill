import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('🔍 Debugging Basic Base Flow...\n');

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

  console.log('👤 User Address:', account.address);
  console.log('💰 USDC Address:', process.env.USDC_BASE);
  console.log('🏗️ Escrow Address:', process.env.BASE_DEPOSIT_ESCROW);

  // Step 1: Check USDC balance
  console.log('\n📊 Step 1: Checking USDC Balance...');
  
  try {
    const balance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    console.log(`   USDC Balance: ${Number(balance) / 1e6} USDC`);
    
    if (balance === 0n) {
      console.log('   ❌ No USDC balance! Need to get some testnet USDC first.');
      return;
    }
  } catch (e) {
    console.log('   ❌ Balance check failed:', e.message);
    return;
  }

  // Step 2: Check current allowance
  console.log('\n🔍 Step 2: Checking Current Allowance...');
  
  try {
    const allowance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, process.env.BASE_DEPOSIT_ESCROW]
    });
    
    console.log(`   Current Allowance: ${Number(allowance) / 1e6} USDC`);
  } catch (e) {
    console.log('   ❌ Allowance check failed:', e.message);
    return;
  }

  // Step 3: Approve if needed
  console.log('\n✅ Step 3: Setting Approval...');
  
  try {
    const approveTx = await baseClient.writeContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'approve',
      args: [process.env.BASE_DEPOSIT_ESCROW, parseUnits('100', 6)] // Approve 100 USDC
    });
    
    console.log('   📝 Approval tx:', approveTx);
    
    const receipt = await basePublicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log('   ✅ Approval confirmed!');
    console.log('   ⛽ Gas used:', receipt.gasUsed.toString());
    
  } catch (e) {
    console.log('   ❌ Approval failed:', e.message);
    return;
  }

  // Step 4: Verify new allowance
  console.log('\n🔍 Step 4: Verifying New Allowance...');
  
  try {
    const newAllowance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, process.env.BASE_DEPOSIT_ESCROW]
    });
    
    console.log(`   New Allowance: ${Number(newAllowance) / 1e6} USDC`);
  } catch (e) {
    console.log('   ❌ New allowance check failed:', e.message);
    return;
  }

  // Step 5: Test deposit
  console.log('\n💰 Step 5: Testing Deposit...');
  
  try {
    const depositTx = await baseClient.writeContract({
      address: process.env.BASE_DEPOSIT_ESCROW,
      abi: [
        {
          "type": "function",
          "name": "depositFor",
          "inputs": [
            {"name": "user", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "minReceive", "type": "uint256"},
            {"name": "feeCap", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"}
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ],
      functionName: 'depositFor',
      args: [
        account.address,
        parseUnits('1', 6), // 1 USDC (smaller amount for testing)
        parseUnits('0.98', 6), // Min receive 0.98 USDC
        parseUnits('0.02', 6), // Max fee 0.02 USDC
        `0x${Date.now().toString(16).padStart(64, '0')}` // Unique nonce
      ]
    });

    console.log('   📝 Deposit tx:', depositTx);
    
    const receipt = await basePublicClient.waitForTransactionReceipt({ hash: depositTx });
    console.log('   ✅ Deposit successful!');
    console.log('   ⛽ Gas used:', receipt.gasUsed.toString());
    console.log('   📊 Events:', receipt.logs.length);
    
    // Check if DepositRequested event was emitted
    const depositEvent = receipt.logs.find(log => 
      log.address.toLowerCase() === process.env.BASE_DEPOSIT_ESCROW.toLowerCase()
    );
    
    if (depositEvent) {
      console.log('   🎉 DepositRequested event found!');
    } else {
      console.log('   ⚠️ No DepositRequested event found');
    }
    
  } catch (e) {
    console.log('   ❌ Deposit failed:', e.message);
    
    // Try to get more details about the failure
    if (e.cause && e.cause.reason) {
      console.log('   📝 Reason:', e.cause.reason);
    }
    
    return;
  }

  console.log('\n🎉 Base flow working! Now checking balances...');
  
  // Step 6: Check final balances
  try {
    const finalBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    const escrowBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [process.env.BASE_DEPOSIT_ESCROW]
    });
    
    console.log(`   User Final Balance: ${Number(finalBalance) / 1e6} USDC`);
    console.log(`   Escrow Balance: ${Number(escrowBalance) / 1e6} USDC`);
    
  } catch (e) {
    console.log('   ⚠️ Final balance check failed:', e.message);
  }

  console.log('\n✅ BASE SIDE IS NOW WORKING! 🎉');
}

main().catch(console.error);
