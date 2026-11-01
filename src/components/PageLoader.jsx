import React, { useState, useEffect } from 'react';
// `motion` is used only inside JSX; core no-unused-vars can't detect that.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, ChevronRight } from 'lucide-react';

const GAME_TIPS = [
  "DID YOU KNOW: Virat Kohli holds the record for the most runs in a single IPL season, scoring 973 runs in 2016.",
  "TIP: Hosting a room is free. Tap Create Room, pick your franchise, and share the 6-character code with your crew.",
  "DID YOU KNOW: Mitchell Starc became the most expensive player in IPL history when KKR bought him for ₹24.75 Crore in the 2024 auction.",
  "TIP: Playing solo? Hit Fill Bots in the lobby to let smart AI managers fill every empty franchise instantly.",
  "TIP: Watch your purse. Reserve budget for your mandatory squad slots so you are never priced out late in the auction.",
  "DID YOU KNOW: CrickAuction enforces the overseas quota automatically - max 8 in Mega, 4 in Classic, 2 in Sprint.",
  "TIP: Public rooms are listed in the Join tab - jump into an open auction without needing a room code.",
  "DID YOU KNOW: Every completed auction is saved to your History tab with full squads, spends, and ratings."
];

const PageLoader = ({ isGame = false }) => {
  const [, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  // Ensure loader UI stays visible for at least 2 seconds
  const [showLoader, setShowLoader] = useState(true);
  const skippedIntro = useSkippedLocalState();

  // Check if we are on the landing page
  const isGameMode = isGame || (typeof window !== 'undefined' && window.location.pathname === '/');

  useEffect(() => {
    if (!isGameMode) return;

    // Load progress based on actual page load event
    let progressInterval = null;
    let simulatedInterval = null;
    const finishLoading = () => {
      setProgress(100);
      setIsLoaded(true);
      setShowLoader(false);
      if (progressInterval) clearInterval(progressInterval);
      if (simulatedInterval) clearInterval(simulatedInterval);
    };

    const startRealProgress = () => {
      // Increment progress slowly until the page load event fires (stop near 95% to keep animation smooth)
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            return prev; // pause increment, wait for load event
          }
          return prev + 0.5; // smooth gradual increase
        });
      }, 30);
    };

    // Start with a deterministic 2‑second simulated loading
    const simulatedStep = 100 / (2000 / 30);
    simulatedInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return prev;
        }
        return Math.min(prev + simulatedStep, 95);
      });
    }, 30);

    // After 2 seconds switch to real progress handling
    const switchTimeout = setTimeout(() => {
      if (simulatedInterval) clearInterval(simulatedInterval);
      startRealProgress();
      // Ensure at least 2s display before considering load
      if (document.readyState === 'complete') {
        finishLoading();
      } else {
        window.addEventListener('load', finishLoading);
      }
    }, 2000);

    // No immediate load listener; will be attached after simulated phase
    
  // Rotate tips every 10 seconds
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 10000);

    // Keyboard listener to skip/continue
    const handleKeyDown = (e) => {
      if (e.key === 'x' || e.key === 'X' || e.key === 'Enter') {
        setIsLoaded(true);
        setProgress(100);
        document.dispatchEvent(new CustomEvent('skipIntro'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

      return () => {
        if (progressInterval) clearInterval(progressInterval);
        if (simulatedInterval) clearInterval(simulatedInterval);
        if (switchTimeout) clearTimeout(switchTimeout);
        clearInterval(tipTimer);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('load', finishLoading);
      };
  }, [isGameMode]);

  // Handle local skip action
  const handleContinue = () => {
    setIsLoaded(true);
    setProgress(100);
    document.dispatchEvent(new CustomEvent('skipIntro'));
  };

  if (isGameMode && !skippedIntro) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col justify-end p-6 md:p-12 overflow-hidden select-none font-sans text-white"
      >
        {/* Dynamic Gaming Backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Ambient Glowing Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 40, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-[#ff5500]/15 blur-[130px] rounded-full"
          />
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              x: [0, -30, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-blue-600/10 blur-[130px] rounded-full"
          />

          {/* Texture Overlay */}
          <motion.div
            animate={{ x: [0, 400], y: [0, 400] }}
            transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-[400px] bg-[url('https://res.cloudinary.com/drl6ky9as/image/upload/v1792012081/texture_os1ukf.jpg')] bg-repeat bg-[length:600px_600px] sm:bg-[length:800px_800px] opacity-[0.35] mix-blend-screen"
          />

          {/* Radial Overlay Vignette */}
          <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_20%,#050505_95%]" />
        </div>

        {/* Top-Right Badge: IPL AUCTION SIMULATOR */}
        <div className="absolute top-6 right-6 md:top-8 md:right-10 z-20 flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/70 border border-orange-500/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="w-2 h-2 rounded-[2px] bg-orange-500 shadow-[0_0_8px_#ff5500]" />
          <span className="text-[10px] md:text-[11px] font-black tracking-widest text-orange-400 uppercase font-mono">
            IPL AUCTION SIMULATOR
          </span>
        </div>

        {/* Left-Side 3D Artwork */}
        <div className="absolute left-4 sm:left-8 md:left-14 top-1/2 -translate-y-1/2 z-10 pointer-events-none select-none max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg">
          <motion.img
            src="/loading-hero.png"
            alt="IPL Auction 3D Arena"
            className="w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(255,85,0,0.3)]"
            initial={{ opacity: 0, x: -40, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>

        {/* Bottom Loading Bar & Controls */}
        <div className="relative z-20 w-full max-w-7xl mx-auto flex flex-col gap-6 mb-2">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">

            {/* Game Tip Box */}
            <div className="max-w-2xl bg-[#0a0a0a]/90 border border-white/10 p-5 rounded-xl backdrop-blur-xl shadow-2xl">
              <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase block mb-1 font-mono">
                LOADING TIP
              </span>
              <div className="min-h-[44px] flex items-center">
                <p className="text-xs md:text-sm font-semibold tracking-wide text-gray-200 leading-relaxed font-sans">
                  {GAME_TIPS[tipIndex]}
                </p>
              </div>
            </div>

            {/* Right: Enter Button or Loading Indicator */}
            <div className="self-end md:self-auto flex items-center gap-4">
              <AnimatePresence mode="wait">
                {(!isLoaded && showLoader) ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex items-center gap-3 bg-white/[0.04] border border-white/10 px-5 py-3 rounded-lg backdrop-blur-md shadow-lg"
                  >
                    <span className="text-[11px] font-black text-white/70 uppercase tracking-widest font-mono">
                      LOADING
                    </span>
                    <div className="w-5 h-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="enter"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      onClick={handleContinue}
                      className="px-8 py-3.5 bg-gradient-to-r from-[#ff5500] to-[#e63900] hover:from-[#ff661a] hover:to-[#ff4500] text-white font-black uppercase tracking-wider text-xs md:text-sm rounded-lg shadow-[0_4px_25px_rgba(255,85,0,0.45)] transition-all cursor-pointer border border-white/15 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      CLICK TO ENTER / PRESS ENTER
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Minimal full-width bottom orange bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 shadow-[0_0_12px_#ff5500]" />
          </div>

        </div>
      </motion.div>
    );
  }

  // Original Minimal Loader for other pages/sections
  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center p-4">
      {/* Background Match */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center w-12 h-12 mb-6">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/10 border-t-orange-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
};

// Helper hook to check if intro was skipped locally
const useSkippedLocalState = () => {
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    const handleSkip = () => setSkipped(true);
    document.addEventListener('skipIntro', handleSkip);
    return () => document.removeEventListener('skipIntro', handleSkip);
  }, []);
  return skipped;
};

export default PageLoader;
