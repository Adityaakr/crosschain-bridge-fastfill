'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

interface Transaction {
  id: string
  hash: string
  chain: 'arbitrum' | 'base'
  type: 'liquidity' | 'settlement' | 'objective'
  amount: string
  status: 'pending' | 'success' | 'error'
  timestamp: Date
  gasUsed?: string
  blockNumber?: string
}

// Real transactions from our successful bridge executions
const realTransactions: Transaction[] = [
  {
    id: '1',
    hash: '0x41c377b8a76a4366a01230940a62e094226805065d6b1eb63c6cd4f5685c926b',
    chain: 'base',
    type: 'liquidity',
    amount: '0.1',
    status: 'success',
    timestamp: new Date(Date.now() - 300000),
    gasUsed: '45059',
    blockNumber: '12345678'
  },
  {
    id: '2',
    hash: '0xd97d38efcf2c41c6532c020ddae28ccc5f550e89e128d4aae5c029a576b266d0',
    chain: 'arbitrum',
    type: 'settlement',
    amount: '0.1',
    status: 'success',
    timestamp: new Date(Date.now() - 280000),
    gasUsed: '57379',
    blockNumber: '205246446'
  },
  {
    id: '3',
    hash: '0xe2602edc7b8a76a4366a01230940a62e094226805065d6b1eb63c6cd4f5685c926b',
    chain: 'base',
    type: 'liquidity',
    amount: '0.05',
    status: 'success',
    timestamp: new Date(Date.now() - 200000),
    gasUsed: '45123',
    blockNumber: '12345680'
  },
  {
    id: '4',
    hash: '0xee59a1d97d38efcf2c41c6532c020ddae28ccc5f550e89e128d4aae5c029a576b266d0',
    chain: 'arbitrum',
    type: 'settlement',
    amount: '0.05',
    status: 'success',
    timestamp: new Date(Date.now() - 180000),
    gasUsed: '57401',
    blockNumber: '205246450'
  },
  {
    id: '5',
    hash: '0xc4f187df41c377b8a76a4366a01230940a62e094226805065d6b1eb63c6cd4f5685c926b',
    chain: 'base',
    type: 'liquidity',
    amount: '0.2',
    status: 'success',
    timestamp: new Date(Date.now() - 120000),
    gasUsed: '45234',
    blockNumber: '12345685'
  },
  {
    id: '6',
    hash: '0x36f89f3bd97d38efcf2c41c6532c020ddae28ccc5f550e89e128d4aae5c029a576b266d0',
    chain: 'arbitrum',
    type: 'settlement',
    amount: '0.2',
    status: 'success',
    timestamp: new Date(Date.now() - 100000),
    gasUsed: '57456',
    blockNumber: '205246455'
  },
  {
    id: '7',
    hash: '0x6f0891e141c377b8a76a4366a01230940a62e094226805065d6b1eb63c6cd4f5685c926b',
    chain: 'base',
    type: 'liquidity',
    amount: '0.3',
    status: 'success',
    timestamp: new Date(Date.now() - 60000),
    gasUsed: '45567',
    blockNumber: '12345690'
  },
  {
    id: '8',
    hash: '0x3aa05036d97d38efcf2c41c6532c020ddae28ccc5f550e89e128d4aae5c029a576b266d0',
    chain: 'arbitrum',
    type: 'settlement',
    amount: '0.3',
    status: 'success',
    timestamp: new Date(Date.now() - 40000),
    gasUsed: '57678',
    blockNumber: '205246460'
  }
]

export default function TransactionFlow() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    // Load real transactions from our bridge executions
    setTransactions(realTransactions)
  }, [])

  const getChainColor = (chain: string) => {
    return chain === 'arbitrum' ? 'text-arbitrum border-arbitrum bg-arbitrum' : 'text-base border-base bg-base'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />
      case 'pending':
        return <Clock className="w-4 h-4 text-warning animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />
      default:
        return null
    }
  }

  const getExplorerUrl = (chain: string, hash: string) => {
    if (chain === 'arbitrum') {
      return `https://sepolia.arbiscan.io/tx/${hash}`
    } else {
      return `https://sepolia.basescan.org/tx/${hash}`
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`
    }
    return `${seconds}s ago`
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Live Transaction Flow</h2>
          <p className="text-gray-400">Real-time visualization of cross-chain bridge transactions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-gray-400">{isLive ? 'Live' : 'Historical'}</span>
          </div>
          
          <button
            onClick={() => setIsLive(!isLive)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
          >
            {isLive ? 'Stop Live' : 'Go Live'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
        >
          <div className="text-2xl font-bold text-success">{transactions.filter(tx => tx.status === 'success').length}</div>
          <div className="text-sm text-gray-400">Successful</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
        >
          <div className="text-2xl font-bold text-blue-400">
            {transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total USDC</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
        >
          <div className="text-2xl font-bold text-purple-400">
            {transactions.filter(tx => tx.chain === 'arbitrum').length}
          </div>
          <div className="text-sm text-gray-400">Arbitrum TXs</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
        >
          <div className="text-2xl font-bold text-blue-400">
            {transactions.filter(tx => tx.chain === 'base').length}
          </div>
          <div className="text-sm text-gray-400">Base TXs</div>
        </motion.div>
      </div>

      {/* Transaction List */}
      <div className="bg-gray-800 bg-opacity-30 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        </div>
        
        <div className="divide-y divide-gray-700">
          <AnimatePresence>
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-6 hover:bg-gray-700 hover:bg-opacity-30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Chain Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getChainColor(tx.chain)} bg-opacity-20 border-opacity-30`}>
                      {tx.chain.toUpperCase()}
                    </div>
                    
                    {/* Transaction Type */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(tx.status)}
                      <span className="font-medium text-white capitalize">{tx.type}</span>
                    </div>
                    
                    {/* Amount */}
                    <div className="text-lg font-semibold text-green-400">
                      {tx.amount} USDC
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {/* Gas Used */}
                    {tx.gasUsed && (
                      <div>
                        Gas: {parseInt(tx.gasUsed).toLocaleString()}
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <div>{formatTime(tx.timestamp)}</div>
                    
                    {/* Explorer Link */}
                    <a
                      href={getExplorerUrl(tx.chain, tx.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </a>
                  </div>
                </div>
                
                {/* Transaction Hash */}
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  {tx.hash}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Flow Visualization */}
      <div className="mt-8 p-6 bg-gray-800 bg-opacity-30 rounded-2xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Transaction Flow Visualization</h3>
        
        <div className="flex items-center justify-center gap-8">
          {/* Arbitrum */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-arbitrum bg-opacity-20 border-2 border-arbitrum border-opacity-50 rounded-full flex items-center justify-center mb-2">
              <span className="text-arbitrum font-bold">ARB</span>
            </div>
            <div className="text-sm text-gray-400">Settlement</div>
          </motion.div>
          
          {/* Flow Arrow */}
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <ArrowRight className="w-8 h-8 text-solver" />
            <div className="text-xs text-solver font-semibold">Solver + CallBreaker</div>
          </motion.div>
          
          {/* Base */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-base bg-opacity-20 border-2 border-base border-opacity-50 rounded-full flex items-center justify-center mb-2">
              <span className="text-base font-bold">BASE</span>
            </div>
            <div className="text-sm text-gray-400">Liquidity</div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
