import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia } from 'viem/chains';
import { EventMonitor } from './EventMonitor.js';
import { Solver + CallBreakerExecutor } from './Solver + CallBreakerExecutor.js';
import { InventoryManager } from './InventoryManager.js';
import { ProfitCalculator } from './ProfitCalculator.js';

export class SolverClient {
  constructor(config) {
    this.config = config;
    this.account = privateKeyToAccount(config.privateKey);
    
    // Initialize clients
    this.baseClient = createWalletClient({
      account: this.account,
      chain: baseSepolia,
      transport: http(config.baseRpc)
    });
    
    this.arbClient = createWalletClient({
      account: this.account,
      chain: arbitrumSepolia,
      transport: http(config.arbRpc)
    });
    
    this.basePublicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(config.baseRpc)
    });
    
    this.arbPublicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(config.arbRpc)
    });
    
    // Initialize components
    this.eventMonitor = new EventMonitor(this.basePublicClient, config);
    this.Solver + CallBreakerExecutor = new Solver + CallBreakerExecutor(this.arbClient, this.arbPublicClient, config);
    this.inventoryManager = new InventoryManager(this.arbClient, this.arbPublicClient, config);
    this.profitCalculator = new ProfitCalculator(config);
    
    // Statistics
    this.stats = {
      fillCount: 0,
      totalVolume: 0n,
      totalProfit: 0n,
      startTime: Date.now()
    };
    
    this.isRunning = false;
  }
  
  async start() {
    console.log('🚀 Starting Solver Client...');
    console.log('👤 Solver Address:', this.account.address);
    
    // Check requirements
    await this.checkRequirements();
    
    // Start monitoring
    this.isRunning = true;
    this.eventMonitor.on('deposit', this.handleDeposit.bind(this));
    await this.eventMonitor.start();
    
    console.log('✅ Solver Client started successfully');
  }
  
  async stop() {
    console.log('🛑 Stopping Solver Client...');
    this.isRunning = false;
    await this.eventMonitor.stop();
    console.log('✅ Solver Client stopped');
  }
  
  async handleDeposit(deposit) {
    try {
      console.log(`💰 New deposit detected: ${formatUnits(deposit.amount, 6)} USDC`);
      
      // Check if profitable
      const profit = await this.profitCalculator.calculate(deposit);
      if (profit <= 0) {
        console.log('❌ Deposit not profitable, skipping');
        return;
      }
      
      // Check inventory
      const hasInventory = await this.inventoryManager.checkInventory(deposit.amount);
      if (!hasInventory) {
        console.log('❌ Insufficient inventory, skipping');
        return;
      }
      
      // Execute fast-fill
      console.log('⚡ Executing fast-fill...');
      const success = await this.Solver + CallBreakerExecutor.executeFastFill(deposit);
      
      if (success) {
        this.stats.fillCount++;
        this.stats.totalVolume += deposit.amount;
        this.stats.totalProfit += BigInt(profit);
        console.log('✅ Fast-fill executed successfully');
      } else {
        console.log('❌ Fast-fill execution failed');
      }
      
    } catch (error) {
      console.error('❌ Error handling deposit:', error);
    }
  }
  
  async checkRequirements() {
    console.log('🔍 Checking solver requirements...');
    
    // Check balances
    const arbUsdcBalance = await this.inventoryManager.getUSDCBalance();
    const arbEthBalance = await this.arbPublicClient.getBalance({
      address: this.account.address
    });
    
    console.log(`💰 Arbitrum USDC: ${formatUnits(arbUsdcBalance, 6)}`);
    console.log(`⛽ Arbitrum ETH: ${formatUnits(arbEthBalance, 18)}`);
    
    // Check minimums
    const minUsdc = parseUnits(this.config.inventoryThreshold || '100', 6);
    const minEth = parseUnits('0.01', 18);
    
    if (arbUsdcBalance < minUsdc) {
      throw new Error(`Insufficient USDC inventory. Need ${formatUnits(minUsdc, 6)}, have ${formatUnits(arbUsdcBalance, 6)}`);
    }
    
    if (arbEthBalance < minEth) {
      throw new Error(`Insufficient ETH for gas. Need ${formatUnits(minEth, 18)}, have ${formatUnits(arbEthBalance, 18)}`);
    }
    
    console.log('✅ All requirements met');
  }
  
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      ...this.stats,
      uptimeMs: uptime,
      avgProfitPerFill: this.stats.fillCount > 0 ? this.stats.totalProfit / BigInt(this.stats.fillCount) : 0n
    };
  }
  
  setProfitCalculator(calculator) {
    this.profitCalculator.setCustomCalculator(calculator);
  }
  
  setRiskManager(riskManager) {
    this.riskManager = riskManager;
  }
}
