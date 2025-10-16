import { createWalletClient, createPublicClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'

// SIMPLE SETUP - SOLVER ON BOTH CHAINS
const SOLVER_PK = '0xc77042f1e4dce562cc77815c20d33b6dbb020fc7795577ab3e185713cf7652d4' // Same solver everywhere
const USER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672'   // User on Base
const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570'  // Solver on both chains

// Contract addresses
const CONTRACTS = {
  USDC_ARB: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
  USDC_BASE: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  IMPROVED_ESCROW_BASE: '0xc1e96b02e2e1d6bcf0d77c97df369fe8e9da1816' as `0x${string}`
}

const RPC_URLS = {
  ARB: 'https://sepolia-rollup.arbitrum.io/rpc',
  BASE: 'https://sepolia.base.org'
}

const erc20Abi = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] }
]

export interface SimpleBridgeTransaction {
  hash: string
  chain: 'arbitrum' | 'base'
  type: 'arbitrum_transfer' | 'base_transfer'
  amount: string
  status: 'pending' | 'success' | 'error'
  timestamp: Date
  gasUsed?: string
  blockNumber?: string
  explorerUrl: string
  description: string
}

export class SimpleCrossChainBridge {
  private solverAccount
  private arbSolverClient
  private baseSolverClient
  private arbPublicClient
  private basePublicClient

  constructor() {
    // Same solver account for both chains
    this.solverAccount = privateKeyToAccount(SOLVER_PK)
    
    // Arbitrum client with solver
    this.arbSolverClient = createWalletClient({
      account: this.solverAccount,
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })

    // Base client with solver
    this.baseSolverClient = createWalletClient({
      account: this.solverAccount,
      chain: baseSepolia,
      transport: http(RPC_URLS.BASE)
    })

    this.arbPublicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })

    this.basePublicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URLS.BASE)
    })
  }

  async getBalances() {
    const [solverArbBalance, solverBaseBalance, userBaseBalance] = await Promise.all([
      // Solver balance on Arbitrum
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      }),
      // Solver balance on Base
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      }),
      // User balance on Base
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS]
      })
    ])

    return {
      solverArbitrum: (Number(solverArbBalance) / 1e6).toFixed(6),
      solverBase: (Number(solverBaseBalance) / 1e6).toFixed(6),
      userBase: (Number(userBaseBalance) / 1e6).toFixed(6)
    }
  }

  async executeSimpleCrossChainBridge(
    amountUSDC: number,
    onProgress: (step: string, transaction?: SimpleBridgeTransaction) => void
  ): Promise<SimpleBridgeTransaction[]> {
    const transferAmount = parseUnits(amountUSDC.toString(), 6)
    const transactions: SimpleBridgeTransaction[] = []

    onProgress('🌉 Starting REAL cross-chain bridge (NO FAKE Solver + CallBreaker)...')

    try {
      // STEP 1: REAL USDC transfer on Arbitrum (solver balance decreases)
      onProgress('💰 REAL USDC transfer on Arbitrum (solver balance will decrease)...')
      
      const arbTx = await this.arbSolverClient.writeContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [CONTRACTS.IMPROVED_ESCROW_BASE, transferAmount] // REAL TRANSFER!
      })

      const arbReceipt = await this.arbPublicClient.waitForTransactionReceipt({ hash: arbTx })
      
      const arbTransaction: SimpleBridgeTransaction = {
        hash: arbTx,
        chain: 'arbitrum',
        type: 'arbitrum_transfer',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: arbReceipt.gasUsed.toString(),
        blockNumber: arbReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.arbiscan.io/tx/${arbTx}`,
        description: `Solver sent ${amountUSDC} USDC on Arbitrum (REAL DECREASE)`
      }
      
      transactions.push(arbTransaction)
      onProgress('✅ Arbitrum transfer complete! Solver balance decreased.', arbTransaction)

      // Check if solver has Base liquidity
      const solverBaseBalance = await this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      })

      if (Number(solverBaseBalance) >= Number(transferAmount)) {
        // STEP 2: REAL USDC transfer on Base (user receives)
        onProgress('💰 REAL USDC transfer on Base (user will receive)...')
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const baseTx = await this.baseSolverClient.writeContract({
          address: CONTRACTS.USDC_BASE,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [USER_ADDRESS, transferAmount] // REAL TRANSFER!
        })

        const baseReceipt = await this.basePublicClient.waitForTransactionReceipt({ hash: baseTx })
        
        const baseTransaction: SimpleBridgeTransaction = {
          hash: baseTx,
          chain: 'base',
          type: 'base_transfer',
          amount: amountUSDC.toString(),
          status: 'success',
          timestamp: new Date(),
          gasUsed: baseReceipt.gasUsed.toString(),
          blockNumber: baseReceipt.blockNumber.toString(),
          explorerUrl: `https://sepolia.basescan.org/tx/${baseTx}`,
          description: `User received ${amountUSDC} USDC on Base`
        }
        
        transactions.push(baseTransaction)
        onProgress('✅ Base transfer complete! User received USDC.', baseTransaction)
      } else {
        onProgress(`❌ Solver needs ${amountUSDC} USDC on Base. Has ${(Number(solverBaseBalance) / 1e6).toFixed(6)} USDC.`)
      }

      return transactions

    } catch (error: any) {
      onProgress(`❌ Bridge failed: ${error.message}`)
      throw error
    }
  }

  getSolverAddress() {
    return SOLVER_ADDRESS
  }

  getUserAddress() {
    return USER_ADDRESS
  }
}
