import { createWalletClient, createPublicClient, http, parseUnits, encodePacked, keccak256, parseAbiItem } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'

// REAL AUTOMATIC STXN BRIDGE WITH EVENT DETECTION
// Flow: Base → Arbitrum with proper cross-chain liquidity and automatic claiming
// Base Solver: 0x3a159... (deposits to escrow, provides liquidity, claims from escrow)
// Arbitrum User: 0x5A265... (receives liquidity on Arbitrum)

const BASE_SOLVER_PK = process.env.ARB_RELAYER_PK || '0xec2180c5dfeaf12266daf34073e7de0c3a498014b2a35294e7bb7eb68ab3739a'
const ARB_USER_PK = process.env.BASE_RELAYER_PK || '0xc77042f1e4dce562cc77815c20d33b6dbb020fc7795577ab3e185713cf7652d4'

const BASE_SOLVER_ADDRESS = '0x3a159d24634A180f3Ab9ff37868358C73226E672'  // Solver on Base
const ARB_USER_ADDRESS = '0x5A26514ce0AF943540407170B09ceA03cBFf5570'    // User on Arbitrum

// Real Contract Addresses
const CONTRACTS = {
  IMPROVED_ESCROW_BASE: process.env.IMPROVED_ESCROW_BASE as `0x${string}` || '0xc1e96b02e2e1d6bcf0d77c97df369fe8e9da1816',
  USDC_ARB: process.env.USDC_ARB as `0x${string}` || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  USDC_BASE: process.env.USDC_BASE as `0x${string}` || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
}

const RPC_URLS = {
  ARB: process.env.ARB_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  BASE: process.env.BASE_RPC_URL || 'https://sepolia.base.org'
}

// ERC20 ABI
const erc20Abi = [
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
] as const

