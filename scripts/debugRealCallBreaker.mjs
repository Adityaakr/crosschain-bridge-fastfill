import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

async function main() {
  console.log('🔍 DEBUGGING REAL STXN CALLBREAKER - NO MOCKS 🔍\n');

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

  console.log('👤 Account:', account.address);
  console.log('🏗️ Real CallBreaker:', process.env.CALLBREAKER_ARB);

  // Step 1: Check if contract exists and get basic info
  console.log('\n📋 Step 1: Contract Verification...');
  
  try {
    const code = await arbPublicClient.getBytecode({
      address: process.env.CALLBREAKER_ARB
    });
    
    console.log('   ✅ Contract exists');
    console.log('   📏 Bytecode length:', code.length);
    
    // Check if we can read basic state
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
    
    console.log('   👑 Owner:', owner);
    console.log('   🔑 Are we owner?', owner.toLowerCase() === account.address.toLowerCase());
    
  } catch (e) {
    console.log('   ❌ Contract check failed:', e.message);
    return;
  }

  // Step 2: Try to understand the error by calling with minimal data
  console.log('\n🧪 Step 2: Minimal Function Test...');
  
  try {
    // Try calling with absolutely minimal data
    const minimalCall = await arbClient.simulateContract({
      address: process.env.CALLBREAKER_ARB,
      abi: [
        {
          "type": "function",
          "name": "pushUserObjective",
          "stateMutability": "payable",
          "inputs": [
            {
              "name": "_userObjective",
              "type": "tuple",
              "components": [
                {"name": "appId", "type": "bytes"},
                {"name": "nonce", "type": "uint256"},
                {"name": "tip", "type": "uint256"},
                {"name": "chainId", "type": "uint256"},
                {"name": "maxFeePerGas", "type": "uint256"},
                {"name": "maxPriorityFeePerGas", "type": "uint256"},
                {"name": "sender", "type": "address"},
                {"name": "callObjects", "type": "tuple[]", "components": [
                  {"name": "salt", "type": "uint256"},
                  {"name": "amount", "type": "uint256"},
                  {"name": "gas", "type": "uint256"},
                  {"name": "addr", "type": "address"},
                  {"name": "callvalue", "type": "bytes"},
                  {"name": "returnvalue", "type": "bytes"},
                  {"name": "skippable", "type": "bool"},
                  {"name": "verifiable", "type": "bool"},
                  {"name": "exposeReturn", "type": "bool"}
                ]}
              ]
            },
            {
              "name": "_additionalData",
              "type": "tuple[]",
              "components": [
                {"name": "key", "type": "bytes32"},
                {"name": "value", "type": "bytes"}
              ]
            }
          ],
          "outputs": [{"name": "requestId", "type": "bytes32"}]
        }
      ],
      functionName: 'pushUserObjective',
      args: [
        {
          appId: '0x',
          nonce: 1n,
          tip: 0n,
          chainId: 421614n,
          maxFeePerGas: parseEther('0.000000001'),
          maxPriorityFeePerGas: parseEther('0.000000001'),
          sender: account.address,
          callObjects: []
        },
        []
      ],
      value: 0n
    });
    
    console.log('   ✅ Simulation successful!');
    console.log('   📝 Result:', minimalCall.result);
    
  } catch (e) {
    console.log('   ❌ Simulation failed:', e.message);
    
    // Try to get more specific error info
    if (e.cause && e.cause.data) {
      console.log('   📝 Error data:', e.cause.data);
    }
    
    // Let's try to decode the error manually
    console.log('   🔍 Error signature: 0xb15db189');
    
    // Check if this could be a ReentrancyGuard error
    console.log('   💡 Checking if this is ReentrancyGuard...');
    
    // ReentrancyGuard error is usually "ReentrantCall()" = 0x3ee5aeb5
    const reentrancyError = '0x3ee5aeb5';
    console.log('   📋 ReentrancyGuard error would be:', reentrancyError);
    
    if (e.message.includes('0xb15db189')) {
      console.log('   🎯 This is our specific error - not ReentrancyGuard');
    }
  }

  // Step 3: Check if there are any state requirements
  console.log('\n🔍 Step 3: Checking Contract State...');
  
  try {
    // Try to read sequenceCounter
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
    
    console.log('   📊 Sequence Counter:', sequenceCounter.toString());
    
  } catch (e) {
    console.log('   ⚠️ Could not read sequenceCounter:', e.message);
  }

  // Step 4: Check if there's a portal state or other requirement
  console.log('\n🚪 Step 4: Checking Portal State...');
  
  try {
    // The error might be related to portal state - let's check if there's a portal function
    const portalAbi = [
      {
        "type": "function",
        "name": "portal",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "bool"}]
      }
    ];
    
    const portalState = await arbPublicClient.readContract({
      address: process.env.CALLBREAKER_ARB,
      abi: portalAbi,
      functionName: 'portal'
    });
    
    console.log('   🚪 Portal state:', portalState);
    
    if (!portalState) {
      console.log('   💡 Portal is closed - this might be the issue!');
      console.log('   📝 CallBreaker might require portal to be open for pushUserObjective');
    }
    
  } catch (e) {
    console.log('   ⚠️ Could not check portal state:', e.message);
  }

  console.log('\n🎯 REAL ERROR ANALYSIS COMPLETE');
  console.log('   Next: Need to resolve the specific validation causing 0xb15db189');
}

main().catch(console.error);
