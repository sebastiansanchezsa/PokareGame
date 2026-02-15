import { handStrength } from './PokerLogic.js';

// Bot personality types
const BOT_TYPES = {
  CONSERVATIVE: 'conservative',
  AGGRESSIVE: 'aggressive',
  STRATEGIC: 'strategic',
};

const BOT_NAMES = [
  'CIPHER', 'NEON', 'BLAZE', 'PHANTOM',
  'VORTEX', 'CHROME', 'PULSE', 'SHADOW',
];

class BotAI {
  constructor(type = BOT_TYPES.STRATEGIC, difficulty = 'medium') {
    this.type = type;
    this.difficulty = difficulty;
    this.name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    this.bluffFactor = this.getBluffFactor();
    this.tightness = this.getTightness();
    this.lastAction = null;
    this.actionDelay = 1000 + Math.random() * 2000; // Thinking time
  }

  getBluffFactor() {
    const base = {
      [BOT_TYPES.CONSERVATIVE]: 0.05,
      [BOT_TYPES.AGGRESSIVE]: 0.3,
      [BOT_TYPES.STRATEGIC]: 0.15,
    };
    const diffMod = { easy: 0.8, medium: 1.0, hard: 1.2 };
    return (base[this.type] || 0.15) * (diffMod[this.difficulty] || 1.0);
  }

  getTightness() {
    return {
      [BOT_TYPES.CONSERVATIVE]: 0.7,
      [BOT_TYPES.AGGRESSIVE]: 0.3,
      [BOT_TYPES.STRATEGIC]: 0.5,
    }[this.type] || 0.5;
  }

  // Decide action given game state
  decide(gameState) {
    const { holeCards, communityCards, pot, currentBet, playerBet, playerChips, minRaise, phase } = gameState;

    const strength = handStrength(holeCards, communityCards);
    const toCall = currentBet - playerBet;
    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

    // Add some randomness based on difficulty
    const noise = this.difficulty === 'easy' ? (Math.random() - 0.5) * 0.3 :
                  this.difficulty === 'hard' ? (Math.random() - 0.5) * 0.1 :
                  (Math.random() - 0.5) * 0.2;

    const adjustedStrength = Math.max(0, Math.min(1, strength + noise));

    // Bluff chance
    const isBluffing = Math.random() < this.bluffFactor && adjustedStrength < 0.4;

    let action;

    if (this.type === BOT_TYPES.CONSERVATIVE) {
      action = this.decideConservative(adjustedStrength, toCall, potOdds, playerChips, minRaise, isBluffing);
    } else if (this.type === BOT_TYPES.AGGRESSIVE) {
      action = this.decideAggressive(adjustedStrength, toCall, potOdds, playerChips, minRaise, pot, isBluffing);
    } else {
      action = this.decideStrategic(adjustedStrength, toCall, potOdds, playerChips, minRaise, pot, phase, isBluffing);
    }

    this.lastAction = action;
    return action;
  }

  decideConservative(strength, toCall, potOdds, chips, minRaise, bluffing) {
    if (bluffing && toCall === 0) {
      return { action: 'raise', amount: minRaise };
    }

    if (strength < 0.3) {
      if (toCall === 0) return { action: 'check' };
      return { action: 'fold' };
    }

    if (strength < 0.5) {
      if (toCall === 0) return { action: 'check' };
      if (potOdds < 0.3) return { action: 'call' };
      return { action: 'fold' };
    }

    if (strength < 0.7) {
      if (toCall === 0) {
        return Math.random() < 0.3 ? { action: 'raise', amount: minRaise } : { action: 'check' };
      }
      return { action: 'call' };
    }

    // Strong hand
    if (strength >= 0.85 && chips > minRaise * 3) {
      return { action: 'raise', amount: Math.min(minRaise * 3, chips) };
    }
    return { action: 'raise', amount: Math.min(minRaise * 2, chips) };
  }

  decideAggressive(strength, toCall, potOdds, chips, minRaise, pot, bluffing) {
    if (bluffing) {
      const bluffAmount = Math.min(pot * 0.5 + minRaise, chips);
      return { action: 'raise', amount: Math.max(minRaise, Math.floor(bluffAmount)) };
    }

    if (strength < 0.2) {
      if (toCall === 0) {
        return Math.random() < 0.4 ? { action: 'raise', amount: minRaise } : { action: 'check' };
      }
      if (toCall > chips * 0.3) return { action: 'fold' };
      return Math.random() < 0.3 ? { action: 'call' } : { action: 'fold' };
    }

    if (strength < 0.4) {
      if (toCall === 0) return { action: 'raise', amount: minRaise };
      return { action: 'call' };
    }

    if (strength < 0.7) {
      const raiseAmt = Math.min(minRaise * 2 + Math.floor(pot * 0.3), chips);
      return { action: 'raise', amount: Math.max(minRaise, raiseAmt) };
    }

    // Very strong - big raise or all-in
    if (strength >= 0.85) {
      if (chips < minRaise * 4) return { action: 'allin' };
      return { action: 'raise', amount: Math.min(Math.floor(pot * 0.8 + minRaise * 2), chips) };
    }

    return { action: 'raise', amount: Math.min(minRaise * 3, chips) };
  }

  decideStrategic(strength, toCall, potOdds, chips, minRaise, pot, phase, bluffing) {
    // Position-aware, phase-aware play
    const isLatePhase = phase === 'turn' || phase === 'river';

    if (bluffing && isLatePhase && toCall === 0) {
      return { action: 'raise', amount: Math.min(Math.floor(pot * 0.6), chips) };
    }

    if (strength < 0.25) {
      if (toCall === 0) return { action: 'check' };
      if (toCall < chips * 0.05 && !isLatePhase) return { action: 'call' }; // Cheap to see
      return { action: 'fold' };
    }

    if (strength < 0.45) {
      if (toCall === 0) {
        return Math.random() < 0.2 ? { action: 'raise', amount: minRaise } : { action: 'check' };
      }
      if (potOdds < strength) return { action: 'call' };
      return { action: 'fold' };
    }

    if (strength < 0.65) {
      if (toCall === 0) {
        // Mix between check and bet
        return Math.random() < 0.5 ? { action: 'raise', amount: Math.min(Math.floor(pot * 0.4), chips) } : { action: 'check' };
      }
      return { action: 'call' };
    }

    if (strength < 0.8) {
      const raiseAmt = Math.min(Math.floor(pot * 0.5 + minRaise), chips);
      return { action: 'raise', amount: Math.max(minRaise, raiseAmt) };
    }

    // Monster hand - extract maximum value
    if (isLatePhase) {
      // Slow play sometimes
      if (Math.random() < 0.3 && toCall === 0) return { action: 'check' };
      const bigRaise = Math.min(Math.floor(pot * 0.75 + minRaise * 2), chips);
      return { action: 'raise', amount: Math.max(minRaise, bigRaise) };
    }

    return { action: 'raise', amount: Math.min(minRaise * 3, chips) };
  }
}

// Create bots based on difficulty setting
function createBots(count, difficulty) {
  const types = [BOT_TYPES.STRATEGIC, BOT_TYPES.AGGRESSIVE, BOT_TYPES.CONSERVATIVE, BOT_TYPES.STRATEGIC];
  const bots = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const bot = new BotAI(type, difficulty);

    // Ensure unique names
    while (usedNames.has(bot.name)) {
      bot.name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    }
    usedNames.add(bot.name);

    bots.push(bot);
  }

  return bots;
}

export { BotAI, BOT_TYPES, BOT_NAMES, createBots };
