// Server-side poker room with full Texas Hold'em logic

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const PHASES = { WAITING: 'waiting', PREFLOP: 'preflop', FLOP: 'flop', TURN: 'turn', RIVER: 'river', SHOWDOWN: 'showdown' };

function cardValue(rank) {
  const v = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  return v[rank] || 0;
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCombinations(arr, k) {
  const result = [];
  function combine(start, combo) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) { combo.push(arr[i]); combine(i + 1, combo); combo.pop(); }
  }
  combine(0, []);
  return result;
}

function evaluate5(cards) {
  const values = cards.map(c => cardValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const unique = [...new Set(values)].sort((a, b) => b - a);

  let isStraight = false, straightHigh = 0;
  if (unique.length >= 5) {
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) { isStraight = true; straightHigh = unique[i]; break; }
    }
    if (!isStraight && unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
      isStraight = true; straightHigh = 5;
    }
  }

  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const entries = Object.entries(counts).map(([v, c]) => ({ value: +v, count: c })).sort((a, b) => b.count - a.count || b.value - a.value);
  const groups = entries.map(e => e.count);
  const gv = entries.map(e => e.value);

  let rank, hv;
  if (isFlush && isStraight) { rank = straightHigh === 14 ? 9 : 8; hv = [straightHigh]; }
  else if (groups[0] === 4) { rank = 7; hv = gv; }
  else if (groups[0] === 3 && groups[1] === 2) { rank = 6; hv = gv; }
  else if (isFlush) { rank = 5; hv = values; }
  else if (isStraight) { rank = 4; hv = [straightHigh]; }
  else if (groups[0] === 3) { rank = 3; hv = gv; }
  else if (groups[0] === 2 && groups[1] === 2) { rank = 2; hv = gv; }
  else if (groups[0] === 2) { rank = 1; hv = gv; }
  else { rank = 0; hv = values; }

  return { rank, hv };
}

function evaluateHand(hole, community) {
  const all = [...hole, ...community];
  if (all.length < 5) return { rank: 0, hv: [0] };
  const combos = getCombinations(all, 5);
  let best = null;
  for (const c of combos) {
    const h = evaluate5(c);
    if (!best || compareHV(h, best) > 0) best = h;
  }
  return best;
}

function compareHV(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.hv.length, b.hv.length); i++) {
    if (a.hv[i] !== b.hv[i]) return a.hv[i] - b.hv[i];
  }
  return 0;
}

const HAND_NAMES = ['Carta Alta', 'Par', 'Doble Par', 'Trío', 'Escalera', 'Color', 'Full House', 'Póker', 'Escalera de Color', 'Escalera Real'];

// Abilities
const ABILITIES = {
  PEEK: { id: 'peek', name: 'Visión', desc: 'Ve la próxima carta comunitaria en secreto', cost: 100, cooldown: 3 },
  SHIELD: { id: 'shield', name: 'Escudo', desc: 'Protege tu apuesta de un raise este turno', cost: 150, cooldown: 5 },
  INTIMIDATE: { id: 'intimidate', name: 'Intimidar', desc: 'Revela el suit de una carta del oponente', cost: 75, cooldown: 2 },
  SWAP: { id: 'swap', name: 'Cambio', desc: 'Cambia una de tus cartas por una nueva del mazo', cost: 200, cooldown: 4 },
  DOUBLEDOWN: { id: 'doubledown', name: 'Doble o Nada', desc: 'Duplica el pozo actual si ganas, pierdes el doble si no', cost: 0, cooldown: 6 },
};

export class PokerRoom {
  constructor(code, settings) {
    this.code = code;
    this.settings = settings;
    this.players = [];
    this.hostId = null;
    this.gameStarted = false;
    this.createdAt = Date.now();
    this.emptyAt = null;

    // Game state
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = 0;
    this.phase = PHASES.WAITING;
    this.dealerIndex = 0;
    this.activePlayerIndex = 0;
    this.roundComplete = false;
    this.smallBlind = settings.smallBlind || 10;
    this.bigBlind = settings.bigBlind || 20;

    // Abilities state
    this.abilityCooldowns = {}; // playerId -> { abilityId -> roundsLeft }
    this.activeEffects = {};    // playerId -> [effect]
  }

