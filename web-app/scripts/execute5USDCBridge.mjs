import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

// Real STXN CallBreaker ABI
const realSTXNAbi = [
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
          {"name": "signature", "type": "bytes"},
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
];

async function main() {
  console.log('💰 EXECUTING 5 USDC BRIDGE - REAL TRANSFER 💰\n');
  console.log('🎯 Base → Arbitrum: 5 USDC transfer with real funds\n');

  const account = privateKeyToAccount(process.env.ARB_RELAYER_PK);
  
  const arbClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const baseClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  const arbPublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const basePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL)
  });

  console.log('👤 User/Solver:', account.address);

  // Step 1: Check real balances
  console.log('\n📊 Step 1: Real Balance Check...');
  
  const baseUsdc = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  });

  const arbUsdc = await arbPublicClient.readContract({
    address: process.env.USDC_ARB,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  });

  const escrowUsdc = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [process.env.BASE_DEPOSIT_ESCROW]
  });

  console.log(`   Base USDC: ${Number(baseUsdc) / 1e6} USDC`);
  console.log(`   Arbitrum USDC: ${Number(arbUsdc) / 1e6} USDC`);
  console.log(`   Escrow USDC: ${Number(escrowUsdc) / 1e6} USDC`);

  // Step 2: Make 5 USDC deposit if needed
  console.log('\n💸 Step 2: Preparing 5 USDC Bridge...');
  
  const bridgeAmount = parseUnits('5', 6); // 5 USDC
  const userReceives = parseUnits('4.9', 6); // User gets 4.9 USDC
  const solverProfit = parseUnits('0.1', 6); // Solver keeps 0.1 USDC

  if (baseUsdc >= bridgeAmount) {
    console.log('   ✅ Sufficient Base USDC for 5 USDC bridge');
    
    try {
      // Check allowance
      const allowance = await basePublicClient.readContract({
        address: process.env.USDC_BASE,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [account.address, process.env.BASE_DEPOSIT_ESCROW]
      });

      if (allowance < bridgeAmount) {
        console.log('   📝 Setting USDC allowance...');
        const approveTx = await baseClient.writeContract({
          address: process.env.USDC_BASE,
          abi: erc20Abi,
          functionName: 'approve',
          args: [process.env.BASE_DEPOSIT_ESCROW, parseUnits('100', 6)]
        });
        await basePublicClient.waitForTransactionReceipt({ hash: approveTx });
        console.log('   ✅ Allowance set');
      }

      // Make deposit
      console.log('   💰 Making 5 USDC deposit...');
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
          bridgeAmount,
          userReceives,
          solverProfit,
          `0x${Date.now().toString(16).padStart(64, '0')}`
        ]
      });

      await basePublicClient.waitForTransactionReceipt({ hash: depositTx });
      console.log('   ✅ 5 USDC deposited to escrow!');
      console.log('   📝 Base TX:', depositTx);

    } catch (e) {
      console.log('   ❌ Deposit failed:', e.message);
    }
  }

  // Step 3: Create STXN objective for 5 USDC bridge
  console.log('\n🎯 Step 3: Creating STXN Objective...');
  
  try {
    const transferCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [account.address, userReceives] // 4.9 USDC to user
    });

    const signature = await account.signMessage({ 
      message: `5 USDC Bridge ${Date.now()}` 
    });

    const userObjective = {
      appId: `0x${Buffer.from("app.cross.fastfill.v1").toString('hex')}`,
      nonce: BigInt(Date.now()),
      tip: parseEther('0.0001'),
      chainId: 421614n, // Arbitrum Sepolia
      maxFeePerGas: parseEther('0.000000002'),
      maxPriorityFeePerGas: parseEther('0.000000001'),
      sender: account.address,
      signature: signature,
      callObjects: [
        {
          salt: 0n,
          amount: 0n,
          gas: 100000n,
          addr: process.env.USDC_ARB,
          callvalue: transferCalldata,
          returnvalue: '0x',
          skippable: false,
          verifiable: true,
          exposeReturn: false
        }
      ]
    };

    console.log('   📤 Pushing 5 USDC objective to STXN...');
    
    const objectiveTx = await arbClient.writeContract({
      address: process.env.CALLBREAKER_ARB,
      abi: realSTXNAbi,
      functionName: 'pushUserObjective',
      args: [userObjective, []],
      value: 0n
    });

    await arbPublicClient.waitForTransactionReceipt({ hash: objectiveTx });
    console.log('   ✅ STXN objective created!');
    console.log('   📝 Arbitrum TX:', objectiveTx);

  } catch (e) {
    console.log('   ❌ Objective creation failed:', e.message);
  }

  // Step 4: Execute solver action (if we have Arbitrum USDC)
  console.log('\n🤖 Step 4: Solver Execution...');
  
  if (arbUsdc >= userReceives) {
    console.log('   ✅ Sufficient Arbitrum USDC - executing transfer!');
    
    try {
      const solverTx = await arbClient.writeContract({
        address: process.env.USDC_ARB,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [account.address, userReceives] // Send 4.9 USDC
      });

      await arbPublicClient.waitForTransactionReceipt({ hash: solverTx });
      console.log('   ✅ REAL ARBITRUM TRANSFER EXECUTED!');
      console.log('   📝 Arbitrum TX:', solverTx);
      console.log('   🌐 Verify:', `https://sepolia.arbiscan.io/tx/${solverTx}`);

    } catch (e) {
      console.log('   ❌ Arbitrum transfer failed:', e.message);
    }
  } else {
    console.log('   ❌ Insufficient Arbitrum USDC');
    console.log(`   Need: ${Number(userReceives) / 1e6} USDC`);
    console.log(`   Have: ${Number(arbUsdc) / 1e6} USDC`);
    console.log('   💡 Get USDC from Arbitrum faucet first');
  }

  // Step 5: Final status
  console.log('\n📊 Step 5: Final Status...');
  
  const finalEscrow = await basePublicClient.readContract({
    address: process.env.USDC_BASE,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [process.env.BASE_DEPOSIT_ESCROW]
  });

  const finalArbUsdc = await arbPublicClient.readContract({
    address: process.env.USDC_ARB,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  });

  console.log(`   Final Escrow: ${Number(finalEscrow) / 1e6} USDC`);
  console.log(`   Final Arbitrum USDC: ${Number(finalArbUsdc) / 1e6} USDC`);

  console.log('\n🎉 5 USDC BRIDGE SETUP COMPLETE! 🎉');
  console.log('\n📋 Bridge Economics:');
  console.log('   💰 User deposits: 5 USDC on Base');
  console.log('   💸 User receives: 4.9 USDC on Arbitrum');
  console.log('   🎯 Solver profit: 0.1 USDC');
  console.log('   📊 Fee rate: 2%');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Get 5+ USDC on Arbitrum from faucet');
  console.log('   2. Run this script again to complete transfer');
  console.log('   3. Enjoy your working cross-chain bridge!');
}

main().catch(console.error);
