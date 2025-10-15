import { EventEmitter } from 'events';
import { parseAbiItem } from 'viem';

export class EventMonitor extends EventEmitter {
  constructor(publicClient, config) {
    super();
    this.publicClient = publicClient;
    this.config = config;
    this.isRunning = false;
    this.lastBlock = null;
    
    // DepositRequested event ABI
    this.depositEventAbi = parseAbiItem(
      'event DepositRequested(bytes32 indexed depositId, address indexed user, uint256 amount, uint256 minReceive, uint256 feeCap)'
    );
  }
  
  async start() {
    console.log('👀 Starting event monitor...');
    this.isRunning = true;
    
    // Get current block
    this.lastBlock = await this.publicClient.getBlockNumber();
    console.log(`📍 Starting from block: ${this.lastBlock}`);
    
    // Start polling
    this.pollEvents();
  }
  
  async stop() {
    console.log('🛑 Stopping event monitor...');
    this.isRunning = false;
  }
  
  async pollEvents() {
    while (this.isRunning) {
      try {
        const currentBlock = await this.publicClient.getBlockNumber();
        
        if (currentBlock > this.lastBlock) {
          await this.fetchEvents(this.lastBlock + 1n, currentBlock);
          this.lastBlock = currentBlock;
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.config.pollIntervalMs || 5000));
        
      } catch (error) {
        console.error('❌ Error polling events:', error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
      }
    }
  }
  
  async fetchEvents(fromBlock, toBlock) {
    try {
      const logs = await this.publicClient.getLogs({
        address: this.config.contracts?.baseDepositEscrow,
        event: this.depositEventAbi,
        fromBlock,
        toBlock
      });
      
      for (const log of logs) {
        const deposit = {
          depositId: log.args.depositId,
          user: log.args.user,
          amount: log.args.amount,
          minReceive: log.args.minReceive,
          feeCap: log.args.feeCap,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        };
        
        console.log(`📥 Deposit event: ${deposit.user} deposited ${deposit.amount} USDC`);
        this.emit('deposit', deposit);
      }
      
    } catch (error) {
      console.error('❌ Error fetching events:', error);
    }
  }
}
