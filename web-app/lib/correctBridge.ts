import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'

// CORRECT 2-WALLET SETUP
const SOLVER_PK = '0xc77042f1e4dce562cc77815c20d33b6dbb020fc7795577ab3e185713cf7652d4' // Wallet 1: Solver
const USER_PK = '0xec2180c5dfeaf12266daf34073e7de0c3a498014b2a35294e7bb7eb68ab3739a'   // Wallet 2: User

const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570' // Solver on Arbitrum
const USER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672'   // User on Base

// Contract addresses
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

const erc20Abi = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] },
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] }
]

// Solver + CallBreaker CallBreaker ABI with correct signature field
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

export interface CorrectBridgeTransaction {
  hash: string
  chain: 'arbitrum' | 'base'
  type: 'Solver + CallBreaker_objective' | 'instant_delivery'
  amount: string
  status: 'pending' | 'success' | 'error'
  timestamp: Date
  gasUsed?: string
  blockNumber?: string
  explorerUrl: string
  description: string
}

export class CorrectCrossChainBridge {
  private solverAccount
  private userAccount
  private arbSolverClient
  private baseUserClient
  private arbPublicClient
  private basePublicClient

  constructor() {
    // Wallet 1: Solver on Arbitrum (has USDC, initiates transfer)
    this.solverAccount = privateKeyToAccount(SOLVER_PK)
    // Wallet 2: User on Base (receives USDC)
    this.userAccount = privateKeyToAccount(USER_PK)
    
    // Arbitrum client with solver account
    this.arbSolverClient = createWalletClient({
      account: this.solverAccount,
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })

    // Base client with solver account (for providing liquidity)
    this.baseUserClient = createWalletClient({
      account: this.solverAccount, // Solver provides liquidity on Base
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
    const [solverArbBalance, userBaseBalance] = await Promise.all([
      // Solver balance on Arbitrum (Wallet 1)
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      }),
      // User balance on Base (Wallet 2)
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS]
      })
    ])

    return {
      solverArbitrum: (Number(solverArbBalance) / 1e6).toFixed(6), // Wallet 1 on Arbitrum
      userBase: (Number(userBaseBalance) / 1e6).toFixed(6)         // Wallet 2 on Base
    }
  }

  async executeCorrectCrossChainBridge(
    amountUSDC: number,
    onProgress: (step: string, transaction?: CorrectBridgeTransaction) => void
  ): Promise<CorrectBridgeTransaction[]> {
    const transferAmount = parseUnits(amountUSDC.toString(), 6)
    const transactions: CorrectBridgeTransaction[] = []

    onProgress('🌉 Starting REAL Arbitrum → Base cross-chain bridge...')

    try {
      // STEP 1: Solver transfers USDC on Arbitrum (REAL TRANSFER - NOT FAKE Solver + CallBreaker!)
      onProgress('💰 Solver transferring USDC on Arbitrum (REAL TRANSFER)...')
      
      const arbTransferTx = await this.arbSolverClient.writeContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [CONTRACTS.IMPROVED_ESCROW_BASE, transferAmount] // REAL USDC TRANSFER!
      })

      const arbTransferReceipt = await this.arbPublicClient.waitForTransactionReceipt({ hash: arbTransferTx })
      
      const transferTransaction: CorrectBridgeTransaction = {
        hash: arbTransferTx,
        chain: 'arbitrum',
        type: 'Solver + CallBreaker_objective',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: arbTransferReceipt.gasUsed.toString(),
        blockNumber: arbTransferReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.arbiscan.io/tx/${arbTransferTx}`,
        description: `Solver transferred ${amountUSDC} USDC on Arbitrum (REAL DECREASE)`
      }
      
      transactions.push(transferTransaction)
      onProgress('✅ REAL USDC transfer complete! Solver Arbitrum balance decreased.', transferTransaction)

      // STEP 2: Push Solver + CallBreaker objective for coordination
      onProgress('🔧 Pushing Solver + CallBreaker objective for cross-chain coordination...')
      
      // Generate signature using exact working pattern from memory
      const signature = await this.solverAccount.signMessage({ 
        message: 'Solver + CallBreaker Fast-Fill Bridge' // Exact string from memory
      })

      // Create Solver + CallBreaker CallObjects for cross-chain coordination
      const callObjects = [{
        salt: BigInt(0),
        amount: BigInt(0),
        gas: BigInt(100000),
        addr: CONTRACTS.USDC_ARB,
        callvalue: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [CONTRACTS.IMPROVED_ESCROW_BASE, transferAmount] // Lock USDC for cross-chain
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
        signature: signature, // CRITICAL: Correct position from memory
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
        onProgress('💸 Funding Solver + CallBreaker CallBreaker...')
        const depositTx = await this.arbSolverClient.writeContract({
          address: CONTRACTS.CALLBREAKER_ARB,
          abi: ismartExecuteAbi,
          functionName: 'deposit',
          value: parseUnits('0.002', 18)
        })
        await this.arbPublicClient.waitForTransactionReceipt({ hash: depositTx })
      }

      // Push Solver + CallBreaker objective
      const arbTx = await this.arbSolverClient.writeContract({
        address: CONTRACTS.CALLBREAKER_ARB,
        abi: ismartExecuteAbi,
        functionName: 'pushUserObjective',
        args: [userObjective, []]
      })

      const arbReceipt = await this.arbPublicClient.waitForTransactionReceipt({ hash: arbTx })
      
      const Solver + CallBreakerTransaction: CorrectBridgeTransaction = {
        hash: arbTx,
        chain: 'arbitrum',
        type: 'Solver + CallBreaker_objective',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: arbReceipt.gasUsed.toString(),
        blockNumber: arbReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.arbiscan.io/tx/${arbTx}`,
        description: `Solver pushed Solver + CallBreaker objective for ${amountUSDC} USDC cross-chain transfer`
      }
      
      transactions.push(Solver + CallBreakerTransaction)
      onProgress('✅ Solver + CallBreaker objective pushed! Cross-chain coordination active.', Solver + CallBreakerTransaction)

      // STEP 3: Check solver liquidity on Base and provide instant delivery
      onProgress('⚡ Checking solver liquidity on Base...')
      
      const solverBaseBalance = await this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      })

      if (Number(solverBaseBalance) < Number(transferAmount)) {
        onProgress(`❌ Insufficient solver liquidity on Base. Need ${amountUSDC} USDC, have ${(Number(solverBaseBalance) / 1e6).toFixed(6)} USDC`)
        throw new Error(`Solver needs ${amountUSDC} USDC on Base to provide liquidity. Current balance: ${(Number(solverBaseBalance) / 1e6).toFixed(6)} USDC`)
      }
      
      // Wait for Solver + CallBreaker processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      onProgress('⚡ Solver providing instant liquidity to User on Base...')
      
      // Solver provides instant liquidity to User on Base (real cross-chain!)
      const baseTx = await this.baseUserClient.writeContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [USER_ADDRESS, transferAmount] // SOLVER → USER (different addresses!)
      })

      const baseReceipt = await this.basePublicClient.waitForTransactionReceipt({ hash: baseTx })
      
      const deliveryTransaction: CorrectBridgeTransaction = {
        hash: baseTx,
        chain: 'base',
        type: 'instant_delivery',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: baseReceipt.gasUsed.toString(),
        blockNumber: baseReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.basescan.org/tx/${baseTx}`,
        description: `User received ${amountUSDC} USDC instantly on Base`
      }
      
      transactions.push(deliveryTransaction)
      onProgress('🎉 Cross-chain bridge complete! User received USDC on Base.', deliveryTransaction)

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

  getCallBreakerAddress() {
    return CONTRACTS.CALLBREAKER_ARB
  }
}
