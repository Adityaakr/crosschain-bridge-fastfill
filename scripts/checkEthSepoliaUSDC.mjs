import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('🔍 CHECKING ETHEREUM SEPOLIA USDC BALANCE 🔍\n');
  console.log('💡 Exploring Base → Ethereum Sepolia bridge option\n');

  // Ethereum Sepolia RPC
  const ethSepoliaClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com') // Public Sepolia RPC
  });

  const userAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';
  
  // Common USDC addresses on Ethereum Sepolia
  const possibleUSDCAddresses = [
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Circle USDC Sepolia
    '0xA0b86a33E6417aB9c0b71e5C1f1a5a0b8b0b0b0b', // Alternative USDC
    '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // Another common USDC Sepolia
  ];

  console.log('👤 User Address:', userAddress);
  console.log('🌐 Chain: Ethereum Sepolia (11155111)');
  console.log('🔗 RPC: https://ethereum-sepolia-rpc.publicnode.com');

  // Check ETH balance first
  try {
    const ethBalance = await ethSepoliaClient.getBalance({
      address: userAddress
    });
    console.log(`\n⛽ Ethereum Sepolia ETH: ${Number(ethBalance) / 1e18} ETH`);
    
    if (Number(ethBalance) / 1e18 < 0.001) {
      console.log('   ⚠️ Low ETH - may need more for gas');
    } else {
      console.log('   ✅ Sufficient ETH for transactions');
    }
  } catch (e) {
    console.log('\n❌ Failed to check ETH balance:', e.message);
  }

  // Check each possible USDC address
  console.log('\n💰 CHECKING USDC BALANCES:');
  
  for (let i = 0; i < possibleUSDCAddresses.length; i++) {
    const usdcAddress = possibleUSDCAddresses[i];
    console.log(`\n📍 USDC Contract ${i + 1}: ${usdcAddress}`);
    
    try {
      const balance = await ethSepoliaClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress]
      });

      console.log(`   Balance: ${Number(balance) / 1e6} USDC`);
      
      if (balance > 0) {
        console.log('   ✅ FOUND USDC! This address has funds');
        
        // Try to get token info
        try {
          const name = await ethSepoliaClient.readContract({
            address: usdcAddress,
            abi: [
              {
                "type": "function",
                "name": "name",
                "inputs": [],
                "outputs": [{"name": "", "type": "string"}],
                "stateMutability": "view"
              }
            ],
            functionName: 'name'
          });
          
          const symbol = await ethSepoliaClient.readContract({
            address: usdcAddress,
            abi: [
              {
                "type": "function",
                "name": "symbol",
                "inputs": [],
                "outputs": [{"name": "", "type": "string"}],
                "stateMutability": "view"
              }
            ],
            functionName: 'symbol'
          });
          
          console.log(`   Token: ${name} (${symbol})`);
        } catch (e) {
          console.log('   Token info: Unable to fetch');
        }
      } else {
        console.log('   Balance: 0 USDC');
      }
      
    } catch (e) {
      console.log(`   ❌ Error checking balance: ${e.message.slice(0, 50)}...`);
    }
  }

  console.log('\n🎯 BASE → ETHEREUM SEPOLIA BRIDGE ANALYSIS:');
  
  console.log('\n✅ ADVANTAGES:');
  console.log('   • Ethereum has more mature testnet ecosystem');
  console.log('   • More USDC faucets available');
  console.log('   • Better tooling and infrastructure');
  console.log('   • More solver activity on Ethereum');

  console.log('\n⚠️ CONSIDERATIONS:');
  console.log('   • Higher gas costs on Ethereum');
  console.log('   • Need STXN CallBreaker on Ethereum');
  console.log('   • May need to redeploy ArbPostApprove equivalent');

  console.log('\n🔧 IMPLEMENTATION STEPS:');
  console.log('   1. Find/deploy STXN CallBreaker on Ethereum Sepolia');
  console.log('   2. Deploy EthPostApprove contract (like ArbPostApprove)');
  console.log('   3. Update bridge scripts for Ethereum chain');
  console.log('   4. Get USDC on Ethereum Sepolia');
  console.log('   5. Test Base → Ethereum bridge flow');

  console.log('\n💡 USDC SOURCES FOR ETHEREUM SEPOLIA:');
  console.log('   • Circle Faucet: https://faucet.circle.com/');
  console.log('   • Ethereum Sepolia Faucets');
  console.log('   • Bridge from other testnets');
  console.log('   • DEX swaps (Uniswap on Sepolia)');

  console.log('\n🌐 VERIFY BALANCES:');
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${userAddress}`);
  
  console.log('\n🚀 RECOMMENDATION:');
  console.log('   If you have USDC on Ethereum Sepolia,');
  console.log('   switching to Base → Ethereum bridge');
  console.log('   would likely be easier to complete!');
}

main().catch(console.error);
