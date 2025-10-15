import 'dotenv/config';
import { createWalletClient, createPublicClient, http, encodeFunctionData, toBytes, parseAbi, Hex, zeroAddress, keccak256, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { CALLBREAKER_ARB, USDC_ARB, ARB_RPC_URL, ARB_RELAYER_PK, APP_ID, MIN_RECEIVE_6DP, CHAIN_ID_ARB, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS } from './constants.js';
import { erc20Abi, ismartExecuteAbi, callBreakerAbi } from './utils/abi.js';

// Build the Arbitrum fast-fill objective:
// 0) USDC.balanceOf(user)  (expose)
// 1) USDC.transfer(user, 9.8 USDC)  (verifiable: expect true)
// 2) USDC.balanceOf(user)  (expose)

async function main() {
  const account = privateKeyToAccount(ARB_RELAYER_PK as Hex);
  const client = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(ARB_RPC_URL)
  });

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(ARB_RPC_URL)
  });

  const user = account.address; // demo: send to relayer; replace with your user EOA/SA owner
  
  console.log('Using address:', user);
  console.log('CallBreaker address:', CALLBREAKER_ARB);
  console.log('USDC address:', USDC_ARB);

  // First, check current balance in CallBreaker
  console.log('Checking CallBreaker balance...');
  try {
    const balance = await publicClient.readContract({
      address: CALLBREAKER_ARB as `0x${string}`,
      abi: callBreakerAbi,
      functionName: 'senderBalances',
      args: [user as `0x${string}`]
    });
    console.log('Current CallBreaker balance:', balance.toString(), 'wei');
    
    if (balance < parseEther('0.001')) {
      console.log('Depositing ETH to CallBreaker for gas settlement...');
      const depositTx = await client.writeContract({
        address: CALLBREAKER_ARB as `0x${string}`,
        abi: callBreakerAbi,
        functionName: 'deposit',
        value: parseEther('0.001')
      });
      console.log('Deposit tx:', depositTx);
    }
  } catch (e) {
    console.log('Balance check/deposit failed:', (e as Error).message);
  }

  const balanceOf = (addr: string) => encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [addr as `0x${string}`]
  });

  const transfer = (to: string, amt: bigint) => encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to as `0x${string}`, amt]
  });

  const callObjects = [
    // Simple balance check only
    {
      salt: 0n, amount: 0n, gas: 0n, addr: USDC_ARB as `0x${string}`,
      callvalue: balanceOf(user), returnvalue: '0x',
      skippable: false, verifiable: false, exposeReturn: true
    }
  ];

  const userObjective = {
    appId: `0x${Buffer.from(APP_ID).toString('hex')}` as Hex,
    nonce: BigInt(Date.now()),
    tip: 0n,
    chainId: CHAIN_ID_ARB,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    sender: user as `0x${string}`,
    callObjects
  };

  const additional: Array<{key: Hex, value: Hex}> = [
    // Empty for now - can add metadata later
  ];

  const hash = await client.writeContract({
    address: CALLBREAKER_ARB as `0x${string}`,
    abi: ismartExecuteAbi,
    functionName: 'pushUserObjective',
    args: [userObjective as any, additional as any],
    value: 0n
  });

  console.log('push tx hash:', hash);
}

// helpers
function encodeBoolTrue(): Hex {
  // abi.encode(true)
  return ('0x' + '0'.repeat(63) + '1') as Hex;
}

function encodeUint256(x: bigint): Hex {
  return ('0x' + x.toString(16).padStart(64, '0')) as Hex;
}

function keccak256Bytes(s: string): Hex {
  // browser-friendly tiny keccak via viem
  return keccak256(toBytes(s));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