  addPlayer(ws) {
    const player = {
      id: ws.playerId,
      ws,
      name: ws.playerInfo.name,
      avatar: ws.playerInfo.avatar,
      chips: this.settings.startingChips,
      holeCards: [],
      bet: 0, totalBet: 0,
      folded: false, allIn: false,
      lastAction: '',
      ready: false,
      _needsAction: false,
      shielded: false,
      doubleDownActive: false,
      abilities: { peek: 0, shield: 0, intimidate: 0, swap: 0, doubledown: 0 },
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.abilityCooldowns[player.id] = {};
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) return;
    this.players.splice(idx, 1);
    delete this.abilityCooldowns[playerId];
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
    if (this.gameStarted && this.players.length < 2) {
      this.endGame();
    }
    this.broadcastRoomState();
    if (this.gameStarted) this.broadcastGameState();
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    this.players.forEach(p => {
      if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(data);
    });
  }

  sendTo(playerId, msg) {
    const p = this.players.find(pl => pl.id === playerId);
    if (p && p.ws && p.ws.readyState === p.ws.OPEN) {
      p.ws.send(JSON.stringify(msg));
    }
  }

  broadcastRoomState() {
    this.broadcast({
      type: 'roomState',
      code: this.code,
      hostId: this.hostId,
      players: this.players.map(p => ({
        id: p.id, name: p.name, avatar: p.avatar,
        chips: p.chips, ready: p.ready,
      })),
      gameStarted: this.gameStarted,
      settings: this.settings,
    });
  }

  // =================== GAME LOGIC ===================

  startGame() {
    if (this.players.length < 2) return;
    this.gameStarted = true;
    this.dealerIndex = 0;
    this.players.forEach(p => {
      p.chips = this.settings.startingChips;
    });
    this.broadcast({ type: 'gameStarted' });
    this.startNewRound();
  }

  startNewRound() {
    this.deck = createDeck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.roundComplete = false;

    this.players.forEach(p => {
      p.holeCards = [];
      p.bet = 0; p.totalBet = 0;
      p.folded = p.chips <= 0;
      p.allIn = false;
      p.lastAction = p.chips <= 0 ? 'ELIMINADO' : '';
      p._needsAction = false;
      p.shielded = false;
      p.doubleDownActive = false;
    });

    // Reduce ability cooldowns
    for (const pid of Object.keys(this.abilityCooldowns)) {
      for (const aid of Object.keys(this.abilityCooldowns[pid])) {
        this.abilityCooldowns[pid][aid] = Math.max(0, this.abilityCooldowns[pid][aid] - 1);
      }
    }

    const active = this.players.filter(p => !p.folded);
    if (active.length < 2) {
      this.endGame();
      return;
    }

    // Move dealer
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    while (this.players[this.dealerIndex].folded) {
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    }

    this.postBlinds();
    this.dealHoleCards();
    this.phase = PHASES.PREFLOP;
    this.startBettingRound();
  }

  postBlinds() {
    const sb = this.getNextActive(this.dealerIndex);
    const bb = this.getNextActive(sb);
    const sbP = this.players[sb];
    const bbP = this.players[bb];
    const sbAmt = Math.min(this.smallBlind, sbP.chips);
    const bbAmt = Math.min(this.bigBlind, bbP.chips);
    this.placeBet(sbP, sbAmt);
    sbP.lastAction = `SB $${sbAmt}`;
    this.placeBet(bbP, bbAmt);
    bbP.lastAction = `BB $${bbAmt}`;
    this.currentBet = bbAmt;
    this.minRaise = this.bigBlind;
  }

  dealHoleCards() {
    this.players.forEach(p => {
      if (p.folded) return;
      p.holeCards = [this.deck.pop(), this.deck.pop()];
    });
    this.broadcast({ type: 'cardsDealt' });
    // Send each player their private cards
    this.players.forEach(p => {
      if (!p.folded) {
        this.sendTo(p.id, { type: 'yourCards', cards: p.holeCards });
      }
    });
  }

