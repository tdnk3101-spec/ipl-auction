/**
 * Intelligent Multi-Factor Franchise AI Bot Engine
 * Models realistic tactical bidding behaviors across all 10 IPL franchises.
 */

import { IPL_PLAYERS } from '../data/players.js';
import { TEAMS } from '../data/teams.js';
import { countOverseas, isOverseasPlayer, toFiniteNumber } from './auctionDisplay.js';
import { computeMinNextBid, MIN_BASE_PRICE } from './auctionValidation.js';

/**
 * Set Tier Base Multipliers: Sets base valuation multiples relative to base price.
 */
export const SET_TIERS = {
  'Marquee Set 1': { base: 2.8, max: 6.5, marquee: true },
  'Set 1':         { base: 1.8, max: 3.8, marquee: false },
  'Set 2':         { base: 1.4, max: 2.6, marquee: false },
  'Set 3':         { base: 1.1, max: 2.0, marquee: false },
  'Set 4':         { base: 0.9, max: 1.5, marquee: false },
  'AL1':           { base: 1.6, max: 3.2, marquee: false },
  'WK1':           { base: 1.5, max: 3.0, marquee: false },
  'FA1':           { base: 1.5, max: 2.8, marquee: false },
  'UBA1':          { base: 1.0, max: 2.0, marquee: false },
  'UAL1':          { base: 1.1, max: 2.2, marquee: false },
  'UWK1':          { base: 0.9, max: 1.7, marquee: false },
  'UFA1':          { base: 1.0, max: 1.9, marquee: false },
  'USP1':          { base: 0.8, max: 1.6, marquee: false },
  'BA2':           { base: 0.8, max: 1.4, marquee: false },
  'AL2':           { base: 0.8, max: 1.4, marquee: false },
  'WK2':           { base: 0.8, max: 1.3, marquee: false },
  'FA2':           { base: 0.8, max: 1.3, marquee: false },
  'SP2':           { base: 0.7, max: 1.2, marquee: false },
  'UBA2':          { base: 0.7, max: 1.2, marquee: false },
  'UAL2':          { base: 0.7, max: 1.2, marquee: false },
  'UWK2':          { base: 0.6, max: 1.0, marquee: false },
  'UFA2':          { base: 0.6, max: 1.0, marquee: false },
};

/**
 * 10 Intelligent Franchise Strategic Profiles
 * Each franchise has unique tactical priorities, target role distributions,
 * phase aggression multipliers, and maximum purse commitment percentages.
 */
