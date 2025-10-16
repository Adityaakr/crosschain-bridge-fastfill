'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Users, Zap, Shield, ArrowDown, ArrowUp } from 'lucide-react'

export default function BridgeArchitecture() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Architecture Diagram */}
      <div className="relative bg-gray-800 bg-opacity-30 rounded-2xl p-8 border border-gray-700 mb-8">
        <h2 className="text-2xl font-bold text-center mb-8 text-white">Solver + CallBreaker Cross-Chain Bridge Architecture</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
          {/* Arbitrum Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="arbitrum-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-arbitrum rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h3 className="text-xl font-bold text-white">ARBITRUM</h3>
            </div>

            {/* App User */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="user-box mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-blue-400">App User</span>
              </div>
              <div className="text-sm text-gray-300">
                • Push user objective (approve or bridge)<br/>
                • Pre or post approve hooks
              </div>
            </motion.div>

            {/* Solver Arb */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="solver-box mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-purple-400">Solver Arb</span>
              </div>
              <div className="text-sm text-gray-300">
                • Listen for user objective pushed<br/>
                • Execute and verify (approve then bridge)
              </div>
            </motion.div>

            {/* CallBreaker Arb */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="callbreaker-box"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-orange-400" />
                <span className="font-semibold text-orange-400">Call Breaker Arb</span>
              </div>
              <div className="text-sm text-gray-300">
                • Pre or post approve hooks<br/>
                • Solver + CallBreaker coordination
              </div>
            </motion.div>
          </motion.div>

          {/* Base Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="base-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-base rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h3 className="text-xl font-bold text-white">BASE</h3>
            </div>

            {/* DEX Router */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="dex-box mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-red-400">DEX Router</span>
              </div>
            </motion.div>

            {/* Solver Base */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="solver-box mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-purple-400">Solver Base</span>
              </div>
              <div className="text-sm text-gray-300">
                • Listen and plan DAG<br/>
                • Execute and verify (claim, swap, then pay)
              </div>
            </motion.div>

            {/* CallBreaker Base */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="callbreaker-box mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-orange-400" />
                <span className="font-semibold text-orange-400">Call Breaker Base</span>
              </div>
              <div className="text-sm text-gray-300">
                • Pre or post approve hooks<br/>
                • Transfer proceeds
              </div>
            </motion.div>

            {/* User */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="user-box"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-blue-400">User</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Cross-chain Flow Arrows */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col items-center"
            >
              <ArrowDown className="w-6 h-6 text-solver animate-bounce-slow mb-2" />
              <div className="text-xs text-solver font-semibold bg-solver bg-opacity-20 px-2 py-1 rounded border border-solver border-opacity-30">
                CROSS-CHAIN
              </div>
              <ArrowUp className="w-6 h-6 text-solver animate-bounce-slow mt-2" />
            </motion.div>
          </div>
        </div>

        {/* Bridge Message Bus */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 p-4 bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600"
        >
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-blue-400">Bridge Message Bus</span>
          </div>
          <div className="text-sm text-gray-300">
            Deliver or fast fill • Push user objective (claim, swap, or pay)
          </div>
        </motion.div>
      </div>

      {/* Flow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="p-6 bg-blue-500 bg-opacity-10 rounded-lg border border-blue-500 border-opacity-30"
        >
          <div className="text-2xl font-bold text-blue-400 mb-2">1</div>
          <h3 className="font-semibold text-white mb-2">User Initiates</h3>
          <p className="text-sm text-gray-300">
            User pushes objective to Solver + CallBreaker CallBreaker on Arbitrum for cross-chain transfer
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="p-6 bg-purple-500 bg-opacity-10 rounded-lg border border-purple-500 border-opacity-30"
        >
          <div className="text-2xl font-bold text-purple-400 mb-2">2</div>
          <h3 className="font-semibold text-white mb-2">Solver Execution</h3>
          <p className="text-sm text-gray-300">
            Solvers provide instant liquidity on Base and coordinate settlement via Solver + CallBreaker
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="p-6 bg-orange-500 bg-opacity-10 rounded-lg border border-orange-500 border-opacity-30"
        >
          <div className="text-2xl font-bold text-orange-400 mb-2">3</div>
          <h3 className="font-semibold text-white mb-2">Settlement</h3>
          <p className="text-sm text-gray-300">
            Solver + CallBreaker coordinates atomic settlement across chains with post-approve validation
          </p>
        </motion.div>
      </div>
    </div>
  )
}
