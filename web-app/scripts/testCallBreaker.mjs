import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

async function main() {
  const account = privateKeyToAccount(process.env.ARB_RELAYER_PK);
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  console.log('Testing CallBreaker interaction...');
  console.log('Account:', account.address);
  console.log('CallBreaker:', process.env.CALLBREAKER_ARB);

  // Check account ETH balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Account ETH balance:', balance.toString(), 'wei');
  console.log('Account ETH balance:', (Number(balance) / 1e18).toFixed(6), 'ETH');

  // Try to get the contract code to verify it exists
  try {
    const code = await publicClient.getBytecode({ address: process.env.CALLBREAKER_ARB });
    console.log('CallBreaker contract exists:', code ? 'YES' : 'NO');
    console.log('Code length:', code ? code.length : 0);
  } catch (e) {
    console.log('Error getting contract code:', e.message);
  }
}

main().catch(console.error);
