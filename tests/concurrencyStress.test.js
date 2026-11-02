import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMinNextBid, validateBidRequest } from '../src/lib/auctionValidation.js';

/**
 * Atomic Transaction Engine simulating Firebase Realtime Database
 * optimistic concurrency control with conflict detection and retries.
 */
class SimulatedRtdbTransactionEngine {
  constructor(initialLiveState, initialTeams) {
    this.liveState = structuredClone(initialLiveState);
    this.teams = structuredClone(initialTeams);
    this.version = 1;
    this.conflictCount = 0;
    this.bidHistory = [];
  }

  async runTransaction(updaterFn, maxRetries = 25) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const readVersion = this.version;
      const snapshot = structuredClone(this.liveState);
      
      // Execute transaction mutation
      const updateResult = updaterFn(snapshot);
      if (updateResult === undefined) {
        // Aborted
        return { committed: false, reason: 'ABORTED' };
      }

      // Small async tick simulating database round-trip & contention
      await new Promise((res) => setTimeout(res, Math.floor(Math.random() * 5)));

      // Compare-And-Swap (CAS) verification
      if (this.version === readVersion) {
        this.liveState = updateResult;
        this.version++;
        this.bidHistory.push(structuredClone(updateResult));
        return { committed: true, snapshot: updateResult };
      }

      // Conflict occurred, retry
      this.conflictCount++;
    }

    return { committed: false, reason: 'MAX_RETRIES_EXCEEDED' };
  }
}

test('Concurrency Stress Test: 100 simultaneous bids result in atomic, monotonic, budget-safe state', async () => {
  const player = {
    id: 'p_bumrah',
    name: 'Jasprit Bumrah',
    role: 'Bowler',
    country: 'IND',
    basePrice: 2.00,
  };

  const initialLive = {
    status: 'bidding',
    playerId: player.id,
    currentBid: 0,
    highBidderId: null,
    highBidderTeamId: null,
    timerEndsAt: Date.now() + 10000,
  };

  const franchises = ['MI', 'CSK', 'RCB', 'KKR', 'SRH', 'DC', 'RR', 'PBKS', 'GT', 'LSG'];
  const teams = {};
  franchises.forEach((fid) => {
    teams[fid] = {
      teamId: fid,
      budgetRemaining: 50.00,
      squad: [],
    };
  });

  const engine = new SimulatedRtdbTransactionEngine(initialLive, teams);

  // 100 simulated clients firing bids simultaneously with jitter
  const CLIENT_COUNT = 100;
  const clientPromises = [];

  for (let i = 0; i < CLIENT_COUNT; i++) {
    const clientIndex = i;
    const clientTeamId = franchises[clientIndex % franchises.length];
    const clientUserId = `user_${clientTeamId}_${clientIndex}`;

    const bidPromise = (async () => {
      // Add random stagger up to 20ms to simulate live network concurrency
      await new Promise((r) => setTimeout(r, Math.random() * 20));

      return engine.runTransaction((currentData) => {
        if (!currentData || currentData.status !== 'bidding') return;
        if (currentData.highBidderId === clientUserId) return; // Prevent self-outbid
        if (currentData.highBidderTeamId === clientTeamId) return; // Prevent team self-outbid

        const cBid = currentData.currentBid || 0;
        const nextBid = computeMinNextBid(cBid, player.basePrice);

        // Validate client constraints against local team state
        const teamState = teams[clientTeamId];
        const validation = validateBidRequest({
          bidAmount: nextBid,
          bidderId: clientUserId,
          bidderTeamId: clientTeamId,
          player,
          auctionLiveState: currentData,
          bidderTeamState: teamState,
          squadLimit: 25,
          overseasLimit: 8,
        });

        if (!validation.isValid) return; // Abort if invalid

        currentData.currentBid = nextBid;
        currentData.highBidderId = clientUserId;
        currentData.highBidderTeamId = clientTeamId;
        currentData.timerEndsAt = Date.now() + 10000;
        return currentData;
      });
    })();

    clientPromises.push(bidPromise);
  }

  const results = await Promise.all(clientPromises);
  const committedBids = results.filter((r) => r.committed);

  assert.ok(committedBids.length > 0, 'At least some bids must commit successfully');
  assert.ok(engine.liveState.currentBid >= player.basePrice, 'Final bid must be at or above base price');
  assert.ok(engine.liveState.highBidderId !== null, 'There must be a definitive highest bidder');

  // Verify monotonicity of bid history
  for (let i = 1; i < engine.bidHistory.length; i++) {
    const prev = engine.bidHistory[i - 1].currentBid;
    const curr = engine.bidHistory[i].currentBid;
    assert.ok(
      curr > prev,
      `Bid history must be strictly monotonic: ${curr} must be greater than ${prev}`
    );
  }

  // Verify winning team budget limit was not breached
  const winnerTeamId = engine.liveState.highBidderTeamId;
  const winnerTeam = teams[winnerTeamId];
  assert.ok(
    engine.liveState.currentBid <= winnerTeam.budgetRemaining,
    'Winning bid must not exceed team available purse'
  );
});

test('Concurrency: Idempotent duplicate requests from same user do not advance bids against self', async () => {
  const player = {
    id: 'p_kohli',
    name: 'Virat Kohli',
    role: 'Batsman',
    country: 'IND',
    basePrice: 2.00,
  };

  const initialLive = {
    status: 'bidding',
    playerId: player.id,
    currentBid: 0,
    highBidderId: null,
    highBidderTeamId: null,
    timerEndsAt: Date.now() + 10000,
  };

  const teams = {
    RCB: { teamId: 'RCB', budgetRemaining: 100, squad: [] },
  };

  const engine = new SimulatedRtdbTransactionEngine(initialLive, teams);

  // Same user sends 10 duplicate bids simultaneously (e.g. double-click or network duplicate)
  const duplicateSubmissions = Array.from({ length: 10 }).map(() => {
    return engine.runTransaction((currentData) => {
      if (!currentData || currentData.status !== 'bidding') return;
      if (currentData.highBidderId === 'user_virat_fan') return;

      const nextBid = computeMinNextBid(currentData.currentBid || 0, player.basePrice);
      currentData.currentBid = nextBid;
      currentData.highBidderId = 'user_virat_fan';
      currentData.highBidderTeamId = 'RCB';
      return currentData;
    });
  });

  const results = await Promise.all(duplicateSubmissions);
  const committed = results.filter((r) => r.committed);

  assert.equal(committed.length, 1, 'Only exactly 1 bid from the user should commit; rest must be rejected');
  assert.equal(engine.liveState.currentBid, 2.00, 'Bid amount should remain at base price and not self-inflate');
});

