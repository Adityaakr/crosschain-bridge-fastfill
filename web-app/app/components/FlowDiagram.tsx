'use client'

import { motion } from 'framer-motion'
import { ArrowRight, User, Shield, Flame, CheckCircle, Clock, Zap } from 'lucide-react'
import { RealSTXNTransaction } from '../../lib/realSTXNBridge'

interface FlowDiagramProps {
  transactions: RealSTXNTransaction[]
  isExecuting: boolean
  currentStep: string
}

export default function FlowDiagram({ transactions, isExecuting, currentStep }: FlowDiagramProps) {
  const chainColors = {
    base: 'from-blue-500 to-blue-600',
    arbitrum: 'from-orange-500 to-red-500'
  }

  const getStepStatus = (stepNumber: number) => {
    const stepTransaction = transactions.find(tx => tx.step === stepNumber)
    if (stepTransaction) return 'completed'
    if (isExecuting && currentStep.includes(`Step ${stepNumber}`)) return 'executing'
    return 'pending'
  }

  const StepBox = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    status, 
    chain,
    transaction 
  }: {
    title: string
    subtitle: string
    icon: any
    status: 'pending' | 'executing' | 'completed'
    chain: 'base' | 'arbitrum'
    transaction?: RealSTXNTransaction
  }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'completed': return 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-100'
        case 'executing': return 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-100 animate-pulse'
        default: return 'bg-slate-50 border-slate-300 text-slate-700'
      }
    }

    const getIconColor = () => {
      switch (status) {
        case 'completed': return 'text-emerald-600 bg-emerald-100'
        case 'executing': return 'text-amber-600 bg-amber-100'
        default: return 'text-slate-500 bg-slate-100'
      }
    }

    const getChainColor = () => {
      return chain === 'base' ? 'bg-blue-500 text-white font-medium' : 'bg-orange-500 text-white font-medium'
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative p-4 rounded-xl border-2 ${getStatusColor()} backdrop-blur-sm`}
        whileHover={{ scale: 1.02 }}
      >
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${getChainColor()} opacity-10`} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${chainColors[chain]} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 font-bold text-lg">{title}</h3>
              <p className="text-gray-600 text-sm">{subtitle}</p>
            </div>
            <div className="flex items-center">
              {status === 'completed' && <CheckCircle className="w-6 h-6 text-green-600" />}
              {status === 'executing' && <Clock className="w-6 h-6 text-blue-600 animate-spin" />}
              {status === 'pending' && <div className="w-6 h-6 rounded-full border-2 border-gray-400" />}
            </div>
          </div>
          
          {transaction && (
            <div className="mt-4 p-3 bg-white/80 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">Amount: {transaction.amount} USDC</span>
                <a
                  href={transaction.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View TX
                </a>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Gas: {transaction.gasUsed} | Block: {transaction.blockNumber}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const FlowArrow = ({ active }: { active: boolean }) => (
    <motion.div 
      className="flex justify-center items-center"
      animate={{ scale: active ? 1.1 : 1 }}
    >
      <div className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 shadow-lg ${
        active 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-400 text-white' 
          : 'bg-white border-slate-300 text-slate-500'
      }`}>
        <ArrowRight className={`w-6 h-6 ${active ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-bold">
          {active ? 'EXECUTING' : 'PENDING'}
        </span>
      </div>
    </motion.div>
  )

  return (
    <div className="w-full max-w-7xl mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-blue-100">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Cross-Chain Bridge Flow
        </h2>
        <p className="text-lg text-slate-600 font-medium">Real-time USDC transfer: Base → Arbitrum</p>
      </div>

      {/* Chain Labels */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg">
            <div className="w-5 h-5 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-bold text-xl">BASE SEPOLIA</span>
          </div>
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg">
            <ArrowRight className="w-7 h-7 text-white animate-bounce" />
            <span className="text-white font-bold text-xl">BRIDGE</span>
          </div>
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg">
            <div className="w-5 h-5 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-bold text-xl">ARBITRUM SEPOLIA</span>
          </div>
        </div>
      </div>

      {/* Flow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
        {/* Step 1: Escrow Deposit on Base */}
        <div className="md:col-span-3">
          <StepBox
            title="Step 1: Escrow Deposit"
            subtitle="Base Solver locks USDC in escrow"
            icon={User}
            status={getStepStatus(1)}
            chain="base"
            transaction={transactions.find(tx => tx.step === 1)}
          />
        </div>

        <FlowArrow active={getStepStatus(1) === 'completed'} />

        {/* Step 2: Cross-Chain Liquidity on Arbitrum */}
        <div className="md:col-span-3">
          <StepBox
            title="Step 2: Instant Liquidity"
            subtitle="Solver provides 99% USDC cross-chain"
            icon={Zap}
            status={getStepStatus(2)}
            chain="arbitrum"
            transaction={transactions.find(tx => tx.step === 2)}
          />
        </div>

        <FlowArrow active={getStepStatus(2) === 'completed'} />

        {/* Step 3: Solver Claims from Escrow */}
        <div className="md:col-span-3">
          <StepBox
            title="Step 3: Solver Claim"
            subtitle="Claim USDC from Base escrow"
            icon={Shield}
            status={getStepStatus(3)}
            chain="base"
            transaction={transactions.find(tx => tx.step === 3)}
          />
        </div>
      </div>

      {/* Current Status */}
      {isExecuting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/30"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-white font-medium">{currentStep}</span>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {transactions.length === 3 && !isExecuting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-xl border border-green-500/30"
        >
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Bridge Complete! 🎉</h3>
            <p className="text-gray-300">
              User received USDC on Arbitrum, Solver claimed from burner. Everyone wins!
            </p>
          </div>
        </motion.div>
      )}

      {/* Flow Description */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-white font-semibold mb-2">1. User Deposits</h4>
          <p className="text-gray-400 text-sm">
            User deposits USDC to burner address on Base. Funds are locked and visible to solver.
          </p>
        </div>
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-white font-semibold mb-2">2. Instant Liquidity</h4>
          <p className="text-gray-400 text-sm">
            Solver sees guaranteed funds and provides 99% USDC to user on Arbitrum instantly.
          </p>
        </div>
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-white font-semibold mb-2">3. Solver Claims</h4>
          <p className="text-gray-400 text-sm">
            Solver claims the full deposit from burner address, earning 1% fee for the service.
          </p>
        </div>
      </div>
    </div>
  )
}
