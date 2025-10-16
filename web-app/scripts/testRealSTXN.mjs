import 'dotenv/config';
import { createWalletClient, createPublicClient, http, encodeFunctionData, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { erc20Abi, ismartExecuteAbi } from './utils/abi.mjs';

async function main() {
  const account = privateKeyToAccount(process.env.ARB_RELAYER_PK);
  const client = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  console.log('Testing Real Solver + CallBreaker CallBreaker...');
  console.log('Account:', account.address);
  console.log('CallBreaker:', process.env.CALLBREAKER_ARB);

  // First, deposit some ETH to CallBreaker
  console.log('Depositing ETH to CallBreaker...');
  try {
    const depositTx = await client.writeContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ismartExecuteAbi,
      functionName: 'deposit',
      value: parseEther('0.001')
    });
    console.log('Deposit tx:', depositTx);
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: depositTx });
    console.log('Deposit confirmed!');
  } catch (e) {
    console.log('Deposit failed:', e.message);
  }

  // Now try with the correct Solver + CallBreaker format - use our bridge app ID
  const balanceOf = (addr) => encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [addr]
  });

  const callObjects = [
    {
      salt: 0n, 
      amount: 0n, 
      gas: 100000n, 
      addr: process.env.USDC_ARB,
      callvalue: balanceOf(account.address), 
      returnvalue: '0x',
      skippable: false, 
      verifiable: false, 
      exposeReturn: true
    }
  ];

  // Use our bridge app ID from constants
  const userObjective = {
    appId: `0x${Buffer.from("app.cross.fastfill.v1").toString('hex')}`, // Our bridge app ID
    nonce: BigInt(Date.now()),
    tip: 0n,
    chainId: 421614n, // Arbitrum Sepolia
    maxFeePerGas: parseEther('0.000000001'), // 1 gwei
    maxPriorityFeePerGas: parseEther('0.000000001'), // 1 gwei
    sender: account.address,
    callObjects
  };

  console.log('Pushing objective with bridge app ID...');
  try {
    const hash = await client.writeContract({
      address: process.env.CALLBREAKER_ARB,
      abi: ismartExecuteAbi,
      functionName: 'pushUserObjective',
      args: [userObjective, []],
      value: 0n
    });

    console.log('Success! Push tx hash:', hash);
    
    // Wait for confirmation and get the event
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed!');
    console.log('Gas used:', receipt.gasUsed.toString());
    
    // Look for UserObjectivePushed event
    console.log('Events:', receipt.logs.length);
    
  } catch (e) {
    console.log('Push failed:', e.message);
    console.log('Error details:', e.details || 'No details');
  }
}

main().catch(console.error);
