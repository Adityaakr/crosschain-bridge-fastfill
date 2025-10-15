import 'dotenv/config';
import { createWalletClient, createPublicClient, http, encodeFunctionData, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { erc20Abi, ismartExecuteAbi } from './utils/abi.mjs';

async function main() {
  console.log('🔍 Debugging CallBreaker Integration...\n');

  const account = privateKeyToAccount(process.env.ARB_RELAYER_PK);
  
  const arbClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const arbPublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  console.log('👤 User Address:', account.address);
  console.log('🏗️ CallBreaker:', process.env.CALLBREAKER_ARB);

  // Step 1: Check if we can call basic functions
  console.log('\n📊 Step 1: Testing Basic CallBreaker Functions...');
  
  try {
    const balance = await arbPublicClient.readContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ismartExecuteAbi,
      functionName: 'senderBalances',
      args: [account.address]
    });
    
    console.log(`   CallBreaker Balance: ${Number(balance) / 1e18} ETH`);
  } catch (e) {
    console.log('   ❌ Balance check failed:', e.message);
    return;
  }

  // Step 2: Try the simplest possible objective
  console.log('\n🎯 Step 2: Testing Minimal Objective...');
  
  try {
    // Create the simplest possible call - just a balance check
    const balanceCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    });

    const minimalObjective = {
      appId: `0x${Buffer.from("test").toString('hex')}`, // Super simple app ID
      nonce: 1n, // Simple nonce
      tip: 0n, // No tip
      chainId: 421614n,
      maxFeePerGas: parseEther('0.000000002'), // 2 gwei
      maxPriorityFeePerGas: parseEther('0.000000001'), // 1 gwei
      sender: account.address,
      callObjects: [
        {
          salt: 0n,
          amount: 0n,
          gas: 50000n, // Lower gas
          addr: process.env.USDC_ARB,
          callvalue: balanceCalldata,
          returnvalue: '0x',
          skippable: true, // Make it skippable
          verifiable: false, // No verification
          exposeReturn: false // No return exposure
        }
      ]
    };

    console.log('   📤 Pushing minimal objective...');
    console.log('   📝 App ID:', minimalObjective.appId);
    
    const pushTx = await arbClient.writeContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ismartExecuteAbi,
      functionName: 'pushUserObjective',
      args: [minimalObjective, []], // No additional data
      value: 0n
    });

    const receipt = await arbPublicClient.waitForTransactionReceipt({ hash: pushTx });
    console.log('   ✅ Minimal objective pushed successfully!');
    console.log('   📝 Transaction:', pushTx);
    console.log('   ⛽ Gas used:', receipt.gasUsed.toString());
    
  } catch (e) {
    console.log('   ❌ Minimal objective failed:', e.message);
    
    // Let's try to decode the error more specifically
    if (e.data) {
      console.log('   📝 Error data:', e.data);
    }
    
    // Try with different parameters
    console.log('\n🔄 Step 3: Trying Different Parameters...');
    
    try {
      // Maybe the issue is with the app ID or chain ID
      const altObjective = {
        appId: '0x', // Empty app ID
        nonce: BigInt(Date.now()),
        tip: 0n,
        chainId: 421614n,
        maxFeePerGas: parseEther('0.00000001'), // 10 gwei
        maxPriorityFeePerGas: parseEther('0.000000001'), // 1 gwei
        sender: account.address,
        callObjects: []  // Empty call objects
      };

      console.log('   📤 Trying empty objective...');
      
      const altTx = await arbClient.writeContract({
        address: process.env.CALLBREAKER_ARB,
        abi: ismartExecuteAbi,
        functionName: 'pushUserObjective',
        args: [altObjective, []],
        value: 0n
      });

      const altReceipt = await arbPublicClient.waitForTransactionReceipt({ hash: altTx });
      console.log('   ✅ Empty objective worked!');
      console.log('   📝 Transaction:', altTx);
      
    } catch (e2) {
      console.log('   ❌ Empty objective also failed:', e2.message);
      
      // Let's check if the error is consistent
      if (e2.data === e.data) {
        console.log('   🔍 Same error - likely a systematic issue');
      }
    }
  }

  // Step 4: Check contract owner and permissions
  console.log('\n🔐 Step 4: Checking Contract Permissions...');
  
  try {
    // Try to read owner if the function exists
    const ownerAbi = [
      {
        "type": "function",
        "name": "owner",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}]
      }
    ];
    
    const owner = await arbPublicClient.readContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ownerAbi,
      functionName: 'owner'
    });
    
    console.log('   📋 Contract Owner:', owner);
    console.log('   📋 Our Address:', account.address);
    console.log('   📋 Are we owner?', owner.toLowerCase() === account.address.toLowerCase());
    
  } catch (e) {
    console.log('   ⚠️ Could not check owner:', e.message);
  }

  console.log('\n🔍 Error Analysis Complete');
}

main().catch(console.error);
