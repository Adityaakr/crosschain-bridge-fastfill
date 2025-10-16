# Cross-Chain Bridge Solver SDK

This SDK enables solvers to participate in the Cross-Chain Bridge Fast-Fill network, providing instant liquidity for Base → Arbitrum USDC transfers.

## 🎯 **What is a Solver?**

Solvers are liquidity providers who:
- Monitor deposit events on Base chain
- Provide instant USDC on Arbitrum to users
- Get reimbursed from the Base deposits
- Earn fees for providing fast liquidity

## 🏗️ **Architecture Overview**

```
Base Chain (Deposit)          Arbitrum Chain (Fast-Fill)
┌─────────────────┐          ┌──────────────────────┐
│ User deposits   │   ────►  │ Solver provides      │
│ 10 USDC         │          │ 9.8+ USDC instantly  │
│                 │          │                      │
│ BaseDepositEscrow│          │ Solver + CallBreaker CallBreaker     │
│ holds funds     │          │ + ArbPostApprove     │
└─────────────────┘          └──────────────────────┘
```

## 📋 **Solver Requirements**

### Technical Requirements
- Node.js 18+ environment
- Access to Base Sepolia and Arbitrum Sepolia RPCs
- Private key with sufficient funds on both chains
- Solver + CallBreaker protocol integration

### Financial Requirements
- **Arbitrum USDC**: Liquidity inventory for fast-fills
- **Base ETH**: Gas for claiming reimbursements
- **Arbitrum ETH**: Gas for Solver + CallBreaker executions + CallBreaker deposits

### Minimum Balances (Testnet)
- 100+ USDC on Arbitrum Sepolia
- 0.01+ ETH on Base Sepolia  
- 0.01+ ETH on Arbitrum Sepolia
- 0.001+ ETH deposited in Solver + CallBreaker CallBreaker

## 🚀 **Quick Start**

### 1. Setup Environment
```bash
# Clone the repository
git clone https://github.com/Adityaakr/crosschain-bridge-fastfill.git
cd crosschain-bridge-fastfill/solver-sdk

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Fill in your solver private keys and RPC URLs
```

### 2. Configure Solver
```bash
# Edit solver-config.json with your parameters
{
  "minProfitBasisPoints": 20,    // 0.2% minimum profit
  "maxSlippageBasisPoints": 50,  // 0.5% max slippage
  "inventoryThreshold": "1000",  // 1000 USDC minimum inventory
  "gasLimitMultiplier": 1.2      // 20% gas limit buffer
}
```

### 3. Run Solver
```bash
# Start the solver daemon
npm run start:solver

# Or run in monitoring mode
npm run monitor
```

## 📚 **SDK Components**

### Core Modules
- **`SolverClient`**: Main solver orchestration
- **`EventMonitor`**: Watches Base chain for deposits
- **`Solver + CallBreakerExecutor`**: Handles Solver + CallBreaker objective execution
- **`InventoryManager`**: Manages USDC liquidity
- **`ProfitCalculator`**: Calculates fees and profitability

### Utility Scripts
- **`checkRequirements.js`**: Validates solver setup
- **`simulateExecution.js`**: Test solver logic without real funds
- **`monitorProfits.js`**: Track solver performance
- **`rebalanceInventory.js`**: Manage cross-chain liquidity

## 🔧 **Integration Guide**

### Basic Solver Implementation
```javascript
import { SolverClient } from './src/SolverClient.js';

const solver = new SolverClient({
  baseRpc: process.env.BASE_RPC_URL,
  arbRpc: process.env.ARB_RPC_URL,
  privateKey: process.env.SOLVER_PRIVATE_KEY,
  config: solverConfig
});

// Start monitoring and executing
await solver.start();
```

### Custom Solver Logic
```javascript
// Override default profit calculation
solver.setProfitCalculator((deposit, currentGas) => {
  const baseFee = deposit.amount * 0.002; // 0.2% base fee
  const gasCost = currentGas * gasPrice;
  return baseFee - gasCost;
});

// Add custom risk management
solver.setRiskManager((deposit) => {
  if (deposit.amount > maxSingleDeposit) return false;
  if (currentInventory < deposit.amount) return false;
  return true;
});
```

## 📊 **Monitoring & Analytics**

### Performance Metrics
- **Fill Rate**: % of deposits successfully filled
- **Average Fill Time**: Time from deposit to user receipt
- **Profit Margins**: Fees earned vs costs
- **Inventory Utilization**: Efficiency of capital deployment

### Dashboard Integration
```javascript
// Get solver statistics
const stats = await solver.getStats();
console.log({
  totalFills: stats.fillCount,
  totalVolume: stats.volumeUSD,
  averageProfit: stats.avgProfitBasisPoints,
  uptime: stats.uptimePercentage
});
```

## 🔒 **Security Considerations**

### Private Key Management
- Use hardware wallets or secure key management systems
- Never commit private keys to version control
- Implement key rotation policies

### Risk Management
- Set maximum single transaction limits
- Implement circuit breakers for unusual activity
- Monitor for MEV attacks and front-running

### Operational Security
- Use secure RPC endpoints
- Implement proper logging without exposing sensitive data
- Set up alerting for failed transactions or low balances

## 🤝 **Solver Network**

### Joining the Network
1. **Setup**: Complete technical and financial requirements
2. **Testing**: Run on testnets with small amounts
3. **Registration**: Register with the bridge operator (optional)
4. **Production**: Deploy with full inventory

### Competitive Dynamics
- **Speed**: Faster execution wins more fills
- **Pricing**: Competitive fees attract more volume
- **Reliability**: Consistent uptime builds reputation
- **Capital**: Larger inventory enables bigger fills

## 📞 **Support & Community**

- **Documentation**: Full API reference in `/docs`
- **Examples**: Sample implementations in `/examples`
- **Issues**: Report bugs via GitHub issues
- **Discord**: Join the solver community channel

## 🎯 **Profit Opportunities**

### Revenue Streams
- **Base Fees**: 0.1-0.2% per successful fill
- **Speed Premiums**: Higher fees for faster execution
- **Volume Bonuses**: Reduced costs at scale
- **MEV Capture**: Front-running protection creates value

### Cost Structure
- **Gas Costs**: ~$0.50-2.00 per fill (testnet: minimal)
- **Inventory Costs**: Opportunity cost of locked capital
- **Infrastructure**: RPC, monitoring, and operational costs

---

**Ready to become a solver? Start with the Quick Start guide above!**
