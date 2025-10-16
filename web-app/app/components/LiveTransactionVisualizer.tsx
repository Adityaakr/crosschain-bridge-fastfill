'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle, Clock, Zap, ExternalLink, Users, Shield } from 'lucide-react'
import { SimpleBridgeTransaction } from '../../lib/simpleBridge'

interface LiveTransactionVisualizerProps {
  transactions: SimpleBridgeTransaction[]
  isExecuting: boolean
  currentStep: string
}

interface TransactionStep {
  id: string
  title: string
  description: string
  chain: 'arbitrum' | 'base'
  status: 'pending' | 'executing' | 'completed'
  transaction?: SimpleBridgeTransaction
}

export default function LiveTransactionVisualizer({ 
  transactions, 
  isExecuting, 
  currentStep 
}: LiveTransactionVisualizerProps) {
  const [steps, setSteps] = useState<TransactionStep[]>([
    {
      id: 'initiate',
      title: 'Initiate Cross-Chain Bridge',
      description: 'Solver initiates USDC transfer from Arbitrum to Base',
      chain: 'arbitrum',
      status: 'pending'
    },
    {
      id: 'Solver + CallBreaker_objective',
      title: 'Solver + CallBreaker Objective Creation',
      description: 'Push cross-chain objective to Solver + CallBreaker CallBreaker',
      chain: 'arbitrum',
      status: 'pending'
    },
    {
      id: 'solver_coordination',
      title: 'Solver + CallBreaker Solver Coordination',
      description: 'Solver + CallBreaker network coordinates cross-chain delivery',
      chain: 'base',
      status: 'pending'
    },
    {
      id: 'receiver_delivery',
      title: 'Receiver Gets USDC',
      description: 'Receiver wallet receives USDC on Base Sepolia',
      chain: 'base',
      status: 'pending'
    }
  ])

  // Update steps based on current execution state
  useEffect(() => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps]
      
      if (isExecuting) {
        // Mark initiate as executing
        newSteps[0].status = 'executing'
        
        if (currentStep.includes('Solver + CallBreaker')) {
          newSteps[0].status = 'completed'
          newSteps[1].status = 'executing'
        }
        
        if (currentStep.includes('coordinating')) {
          newSteps[1].status = 'completed'
          newSteps[2].status = 'executing'
        }
        
        if (currentStep.includes('complete')) {
          newSteps[2].status = 'completed'
          newSteps[3].status = 'completed'
        }
      }
      
      // Attach transactions to steps
      transactions.forEach(tx => {
        if (tx.chain === 'arbitrum' && tx.type === 'arbitrum_transfer') {
          newSteps[1].transaction = tx
          newSteps[1].status = 'completed'
        }
        if (tx.chain === 'base' && tx.type === 'base_transfer') {
          newSteps[3].transaction = tx
          newSteps[3].status = 'completed'
        }
      })
      
      return newSteps
    })
  }, [isExecuting, currentStep, transactions])

  const getStepIcon = (step: TransactionStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-success" />
      case 'executing':
        return <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      default:
        return <Clock className="w-6 h-6 text-gray-400" />
    }
  }

  const getChainBadge = (chain: 'arbitrum' | 'base') => {
    return (
      <div className={`px-2 py-1 rounded text-xs font-medium ${
        chain === 'arbitrum' 
          ? 'bg-arbitrum bg-opacity-20 text-arbitrum border border-arbitrum border-opacity-30'
          : 'bg-base bg-opacity-20 text-base border border-base border-opacity-30'
      }`}>
        {chain.toUpperCase()}
      </div>
    )
  }

  return (
    <div className="bg-gray-800 bg-opacity-30 rounded-2xl border border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-solver" />
        <h3 className="text-xl font-bold text-white">Live Cross-Chain Execution</h3>
        {isExecuting && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-success">EXECUTING</span>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-arbitrum bg-opacity-10 rounded-lg border border-arbitrum border-opacity-30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-arbitrum" />
            <span className="font-semibold text-arbitrum">Solver (Arbitrum)</span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            0x5A26514ce0AF943540407170B09ceA03cBFf5570
          </div>
          <div className="text-sm text-gray-300 mt-1">Has USDC • Initiates transfer</div>
        </div>

        <div className="p-4 bg-base bg-opacity-10 rounded-lg border border-base border-opacity-30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-base" />
            <span className="font-semibold text-base">Receiver (Base)</span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            0x3a159d24634A180f3Ab9ff37868358C73226E672
          </div>
          <div className="text-sm text-gray-300 mt-1">Receives USDC • Cross-chain delivery</div>
        </div>
      </div>

      {/* Transaction Steps */}
      <div className="space-y-4">
        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                step.status === 'completed'
                  ? 'bg-success bg-opacity-10 border-success border-opacity-30'
                  : step.status === 'executing'
                  ? 'bg-blue-500 bg-opacity-10 border-blue-500 border-opacity-30'
                  : 'bg-gray-700 bg-opacity-30 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStepIcon(step)}
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-white">{step.title}</h4>
                      {getChainBadge(step.chain)}
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{step.description}</p>
                  </div>
                </div>

                {step.transaction && (
                  <a
                    href={`https://sepolia.${step.chain === 'arbitrum' ? 'arbiscan' : 'basescan'}.org/tx/${step.transaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View TX
                  </a>
                )}
              </div>

              {step.transaction && (
                <div className="mt-3 p-3 bg-gray-700 bg-opacity-50 rounded text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Hash:</span>
                      <div className="font-mono text-gray-300">{step.transaction.hash.slice(0, 20)}...</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Gas Used:</span>
                      <div className="text-gray-300">{parseInt(step.transaction.gasUsed || '0').toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Solver + CallBreaker Flow Visualization */}
      <div className="mt-6 p-4 bg-solver bg-opacity-10 rounded-lg border border-solver border-opacity-30">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-solver" />
          <span className="font-semibold text-solver">Solver + CallBreaker Protocol Flow</span>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-arbitrum bg-opacity-20 border-2 border-arbitrum border-opacity-50 rounded-full flex items-center justify-center mb-2">
              <span className="text-arbitrum font-bold text-sm">ARB</span>
            </div>
            <div className="text-xs text-gray-400">Solver Locks USDC</div>
          </div>
          
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <ArrowRight className="w-6 h-6 text-solver" />
            <div className="text-xs text-solver font-semibold">Solver + CallBreaker</div>
            <ArrowRight className="w-6 h-6 text-solver" />
          </motion.div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-base bg-opacity-20 border-2 border-base border-opacity-50 rounded-full flex items-center justify-center mb-2">
              <span className="text-base font-bold text-sm">BASE</span>
            </div>
            <div className="text-xs text-gray-400">Receiver Gets USDC</div>
          </div>
        </div>
      </div>
    </div>
  )
}
