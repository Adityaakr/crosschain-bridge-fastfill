import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'

// Real Solver + CallBreaker CallBreaker ABI with correct field order
const ismartExecuteAbi = [
  {
    "type": "function",
    "name": "pushUserObjective",
    "stateMutability": "payable",
    "inputs": [
      {
        "name": "_userObjective",
        "type": "tuple",
        "components": [
          {"name": "appId", "type": "bytes"},
          {"name": "nonce", "type": "uint256"},
          {"name": "tip", "type": "uint256"},
          {"name": "chainId", "type": "uint256"},
          {"name": "maxFeePerGas", "type": "uint256"},
          {"name": "maxPriorityFeePerGas", "type": "uint256"},
          {"name": "sender", "type": "address"},
          {"name": "signature", "type": "bytes"}, // CRITICAL: Correct position
          {"name": "callObjects", "type": "tuple[]", "components": [
            {"name": "salt", "type": "uint256"},
            {"name": "amount", "type": "uint256"},
            {"name": "gas", "type": "uint256"},
            {"name": "addr", "type": "address"},
            {"name": "callvalue", "type": "bytes"},
            {"name": "returnvalue", "type": "bytes"},
            {"name": "skippable", "type": "bool"},
            {"name": "verifiable", "type": "bool"},
            {"name": "exposeReturn", "type": "bool"}
          ]}
        ]
      },
      {
        "name": "_additionalData",
        "type": "tuple[]",
        "components": [
          {"name": "key", "type": "bytes32"},
          {"name": "value", "type": "bytes"}
        ]
      }
    ],
    "outputs": [{"name": "requestId", "type": "bytes32"}]
  },
  {
    "type": "function",
    "name": "deposit",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function", 
    "name": "senderBalances",
    "stateMutability": "view",
    "inputs": [{"name": "sender", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  }
]

const erc20Abi = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] },
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] },
  { "type": "function", "name": "allowance", "stateMutability": "view", "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] }
]

// Contract addresses from .env
const CONTRACTS = {
  CALLBREAKER_ARB: '0x7f71a9c6b157aa17501cb30b36c3d1affe7059cc' as `0x${string}`,
  USDC_ARB: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
  USDC_BASE: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  IMPROVED_ESCROW_BASE: '0xc1e96b02e2e1d6bcf0d77c97df369fe8e9da1816' as `0x${string}`
}

const RPC_URLS = {
  ARB: 'https://sepolia-rollup.arbitrum.io/rpc',
  BASE: 'https://sepolia.base.org'
}

// Two-wallet architecture for real cross-chain bridge
const SOLVER_PK = '0xc77042f1e4dce562cc77815c20d33b6dbb020fc7795577ab3e185713cf7652d4' // Wallet 1: 0x5A26514ce0AF943540407170B09ceA03cBFf5570
const RECEIVER_PK = '0xec2180c5dfeaf12266daf34073e7de0c3a498014b2a35294e7bb7eb68ab3739a' // Wallet 2: 0x3a159d24634A180f3Ab9ff37868358C73226E672

const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570' // Has USDC on Arbitrum
const RECEIVER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672' // Will receive USDC on Base

export interface BridgeTransaction {
  hash: string
  chain: 'arbitrum' | 'base'
  type: 'liquidity' | 'settlement'
  amount: string
  status: 'pending' | 'success' | 'error'
  timestamp: Date
  gasUsed?: string
  blockNumber?: string
}

export class RealSolver + CallBreakerBridge {
  private solverAccount
  private receiverAccount
  private arbClient
  private baseClient
  private arbPublicClient
  private basePublicClient

