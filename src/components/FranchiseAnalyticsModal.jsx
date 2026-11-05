import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Wallet, Users, Globe, BarChart2, ShieldAlert, Award } from 'lucide-react';
import { formatCrores, countOverseas } from '../lib/auctionDisplay';
import { generateSquadStrategicAnalysis, IPL_FRANCHISE_PROFILES } from '../lib/botEngine';
import { IPL_PLAYERS } from '../data/players';

export default function FranchiseAnalyticsModal({
  isOpen,
  onClose,
  teams = [],
  squadLimit = 25,
  overseasLimit = 8
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.teamId || 'CSK');

  if (!isOpen) return null;

  const currentTeam = teams.find((t) => t.teamId === selectedTeamId) || teams[0] || {};
  const squad = currentTeam.squad || [];
  const overseasCount = countOverseas(squad, IPL_PLAYERS);
  const remainingSlots = Math.max(0, squadLimit - squad.length);
  const profile = IPL_FRANCHISE_PROFILES[currentTeam.teamId] || {};

  // Strategic analysis computed using our dedicated engine
  const analysis = generateSquadStrategicAnalysis(currentTeam, squadLimit) || {};

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-[#0b0c10] border border-orange-500/20 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-orange-950/40 via-amber-950/20 to-transparent border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <BarChart2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Franchise Intelligence & Squad Analytics</h3>
                <p className="text-xs text-gray-400">Live roster balance, purse efficiency, and strategic grading</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Franchise Selector Pills */}
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 overflow-x-auto bg-black/30">
            {teams.map((t) => {
              const isSelected = t.teamId === selectedTeamId;
              return (
                <button
                  key={t.teamId}
                  onClick={() => setSelectedTeamId(t.teamId)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${isSelected
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {t.teamId}
                </button>
              );
            })}
          </div>

          {/* Main Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                  <Wallet size={12} className="text-green-400" /> Remaining Purse
                </span>
                <p className="text-xl font-black text-green-400 mt-1">
                  {formatCrores(currentTeam.budgetRemaining || 0)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Spent: {formatCrores(currentTeam.spent || 0)}
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                  <Users size={12} className="text-blue-400" /> Squad Size
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {squad.length} <span className="text-xs text-gray-500 font-normal">/ {squadLimit}</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {remainingSlots} slots remaining
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                  <Globe size={12} className="text-purple-400" /> Overseas Slots
                </span>
                <p className="text-xl font-black text-purple-400 mt-1">
                  {overseasCount} <span className="text-xs text-gray-500 font-normal">/ {overseasLimit}</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {Math.max(0, overseasLimit - overseasCount)} slots free
                </p>
              </div>

              <div className="p-4 bg-orange-500/[0.04] border border-orange-500/20 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider uppercase text-orange-400 flex items-center gap-1.5">
                  <Award size={12} className="text-orange-400" /> Squad Grade
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-orange-400">{analysis.grade}</span>
                  <span className="text-xs text-gray-400 font-semibold">{analysis.score}/100</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  Reserve Safety: {analysis.reserveCompliance ? 'Safe' : 'At Risk'}
                </p>
              </div>
            </div>

            {/* Role Distribution Grid */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-orange-400" /> Positional Distribution
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Batsmen', count: analysis.breakdown?.Batsman || 0, color: 'text-amber-400' },
                  { label: 'Bowlers', count: analysis.breakdown?.Bowler || 0, color: 'text-blue-400' },
                  { label: 'All-Rounders', count: analysis.breakdown?.['All-Rounder'] || 0, color: 'text-green-400' },
                  { label: 'Wicketkeepers', count: analysis.breakdown?.Wicketkeeper || 0, color: 'text-purple-400' },
                ].map((pos) => (
                  <div key={pos.label} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{pos.label}</p>
                    <p className={`text-xl font-black ${pos.color} mt-1`}>{pos.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Feedback & AI Scouting Report */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
                <ShieldAlert size={14} /> Strategic Roster Assessment
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Philosophy: <span className="text-white font-semibold">{profile.name || currentTeam.teamName}</span> employs a{' '}
                <span className="text-orange-400 font-medium">{profile.description || 'balanced competitive strategy'}</span>.
              </p>
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Target Deficits:</span>
                  <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                    {analysis.weaknesses.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Current Signed Squad List */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                Acquired Players ({squad.length})
              </h4>
              {squad.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 border border-white/5 rounded-xl bg-white/[0.01]">
                  No players signed yet in this auction.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {squad.map((pl, idx) => {
                    const isPlOverseas = isOverseasPlayer(pl);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-white">{pl.name || 'Player'}</p>
                          <p className="text-[10px] text-gray-400">
                            {pl.role} • {isPlOverseas ? `Overseas (${pl.country || 'INT'})` : 'IND'}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-orange-400">
                          {formatCrores(pl.soldPrice || pl.basePrice || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-black/40 border-t border-white/5 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

