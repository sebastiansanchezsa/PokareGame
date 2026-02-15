// Texas Hold'em hand evaluation and game rules

const HAND_RANKS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
};

const HAND_NAMES = {
  [HAND_RANKS.HIGH_CARD]: 'Carta Alta',
  [HAND_RANKS.ONE_PAIR]: 'Par',
  [HAND_RANKS.TWO_PAIR]: 'Doble Par',
  [HAND_RANKS.THREE_OF_A_KIND]: 'Trío',
  [HAND_RANKS.STRAIGHT]: 'Escalera',
  [HAND_RANKS.FLUSH]: 'Color',
  [HAND_RANKS.FULL_HOUSE]: 'Full House',
  [HAND_RANKS.FOUR_OF_A_KIND]: 'Póker',
  [HAND_RANKS.STRAIGHT_FLUSH]: 'Escalera de Color',
  [HAND_RANKS.ROYAL_FLUSH]: 'Escalera Real',
};

const PHASES = {
  WAITING: 'waiting',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
};

function cardValue(rank) {
  const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  return values[rank] || 0;
}

// Evaluate the best 5-card hand from 7 cards (2 hole + 5 community)
function evaluateHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) return { rank: HAND_RANKS.HIGH_CARD, value: 0, kickers: [], name: 'Carta Alta' };

  // Generate all 5-card combinations
  const combos = getCombinations(allCards, 5);
  let bestHand = null;

  for (const combo of combos) {
    const hand = evaluate5Cards(combo);
    if (!bestHand || compareHandValues(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand;
}

function getCombinations(arr, k) {
  const result = [];
  function combine(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  combine(0, []);
  return result;
}

function evaluate5Cards(cards) {
  const values = cards.map(c => cardValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Normal straight check
  const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
  if (uniqueVals.length >= 5) {
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      if (uniqueVals[i] - uniqueVals[i + 4] === 4) {
        isStraight = true;
        straightHigh = uniqueVals[i];
        break;
      }
    }
    // Ace-low straight (A-2-3-4-5)
    if (!isStraight && uniqueVals.includes(14) && uniqueVals.includes(2) && uniqueVals.includes(3) && uniqueVals.includes(4) && uniqueVals.includes(5)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count occurrences
  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });

  const countEntries = Object.entries(counts).map(([v, c]) => ({ value: parseInt(v), count: c }));
  countEntries.sort((a, b) => b.count - a.count || b.value - a.value);

  const groups = countEntries.map(e => e.count);
  const groupValues = countEntries.map(e => e.value);

  // Determine hand rank
  let rank, handValues;

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      rank = HAND_RANKS.ROYAL_FLUSH;
    } else {
      rank = HAND_RANKS.STRAIGHT_FLUSH;
    }
    handValues = [straightHigh];
  } else if (groups[0] === 4) {
    rank = HAND_RANKS.FOUR_OF_A_KIND;
    handValues = groupValues;
  } else if (groups[0] === 3 && groups[1] === 2) {
    rank = HAND_RANKS.FULL_HOUSE;
    handValues = groupValues;
  } else if (isFlush) {
    rank = HAND_RANKS.FLUSH;
    handValues = values;
  } else if (isStraight) {
    rank = HAND_RANKS.STRAIGHT;
    handValues = [straightHigh];
  } else if (groups[0] === 3) {
    rank = HAND_RANKS.THREE_OF_A_KIND;
    handValues = groupValues;
  } else if (groups[0] === 2 && groups[1] === 2) {
    rank = HAND_RANKS.TWO_PAIR;
    handValues = groupValues;
  } else if (groups[0] === 2) {
    rank = HAND_RANKS.ONE_PAIR;
    handValues = groupValues;
  } else {
    rank = HAND_RANKS.HIGH_CARD;
    handValues = values;
  }

  return {
    rank,
    handValues,
    name: HAND_NAMES[rank],
    cards,
  };
}

function compareHandValues(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.handValues.length, b.handValues.length); i++) {
    if (a.handValues[i] !== b.handValues[i]) return a.handValues[i] - b.handValues[i];
  }
  return 0;
}

function compareHands(handA, handB) {
  return compareHandValues(handA, handB);
}

// Determine winners from array of { playerIndex, hand }
function determineWinners(playerHands) {
  if (playerHands.length === 0) return [];
  if (playerHands.length === 1) return [playerHands[0]];

  let best = playerHands[0];
  let winners = [playerHands[0]];

  for (let i = 1; i < playerHands.length; i++) {
    const cmp = compareHands(playerHands[i].hand, best.hand);
    if (cmp > 0) {
      best = playerHands[i];
      winners = [playerHands[i]];
    } else if (cmp === 0) {
      winners.push(playerHands[i]);
    }
  }

  return winners;
}

// Calculate hand strength as a simple 0-1 score for AI
function handStrength(holeCards, communityCards) {
  if (communityCards.length === 0) {
    // Pre-flop strength based on hole cards
    return preflopStrength(holeCards);
  }

  const hand = evaluateHand(holeCards, communityCards);
  // Normalize rank to 0-1
  const base = hand.rank / 9;
  // Add kicker bonus
  const kickerBonus = (hand.handValues[0] || 0) / 14 * 0.1;
  return Math.min(1, base + kickerBonus);
}

function preflopStrength(holeCards) {
  if (holeCards.length < 2) return 0.3;

  const v1 = cardValue(holeCards[0].rank);
  const v2 = cardValue(holeCards[1].rank);
  const suited = holeCards[0].suit === holeCards[1].suit;
  const pair = v1 === v2;
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const gap = high - low;

  let strength = 0;

  if (pair) {
    strength = 0.5 + (high / 14) * 0.5; // Pairs: 0.5-1.0
  } else {
    strength = (high + low) / 28 * 0.6;
    if (suited) strength += 0.08;
    if (gap <= 2) strength += 0.05;
    if (high >= 12) strength += 0.1; // Face cards
  }

  return Math.min(1, Math.max(0, strength));
}

export {
  HAND_RANKS,
  HAND_NAMES,
  PHASES,
  evaluateHand,
  compareHands,
  determineWinners,
  handStrength,
  cardValue,
};