  startBettingRound() {
    const canAct = this.players.filter(p => !p.folded && !p.allIn && p.chips > 0);
    if (canAct.length <= 1) {
      setTimeout(() => this.advancePhase(), 500);
      return;
    }

    if (this.phase === PHASES.PREFLOP) {
      const bb = this.getNextActive(this.getNextActive(this.dealerIndex));
      this.activePlayerIndex = this.getNextActive(bb);
    } else {
      this.activePlayerIndex = this.getNextActive(this.dealerIndex);
    }

    if (this.phase !== PHASES.PREFLOP) {
      this.players.forEach(p => { p.bet = 0; });
      this.currentBet = 0;
    }

    this.players.forEach(p => {
      if (!p.folded && !p.allIn && p.chips > 0) p._needsAction = true;
    });

    this.broadcastGameState();
    this.promptPlayer();
  }

  promptPlayer() {
    const p = this.players[this.activePlayerIndex];
    if (!p || p.folded || p.allIn || p.chips <= 0) {
      if (this.checkBettingComplete()) {
        this.advancePhase();
      } else {
        this.activePlayerIndex = this.getNextActive(this.activePlayerIndex);
        this.promptPlayer();
      }
      return;
    }

    this.broadcastGameState();

    const toCall = this.currentBet - p.bet;
    this.sendTo(p.id, {
      type: 'yourTurn',
      canCheck: toCall <= 0,
      canCall: toCall > 0,
      callAmount: toCall,
      minRaise: Math.min(this.currentBet + this.minRaise, p.chips + p.bet),
      maxRaise: p.chips + p.bet,
    });

    // Auto-fold timeout (60s)
    if (p._turnTimer) clearTimeout(p._turnTimer);
    p._turnTimer = setTimeout(() => {
      if (!this.roundComplete && this.activePlayerIndex === this.players.indexOf(p)) {
        this.handlePlayerAction(p.id, 'fold');
      }
    }, 60000);
  }

  handlePlayerAction(playerId, action, amount) {
    const pIdx = this.players.findIndex(p => p.id === playerId);
    if (pIdx === -1 || pIdx !== this.activePlayerIndex) return;
    const p = this.players[pIdx];
    if (p._turnTimer) clearTimeout(p._turnTimer);

    switch (action) {
      case 'fold':
        p.folded = true;
        p.lastAction = 'FOLD';
        p._needsAction = false;
        this.broadcast({ type: 'playerAction', playerId, action: 'fold', name: p.name });
        break;
      case 'check':
        p.lastAction = 'CHECK';
        p._needsAction = false;
        this.broadcast({ type: 'playerAction', playerId, action: 'check', name: p.name });
        break;
      case 'call': {
        const callAmt = Math.min(this.currentBet - p.bet, p.chips);
        this.placeBet(p, callAmt);
        p.lastAction = `CALL $${callAmt}`;
        p._needsAction = false;
        this.broadcast({ type: 'playerAction', playerId, action: 'call', amount: callAmt, name: p.name });
        break;
      }
      case 'raise': {
        const raiseAmt = Math.min(Math.max(amount || 0, this.currentBet + this.minRaise), p.chips + p.bet);
        const toAdd = raiseAmt - p.bet;
        this.minRaise = raiseAmt - this.currentBet;
        this.currentBet = raiseAmt;
        this.placeBet(p, toAdd);
        p.lastAction = `RAISE $${raiseAmt}`;
        p._needsAction = false;
        this.resetActionsForRaise(p);
        this.broadcast({ type: 'playerAction', playerId, action: 'raise', amount: raiseAmt, name: p.name });
        break;
      }
      case 'allin': {
        const allAmt = p.chips;
        const totalBet = p.bet + allAmt;
        if (totalBet > this.currentBet) {
          this.minRaise = totalBet - this.currentBet;
          this.currentBet = totalBet;
          this.resetActionsForRaise(p);
        }
        this.placeBet(p, allAmt);
        p.allIn = true;
        p._needsAction = false;
        p.lastAction = `ALL IN $${totalBet}`;
        this.broadcast({ type: 'playerAction', playerId, action: 'allin', amount: totalBet, name: p.name });
        break;
      }
    }

    // Check win by last standing
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      this.endRound([activePlayers[0]]);
      return;
    }

