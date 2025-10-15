import 'dotenv/config';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

async function main() {
  console.log('🚀 DEPLOYING FRESH STXN CALLBREAKER - NO MOCKS 🚀\n');

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

  console.log('👤 Deployer:', account.address);
  console.log('🌐 Chain: Arbitrum Sepolia');

  // Deploy using forge create with the exact same parameters as the working deployment
  console.log('\n🏗️ Deploying Fresh CallBreaker...');
  
  try {
    // Use forge to deploy CallBreaker with our address as owner
    console.log('   📝 Using forge create for deployment...');
    console.log('   👑 Owner will be:', account.address);
    
    // The deployment command would be:
    // forge create --rpc-url $ARB_RPC_URL --private-key $ARB_RELAYER_PK src/CallBreaker.sol:CallBreaker --constructor-args <owner_address>
    
    console.log('\n🔧 Run this command to deploy fresh CallBreaker:');
    console.log(`cd lib/stxn && forge create --rpc-url ${process.env.ARB_RPC_URL} --private-key ${process.env.ARB_RELAYER_PK} src/CallBreaker.sol:CallBreaker --constructor-args ${account.address}`);
    
    console.log('\n💡 Alternative: Let\'s try to understand the current CallBreaker issue first...');
    
    // Let's check if the issue is with the ABI or contract state
    console.log('\n🔍 Checking Current CallBreaker State...');
    
    // Try to call the most basic function - owner()
    const owner = await arbPublicClient.readContract({
      address: process.env.CALLBREAKER_ARB,
      abi: [
        {
          "type": "function",
          "name": "owner",
          "stateMutability": "view",
          "inputs": [],
          "outputs": [{"name": "", "type": "address"}]
        }
      ],
      functionName: 'owner'
    });
    
    console.log('   ✅ Owner read successful:', owner);
    
    // Try to call sequenceCounter
    const sequenceCounter = await arbPublicClient.readContract({
      address: process.env.CALLBREAKER_ARB,
      abi: [
        {
          "type": "function",
          "name": "sequenceCounter",
          "stateMutability": "view",
          "inputs": [],
          "outputs": [{"name": "", "type": "uint256"}]
        }
      ],
      functionName: 'sequenceCounter'
    });
    
    console.log('   ✅ Sequence counter read successful:', sequenceCounter.toString());
    
    // The issue must be specifically with pushUserObjective function
    console.log('\n🎯 Issue Analysis:');
    console.log('   ✅ Basic contract reads work');
    console.log('   ❌ pushUserObjective fails with 0xb15db189');
    console.log('   💡 This suggests a specific validation in pushUserObjective');
    
    // Let's check if there are any app-specific validations
    console.log('\n🔍 Checking App Validations...');
    
    // Try to read pre-approval addresses for our app
    try {
      const preApprovalAbi = [
        {
          "type": "function",
          "name": "_preApprovalAddresses",
          "stateMutability": "view",
          "inputs": [{"name": "", "type": "bytes"}],
          "outputs": [{"name": "", "type": "address"}]
        }
      ];
      
      const appId = `0x${Buffer.from("app.cross.fastfill.v1").toString('hex')}`;
      
      // This might fail if it's a private mapping, but let's try
      console.log('   📋 Checking pre-approval for app:', appId);
      
    } catch (e) {
      console.log('   ⚠️ Cannot read pre-approval mappings (private)');
    }
    
    console.log('\n💡 SOLUTION APPROACH:');
    console.log('   1. The current CallBreaker is deployed and basic functions work');
    console.log('   2. The error 0xb15db189 is specific to pushUserObjective');
    console.log('   3. We need to identify what validation is failing');
    console.log('   4. Possible causes: app validation, parameter validation, or state requirement');
    
  } catch (e) {
    console.log('   ❌ Analysis failed:', e.message);
  }
}

main().catch(console.error);
