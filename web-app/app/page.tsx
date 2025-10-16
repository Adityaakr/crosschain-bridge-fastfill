'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BridgeArchitecture from './components/BridgeArchitecture'
import TransactionFlow from './components/TransactionFlow'
import BridgeInterface from './components/BridgeInterface'
import { ArrowRightLeft, Activity, Zap } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'transactions' | 'bridge'>('architecture')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-Solver + CallBreaker bg-opacity-20 rounded-full border border-Solver + CallBreaker border-opacity-30">
            <Zap className="w-8 h-8 text-Solver + CallBreaker" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
            Cross-chain Bridge Fast-fill
          </h1>
        </div>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Cross-chain USDC bridge powered by Solver + CallBreaker for instant liquidity and atomic settlement
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-2xl mx-auto">
          <div className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-success">100%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">&lt;10s</div>
            <div className="text-sm text-gray-400">Avg Transfer Time</div>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">0.65</div>
            <div className="text-sm text-gray-400">USDC Bridged</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex justify-center mb-8"
      >
        <div className="flex bg-gray-800 bg-opacity-50 rounded-lg p-1 border border-gray-700">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-200 ${
              activeTab === 'architecture'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Architecture
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-200 ${
              activeTab === 'transactions'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Live Transactions
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-200 ${
              activeTab === 'bridge'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Bridge Interface
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'architecture' && <BridgeArchitecture />}
          {activeTab === 'transactions' && <TransactionFlow />}
          {activeTab === 'bridge' && <BridgeInterface />}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
