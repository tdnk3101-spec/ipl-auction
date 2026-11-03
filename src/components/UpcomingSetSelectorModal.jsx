import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, CheckCircle2, ArrowRight, Sparkles, Filter } from 'lucide-react';

export default function UpcomingSetSelectorModal({
  isOpen,
  onClose,
  remainingSets = [],
  currentSetName = '',
  onSelectSet,
  loading = false
}) {
  const [selectedSet, setSelectedSet] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const filteredSets = remainingSets.filter(s =>
    s.setName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getSetBadgeColor = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('marquee')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (lower.includes('bat') || lower.includes('ba')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (lower.includes('bowl') || lower.includes('fa') || lower.includes('sp')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (lower.includes('all') || lower.includes('al')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (lower.includes('keeper') || lower.includes('wk')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-white/10 text-gray-300 border-white/20';
  };

  const handleConfirm = async () => {
    if (!selectedSet) return;
    await onSelectSet(selectedSet);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-[#0c0d12] border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-orange-950/40 via-amber-950/20 to-transparent border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  Select Upcoming Auction Set
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Host Only
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Prioritize which player set enters the auction hammer next
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

          {/* Active Set Banner */}
          {currentSetName && (
            <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-orange-400" /> Current Active Set:
              </span>
              <span className="font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                {currentSetName}
              </span>
            </div>
          )}

          {/* Search Filter */}
          <div className="p-4 border-b border-white/5 bg-black/20">
            <div className="relative">
              <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter sets (e.g. Marquee, Fast Bowlers, Spinners)..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          {/* Sets Grid */}
          <div className="p-5 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
            {filteredSets.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 border border-white/5 rounded-xl bg-white/[0.01]">
                No matching remaining sets found.
              </div>
            ) : (
              filteredSets.map((s) => {
                const isSelected = selectedSet === s.setName;
                const isCurrent = currentSetName === s.setName;
                const badgeColor = getSetBadgeColor(s.setName);

                return (
                  <button
                    key={s.setName}
                    type="button"
                    onClick={() => setSelectedSet(s.setName)}
                    className={`w-full p-3.5 rounded-xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? 'bg-orange-500/15 border-orange-500 text-white shadow-lg shadow-orange-500/10'
                        : isCurrent
                        ? 'bg-white/[0.04] border-white/15 text-gray-200'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${badgeColor}`}>
                        {s.count}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black truncate">{s.setName}</p>
                          {isCurrent && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {s.count} player{s.count === 1 ? '' : 's'} available in this set
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <CheckCircle2 size={18} className="text-orange-400" />
                      ) : (
                        <span className="text-xs text-gray-600 group-hover:text-orange-400 transition-colors">
                          <ArrowRight size={14} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-400 truncate">
              {selectedSet ? (
                <>Selected: <strong className="text-orange-400">{selectedSet}</strong></>
              ) : (
                'Choose a set above to bring to the front of the auction queue.'
              )}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSet || loading}
                onClick={handleConfirm}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-500/20"
              >
                {loading ? 'Reordering...' : 'Prioritize This Set'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
