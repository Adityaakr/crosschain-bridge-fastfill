import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { erc20Abi } from './utils/abi.mjs';

async function main() {
  console.log('💰 CHECKING ETHEREUM SEPOLIA USDC BALANCE 💰\n');

  const ethSepoliaClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com')
  });

  const userAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';
  const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

  console.log('👤 User Address:', userAddress);
  console.log('💰 USDC Contract:', usdcAddress);
  console.log('🌐 Chain: Ethereum Sepolia (11155111)');
  console.log('🔗 RPC: https://ethereum-sepolia-rpc.publicnode.com');

  try {
    // Check ETH balance
    const ethBalance = await ethSepoliaClient.getBalance({
      address: userAddress
    });
    console.log(`\n⛽ ETH Balance: ${Number(ethBalance) / 1e18} ETH`);

    // Check USDC balance
    const usdcBalance = await ethSepoliaClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    console.log(`💰 USDC Balance: ${Number(usdcBalance) / 1e6} USDC`);

    // Get token info
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
      
      console.log(`📝 Token: ${name} (${symbol})`);
    } catch (e) {
      console.log('📝 Token info: Unable to fetch');
    }

    // Bridge readiness check
    console.log('\n🌉 BASE → ETHEREUM SEPOLIA BRIDGE READINESS:');
    
    const minEth = 0.001; // 0.001 ETH for gas
    const minUsdc = 5; // 5 USDC for bridge
    
    console.log('\n✅ Requirements Check:');
    console.log(`   Ethereum ETH: ${Number(ethBalance) / 1e18 >= minEth ? '✅' : '❌'} (${Number(ethBalance) / 1e18} ≥ ${minEth})`);
    console.log(`   Ethereum USDC: ${Number(usdcBalance) / 1e6 >= minUsdc ? '✅' : '❌'} (${Number(usdcBalance) / 1e6} ≥ ${minUsdc})`);

    if (Number(usdcBalance) / 1e6 >= minUsdc && Number(ethBalance) / 1e18 >= minEth) {
      console.log('\n🎉 READY FOR BASE → ETHEREUM BRIDGE!');
      console.log('   ✅ Sufficient USDC on Ethereum');
      console.log('   ✅ Sufficient ETH for gas');
      console.log('   🎯 Can complete 5 USDC bridge transfer');
      
      console.log('\n💰 Bridge Economics:');
      console.log('   • User deposits: 5 USDC on Base');
      console.log('   • Solver sends: 4.9 USDC on Ethereum');
      console.log('   • Solver claims: 5 USDC from Base');
      console.log('   • Solver profit: 0.1 USDC');
      
    } else {
      console.log('\n⏳ NOT READY YET:');
      
      if (Number(ethBalance) / 1e18 < minEth) {
        console.log(`   ❌ Need ${minEth - Number(ethBalance) / 1e18} more ETH`);
      }
      
      if (Number(usdcBalance) / 1e6 < minUsdc) {
        console.log(`   ❌ Need ${minUsdc - Number(usdcBalance) / 1e6} more USDC`);
      }
      
      console.log('\n🔗 Get Ethereum Sepolia Assets:');
      console.log('   • ETH Faucet: https://sepoliafaucet.com/');
      console.log('   • USDC Faucet: https://faucet.circle.com/');
      console.log('   • Ethereum Faucets: https://faucetlink.to/sepolia');
    }

    console.log('\n🔧 NEXT STEPS IF READY:');
    console.log('   1. Find/deploy Solver + CallBreaker CallBreaker on Ethereum');
    console.log('   2. Deploy EthPostApprove contract');
    console.log('   3. Update .env with Ethereum details');
    console.log('   4. Execute Base → Ethereum bridge');

  } catch (error) {
    console.log('❌ Error checking balances:', error.message);
  }

  console.log('\n🔗 Verify on Etherscan:');
  console.log(`   Address: https://sepolia.etherscan.io/address/${userAddress}`);
  console.log(`   USDC Token: https://sepolia.etherscan.io/token/${usdcAddress}?a=${userAddress}`);
}

main().catch(console.error);
