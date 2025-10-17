'use client'

import { motion } from 'framer-motion'
import { ArrowRight, User, Shield, Zap, CheckCircle, Clock, Network, Database, Cpu } from 'lucide-react'
import { RealSTXNTransaction } from '../../lib/realSTXNBridge'

interface EnhancedNetworkFlowProps {
  transactions: RealSTXNTransaction[]
  isExecuting: boolean
  currentStep: string
}

export default function EnhancedNetworkFlow({ transactions, isExecuting, currentStep }: EnhancedNetworkFlowProps) {
  const getStepStatus = (stepNumber: number) => {
    const stepTransaction = transactions.find(tx => tx.step === stepNumber)
    if (stepTransaction) return 'completed'
    if (isExecuting && currentStep.includes(`Step ${stepNumber}`)) return 'executing'
    return 'pending'
  }

  const NetworkCard = ({ 
    title, 
    subtitle, 
    components, 
    color,
    transactions: networkTransactions 
  }: { 
    title: string
    subtitle: string
    components: Array<{name: string, status: 'active' | 'processing' | 'idle', description: string}>
    color: string
    transactions: RealSTXNTransaction[]
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border-2 ${color} backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Network className="w-6 h-6" />
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-sm opacity-80">{subtitle}</p>
          </div>
        </div>

        <div className="space-y-3">
          {components.map((component, index) => (
            <motion.div
              key={index}
              className={`p-3 rounded-lg border ${
                component.status === 'active' ? 'bg-green-50 border-green-200' :
                component.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    component.status === 'active' ? 'bg-green-500' :
                    component.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  <span className="font-medium">{component.name}</span>
                </div>
                {component.status === 'active' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {component.status === 'processing' && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">{component.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Network Transactions */}
        {networkTransactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-sm mb-2">Recent Transactions</h4>
            <div className="space-y-2">
              {networkTransactions.slice(0, 2).map((tx, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{tx.hash.slice(0, 10)}...</span>
                  <span className={`px-2 py-1 rounded ${
                    tx.status === 'success' ? 'bg-green-100 text-green-700' :
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const CrossChainArrow = ({ active }: { active: boolean }) => (
    <motion.div
      className="flex items-center justify-center"
      animate={{ scale: active ? 1.1 : 1 }}
    >
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
        active ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-100 border-2 border-gray-200'
      }`}>
        <ArrowRight className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className={`text-sm font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
          Cross-Chain
        </span>
      </div>
    </motion.div>
  )

  // Determine component statuses based on current execution
  const baseComponents: Array<{name: string, status: 'active' | 'processing' | 'idle', description: string}> = [
    {
      name: 'App User',
      status: (getStepStatus(1) === 'completed' ? 'active' : 
              getStepStatus(1) === 'executing' ? 'processing' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Initiates bridge request'
    },
    {
      name: 'Solver Base',
      status: (getStepStatus(1) === 'completed' ? 'active' : 
              getStepStatus(1) === 'executing' ? 'processing' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Deposits to escrow contract'
    },
    {
      name: 'CallBreaker Base',
      status: (getStepStatus(2) === 'completed' ? 'active' : 
              getStepStatus(2) === 'executing' ? 'processing' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Processes cross-chain objective'
    },
    {
      name: 'Escrow Contract',
      status: (getStepStatus(1) === 'completed' ? 'active' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Holds deposited USDC securely'
    }
  ]

  const arbitrumComponents: Array<{name: string, status: 'active' | 'processing' | 'idle', description: string}> = [
    {
      name: 'CallBreaker Arbitrum',
      status: (getStepStatus(2) === 'completed' ? 'active' : 
              getStepStatus(2) === 'executing' ? 'processing' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Executes cross-chain calls'
    },
    {
      name: 'DEX Router',
      status: (getStepStatus(2) === 'completed' ? 'active' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Handles token transfers'
    },
    {
      name: 'Solver Arbitrum',
      status: (getStepStatus(2) === 'completed' ? 'active' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Provides liquidity reserves'
    },
    {
      name: 'User Wallet',
      status: (getStepStatus(2) === 'completed' ? 'active' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Receives USDC tokens'
    }
  ]

  const bridgeComponents: Array<{name: string, status: 'active' | 'processing' | 'idle', description: string}> = [
    {
      name: 'Bridge Message Bus',
      status: (getStepStatus(2) === 'executing' ? 'processing' : 
              getStepStatus(2) === 'completed' ? 'active' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Cross-chain message relay'
    },
    {
      name: 'STXN Network',
      status: (getStepStatus(2) === 'executing' ? 'processing' : 
              getStepStatus(2) === 'completed' ? 'active' : 'idle') as 'active' | 'processing' | 'idle',
      description: 'Decentralized execution layer'
    }
  ]

  const baseTransactions = transactions.filter(tx => tx.chain === 'base')
  const arbitrumTransactions = transactions.filter(tx => tx.chain === 'arbitrum')

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Real-Time STXN CallBreaker Network Flow</h2>
        <p className="text-gray-600">Live visualization of cross-chain bridge execution across Base and Arbitrum networks</p>
      </div>

      {/* Network Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Base Network */}
        <NetworkCard
          title="Base Network"
          subtitle="Source Chain - Escrow & CallBreaker"
          components={baseComponents}
          color="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          transactions={baseTransactions}
        />

        {/* Bridge Layer */}
        <div className="space-y-4">
          <CrossChainArrow active={getStepStatus(2) === 'executing' || getStepStatus(2) === 'completed'} />
          
          <NetworkCard
            title="Bridge Infrastructure"
            subtitle="Cross-Chain Message Layer"
            components={bridgeComponents}
            color="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
            transactions={[]}
          />
          
          <CrossChainArrow active={getStepStatus(2) === 'executing' || getStepStatus(2) === 'completed'} />
        </div>

        {/* Arbitrum Network */}
        <NetworkCard
          title="Arbitrum Network"
          subtitle="Destination Chain - Liquidity & Execution"
          components={arbitrumComponents}
          color="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200"
          transactions={arbitrumTransactions}
        />
      </div>

      {/* Step Progress Indicator */}
      <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
        <h3 className="text-lg font-bold mb-4">Bridge Execution Progress</h3>
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => {
            const status = getStepStatus(step)
            const stepLabels = ['Escrow Deposit', 'Cross-Chain Liquidity', 'Solver Claim']
            
            return (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  status === 'completed' ? 'bg-green-500 text-white' :
                  status === 'executing' ? 'bg-blue-500 text-white animate-pulse' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                <div className="ml-3">
                  <div className="font-medium">{stepLabels[step - 1]}</div>
                  <div className="text-sm text-gray-600 capitalize">{status}</div>
                </div>
                {step < 3 && (
                  <ArrowRight className={`w-5 h-5 mx-4 ${
                    getStepStatus(step + 1) !== 'pending' ? 'text-blue-500' : 'text-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Status */}
      {currentStep && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Current Status:</span>
            <span className="text-blue-700">{currentStep}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