export const FRANCHISE_STRATEGIC_PROFILES = {
  CSK: {
    name: 'Chennai Super Kings',
    philosophy: 'Experience, All-Rounders & Spin Command',
    style: 'disciplined_veteran',
    roleAffinities: { 'All-Rounder': 1.45, 'Bowler': 1.30, 'Batsman': 1.15, 'Wicketkeeper': 1.10 },
    setAffinities: { 'Marquee Set 1': 1.25, 'AL1': 1.30, 'Set 1': 1.20 },
    targetRoleRatios: { 'Batsman': 0.35, 'Bowler': 0.35, 'All-Rounder': 0.22, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.28,
    hesitationThreshold: 0.88,
  },
  MI: {
    name: 'Mumbai Indians',
    philosophy: 'Marquee Pace Battery & High-Impact Star Hunting',
    style: 'marquee_aggressive',
    roleAffinities: { 'Bowler': 1.45, 'Batsman': 1.30, 'All-Rounder': 1.15, 'Wicketkeeper': 1.10 },
    setAffinities: { 'Marquee Set 1': 1.55, 'FA1': 1.35, 'Set 1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.35, 'Bowler': 0.40, 'All-Rounder': 0.17, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.40,
    hesitationThreshold: 0.92,
  },
  RCB: {
    name: 'Royal Challengers Bengaluru',
    philosophy: 'Destructive Top-Order Firepower & Boundary Hitters',
    style: 'batting_firepower',
    roleAffinities: { 'Batsman': 1.50, 'All-Rounder': 1.25, 'Wicketkeeper': 1.20, 'Bowler': 1.10 },
    setAffinities: { 'Marquee Set 1': 1.50, 'AL1': 1.25, 'Set 1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.45, 'Bowler': 0.30, 'All-Rounder': 0.17, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.38,
    hesitationThreshold: 0.90,
  },
  KKR: {
    name: 'Kolkata Knight Riders',
    philosophy: 'Mystery Spin Arsenal & Lethal Caribbean Finishers',
    style: 'spin_and_finishers',
    roleAffinities: { 'All-Rounder': 1.40, 'Bowler': 1.35, 'Batsman': 1.15, 'Wicketkeeper': 1.10 },
    setAffinities: { 'AL1': 1.35, 'Set 1': 1.20, 'USP1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.30, 'Bowler': 0.38, 'All-Rounder': 0.24, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.32,
    hesitationThreshold: 0.86,
  },
  RR: {
    name: 'Rajasthan Royals',
    philosophy: 'Data-Driven Talent Scouting & Uncapped Gems',
    style: 'value_analytics',
    roleAffinities: { 'All-Rounder': 1.30, 'Bowler': 1.25, 'Batsman': 1.25, 'Wicketkeeper': 1.20 },
    setAffinities: { 'UBA1': 1.45, 'UAL1': 1.40, 'UFA1': 1.35, 'USP1': 1.30 },
    targetRoleRatios: { 'Batsman': 0.36, 'Bowler': 0.36, 'All-Rounder': 0.20, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.28,
    hesitationThreshold: 0.82,
  },
  SRH: {
    name: 'Sunrisers Hyderabad',
    philosophy: 'Pace Dominance & Explosive Powerplay Batting',
    style: 'fast_bowling_power',
    roleAffinities: { 'Bowler': 1.45, 'Batsman': 1.35, 'All-Rounder': 1.10, 'Wicketkeeper': 1.10 },
    setAffinities: { 'FA1': 1.40, 'Set 1': 1.25, 'Marquee Set 1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.35, 'Bowler': 0.42, 'All-Rounder': 0.15, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.34,
    hesitationThreshold: 0.88,
  },
  DC: {
    name: 'Delhi Capitals',
    philosophy: 'Strategic Core Balance & Tactical Depth',
    style: 'balanced_scouting',
    roleAffinities: { 'Bowler': 1.30, 'Wicketkeeper': 1.30, 'Batsman': 1.20, 'All-Rounder': 1.20 },
    setAffinities: { 'UBA1': 1.25, 'Set 2': 1.20, 'WK1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.36, 'Bowler': 0.36, 'All-Rounder': 0.18, 'Wicketkeeper': 0.10 },
    maxSinglePlayerBudgetRatio: 0.30,
    hesitationThreshold: 0.85,
  },
  PBKS: {
    name: 'Punjab Kings',
    philosophy: 'Purse Aggression, Marquee Reset & High Stakes Wars',
    style: 'purse_heavy_challenger',
    roleAffinities: { 'Batsman': 1.35, 'All-Rounder': 1.30, 'Bowler': 1.25, 'Wicketkeeper': 1.10 },
    setAffinities: { 'Marquee Set 1': 1.40, 'UAL1': 1.30, 'UBA1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.38, 'Bowler': 0.34, 'All-Rounder': 0.20, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.36,
    hesitationThreshold: 0.89,
  },
  GT: {
    name: 'Gujarat Titans',
    philosophy: 'Disciplined Structure, Match Winners & Anchor Balance',
    style: 'structured_depth',
    roleAffinities: { 'All-Rounder': 1.35, 'Bowler': 1.30, 'Batsman': 1.20, 'Wicketkeeper': 1.15 },
    setAffinities: { 'Set 1': 1.25, 'Set 2': 1.20, 'AL1': 1.25 },
    targetRoleRatios: { 'Batsman': 0.35, 'Bowler': 0.37, 'All-Rounder': 0.20, 'Wicketkeeper': 0.08 },
    maxSinglePlayerBudgetRatio: 0.30,
    hesitationThreshold: 0.85,
  },
  LSG: {
    name: 'Lucknow Super Giants',
    philosophy: 'Multi-Skilled Utility, Adaptability & Death Specialists',
    style: 'utility_versatility',
    roleAffinities: { 'All-Rounder': 1.40, 'Wicketkeeper': 1.30, 'Bowler': 1.25, 'Batsman': 1.15 },
    setAffinities: { 'WK1': 1.30, 'AL1': 1.30, 'Set 2': 1.20 },
    targetRoleRatios: { 'Batsman': 0.32, 'Bowler': 0.36, 'All-Rounder': 0.22, 'Wicketkeeper': 0.10 },
    maxSinglePlayerBudgetRatio: 0.30,
    hesitationThreshold: 0.86,
  },
};

export const IPL_FRANCHISE_PROFILES = FRANCHISE_STRATEGIC_PROFILES;

/**
 * Computes a franchise's current squad role deficit.
 * If a franchise currently has 0 WKs or 0 Bowlers, returns a need boost multiplier.
 */
export function computeRoleDeficitMultiplier(squad, playerRole, targetRatios) {
  if (!Array.isArray(squad) || squad.length === 0) return 1.15;

  const total = squad.length;
  const currentCount = squad.reduce((count, s) => {
    const role = typeof s === 'object' ? s.role : null;
    return role === playerRole ? count + 1 : count;
  }, 0);

  const currentRatio = currentCount / total;
  const targetRatio = targetRatios[playerRole] || 0.25;

  // Severe deficit (e.g. 0 wicketkeepers or bowlers when squad size > 3)
  if (currentCount === 0 && (playerRole === 'Wicketkeeper' || playerRole === 'Bowler')) {
    return 1.40;
  }

  // Normal deficit vs target ratio
  if (currentRatio < targetRatio) {
    return 1.10 + (targetRatio - currentRatio) * 0.8;
  }

  // Surplus: diminish willingness
  return Math.max(0.70, 1.0 - (currentRatio - targetRatio) * 0.6);
}

/**
 * Computes an intelligent, dynamic maximum valuation for a bot team on a player.
 */
export function computeIntelligentBotValuation({
  player,
  botTeam,
  squadLimit = 25,
  budgetRemaining,
  initialBudget = 120.0,
  randomSeed = Math.random()
}) {
  const basePrice = toFiniteNumber(player.basePrice, MIN_BASE_PRICE);
  const set = player.set || 'Set 4';
  const teamId = botTeam?.teamId || 'CSK';
  const profile = FRANCHISE_STRATEGIC_PROFILES[teamId] || FRANCHISE_STRATEGIC_PROFILES.CSK;

  // 1. Set Tier Valuation
  const tier = SET_TIERS[set] || { base: 0.8, max: 1.4, marquee: false };
  const willingness = tier.base + randomSeed * (tier.max - tier.base);

  // 2. Role and Set Affinities
  const roleMult = profile.roleAffinities[player.role] || 1.0;
  const setMult = profile.setAffinities[set] || 1.0;

  // 3. Squad Need Deficit Multiplier
  const needMult = computeRoleDeficitMultiplier(botTeam?.squad || [], player.role, profile.targetRoleRatios);

  // 4. Inflation Index (budget remaining vs required remaining squad slots)
  const currentSquadSize = (botTeam?.squad || []).length;
  const remainingSlots = squadLimit - currentSquadSize;
  const averageAvailablePerSlot = remainingSlots > 0 ? budgetRemaining / remainingSlots : 0;
  const averageStartingPerSlot = initialBudget / squadLimit;
  const inflationMult = Math.min(1.35, Math.max(0.75, averageAvailablePerSlot / (averageStartingPerSlot || 1)));

  // Raw valuation
  let valuation = basePrice * willingness * roleMult * setMult * needMult * inflationMult;

  // 5. Hard Maximum Commitment Ratio per Franchise Style
  const maxAllowableByStyle = budgetRemaining * profile.maxSinglePlayerBudgetRatio;
  valuation = Math.min(valuation, maxAllowableByStyle);

  // 6. Hard Mathematical Reserve Floor:
  // Must leave at least MIN_BASE_PRICE for every other required slot
  const remainingSlotsAfterThis = remainingSlots - 1;
  const minRequiredReserve = remainingSlotsAfterThis > 0 ? remainingSlotsAfterThis * MIN_BASE_PRICE : 0;
  const maxSafeValuation = Math.max(0, budgetRemaining - minRequiredReserve);

  valuation = Math.min(valuation, maxSafeValuation);
  valuation = Math.max(basePrice, valuation);

  return parseFloat(valuation.toFixed(2));
}

/**
 * Main evaluation entry point: Determines whether a bot places a bid,
 * what amount to bid, and the reasoning behind the decision.
 */
export function evaluateBotBid({
  player,
  currentBid = 0,
  highBidderId,
  highBidderTeamId,
  botTeam,
  squadLimit = 25,
  overseasLimit = 8,
  initialBudget = 120.0,
  randomValue = Math.random()
}) {
  if (!player || !botTeam) return null;

  const botUserId = botTeam.userId;
  const teamId = botTeam.teamId;

  // 1. Don't outbid yourself or your own team
  if (highBidderId === botUserId || highBidderTeamId === teamId) {
    return null;
  }

  // 2. Squad Capacity Check
  const squad = Array.isArray(botTeam.squad) ? botTeam.squad : [];
  if (squad.length >= squadLimit) {
    return null;
  }

  // 3. Overseas Quota Check
  if (isOverseasPlayer(player)) {
    const currentOverseas = countOverseas(squad, IPL_PLAYERS);
    if (currentOverseas >= overseasLimit) {
      return null;
    }
  }

  // 4. Role Balance Soft Limits
  const currentRoleCount = squad.reduce((acc, s) => {
    const pRole = typeof s === 'object' ? s.role : null;
    return pRole === player.role ? acc + 1 : acc;
  }, 0);
  const maxRoleQuota = squadLimit <= 5 ? 3 : squadLimit <= 11 ? 5 : 9;
  if (currentRoleCount >= maxRoleQuota && (squadLimit - squad.length) > 1) {
    return null;
  }

  // 5. Calculate Minimum Required Next Bid
  const cBid = toFiniteNumber(currentBid, 0);
  const basePrice = toFiniteNumber(player.basePrice, MIN_BASE_PRICE);
  const nextBid = computeMinNextBid(cBid, basePrice);

  // 6. Purse & Reserve Budget Check
  const budgetRemaining = toFiniteNumber(botTeam.budgetRemaining, initialBudget);
  if (budgetRemaining < nextBid) {
    return null;
  }

  const slotsRemainingAfterThis = squadLimit - (squad.length + 1);
  const reserveRequired = slotsRemainingAfterThis > 0 ? slotsRemainingAfterThis * MIN_BASE_PRICE : 0;
  if ((budgetRemaining - nextBid) < reserveRequired) {
    return null; // preserve mandatory purse reserve
  }

  // 7. Compute Intelligent Max Valuation
  const maxValuation = computeIntelligentBotValuation({
    player,
    botTeam,
    squadLimit,
    budgetRemaining,
    initialBudget,
    randomSeed: randomValue
  });

  if (nextBid > maxValuation) {
    return null;
  }

  // 8. Dynamic Bid Escalation Probability
  const profile = FRANCHISE_STRATEGIC_PROFILES[teamId] || FRANCHISE_STRATEGIC_PROFILES.CSK;
  const priceToValuationRatio = nextBid / maxValuation;
  
  let willingnessChance = 1.0;
  if (priceToValuationRatio > 0.85) {
    willingnessChance = profile.hesitationThreshold - 0.25;
  } else if (priceToValuationRatio > 0.65) {
    willingnessChance = profile.hesitationThreshold - 0.10;
  } else {
    willingnessChance = 0.98;
  }

  if (randomValue > willingnessChance) {
    return null;
  }

  return {
    shouldBid: true,
    botUserId,
    teamId,
    nextBid,
    maxValuation,
    philosophy: profile.philosophy
  };
}

/**
 * Generates an automated strategic analysis of a completed team squad.
 */
export function generateSquadStrategicAnalysis(teamState, squadLimit = 25) {
  if (!teamState) return null;

  const teamId = teamState.teamId || 'CSK';
  const profile = FRANCHISE_STRATEGIC_PROFILES[teamId] || FRANCHISE_STRATEGIC_PROFILES.CSK;
  const squad = Array.isArray(teamState.squad) ? teamState.squad : [];
  const spent = toFiniteNumber(teamState.spent, 0);
  const budgetRemaining = toFiniteNumber(teamState.budgetRemaining, 0);

  const roleCounts = squad.reduce((acc, p) => {
    const role = p?.role || 'Batsman';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const overseasCount = countOverseas(squad);
  const isComplete = squad.length >= (squadLimit <= 5 ? 5 : squadLimit <= 11 ? 11 : 18);

  let rating = 'B';
  const feedback = [];

  if (roleCounts['Wicketkeeper'] >= 1 && roleCounts['Bowler'] >= 3 && roleCounts['Batsman'] >= 3) {
    rating = 'A';
    feedback.push('Solid core with balanced role distribution across all departments.');
  }

  if (squad.length >= squadLimit * 0.8 && budgetRemaining > 2.0) {
    rating = 'S';
    feedback.push('Exceptional purse efficiency; secured primary targets while preserving liquidity.');
  }

  if (roleCounts['Wicketkeeper'] === 0) {
    feedback.push('Warning: Squad lacks a specialized wicketkeeper.');
    rating = 'C';
  }

  return {
    teamId,
    teamName: profile.name,
    philosophy: profile.philosophy,
    squadCount: squad.length,
    overseasCount,
    spent,
    budgetRemaining,
    roleCounts,
    rating,
    feedback
  };
}
