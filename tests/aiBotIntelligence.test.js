import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRANCHISE_STRATEGIC_PROFILES,
  computeRoleDeficitMultiplier,
  computeIntelligentBotValuation,
  evaluateBotBid,
  generateSquadStrategicAnalysis
} from '../src/lib/botEngine.js';

test('all 10 IPL franchises have configured strategic profiles', () => {
  const expectedTeams = ['CSK', 'MI', 'RCB', 'KKR', 'RR', 'SRH', 'DC', 'PBKS', 'GT', 'LSG'];
  expectedTeams.forEach((teamId) => {
    const profile = FRANCHISE_STRATEGIC_PROFILES[teamId];
    assert.ok(profile, `Profile exists for ${teamId}`);
    assert.ok(profile.name);
    assert.ok(profile.philosophy);
    assert.ok(profile.roleAffinities);
    assert.ok(profile.maxSinglePlayerBudgetRatio > 0 && profile.maxSinglePlayerBudgetRatio <= 0.5);
  });
});

test('bot will not outbid itself or its team', () => {
  const player = { id: 'p1', name: 'Jasprit Bumrah', role: 'Bowler', basePrice: 2.0 };
  const botTeam = { userId: 'bot_mi', teamId: 'MI', budgetRemaining: 80, squad: [] };

  const outbidSelf = evaluateBotBid({
    player,
    currentBid: 5.0,
    highBidderId: 'bot_mi',
    highBidderTeamId: 'MI',
    botTeam
  });
  assert.equal(outbidSelf, null);

  const outbidSameTeam = evaluateBotBid({
    player,
    currentBid: 5.0,
    highBidderId: 'another_user',
    highBidderTeamId: 'MI',
    botTeam
  });
  assert.equal(outbidSameTeam, null);
});

test('bot respects overseas quota strictly', () => {
  const overseasPlayer = { id: 'p_aus', name: 'Pat Cummins', role: 'Bowler', country: 'AUS', basePrice: 2.0 };
  const botTeamWithFullOverseas = {
    userId: 'bot_csk',
    teamId: 'CSK',
    budgetRemaining: 50,
    squad: [
      { id: '1', country: 'AUS' },
      { id: '2', country: 'ENG' },
      { id: '3', country: 'SA' },
      { id: '4', country: 'WI' }
    ]
  };

  const decision = evaluateBotBid({
    player: overseasPlayer,
    currentBid: 2.0,
    highBidderId: 'user1',
    botTeam: botTeamWithFullOverseas,
    squadLimit: 11,
    overseasLimit: 4
  });
  assert.equal(decision, null, 'Bot must not bid on overseas player when quota is full');
});

test('bot respects squad capacity limit strictly', () => {
  const player = { id: 'p1', name: 'Player X', role: 'Batsman', country: 'IND', basePrice: 0.5 };
  const fullSquad = Array.from({ length: 5 }, (_, i) => ({ id: `s_${i}` }));
  const botTeamFull = {
    userId: 'bot_rcb',
    teamId: 'RCB',
    budgetRemaining: 20,
    squad: fullSquad
  };

  const decision = evaluateBotBid({
    player,
    currentBid: 0.5,
    highBidderId: 'user1',
    botTeam: botTeamFull,
    squadLimit: 5
  });
  assert.equal(decision, null, 'Bot must not bid when squad is full');
});

test('bot strictly protects mandatory reserve budget for remaining slots', () => {
  // 5-sprint mode: bot has ₹1.00 Cr remaining and 0 players.
  // Drafting this player leaves 4 unfilled slots.
  // 4 slots * 0.20 Cr reserve = ₹0.80 Cr mandatory reserve.
  // Next bid would be ₹0.50 Cr. 1.00 - 0.50 = 0.50 Cr remaining, which is LESS than 0.80 Cr reserve!
  const player = { id: 'p1', name: 'Expensive Player', role: 'Batsman', basePrice: 0.5 };
  const botTeamLowPurse = {
    userId: 'bot_dc',
    teamId: 'DC',
    budgetRemaining: 1.00,
    squad: []
  };

  const decision = evaluateBotBid({
    player,
    currentBid: 0,
    highBidderId: 'user1',
    botTeam: botTeamLowPurse,
    squadLimit: 5
  });
  assert.equal(decision, null, 'Bot must reject bid that violates reserve budget floor');
});

test('role deficit multiplier boosts willingness for underrepresented roles', () => {
  const squadWithoutBowlers = [
    { role: 'Batsman' },
    { role: 'Batsman' },
    { role: 'All-Rounder' }
  ];
  const targetRatios = { 'Batsman': 0.35, 'Bowler': 0.35, 'All-Rounder': 0.20, 'Wicketkeeper': 0.10 };

  const bowlerBoost = computeRoleDeficitMultiplier(squadWithoutBowlers, 'Bowler', targetRatios);
  const batsmanBoost = computeRoleDeficitMultiplier(squadWithoutBowlers, 'Batsman', targetRatios);

  assert.ok(bowlerBoost > batsmanBoost, 'Deficit role must receive higher valuation multiplier than surplus role');
});

test('generateSquadStrategicAnalysis grades balanced squad appropriately', () => {
  const balancedTeam = {
    teamId: 'CSK',
    budgetRemaining: 5.5,
    spent: 84.5,
    squad: [
      { name: 'Player 1', role: 'Batsman', country: 'IND' },
      { name: 'Player 2', role: 'Batsman', country: 'IND' },
      { name: 'Player 3', role: 'Batsman', country: 'IND' },
      { name: 'Player 4', role: 'Wicketkeeper', country: 'IND' },
      { name: 'Player 5', role: 'All-Rounder', country: 'IND' },
      { name: 'Player 6', role: 'Bowler', country: 'IND' },
      { name: 'Player 7', role: 'Bowler', country: 'IND' },
      { name: 'Player 8', role: 'Bowler', country: 'IND' },
      { name: 'Player 9', role: 'Bowler', country: 'AUS' },
      { name: 'Player 10', role: 'All-Rounder', country: 'WI' }
    ]
  };

  const analysis = generateSquadStrategicAnalysis(balancedTeam, 11);
  assert.ok(analysis);
  assert.equal(analysis.teamId, 'CSK');
  assert.ok(analysis.rating === 'A' || analysis.rating === 'S');
  assert.equal(analysis.squadCount, 10);
  assert.equal(analysis.overseasCount, 2);
});
