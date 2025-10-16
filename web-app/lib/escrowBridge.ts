import { createWalletClient, createPublicClient, http, parseUnits, keccak256, toBytes, parseEventLogs } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'

// Contract addresses and keys
const CONTRACTS = {
  IMPROVED_ESCROW_BASE: '0xc1e96b02e2e1d6bcf0d77c97df369fe8e9da1816' as `0x${string}`,
  USDC_ARB: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
  USDC_BASE: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
}

const RPC_URLS = {
  ARB: 'https://sepolia-rollup.arbitrum.io/rpc',
  BASE: 'https://sepolia.base.org'
}

// Wallet keys
const USER_PK = '0xec2180c5dfeaf12266daf34073e7de0c3a498014b2a35294e7bb7eb68ab3739a' // User on Base
const SOLVER_PK = '0xc77042f1e4dce562cc77815c20d33b6dbb020fc7795577ab3e185713cf7652d4' // Solver on both chains

const USER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672'
const SOLVER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570'

const erc20Abi = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] },
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}] }
]

// Simplified escrow ABI
const escrowAbi = [
  {
    "type": "function",
    "name": "depositFor",
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "minReceive", "type": "uint256"},
      {"name": "feeCap", "type": "uint256"},
      {"name": "targetChainId", "type": "uint256"},
      {"name": "targetToken", "type": "address"},
      {"name": "nonce", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "solverClaim",
    "inputs": [
      {"name": "depositId", "type": "bytes32"},
      {"name": "proof", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "DepositRequested",
    "inputs": [
      {"name": "depositId", "type": "bytes32", "indexed": true},
      {"name": "user", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false},
      {"name": "minReceive", "type": "uint256", "indexed": false},
      {"name": "targetChainId", "type": "uint256", "indexed": false},
      {"name": "targetToken", "type": "address", "indexed": false}
    ],
    "anonymous": false
  }
]

export interface EscrowBridgeTransaction {
  hash: string
  chain: 'arbitrum' | 'base'
  type: 'deposit' | 'instant_liquidity' | 'claim'
  amount: string
  status: 'pending' | 'success' | 'error'
  timestamp: Date
  gasUsed?: string
  blockNumber?: string
  explorerUrl: string
  description: string
}

export class EscrowCrossChainBridge {
  private userAccount
  private solverAccount
  private baseUserClient
  private baseSolverClient
  private arbSolverClient
  private basePublicClient
  private arbPublicClient

  constructor() {
    this.userAccount = privateKeyToAccount(USER_PK)
    this.solverAccount = privateKeyToAccount(SOLVER_PK)
    
    this.baseUserClient = createWalletClient({
      account: this.userAccount,
      chain: baseSepolia,
      transport: http(RPC_URLS.BASE)
    })

    this.baseSolverClient = createWalletClient({
      account: this.solverAccount,
      chain: baseSepolia,
      transport: http(RPC_URLS.BASE)
    })

    this.arbSolverClient = createWalletClient({
      account: this.solverAccount,
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })

    this.basePublicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URLS.BASE)
    })

    this.arbPublicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })
  }

  async getBalances() {
    const [userBaseBalance, userArbBalance, solverArbBalance, escrowBalance] = await Promise.all([
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS]
      }),
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS]
      }),
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SOLVER_ADDRESS]
      }),
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [CONTRACTS.IMPROVED_ESCROW_BASE]
      })
    ])

    return {
      userBase: (Number(userBaseBalance) / 1e6).toFixed(6),
      userArbitrum: (Number(userArbBalance) / 1e6).toFixed(6),
      solverArbitrum: (Number(solverArbBalance) / 1e6).toFixed(6),
      escrow: (Number(escrowBalance) / 1e6).toFixed(6)
    }
  }

  async executeEscrowBridge(
    amountUSDC: number,
    onProgress: (step: string, transaction?: EscrowBridgeTransaction) => void
  ): Promise<EscrowBridgeTransaction[]> {
    const bridgeAmount = parseUnits(amountUSDC.toString(), 6)
    const receiveAmount = parseUnits((amountUSDC * 0.99).toString(), 6) // 1% fee
    const transactions: EscrowBridgeTransaction[] = []

    onProgress('🏦 Starting escrow-based cross-chain bridge...')

    try {
      // STEP 1: User deposits into escrow on Base
      onProgress('💰 User depositing USDC into escrow on Base...')
      
      // Approve escrow
      const approveTx = await this.baseUserClient.writeContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.IMPROVED_ESCROW_BASE, bridgeAmount]
      })
      await this.basePublicClient.waitForTransactionReceipt({ hash: approveTx })

      // Deposit to escrow
      const nonce = keccak256(toBytes('escrow_bridge_' + Date.now().toString()))
      const depositTx = await this.baseUserClient.writeContract({
        address: CONTRACTS.IMPROVED_ESCROW_BASE,
        abi: escrowAbi,
        functionName: 'depositFor',
        args: [
          USER_ADDRESS,
          bridgeAmount,
          receiveAmount,
          parseUnits('0.01', 6), // 1% fee cap
          BigInt(421614), // Arbitrum Sepolia
          CONTRACTS.USDC_ARB,
          nonce
        ]
      })

      const depositReceipt = await this.basePublicClient.waitForTransactionReceipt({ hash: depositTx })
      
      const depositTransaction: EscrowBridgeTransaction = {
        hash: depositTx,
        chain: 'base',
        type: 'deposit',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: depositReceipt.gasUsed.toString(),
        blockNumber: depositReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.basescan.org/tx/${depositTx}`,
        description: `User deposited ${amountUSDC} USDC into escrow`
      }
      
      transactions.push(depositTransaction)
      onProgress('✅ USDC locked in escrow! Solver can now provide liquidity.', depositTransaction)

      // Get deposit ID from event
      const logs = await this.basePublicClient.getLogs({
        address: CONTRACTS.IMPROVED_ESCROW_BASE,
        fromBlock: depositReceipt.blockNumber,
        toBlock: depositReceipt.blockNumber
      })

      const parsedLogs = parseEventLogs({
        abi: escrowAbi,
        logs
      })

      const depositEvent = parsedLogs.find(log => 
        log.eventName === 'DepositRequested' && 
        log.transactionHash === depositTx
      )

      if (!depositEvent) {
        throw new Error('Could not find deposit event')
      }

      const depositId = depositEvent.args.depositId

      // STEP 2: Solver provides instant liquidity on Arbitrum
      onProgress('⚡ Solver providing instant liquidity on Arbitrum...')
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Dramatic pause
      
      const arbTransferTx = await this.arbSolverClient.writeContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [USER_ADDRESS, receiveAmount]
      })

      const arbTransferReceipt = await this.arbPublicClient.waitForTransactionReceipt({ hash: arbTransferTx })
      
      const liquidityTransaction: EscrowBridgeTransaction = {
        hash: arbTransferTx,
        chain: 'arbitrum',
        type: 'instant_liquidity',
        amount: (amountUSDC * 0.99).toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: arbTransferReceipt.gasUsed.toString(),
        blockNumber: arbTransferReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.arbiscan.io/tx/${arbTransferTx}`,
        description: `Solver provided ${(amountUSDC * 0.99).toFixed(2)} USDC instantly`
      }
      
      transactions.push(liquidityTransaction)
      onProgress('🎉 User received USDC instantly on Arbitrum!', liquidityTransaction)

      // STEP 3: Solver claims from escrow
      onProgress('🏦 Solver claiming from escrow...')
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create proof
      const proofData = {
        arbitrumTxHash: arbTransferTx,
        arbitrumBlock: arbTransferReceipt.blockNumber.toString(),
        receiver: USER_ADDRESS,
        amount: receiveAmount.toString(),
        timestamp: Date.now()
      }
      
      const proofHash = keccak256(toBytes(JSON.stringify(proofData)))
      
      const claimTx = await this.baseSolverClient.writeContract({
        address: CONTRACTS.IMPROVED_ESCROW_BASE,
        abi: escrowAbi,
        functionName: 'solverClaim',
        args: [depositId, proofHash]
      })
      
      const claimReceipt = await this.basePublicClient.waitForTransactionReceipt({ hash: claimTx })
      
      const claimTransaction: EscrowBridgeTransaction = {
        hash: claimTx,
        chain: 'base',
        type: 'claim',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: claimReceipt.gasUsed.toString(),
        blockNumber: claimReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.basescan.org/tx/${claimTx}`,
        description: `Solver claimed ${amountUSDC} USDC from escrow`
      }
      
      transactions.push(claimTransaction)
      onProgress('🎉 Everyone wins! Cross-chain bridge complete!', claimTransaction)

      return transactions

    } catch (error: any) {
      onProgress(`❌ Bridge failed: ${error.message}`)
      throw error
    }
  }

  getUserAddress() {
    return USER_ADDRESS
  }

  getSolverAddress() {
    return SOLVER_ADDRESS
  }

  getEscrowAddress() {
    return CONTRACTS.IMPROVED_ESCROW_BASE
  }
}
