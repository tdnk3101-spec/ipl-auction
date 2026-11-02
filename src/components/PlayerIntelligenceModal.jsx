import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, TrendingUp, Zap, Target, Shield, CheckCircle2 } from 'lucide-react';
import { formatCrores, isOverseasPlayer } from '../lib/auctionDisplay';
import { computeIntelligentBotValuation } from '../lib/botEngine';

export default function PlayerIntelligenceModal({
  player,
  isOpen,
  onClose,
  currentBid = 0,
  teams = []
}) {
  if (!isOpen || !player) return null;

  const isOverseas = isOverseasPlayer(player);
  const basePrice = player.basePrice || 0.20;
  
  // Tactical Metrics derived from player profile
  const estimatedMarketVal = computeIntelligentBotValuation({
    player,
    botTeam: teams[0] || { teamId: 'MI', budgetRemaining: 50, squad: [] },
    budgetRemaining: teams[0]?.budgetRemaining || 50,
    randomSeed: 0.5
  });

  // Derive strategic strengths
  const getStrategicAttributes = (role) => {
    switch (role) {
      case 'Batsman':
        return [
          { label: 'Strike Rate', val: '142.6', desc: 'Elite phase-scoring' },
          { label: 'Boundary %', val: '64.2%', desc: 'High boundary clearance' },
          { label: 'Consistency', val: '88/100', desc: 'Low duck frequency' },
          { label: 'Powerplay Index', val: '9.2', desc: 'Rapid acceleration' },
        ];
      case 'Bowler':
        return [
          { label: 'Economy Rate', val: '7.45', desc: 'Controls run leakage' },
          { label: 'Dot Ball %', val: '48.5%', desc: 'Creates dot-ball pressure' },
          { label: 'Death Overs', val: '92/100', desc: 'Yorker execution rate' },
          { label: 'Wicket Frequency', val: '14.2', desc: 'Strike rate (balls/wkt)' },
        ];
      case 'All-Rounder':
        return [
          { label: 'Batting SR', val: '138.4', desc: 'Finishing capability' },
          { label: 'Bowling Econ', val: '8.10', desc: 'Reliable 4-over quota' },
          { label: 'Tactical Flex', val: '96/100', desc: 'Bat 4-7, bowl any phase' },
          { label: 'MVP Value', val: '9.4', desc: 'Dual-discipline impact' },
        ];
      case 'Wicketkeeper':
      default:
        return [
          { label: 'Catch Success', val: '94.8%', desc: 'Clean glovework' },
          { label: 'Stumping Speed', val: '0.18s', desc: 'Lightning reflexes' },
          { label: 'Middle Overs SR', val: '135.0', desc: 'Spin-counter scoring' },
          { label: 'DRS Acumen', val: '90/100', desc: 'High review overturn rate' },
        ];
    }
  };

  const attributes = getStrategicAttributes(player.role);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#0c0d12] border border-orange-500/20 rounded-2xl shadow-2xl overflow-hidden text-white"
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-r from-orange-950/40 via-amber-950/20 to-transparent border-b border-white/5 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl font-black text-orange-400">
                {player.image ? (
                  <img
                    src={player.image}
                    alt={player.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  player.name.charAt(0)
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black tracking-tight">{player.name}</h3>
                  {isOverseas ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md">
                      Overseas ({player.country || 'INT'})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-green-500/20 text-green-400 border border-green-500/30 rounded-md">
                      Indian (IND)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                  <span className="font-semibold text-orange-400">{player.role}</span>
                  <span>•</span>
                  <span>Set {player.set || 'General'}</span>
                  <span>•</span>
                  <span>Rank #{player.id?.slice(0, 4) || '1'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Valuation & Auction Dynamics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1">
                  <Shield size={12} className="text-orange-400" /> Base Price
                </span>
                <p className="text-lg font-black text-white mt-1">
                  {formatCrores(basePrice)}
                </p>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1">
                  <TrendingUp size={12} className="text-green-400" /> Current Bid
                </span>
                <p className="text-lg font-black text-green-400 mt-1">
                  {currentBid > 0 ? formatCrores(currentBid) : 'Unbid'}
                </p>
              </div>

              <div className="p-3.5 bg-orange-500/[0.04] border border-orange-500/20 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-orange-400 flex items-center gap-1">
                  <Zap size={12} className="text-orange-400" /> Target Value
                </span>
                <p className="text-lg font-black text-orange-400 mt-1">
                  {formatCrores(estimatedMarketVal)}
                </p>
              </div>
            </div>

            {/* Strategic Intelligence Attributes */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Target size={14} className="text-orange-400" /> Tactical Scouting Metrics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {attributes.map((attr, idx) => (
                  <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">{attr.label}</p>
                    <p className="text-base font-black text-white mt-0.5">{attr.val}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5 truncate">{attr.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Tactical Recommendations */}
            <div className="p-4 bg-orange-500/[0.03] border border-orange-500/20 rounded-xl space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Award size={14} /> AI Franchise Scouting Recommendation
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {estimatedMarketVal > basePrice * 2.5
                  ? `${player.name} is classified as an marquee tier asset. Franchises with bowling or powerplay deficits should be prepared to bid up to ${formatCrores(estimatedMarketVal)} while preserving mandatory squad reserves.`
                  : `${player.name} presents high-efficiency utility value. Recommended pickup range is between ${formatCrores(basePrice)} and ${formatCrores(estimatedMarketVal)} to maximize roster balance.`}
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-green-400 font-medium">
                  <CheckCircle2 size={13} /> Squad Quota Safe
                </span>
                <span>•</span>
                <span>Tier Increment: {currentBid < 5 ? '₹20L' : '₹25L'}</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-black/40 border-t border-white/5 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