// Escrow ABI with events
const escrowAbi = [
  {
    type: 'function',
    name: 'depositFor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minReceive', type: 'uint256' },
      { name: 'feeCap', type: 'uint256' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'targetToken', type: 'address' },
      { name: 'nonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'solverClaim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositId', type: 'bytes32' },
      { name: 'proofHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'deposits',
    stateMutability: 'view',
    inputs: [{ name: 'depositId', type: 'bytes32' }],
    outputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minReceive', type: 'uint256' },
      { name: 'feeCap', type: 'uint256' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'targetToken', type: 'address' },
      { name: 'claimed', type: 'bool' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    type: 'event',
    name: 'DepositRequested',
    inputs: [
      { name: 'depositId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'minReceive', type: 'uint256' },
      { name: 'feeCap', type: 'uint256' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'targetToken', type: 'address' }
    ]
  },
  {
    type: 'event',
    name: 'SolverClaim',
    inputs: [
      { name: 'depositId', type: 'bytes32', indexed: true },
      { name: 'solver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'proofHash', type: 'bytes32' }
    ]
  }
] as const

export interface RealAutomaticSTXNTransaction {
  hash: string
  chain: 'arbitrum' | 'base'
  type: 'escrow_deposit' | 'cross_chain_liquidity' | 'solver_claim'
  amount: string
  status: 'pending' | 'success' | 'failed'
  timestamp: Date
  gasUsed?: string
  blockNumber?: string
  explorerUrl: string
  description: string
  step: number
  depositId?: string
  from?: string
  to?: string
}

export class RealAutomaticSTXNCallBreakerBridge {
  private baseSolverAccount
  private arbUserAccount
  private baseSolverClient
  private arbUserClient
  private arbPublicClient
  private basePublicClient
  private eventWatcher: any = null

  constructor() {
    // Real accounts for proper cross-chain setup
    this.baseSolverAccount = privateKeyToAccount(BASE_SOLVER_PK as `0x${string}`)
    this.arbUserAccount = privateKeyToAccount(ARB_USER_PK as `0x${string}`)

    // Base solver client (deposits to escrow, provides liquidity, claims)
    this.baseSolverClient = createWalletClient({
      account: this.baseSolverAccount,
      chain: baseSepolia,
      transport: http(RPC_URLS.BASE)
    })

    // Arbitrum user client (receives liquidity)
    this.arbUserClient = createWalletClient({
      account: this.arbUserAccount,
      chain: arbitrumSepolia,
      transport: http(RPC_URLS.ARB)
    })

    // Public clients for reading and events
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
    const [baseSolverBaseBalance, baseSolverArbBalance, arbUserArbBalance, escrowBalance] = await Promise.all([
      // Base solver balance on Base
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [BASE_SOLVER_ADDRESS]
      }),
      // Base solver balance on Arbitrum (for providing liquidity)
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [BASE_SOLVER_ADDRESS]
      }),
      // Arbitrum user balance on Arbitrum (receives liquidity)
      this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [ARB_USER_ADDRESS]
      }),
      // Escrow balance
      this.basePublicClient.readContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [CONTRACTS.IMPROVED_ESCROW_BASE]
      })
    ])

    return {
      userBase: (Number(baseSolverBaseBalance) / 1e6).toFixed(6),        // Base solver balance on Base
      userArbitrum: (Number(arbUserArbBalance) / 1e6).toFixed(6),       // Arbitrum user balance on Arbitrum
      solverBase: (Number(baseSolverBaseBalance) / 1e6).toFixed(6),     // Base solver balance on Base
      solverArbitrum: (Number(baseSolverArbBalance) / 1e6).toFixed(6),  // Base solver balance on Arbitrum
      escrow: (Number(escrowBalance) / 1e6).toFixed(6)
    }
  }

  private generateDepositId(user: string, amount: bigint, minReceive: bigint, feeCap: bigint, targetChainId: bigint, targetToken: string, nonce: string): string {
    const encoded = encodePacked(
      ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'address', 'bytes32', 'uint256', 'address'],
      [user as `0x${string}`, amount, minReceive, feeCap, targetChainId, targetToken as `0x${string}`, nonce as `0x${string}`, BigInt(84532), CONTRACTS.IMPROVED_ESCROW_BASE]
    )
    return keccak256(encoded)
  }

  // Start watching for deposit events and automatically provide liquidity + claim
  private async startEventWatcher(onProgress: (step: string, transaction?: RealAutomaticSTXNTransaction) => void) {
    if (this.eventWatcher) {
      this.eventWatcher() // Stop existing watcher
    }

    onProgress('👀 Starting automatic event detection...')

    this.eventWatcher = this.basePublicClient.watchContractEvent({
      address: CONTRACTS.IMPROVED_ESCROW_BASE,
      abi: escrowAbi,
      eventName: 'DepositRequested',
      onLogs: async (logs) => {
        for (const log of logs) {
          const { depositId, user, amount, minReceive } = log.args
          
          if (depositId && user && amount && minReceive) {
            onProgress(`🔔 Detected deposit event! DepositId: ${depositId}`)
            
            // Automatically provide cross-chain liquidity and claim
            await this.handleDepositEvent(depositId, user, amount, minReceive, onProgress)
          }
        }
      }
    })
  }

  // Handle detected deposit event - provide liquidity and claim
  private async handleDepositEvent(
    depositId: string, 
    user: string, 
    amount: bigint, 
    minReceive: bigint,
    onProgress: (step: string, transaction?: RealAutomaticSTXNTransaction) => void
  ) {
    try {
      onProgress(`⚡ Auto-handling deposit ${depositId}...`)

      // Step 1: Provide cross-chain liquidity (Base solver → Arbitrum user)
      onProgress(`💰 Providing ${(Number(minReceive) / 1e6).toFixed(6)} USDC liquidity from Base solver to Arbitrum user...`)

      // Check if Base solver has enough USDC on Arbitrum
      const solverArbBalance = await this.arbPublicClient.readContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [BASE_SOLVER_ADDRESS]
      })

      if (solverArbBalance < minReceive) {
        onProgress(`❌ Base solver has insufficient USDC on Arbitrum: ${(Number(solverArbBalance) / 1e6).toFixed(6)} < ${(Number(minReceive) / 1e6).toFixed(6)}`)
        return
      }

      // Create wallet client for Base solver on Arbitrum
      const baseSolverArbClient = createWalletClient({
        account: this.baseSolverAccount,
        chain: arbitrumSepolia,
        transport: http(RPC_URLS.ARB)
      })

      // Provide liquidity: Base solver → Arbitrum user
      const liquidityTx = await baseSolverArbClient.writeContract({
        address: CONTRACTS.USDC_ARB,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [ARB_USER_ADDRESS as `0x${string}`, minReceive]
      })

      const liquidityReceipt = await this.arbPublicClient.waitForTransactionReceipt({ hash: liquidityTx })
      
      const liquidityTransaction: RealAutomaticSTXNTransaction = {
        hash: liquidityTx,
        chain: 'arbitrum',
        type: 'cross_chain_liquidity',
        amount: (Number(minReceive) / 1e6).toFixed(6),
        status: 'success',
        timestamp: new Date(),
        gasUsed: liquidityReceipt.gasUsed.toString(),
        blockNumber: liquidityReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.arbiscan.io/tx/${liquidityTx}`,
        description: `Base solver provided ${(Number(minReceive) / 1e6).toFixed(6)} USDC to Arbitrum user`,
        step: 2,
        depositId,
        from: BASE_SOLVER_ADDRESS,
        to: ARB_USER_ADDRESS
      }
      
      onProgress(`✅ Cross-chain liquidity provided: ${liquidityTx}`, liquidityTransaction)

      // Step 2: Automatically claim from escrow
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait a bit
      
      onProgress(`💎 Auto-claiming ${(Number(amount) / 1e6).toFixed(6)} USDC from escrow...`)

      const proofHash = keccak256(encodePacked(['string', 'bytes32'], ['cross_chain_proof', depositId as `0x${string}`]))
      
      const claimTx = await this.baseSolverClient.writeContract({
        address: CONTRACTS.IMPROVED_ESCROW_BASE,
        abi: escrowAbi,
        functionName: 'solverClaim',
        args: [depositId as `0x${string}`, proofHash]
      })

      const claimReceipt = await this.basePublicClient.waitForTransactionReceipt({ hash: claimTx })
      
      const claimTransaction: RealAutomaticSTXNTransaction = {
        hash: claimTx,
        chain: 'base',
        type: 'solver_claim',
        amount: (Number(amount) / 1e6).toFixed(6),
        status: 'success',
        timestamp: new Date(),
        gasUsed: claimReceipt.gasUsed.toString(),
        blockNumber: claimReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.basescan.org/tx/${claimTx}`,
        description: `Base solver auto-claimed ${(Number(amount) / 1e6).toFixed(6)} USDC from escrow`,
        step: 3,
        depositId
      }
      
      onProgress(`✅ Auto-claim successful: ${claimTx}`, claimTransaction)
      onProgress(`🎉 Automatic bridge complete! User got liquidity, solver got reimbursed!`)

    } catch (error: any) {
      onProgress(`❌ Auto-handling failed: ${error.message}`)
    }
  }

  async executeRealSTXNBridge(
    amountUSDC: number,
    onProgress: (step: string, transaction?: RealAutomaticSTXNTransaction) => void
  ): Promise<RealAutomaticSTXNTransaction[]> {
    const amount = parseUnits(amountUSDC.toString(), 6)
    const minReceive = parseUnits((amountUSDC * 0.98).toString(), 6) // 98% (2% fee)
    const feeCap = parseUnits((amountUSDC * 0.02).toString(), 6) // 2% fee cap
    const targetChainId = BigInt(421614) // Arbitrum Sepolia
    const targetToken = CONTRACTS.USDC_ARB
    const nonce = keccak256(encodePacked(['uint256'], [BigInt(Date.now())]))
    
    const transactions: RealAutomaticSTXNTransaction[] = []

    onProgress('🚀 Starting Real Automatic STXN Bridge: Base → Arbitrum')

    try {
      // Start event watcher for automatic handling
      await this.startEventWatcher(onProgress)

      // STEP 1: Base solver deposits USDC into escrow contract
      onProgress(`💰 Step 1: Base solver depositing ${amountUSDC} USDC ....`)
      
      // Ensure large allowance to avoid repeated approvals
      const largeAllowance = parseUnits('1000', 6) // 1000 USDC allowance
      
      const approveTx = await this.baseSolverClient.writeContract({
        address: CONTRACTS.USDC_BASE,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.IMPROVED_ESCROW_BASE, largeAllowance]
      })

      await this.basePublicClient.waitForTransactionReceipt({ hash: approveTx })
      
      // Deposit to escrow
      const depositTx = await this.baseSolverClient.writeContract({
        address: CONTRACTS.IMPROVED_ESCROW_BASE,
        abi: escrowAbi,
        functionName: 'depositFor',
        args: [
          BASE_SOLVER_ADDRESS, // user
          amount,              // amount
          minReceive,          // minReceive
          feeCap,              // feeCap
          targetChainId,       // targetChainId
          targetToken,         // targetToken
          nonce                // nonce
        ]
      })

      const depositReceipt = await this.basePublicClient.waitForTransactionReceipt({ hash: depositTx })
      
      const depositId = this.generateDepositId(
        BASE_SOLVER_ADDRESS,
        amount,
        minReceive,
        feeCap,
        targetChainId,
        targetToken,
        nonce
      )
      
      const depositTransaction: RealAutomaticSTXNTransaction = {
        hash: depositTx,
        chain: 'base',
        type: 'escrow_deposit',
        amount: amountUSDC.toString(),
        status: 'success',
        timestamp: new Date(),
        gasUsed: depositReceipt.gasUsed.toString(),
        blockNumber: depositReceipt.blockNumber.toString(),
        explorerUrl: `https://sepolia.basescan.org/tx/${depositTx}`,
        description: `Base solver deposited ${amountUSDC} USDC into escrow contract`,
        step: 1,
        depositId
      }
      
      transactions.push(depositTransaction)
      onProgress(`✅ Step 1 Complete: ${amountUSDC} USDC deposited! Event watcher will handle the rest automatically...`, depositTransaction)

      // The event watcher will automatically handle steps 2 and 3
      onProgress(`🤖 Waiting for automatic event detection and processing...`)

      return transactions

    } catch (error: any) {
      onProgress(`❌ Real STXN Bridge failed: ${error.message}`)
      throw error
    }
  }

  // Stop event watcher
  stopEventWatcher() {
    if (this.eventWatcher) {
      this.eventWatcher()
      this.eventWatcher = null
    }
  }

  getUserAddress() {
    return ARB_USER_ADDRESS  // Arbitrum user address
  }

  getSolverAddress() {
    return BASE_SOLVER_ADDRESS   // Base solver address
  }

  getEscrowAddress() {
    return CONTRACTS.IMPROVED_ESCROW_BASE
  }
}