    if (this.checkBettingComplete()) {
      setTimeout(() => this.advancePhase(), 800);
    } else {
      this.activePlayerIndex = this.getNextActive(this.activePlayerIndex);
      setTimeout(() => this.promptPlayer(), 300);
    }
  }

  handleAbility(playerId, abilityId) {
    if (!this.settings.abilities) return;
    const p = this.players.find(pl => pl.id === playerId);
    if (!p || p.folded) return;

    const ability = ABILITIES[abilityId.toUpperCase()];
    if (!ability) return;

    // Check cooldown
    const cd = this.abilityCooldowns[playerId] || {};
    if (cd[abilityId] > 0) {
      this.sendTo(playerId, { type: 'error', message: `Habilidad en cooldown (${cd[abilityId]} rondas)` });
      return;
    }

    // Check cost
    if (p.chips < ability.cost) {
      this.sendTo(playerId, { type: 'error', message: 'No tienes suficientes fichas' });
      return;
    }

    // Deduct cost
    p.chips -= ability.cost;

    // Set cooldown
    if (!this.abilityCooldowns[playerId]) this.abilityCooldowns[playerId] = {};
    this.abilityCooldowns[playerId][abilityId] = ability.cooldown;

    // Apply effect
    switch (abilityId) {
      case 'peek': {
        const nextIdx = this.communityCards.length;
        if (nextIdx < 5 && this.deck.length > 0) {
          const peekCard = this.deck[this.deck.length - 1];
          this.sendTo(playerId, { type: 'abilityResult', ability: 'peek', card: peekCard });
        } else {
          this.sendTo(playerId, { type: 'abilityResult', ability: 'peek', card: null });
        }
        break;
      }
      case 'shield':
        p.shielded = true;
        break;
      case 'intimidate': {
        // Reveal the suit of a random card from a random opponent
        const opponents = this.players.filter(pl => pl.id !== playerId && !pl.folded && pl.holeCards.length > 0);
        if (opponents.length > 0) {
          const target = opponents[Math.floor(Math.random() * opponents.length)];
          const cardIdx = Math.floor(Math.random() * target.holeCards.length);
          const revealedSuit = target.holeCards[cardIdx].suit;
          this.sendTo(playerId, {
            type: 'abilityResult', ability: 'intimidate',
            targetName: target.name, suit: revealedSuit,
          });
        }
        break;
      }
      case 'swap': {
        // Swap one of your cards for a new one from the deck
        if (p.holeCards.length > 0 && this.deck.length > 0) {
          const swapIdx = 0; // swap first card
          const oldCard = p.holeCards[swapIdx];
          p.holeCards[swapIdx] = this.deck.pop();
          this.deck.push(oldCard); // put old card back
          this.sendTo(playerId, {
            type: 'abilityResult', ability: 'swap',
            newCards: p.holeCards,
          });
        }
        break;
      }
      case 'doubledown': {
        // Mark that pot is doubled for this player if they win
        p.doubleDownActive = true;
        break;
      }
    }

    this.broadcast({
      type: 'abilityUsed',
      playerId,
      name: p.name,
      ability: abilityId,
      abilityName: ability.name,
    });

    this.broadcastGameState();
  }

  placeBet(p, amount) {
    const actual = Math.min(amount, p.chips);
    p.chips -= actual;
    p.bet += actual;
    p.totalBet += actual;
    this.pot += actual;
    if (p.chips <= 0) p.allIn = true;
  }

  resetActionsForRaise(raiser) {
    this.players.forEach(p => {
      if (p !== raiser && !p.folded && !p.allIn) p._needsAction = true;
    });
  }

  checkBettingComplete() {
    const active = this.players.filter(p => !p.folded && !p.allIn && p.chips > 0);
    return active.every(p => p.bet >= this.currentBet) && !active.some(p => p._needsAction);
  }

  advancePhase() {
    this.players.forEach(p => { p._needsAction = false; });
    switch (this.phase) {
      case PHASES.PREFLOP:
        this.phase = PHASES.FLOP;
        this.dealCommunity(3);
        break;
      case PHASES.FLOP:
        this.phase = PHASES.TURN;
        this.dealCommunity(1);
        break;
      case PHASES.TURN:
        this.phase = PHASES.RIVER;
        this.dealCommunity(1);
        break;
      case PHASES.RIVER:
        this.phase = PHASES.SHOWDOWN;
        this.showdown();
        return;
    }
    this.broadcast({ type: 'phaseChange', phase: this.phase, communityCards: this.communityCards });
    setTimeout(() => this.startBettingRound(), 1200);
  }

  dealCommunity(count) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length > 0) this.communityCards.push(this.deck.pop());
    }
  }

  showdown() {
    const active = this.players.filter(p => !p.folded);
    // Reveal all cards
    const hands = active.map(p => {
      const hand = evaluateHand(p.holeCards, this.communityCards);
      return { player: p, hand, cards: p.holeCards };
    });

    let best = hands[0];
    let winners = [hands[0]];
    for (let i = 1; i < hands.length; i++) {
      const cmp = compareHV(hands[i].hand, best.hand);
      if (cmp > 0) { best = hands[i]; winners = [hands[i]]; }
      else if (cmp === 0) { winners.push(hands[i]); }
    }

    this.endRound(
      winners.map(w => w.player),
      hands.map(h => ({ playerId: h.player.id, name: h.player.name, cards: h.cards, handName: HAND_NAMES[h.hand.rank] || 'Carta Alta' }))
    );
  }

  endRound(winners, allHands = null) {
    this.roundComplete = true;

    // Double Down bonus
    let totalPot = this.pot;
    const hasDoubleDown = winners.some(w => w.doubleDownActive);
    if (hasDoubleDown) totalPot = Math.floor(totalPot * 2);

    // Losers with doubleDown lose extra chips
    this.players.forEach(p => {
      if (p.doubleDownActive && !winners.includes(p)) {
        const penalty = Math.min(p.chips, this.pot);
        p.chips -= penalty;
      }
      p.doubleDownActive = false;
    });

    const share = Math.floor(totalPot / winners.length);
    winners.forEach(w => { w.chips += share; });

    // Check eliminations
    const eliminated = this.players.filter(p => p.chips <= 0 && !p.folded);

    this.broadcast({
      type: 'roundEnd',
      winners: winners.map(w => ({ id: w.id, name: w.name, chips: w.chips })),
      pot: this.pot,
      allHands,
      eliminated: eliminated.map(e => ({ id: e.id, name: e.name })),
      doubleDown: hasDoubleDown,
    });

    this.broadcastGameState();
  }

  endGame() {
    const winner = this.players.find(p => p.chips > 0) || this.players[0];
    this.broadcast({
      type: 'gameOver',
      winner: winner ? { id: winner.id, name: winner.name, chips: winner.chips } : null,
    });
    this.gameStarted = false;
  }

  getNextActive(fromIdx) {
    let idx = (fromIdx + 1) % this.players.length;
    let count = 0;
    while (count < this.players.length) {
      if (!this.players[idx].folded && !this.players[idx].allIn && this.players[idx].chips > 0) return idx;
      idx = (idx + 1) % this.players.length;
      count++;
    }
    return fromIdx;
  }

  broadcastGameState() {
    // Send game state to each player (with their private cards only)
    this.players.forEach(p => {
      const state = {
        type: 'gameState',
        phase: this.phase,
        pot: this.pot,
        currentBet: this.currentBet,
        communityCards: this.communityCards,
        activePlayerIndex: this.activePlayerIndex,
        activePlayerId: this.players[this.activePlayerIndex]?.id,
        dealerIndex: this.dealerIndex,
        players: this.players.map((pl, idx) => ({
          id: pl.id,
          name: pl.name,
          avatar: pl.avatar,
          chips: pl.chips,
          bet: pl.bet,
          folded: pl.folded,
          allIn: pl.allIn,
          lastAction: pl.lastAction,
          isActive: idx === this.activePlayerIndex,
          hasCards: pl.holeCards.length > 0,
          // Only show cards during showdown or own cards
          cards: (this.phase === PHASES.SHOWDOWN && !pl.folded) ? pl.holeCards : (pl.id === p.id ? pl.holeCards : null),
          shielded: pl.shielded,
          doubleDownActive: pl.doubleDownActive,
        })),
        yourCards: p.holeCards,
        yourChips: p.chips,
        abilityCooldowns: this.abilityCooldowns[p.id] || {},
        abilities: this.settings.abilities ? ABILITIES : null,
      };
      this.sendTo(p.id, state);
    });
  }
}
