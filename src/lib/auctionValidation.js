/**
 * Server-Authoritative Auction Validation Pipeline
 * Validates bidding rules, purse floors, overseas quotas, and squad constraints.
 */

import { countOverseas, isOverseasPlayer, toFiniteNumber } from './auctionDisplay.js';

export const MIN_BASE_PRICE = 0.20; // 20 Lakhs is minimum reserve for empty slots in IPL

/**
 * Returns minimum allowable bid increment based on current price tier.
 */
export function getMinimumBidIncrement(currentBid = 0) {
  const bid = toFiniteNumber(currentBid, 0);
  if (bid < 1.0) return 0.05;  // 5 Lakhs
  if (bid < 5.0) return 0.20;  // 20 Lakhs
  if (bid < 10.0) return 0.25; // 25 Lakhs
  return 0.50;                 // 50 Lakhs
}

/**
 * Computes the minimum required next bid.
 */
export function computeMinNextBid(currentBid = 0, basePrice = 0.20) {
  const numCurrent = toFiniteNumber(currentBid, 0);
  const numBase = toFiniteNumber(basePrice, MIN_BASE_PRICE);

  if (numCurrent <= 0) {
    return numBase;
  }
  const increment = getMinimumBidIncrement(numCurrent);
  return parseFloat((numCurrent + increment).toFixed(2));
}

/**
 * Validates an incoming bid request against all auction business logic.
 * 
 * @param {Object} params
 * @param {number} params.bidAmount - Proposed bid in Crores
 * @param {string} params.bidderId - User ID of the bidder
 * @param {string} params.bidderTeamId - Team ID (e.g. 'CSK', 'MI')
 * @param {Object} params.player - Player object currently on the hammer
 * @param {Object} params.auctionLiveState - Live node from RTDB
 * @param {Object} params.bidderTeamState - Team node from RTDB (budget, squad, etc.)
 * @param {number} params.squadLimit - 25, 11, or 5
 * @param {number} params.overseasLimit - 8, 4, or 2
 * @returns {{ isValid: boolean, error?: string, code?: string, minNextBid?: number }}
 */
export function validateBidRequest({
  bidAmount,
  bidderId,
  bidderTeamId,
  player,
  auctionLiveState,
  bidderTeamState,
  squadLimit = 25,
  overseasLimit = 8
}) {
  if (!auctionLiveState || auctionLiveState.status !== 'bidding') {
    return {
      isValid: false,
      error: 'Bidding is currently closed for this player.',
      code: 'BIDDING_CLOSED'
    };
  }

  if (!player) {
    return {
      isValid: false,
      error: 'No active player is currently under the hammer.',
      code: 'NO_ACTIVE_PLAYER'
    };
  }

  if (!bidderId || !bidderTeamId) {
    return {
      isValid: false,
      error: 'Bidder identification or team assignment is missing.',
      code: 'UNIDENTIFIED_BIDDER'
    };
  }

  // Prevent self-outbidding
  if (auctionLiveState.highBidderId === bidderId || auctionLiveState.highBidderTeamId === bidderTeamId) {
    return {
      isValid: false,
      error: 'You already hold the highest bid on this player.',
      code: 'ALREADY_HIGHEST_BIDDER'
    };
  }

  const numBidAmount = parseFloat(toFiniteNumber(bidAmount, 0).toFixed(2));
  const currentBid = toFiniteNumber(auctionLiveState.currentBid, 0);
  const basePrice = toFiniteNumber(player.basePrice, MIN_BASE_PRICE);
  const minRequiredBid = computeMinNextBid(currentBid, basePrice);

  if (numBidAmount < minRequiredBid) {
    return {
      isValid: false,
      error: `Bid must be at least ₹${minRequiredBid.toFixed(2)} Cr.`,
      code: 'BID_TOO_LOW',
      minNextBid: minRequiredBid
    };
  }

  if (!bidderTeamState) {
    return {
      isValid: false,
      error: 'Franchise state could not be located.',
      code: 'TEAM_NOT_FOUND'
    };
  }

  const budgetRemaining = toFiniteNumber(bidderTeamState.budgetRemaining, 0);
  const squad = Array.isArray(bidderTeamState.squad) ? bidderTeamState.squad : [];
  const currentSquadSize = squad.length;

  // Check Squad Capacity
  if (currentSquadSize >= squadLimit) {
    return {
      isValid: false,
      error: `Your squad is full (${squadLimit}/${squadLimit} slots). You cannot draft more players.`,
      code: 'SQUAD_FULL'
    };
  }

  // Check Overseas Limit
  if (isOverseasPlayer(player)) {
    const currentOverseas = countOverseas(squad);
    if (currentOverseas >= overseasLimit) {
      return {
        isValid: false,
        error: `Overseas quota reached (${overseasLimit}/${overseasLimit} players). You can only bid on Indian players.`,
        code: 'OVERSEAS_QUOTA_REACHED'
      };
    }
  }

  // Check Available Budget
  if (numBidAmount > budgetRemaining) {
    return {
      isValid: false,
      error: `Insufficient purse. Bid of ₹${numBidAmount.toFixed(2)} Cr exceeds your remaining budget of ₹${budgetRemaining.toFixed(2)} Cr.`,
      code: 'INSUFFICIENT_PURSE'
    };
  }

  // Check Reserve Budget Floor (must retain MIN_BASE_PRICE for every unfilled required slot)
  const remainingSlotsAfterThisBuy = squadLimit - (currentSquadSize + 1);
  const requiredReserve = remainingSlotsAfterThisBuy > 0 ? remainingSlotsAfterThisBuy * MIN_BASE_PRICE : 0;
  const purseAfterBid = budgetRemaining - numBidAmount;

  if (purseAfterBid < requiredReserve) {
    const maxAffordableBid = Math.max(0, budgetRemaining - requiredReserve);
    return {
      isValid: false,
      error: `Purse reserve violation: You must keep ₹${requiredReserve.toFixed(2)} Cr reserve to fill your remaining ${remainingSlotsAfterThisBuy} slot(s). Maximum allowable bid is ₹${maxAffordableBid.toFixed(2)} Cr.`,
      code: 'PURSE_RESERVE_VIOLATION',
      maxAffordableBid
    };
  }

  return {
    isValid: true,
    bidAmount: numBidAmount,
    minNextBid: computeMinNextBid(numBidAmount, basePrice)
  };
}

