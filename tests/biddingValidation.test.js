import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMinNextBid,
  getMinimumBidIncrement,
  validateBidRequest,
  MIN_BASE_PRICE
} from '../src/lib/auctionValidation.js';

test('getMinimumBidIncrement returns correct tier increments', () => {
  assert.equal(getMinimumBidIncrement(0.20), 0.05);
  assert.equal(getMinimumBidIncrement(0.80), 0.05);
  assert.equal(getMinimumBidIncrement(1.00), 0.20);
  assert.equal(getMinimumBidIncrement(3.40), 0.20);
  assert.equal(getMinimumBidIncrement(5.00), 0.25);
  assert.equal(getMinimumBidIncrement(8.50), 0.25);
  assert.equal(getMinimumBidIncrement(10.00), 0.50);
  assert.equal(getMinimumBidIncrement(24.00), 0.50);
});

test('computeMinNextBid handles zero/unbid and tier increases', () => {
  assert.equal(computeMinNextBid(0, 2.00), 2.00);
  assert.equal(computeMinNextBid(2.00, 2.00), 2.20);
  assert.equal(computeMinNextBid(9.75, 2.00), 10.00);
  assert.equal(computeMinNextBid(10.00, 2.00), 10.50);
});

test('validateBidRequest rejects if bidding is closed or no player', () => {
  const resultClosed = validateBidRequest({
    bidAmount: 2.0,
    bidderId: 'user1',
    bidderTeamId: 'CSK',
    player: { id: 'p1', name: 'Player One', basePrice: 2.0 },
    auctionLiveState: { status: 'waiting' },
    bidderTeamState: { budgetRemaining: 100, squad: [] }
  });
  assert.equal(resultClosed.isValid, false);
  assert.equal(resultClosed.code, 'BIDDING_CLOSED');

  const resultNoPlayer = validateBidRequest({
    bidAmount: 2.0,
    bidderId: 'user1',
    bidderTeamId: 'CSK',
    player: null,
    auctionLiveState: { status: 'bidding' },
    bidderTeamState: { budgetRemaining: 100, squad: [] }
  });
  assert.equal(resultNoPlayer.isValid, false);
  assert.equal(resultNoPlayer.code, 'NO_ACTIVE_PLAYER');
});

test('validateBidRequest rejects self-outbidding', () => {
  const result = validateBidRequest({
    bidAmount: 2.5,
    bidderId: 'user1',
    bidderTeamId: 'CSK',
    player: { id: 'p1', name: 'Rohit Sharma', basePrice: 2.0 },
    auctionLiveState: { status: 'bidding', currentBid: 2.2, highBidderId: 'user1', highBidderTeamId: 'CSK' },
    bidderTeamState: { budgetRemaining: 80, squad: [] }
  });
  assert.equal(result.isValid, false);
  assert.equal(result.code, 'ALREADY_HIGHEST_BIDDER');
});

test('validateBidRequest rejects bid lower than minNextBid', () => {
  const result = validateBidRequest({
    bidAmount: 2.05,
    bidderId: 'user2',
    bidderTeamId: 'MI',
    player: { id: 'p1', name: 'Rohit Sharma', basePrice: 2.0 },
    auctionLiveState: { status: 'bidding', currentBid: 2.0, highBidderId: 'user1', highBidderTeamId: 'CSK' },
    bidderTeamState: { budgetRemaining: 80, squad: [] }
  });
  assert.equal(result.isValid, false);
  assert.equal(result.code, 'BID_TOO_LOW');
  assert.equal(result.minNextBid, 2.20);
});

test('validateBidRequest rejects when squad capacity is full', () => {
  const fullSquad = Array.from({ length: 25 }, (_, i) => ({ id: `p_${i}`, name: `Player ${i}` }));
  const result = validateBidRequest({
    bidAmount: 1.0,
    bidderId: 'user1',
    bidderTeamId: 'RCB',
    player: { id: 'new_p', name: 'New Talent', basePrice: 0.5 },
    auctionLiveState: { status: 'bidding', currentBid: 0.5, highBidderId: 'user2' },
    bidderTeamState: { budgetRemaining: 20, squad: fullSquad },
    squadLimit: 25
  });
  assert.equal(result.isValid, false);
  assert.equal(result.code, 'SQUAD_FULL');
});

test('validateBidRequest rejects overseas player when quota is full', () => {
  const overseasSquad = [
    { id: 'o1', country: 'AUS' },
    { id: 'o2', country: 'ENG' },
    { id: 'o3', country: 'SA' },
    { id: 'o4', country: 'WI' }
  ];
  const result = validateBidRequest({
    bidAmount: 2.0,
    bidderId: 'user1',
    bidderTeamId: 'KKR',
    player: { id: 'star_overseas', name: 'Travis Head', country: 'AUS', basePrice: 2.0 },
    auctionLiveState: { status: 'bidding', currentBid: 0 },
    bidderTeamState: { budgetRemaining: 50, squad: overseasSquad },
    squadLimit: 11,
    overseasLimit: 4
  });
  assert.equal(result.isValid, false);
  assert.equal(result.code, 'OVERSEAS_QUOTA_REACHED');
});

test('validateBidRequest rejects when bid exceeds remaining purse', () => {
  const result = validateBidRequest({
    bidAmount: 15.0,
    bidderId: 'user1',
    bidderTeamId: 'GT',
    player: { id: 'p1', name: 'Jasprit Bumrah', basePrice: 2.0 },
    auctionLiveState: { status: 'bidding', currentBid: 14.5, highBidderId: 'user2' },
    bidderTeamState: { budgetRemaining: 12.0, squad: [] }
  });
  assert.equal(result.isValid, false);
  assert.equal(result.code, 'INSUFFICIENT_PURSE');
});

test('validateBidRequest enforces reserve budget floor for unfilled squad slots', () => {
  // Team has ₹3.0 Cr remaining, currently has 0 players in a 5-player sprint.
  // Drafting this player leaves 4 unfilled slots.
  // 4 slots * 0.20 Cr = ₹0.80 Cr reserve required.
  // Maximum affordable bid = 3.0 - 0.80 = ₹2.20 Cr.
  // If user bids ₹2.50 Cr, remaining purse would be ₹0.50 Cr, leaving them unable to fulfill remaining 4 slots.
  const result = validateBidRequest({
    bidAmount: 2.50,
    bidderId: 'user1',
    bidderTeamId: 'DC',
    player: { id: 'p1', name: 'Star Batter', basePrice: 2.0 },
    auctionLiveState: { status: 'bidding', currentBid: 2.20, highBidderId: 'user2' },
    bidderTeamState: { budgetRemaining: 3.00, squad: [] },
    squadLimit: 5
  });
  assert.equal(result.isValid, false);
  assert.equal(result.code, 'PURSE_RESERVE_VIOLATION');
  assert.equal(result.maxAffordableBid, 2.20);
});

test('validateBidRequest approves valid bid that satisfies all constraints', () => {
  const result = validateBidRequest({
    bidAmount: 2.20,
    bidderId: 'user1',
    bidderTeamId: 'CSK',
    player: { id: 'p1', name: 'Ruturaj Gaikwad', basePrice: 2.0, country: 'IND' },
    auctionLiveState: { status: 'bidding', currentBid: 2.0, highBidderId: 'user2' },
    bidderTeamState: { budgetRemaining: 100.0, squad: [] },
    squadLimit: 25,
    overseasLimit: 8
  });
  assert.equal(result.isValid, true);
  assert.equal(result.bidAmount, 2.20);
  assert.equal(result.minNextBid, 2.40);
});

