'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Wallet, Settings, Info, ExternalLink, Zap, CheckCircle, AlertCircle, Shield, Flame } from 'lucide-react'
import { RealSTXNCallBreakerBridge, RealSTXNTransaction } from '../../lib/realSTXNBridge'
import FlowDiagram from './FlowDiagram'
import EnhancedNetworkFlow from './EnhancedNetworkFlow'

export default function BridgeInterface() {
  const [amount, setAmount] = useState('')
  const [isConnected, setIsConnected] = useState(true) // Auto-connect for demo
  const [isLoading, setIsLoading] = useState(false)
  const [fromChain, setFromChain] = useState<'arbitrum' | 'base'>('base')
  const [toChain, setToChain] = useState<'arbitrum' | 'base'>('arbitrum')
  const [balances, setBalances] = useState({
    arbitrum: '0.000000',
    base: '0.000000',
    receiver: '0.000000'
  })
  const [transactions, setTransactions] = useState<RealSTXNTransaction[]>([])
  const [bridge] = useState(new RealSTXNCallBreakerBridge())
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [currentExecutionStep, setCurrentExecutionStep] = useState('')

  const handleSwapChains = () => {
    setFromChain(toChain)
    setToChain(fromChain)
  }

  // Load real balances on component mount
  useEffect(() => {
    const loadBalances = async () => {
      try {
        const realBalances = await bridge.getBalances()
        setBalances({
          arbitrum: realBalances.userArbitrum,   // User balance on Arbitrum (DEPOSITS from here)
          base: realBalances.userBase,           // User balance on Base (RECEIVES here)
          receiver: realBalances.userBase        // User balance on Base (RECEIVES here)
        })
      } catch (error) {
        console.error('Failed to load balances:', error)
      }
    }
    
    loadBalances()
    // Refresh balances every 30 seconds
    const interval = setInterval(loadBalances, 30000)
    return () => clearInterval(interval)
  }, [bridge])

  const handleBridge = async () => {
    if (!amount || !isConnected) return
    
    setIsLoading(true)
    setBridgeStatus('idle')
    setStatusMessage('Initiating real cross-chain bridge...')
    setCurrentExecutionStep('Initiating cross-chain bridge')
    
    try {
      const amountNum = parseFloat(amount)
      
      const transactions = await bridge.executeRealSTXNBridge(amountNum, (step: string, transaction?: RealSTXNTransaction) => {
        setCurrentExecutionStep(step)
        setStatusMessage(step)
        
        if (transaction) {
          setTransactions(prev => [transaction, ...prev].slice(0, 10))
        }
      })
      
      // Update balances
      const newBalances = await bridge.getBalances()
      setBalances({
        arbitrum: newBalances.userArbitrum,   // User balance on Arbitrum (receives here)
        base: newBalances.userBase,           // User balance on Base (deposits from here)
        receiver: newBalances.userArbitrum    // User balance on Arbitrum (receives here)
      })
      
      setCurrentExecutionStep('Cross-chain bridge complete')
      setBridgeStatus('success')
      setStatusMessage(`Successfully executed real bridge Transaction: ${amount} USDC from Base to Arbitrum!`)
      setAmount('')
      
    } catch (error: any) {
      setBridgeStatus('error')
      setStatusMessage(`Bridge failed: ${error.message}`)
      setCurrentExecutionStep('Bridge execution failed')
      console.error('Bridge execution failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const estimatedTime = '< 10 seconds'
  const estimatedFee = '0.002 USDC'
  const minReceive = amount ? (parseFloat(amount) * 0.998).toFixed(6) : '0'

  return (
    <div className="max-w-7xl mx-auto">
      {/* Bridge Interface - Landscape Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-8 mb-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Flow Cross-Chain Bridge</h1>
            <p className="text-lg text-blue-600 font-medium">Base → Arbitrum</p>
          </div>
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full">
            <Flame className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">FLOW BRIDGE</span>
          </div>
        </div>

        {/* Landscape Layout - Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Bridge Controls */}
          <div className="space-y-6">
            {/* From Chain */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-700">From</span>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Balance</div>
                  <div className="text-2xl font-bold text-blue-900">{balances[fromChain]} USDC</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">
                    {fromChain === 'arbitrum' ? 'ARB' : 'BASE'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {fromChain === 'arbitrum' ? 'Arbitrum Sepolia' : 'Base Sepolia'}
                  </h3>
                  <p className="text-gray-600">
                    {fromChain === 'arbitrum' ? 'Layer 2 Scaling Solution' : ' L2 Network'}
                  </p>
                </div>
              </div>
            </div>

            {/* To Chain */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-700">To</span>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Balance</div>
                  <div className="text-2xl font-bold text-blue-900">{balances[toChain]} USDC</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">
                    {toChain === 'arbitrum' ? 'ARB' : 'BASE'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {toChain === 'arbitrum' ? 'Arbitrum Sepolia' : 'Base Sepolia'}
                  </h3>
                  <p className="text-gray-600">
                    {toChain === 'arbitrum' ? 'Layer 2 Scaling Solution' : ' L2 Network'}
                  </p>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapChains}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full border border-gray-600 transition-colors"
              >
                <ArrowDown className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Amount Input */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-700">Amount</span>
                <button
                  onClick={() => setAmount(balances[fromChain])}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  MAX
                </button>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white text-right text-3xl font-bold text-gray-900 placeholder-gray-400 outline-none border-2 border-blue-200 rounded-xl p-4 focus:border-blue-500 transition-colors"
                />
                <span className="text-xl font-bold text-gray-700">USDC</span>
              </div>
            </div>

            {/* Bridge Button */}
            <button
              onClick={handleBridge}
              disabled={!amount || !isConnected || isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-lg rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Executing Bridge...
                </div>
              ) : (
                'Execute Transaction'
              )}
            </button>
          </div>

          {/* Right Column - Transaction Details */}
          <div className="space-y-6">
            {/* Transaction Summary */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">You Send</span>
                  <span className="font-semibold text-gray-900">{amount || '0'} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bridge Fee (0.005%)</span>
                  <span className="font-semibold text-green-600">{amount ? (parseFloat(amount) * 0.00005).toFixed(6) : '0'} USDC (Covered by Solver)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">You Receive</span>
                  <span className="font-semibold text-gray-900">{amount || '0'} USDC</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Time</span>
                    <span className="font-semibold text-blue-600">{estimatedTime}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Status Display */}
            {(bridgeStatus !== 'idle' || statusMessage) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${
                  bridgeStatus === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : bridgeStatus === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                {bridgeStatus === 'success' && <CheckCircle className="w-6 h-6" />}
                {bridgeStatus === 'error' && <AlertCircle className="w-6 h-6" />}
                {bridgeStatus === 'idle' && <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                <span className="font-medium">{statusMessage}</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Live Transaction Visualizer */}
      {(isLoading || transactions.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <EnhancedNetworkFlow 
            transactions={transactions}
            isExecuting={isLoading}
            currentStep={currentExecutionStep}
          />
          <FlowDiagram 
            transactions={transactions}
            isExecuting={isLoading}
            currentStep={currentExecutionStep}
          />
        </motion.div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl border-2 border-blue-200 shadow-lg"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Flow Bridge</h3>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Revolutionary burner address flow that guarantees instant cross-chain transfers 
            with 99% efficiency and 1% solver fee.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-gray-200 shadow-lg"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-600 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Secure & Trustless</h3>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            Funds are secured in burner address with guaranteed solver reimbursement. 
            No trust required between parties.
          </p>
          
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 p-8 bg-white rounded-3xl border-2 border-gray-200 shadow-lg"
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Bridge Transactions</h3>
        
        <div className="space-y-4">
          {transactions.length > 0 ? (
            transactions.map((tx, index) => (
              <div key={index} className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-gray-50 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${
                    tx.status === 'success' ? 'bg-green-500' : 
                    tx.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-gray-900">{tx.amount} USDC</span>
                    <span className="text-gray-600 text-sm">
                      {tx.type === 'escrow_deposit' ? 'Escrow Deposit' : 
                       tx.type === 'cross_chain_liquidity' ? 'Cross-Chain Liquidity' : 
                       tx.type === 'solver_claim' ? 'Solver Claim' : 'Unknown'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {tx.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <a
                  href={`https://sepolia.${tx.chain === 'arbitrum' ? 'arbiscan' : 'basescan'}.org/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-xl"
                >
                  <ExternalLink className="w-4 h-4" />
                  View TX
                </a>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-2xl">
              <div className="text-lg font-medium mb-2">No Recent Transactions</div>
              <div className="text-sm">Execute a bridge to see real transaction data here</div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
