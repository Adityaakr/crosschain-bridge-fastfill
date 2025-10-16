import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { erc20Abi } from './web-app/scripts/utils/abi.mjs';

const arbPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARB_RPC_URL)
});

const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL)
});

const solverAddress = '0x5A26514ce0AF943540407170B09ceA03cBFf5570';
const receiverAddress = '0x3a159d24634A180f3Ab9ff37868358C73226E672';
const initialSolverBalance = 15.01;
const initialReceiverBalance = 13.8;

console.log('🔍 Solver + CallBreaker Bridge Execution Monitor\n');
console.log('📋 Transaction: 0x125ee1fe2811d5e02ee7f3868d80dff3e14a118badbb0c6c958fb30df760d1a1');
console.log('⏰ Monitoring for solver execution...\n');

async function checkExecution() {
  try {
    const solverBalance = await arbPublicClient.readContract({
      address: process.env.USDC_ARB,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [solverAddress]
    });

    const receiverBalance = await basePublicClient.readContract({
      address: process.env.USDC_BASE,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [receiverAddress]
    });

    const currentSolver = Number(solverBalance) / 1e6;
    const currentReceiver = Number(receiverBalance) / 1e6;
    
    const solverChange = initialSolverBalance - currentSolver;
    const receiverChange = currentReceiver - initialReceiverBalance;

    console.log('💰 Current Balances:');
    console.log('   Solver (Arbitrum):', currentSolver.toFixed(6), 'USDC');
    console.log('   Receiver (Base):', currentReceiver.toFixed(6), 'USDC');
    
    console.log('\n📊 Changes:');
    console.log('   Solver decrease:', solverChange.toFixed(6), 'USDC');
    console.log('   Receiver increase:', receiverChange.toFixed(6), 'USDC');

    if (solverChange >= 0.5) {
      console.log('\n🎉 Solver + CallBreaker EXECUTION SUCCESSFUL!');
      console.log('   ✅ Solver transferred 0.5 USDC on Arbitrum');
      
      if (receiverChange >= 0.4) {
        console.log('   🌉 CROSS-CHAIN BRIDGE COMPLETE!');
        console.log('   ✅ Receiver got USDC on Base');
        console.log('   🚀 Arbitrum → Base bridge working perfectly!');
        return true;
      } else {
        console.log('   ⏳ Cross-chain settlement to Base pending');
        console.log('   💡 Solver + CallBreaker coordinating Base delivery');
      }
    } else if (solverChange > 0) {
      console.log('\n⚡ PARTIAL EXECUTION DETECTED');
      console.log('   🔄 Solver + CallBreaker solvers are processing...');
    } else {
      console.log('\n⏳ Solver + CallBreaker execution pending...');
      console.log('   💡 Objective in solver mempool');
      console.log('   🔍 Waiting for solver pickup');
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking execution:', error.message);
    return false;
  }
}

// Check execution every 30 seconds for up to 10 minutes
let attempts = 0;
const maxAttempts = 20;

const monitor = setInterval(async () => {
  attempts++;
  console.log(`\n🔄 Check ${attempts}/${maxAttempts} (${new Date().toLocaleTimeString()})`);
  
  const completed = await checkExecution();
  
  if (completed || attempts >= maxAttempts) {
    clearInterval(monitor);
    
    if (completed) {
      console.log('\n🎉 MONITORING COMPLETE - BRIDGE SUCCESSFUL! 🎉');
    } else {
      console.log('\n⏰ MONITORING TIMEOUT - Check manually for updates');
      console.log('💡 Solver + CallBreaker solvers may need more time for execution');
    }
  } else {
    console.log(`\n⏳ Next check in 30 seconds...`);
  }
}, 30000);

// Initial check
console.log('🔄 Initial Check');
await checkExecution();
