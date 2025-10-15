// Cross-Chain Bridge Solver SDK
// Main exports for the solver SDK

export { SolverClient } from './SolverClient.js';
export { EventMonitor } from './EventMonitor.js';
export { STXNExecutor } from './STXNExecutor.js';
export { InventoryManager } from './InventoryManager.js';
export { ProfitCalculator } from './ProfitCalculator.js';

// Utility functions
export * from './utils/index.js';

// Constants
export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614
};

export const DEFAULT_CONFIG = {
  minProfitBasisPoints: 20,
  maxSlippageBasisPoints: 50,
  inventoryThreshold: '1000',
  gasLimitMultiplier: 1.2,
  pollIntervalMs: 5000,
  retryAttempts: 3,
  timeoutMs: 30000
};