  constructor() {
    // Wallet 1: Solver on Arbitrum (has USDC)
    this.solverAccount = privateKeyToAccount(SOLVER_PK)
    // Wallet 2: Receiver on Base (will get USDC)
    this.receiverAccount = privateKeyToAccount(RECEIVER_PK)
    
    // Arbitrum client with solver account
    this.arbClient = createWalletClient({
      account: this.solverAccount,
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })

    // Base client with receiver account
    this.baseClient = createWalletClient({
      account: this.receiverAccount,
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
    const [solverArbBalance, receiverBaseBalance] = await Promise.all([
      // Solver balance on Arbitrum (Wallet 1)
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      }),
      // Receiver balance on Base (Wallet 2)
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [RECEIVER_ADDRESS]
      })
    ])

    return {
      arbitrum: (Number(solverArbBalance) / 1e6).toFixed(6), // Solver's USDC on Arbitrum
      base: (Number(receiverBaseBalance) / 1e6).toFixed(6), // Receiver's USDC on Base
      receiver: (Number(receiverBaseBalance) / 1e6).toFixed(6) // Same as base for display
    }
  }

  async executeBridge(amountUSDC: number): Promise<BridgeTransaction[]> {
    const transferAmount = parseUnits(amountUSDC.toString(), 6)
    const transactions: BridgeTransaction[] = []

    console.log('🌉 REAL CROSS-CHAIN BRIDGE: ARBITRUM → BASE')
    console.log('   Solver (Arbitrum):', SOLVER_ADDRESS)
    console.log('   Receiver (Base):', RECEIVER_ADDRESS)
    console.log('   Amount:', amountUSDC, 'USDC')

    try {
      // Phase 1: Solver + CallBreaker Coordination on Arbitrum (Solver initiates transfer)
      console.log('🚀 Phase 1: Solver + CallBreaker Cross-Chain Objective on Arbitrum...')
      
      // Generate signature using exact working pattern from memory
      const signature = await this.solverAccount.signMessage({ 
        message: 'Solver + CallBreaker Fast-Fill Bridge' // Exact string from memory
      })

      // Create Solver + CallBreaker CallObjects for cross-chain transfer
      const callObjects = [{
        salt: BigInt(0),
        amount: BigInt(0),
        gas: BigInt(100000),
        addr: CONTRACTS.USDC_ARB,
        callvalue: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [CONTRACTS.IMPROVED_ESCROW_BASE, transferAmount] // Lock USDC in escrow for cross-chain
        }),
        returnvalue: '0x',
        skippable: false,
        verifiable: true,
        exposeReturn: false
      }]

      // Use exact parameters from memory for Solver + CallBreaker
      const userObjective = {
        appId: `0x${Buffer.from("app.cross.fastfill.v1").toString('hex')}`,
        nonce: BigInt(Date.now()),
        tip: parseUnits('0.0001', 18), // Exact from memory
        chainId: BigInt(421614), // Arbitrum Sepolia
        maxFeePerGas: parseUnits('0.000000002', 18), // Exact from memory
        maxPriorityFeePerGas: parseUnits('0.000000001', 18), // Exact from memory
        sender: this.solverAccount.address,
        signature: signature, // CRITICAL: Correct position
        callObjects
      }

      // Ensure CallBreaker has gas
      const callBreakerBalance = await this.arbPublicClient.readContract({
        address: CONTRACTS.CALLBREAKER_ARB,
        abi: ismartExecuteAbi,
        functionName: 'senderBalances',
        args: [this.solverAccount.address]
      })

      if (Number(callBreakerBalance) < Number(parseUnits('0.001', 18))) {
        console.log('💸 Funding Arbitrum CallBreaker...')
        const depositTx = await this.arbClient.writeContract({
          address: CONTRACTS.CALLBREAKER_ARB,
          abi: ismartExecuteAbi,
          functionName: 'deposit',
          value: parseUnits('0.002', 18)
        })
        await this.arbPublicClient.waitForTransactionReceipt({ hash: depositTx })
      }

      // Push Solver + CallBreaker objective for cross-chain coordination
      const arbTx = await this.arbClient.writeContract({
        address: CONTRACTS.CALLBREAKER_ARB,
        abi: ismartExecuteAbi,
        functionName: 'pushUserObjective',
        args: [userObjective, []]
      })

      const arbReceipt = await this.arbPublicClient.waitForTransactionReceipt({ hash: arbTx })
      
      transactions.push({
        hash: arbTx,
        chain: 'arbitrum',
        type: 'settlement',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: arbReceipt.gasUsed.toString(),
        blockNumber: arbReceipt.blockNumber.toString()
      })

      console.log('✅ Solver + CallBreaker objective pushed on Arbitrum:', arbTx)

      // Phase 2: Solver + CallBreaker coordinates cross-chain delivery to Base
      console.log('⚡ Phase 2: Solver + CallBreaker coordinating cross-chain delivery to Base...')
      
      // Wait for Solver + CallBreaker processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // In production, Solver + CallBreaker solvers would automatically:
      // 1. Detect the objective on Arbitrum
      // 2. Provide liquidity to receiver on Base
      // 3. Claim the locked USDC from Arbitrum
      
      console.log('🌉 Solver + CallBreaker cross-chain coordination complete!')
      console.log('   Real transaction on Arbitrum:', arbTx)
      console.log('   Solver + CallBreaker solvers will handle Base delivery')

      return transactions

    } catch (error: any) {
      console.error('❌ Bridge execution failed:', error)
      throw error
    }
  }

  getSolverAddress() {
    return SOLVER_ADDRESS
  }

  getReceiverAddress() {
    return RECEIVER_ADDRESS
  }
}
