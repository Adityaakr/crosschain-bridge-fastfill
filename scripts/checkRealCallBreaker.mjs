import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

async function main() {
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARB_RPC_URL)
  });

  // Original address from .env
  const originalCallBreaker = "0x11C323a5340DAE5B958141d352Acf1cdB41dAc37";
  
  console.log('Checking original CallBreaker address:', originalCallBreaker);

  try {
    // Check if contract exists
    const code = await publicClient.getBytecode({ address: originalCallBreaker });
    console.log('Contract exists:', code ? 'YES' : 'NO');
    console.log('Code length:', code ? code.length : 0);

    if (code && code.length > 2) {
      console.log('Contract bytecode found - this is likely a real contract');
      
      // Try to call a view function that might exist
      try {
        // Try common view functions
        const balance = await publicClient.readContract({
          address: originalCallBreaker,
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
          args: ['0x3a159d24634A180f3Ab9ff37868358C73226E672']
        });
        console.log('senderBalances call successful:', balance.toString());
      } catch (e) {
        console.log('senderBalances call failed:', e.message);
      }

      // Try to get contract info
      try {
        const storage = await publicClient.getStorageAt({
          address: originalCallBreaker,
          slot: '0x0'
        });
        console.log('Storage slot 0:', storage);
      } catch (e) {
        console.log('Storage read failed:', e.message);
      }
    }
  } catch (e) {
    console.log('Error checking contract:', e.message);
  }

  // Also check some known STXN-related addresses from web search
  const possibleAddresses = [
    "0x11C323a5340DAE5B958141d352Acf1cdB41dAc37", // Original
    "0x1d0dd0eb4559061972adcfe62b881c15ca880623", // From search results
  ];

  for (const addr of possibleAddresses) {
    console.log(`\nChecking ${addr}:`);
    try {
      const code = await publicClient.getBytecode({ address: addr });
      console.log(`  Has code: ${code ? 'YES' : 'NO'} (${code ? code.length : 0} bytes)`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

main().catch(console.error);
