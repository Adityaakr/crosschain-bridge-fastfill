# Cross-Chain Bridge Fast-Fill

A production-ready USDC bridge with instant liquidity using STXN protocol integration.

## **Features**

- **Gasless Deposits**: Users deposit on Base without requiring on-chain signatures at deposit time
- **Instant Fast-Fill**: Receive USDC on Arbitrum within ~1-2 blocks using solver inventory
- **MEV Protection**: STXN post-approve guard guarantees ≥98% of deposit amount (max 2% fee)
- **Real STXN Integration**: Uses actual STXN CallBreaker contracts, not mocks
- **Production Security**: Comprehensive safety checks and validations

## 🏗️ **Architecture**

### Bridge Flow
1. **User Deposit on Base**: Gasless deposit via `depositFor` function
2. **STXN Objective Creation**: Push UserObjective to real STXN CallBreaker
3. **Solver Execution**: Real STXN solvers provide instant liquidity
4. **Post-Approve Validation**: Ensures ≥98% of deposit amount received

### Project Structure
```
contracts/
  BaseDepositEscrow.sol         # Gasless USDC deposits on Base
  ArbPostApprove.sol           # STXN post-approve guard with MEV protection
  ImprovedBaseDepositEscrow.sol # Enhanced security version
  stxn/Types.sol               # STXN protocol interfaces

scripts/
  deployBase.ts                # Base network deployment
  pushArbFastFill.ts          # STXN objective creation
  utils/                      # ABIs and utility functions
  [40+ utility scripts]       # Comprehensive tooling suite
```

## 🛠️ **Setup**

### Prerequisites
- Node.js 18+
- Foundry
- Git with submodules

### Installation
```bash
# Clone the repository
git clone https://github.com/Adityaakr/crosschain-bridge-fastfill.git
cd crosschain-bridge-fastfill

# Install dependencies
npm install

# Initialize STXN submodule
git submodule update --init --recursive

# Setup environment
cp .env.example .env
# Fill in your private keys and RPC URLs in .env
```

### Build Contracts
```bash
forge build
```

## 🚀 **Usage**

### Deploy Contracts
```bash
# Deploy on Base Sepolia
npm run deploy:base

# Deploy on Arbitrum Sepolia  
npm run deploy:arb
```

### Execute Bridge Transfer
```bash
# Push fast-fill objective to STXN
npm run push:arb
```

### Utility Scripts
The project includes 40+ utility scripts for:
- Balance checking across chains
- Real STXN integration testing
- Solver simulation and execution
- Cross-chain bridge orchestration
- Debugging and verification

## 🔒 **Security Features**

- **Post-Approve Validation**: Guarantees minimum receive amount
- **Safe ERC-20 Transfers**: Custom `_safeTransferFrom` implementation
- **Reentrancy Protection**: Comprehensive security checks
- **Real STXN Integration**: No mock contracts, production-ready

## 📚 **Documentation**

- [`DEPLOYMENT_STATUS.md`](./DEPLOYMENT_STATUS.md) - Detailed deployment information
- [`FINAL_STATUS.md`](./FINAL_STATUS.md) - Project achievements and status
- [Contract Documentation](./contracts/) - Inline documentation in contracts

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 **Achievements**

- ✅ **STXN Integration**: Working with actual CallBreaker contracts
- ✅ **Production Deployments**: Live on Base and Arbitrum testnets
- ✅ **Comprehensive Tooling**: 40+ scripts for development and testing
- ✅ **Security Focused**: MEV protection and safety validations
- ✅ **Professional Architecture**: Clean, maintainable codebase

---
