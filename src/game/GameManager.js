import * as THREE from 'three';
import { Deck } from './Deck.js';
import { PHASES, evaluateHand, determineWinners } from './PokerLogic.js';
import { createBots } from './BotAI.js';
// Chip visuals created inline in animateChipsToPot

export class GameManager {
  constructor(scene, table, audioManager) {
    this.scene = scene;
    this.table = table;
    this.audio = audioManager;

    // Game state
    this.phase = PHASES.WAITING;
    this.deck = new Deck();
    this.players = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = 0;
    this.dealerIndex = 0;
    this.activePlayerIndex = 0;
    this.roundComplete = false;

    // 3D objects on table
    this.cardMeshes = [];
    this.chipMeshes = [];
    this.communityCardMeshes = [];

    // Blinds
    this.smallBlind = 10;
    this.bigBlind = 20;

    // Settings
    this.settings = {
      numBots: 2,
      difficulty: 'medium',
      startingChips: 1000,
    };

    // Animation queue
    this.animQueue = [];
    this.animating = false;
    this.animTimer = 0;

    // Abilities system (single-player)
    this.abilities = {
      peek: { id: 'peek', name: 'Visión', cost: 100, cooldown: 3 },
      shield: { id: 'shield', name: 'Escudo', cost: 150, cooldown: 5 },
      intimidate: { id: 'intimidate', name: 'Intimidar', cost: 75, cooldown: 2 },
      swap: { id: 'swap', name: 'Cambio', cost: 200, cooldown: 4 },
      doubledown: { id: 'doubledown', name: 'Doble o Nada', cost: 0, cooldown: 6 },
    };
    this.abilityCooldowns = {}; // abilityId -> roundsLeft
    this.playerShielded = false;
    this.playerDoubleDown = false;

    // Win streak system
    this.winStreak = 0;
    this.totalHandsWon = 0;
    this.totalHandsPlayed = 0;

    // Bot taunts
    this.botTaunts = {
      win: [
        '¡Demasiado fácil!', '¿Eso es todo?', 'Mejor suerte la próxima vez...',
        '💀 Sin piedad', 'Gracias por las fichas, amigo',
        '¡Sigue intentando!', 'Esto fue... patético', '¡Yo soy el rey de esta mesa!',
      ],
      lose: [
        '¡Tuviste suerte!', 'No volverá a pasar...', 'Disfrútalo mientras puedas',
        '😤 La próxima es mía', 'Buen movimiento... por ahora',
        'Me la vas a pagar', '¡Eso fue trampa!', 'Principiante con suerte...',
      ],
      bigPot: [
        '¡MADRE MÍA!', '¡Esto se pone caliente! 🔥', '¡TODO O NADA!',
        '¿Alguien tiene miedo?', '¡El pozo está que arde!',
      ],
      allIn: [
        '¡¿ALL IN?! Estás loco...', 'Esto es personal ahora',
        '¡VAMOS! A ver quién tiene más...', '😱 No puede ser...',
      ],
    };

    // Callbacks
    this.onStateChange = null;
    this.onPlayerTurn = null;
    this.onRoundEnd = null;
    this.onMessage = null;
    this.onAbilityResult = null;
    this.onStreakUpdate = null;
  }

  configure(settings) {
    Object.assign(this.settings, settings);
  }

  startGame() {
    this.clearTable();

    // Create players
    this.players = [];

    // Human player (index 0)
    this.players.push({
      index: 0,
      name: 'TÚ',
      chips: this.settings.startingChips,
      holeCards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      isBot: false,
      bot: null,
      lastAction: '',
    });

    // Bots
    const bots = createBots(this.settings.numBots, this.settings.difficulty);
    bots.forEach((bot, i) => {
      this.players.push({
        index: i + 1,
        name: bot.name,
        chips: this.settings.startingChips,
        holeCards: [],
        bet: 0,
        totalBet: 0,
        folded: false,
        allIn: false,
        isBot: true,
        bot: bot,
        lastAction: '',
      });
    });

    // Get positions
    this.positions = this.table.getPlayerPositions(this.settings.numBots);

    this.dealerIndex = 0;
    this.startNewRound();
  }

  startNewRound() {
    this.clearTable();
    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.roundComplete = false;
    this.playerShielded = false;
    this.playerDoubleDown = false;
    this.totalHandsPlayed++;

    // Reduce ability cooldowns
    for (const aid of Object.keys(this.abilityCooldowns)) {
      this.abilityCooldowns[aid] = Math.max(0, this.abilityCooldowns[aid] - 1);
    }

    // Reset players
    this.players.forEach(p => {
      p.holeCards = [];
      p.bet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
      p.lastAction = '';
    });

    // Mark eliminated players as folded
    this.players.forEach(p => {
      if (p.chips <= 0) p.folded = true;
    });

    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length < 2) {
      this.emitMessage(activePlayers.length === 1 ? `${activePlayers[0].name} GANA LA PARTIDA!` : 'PARTIDA TERMINADA');
      if (this.onRoundEnd) this.onRoundEnd({ gameOver: true, winner: activePlayers[0] });
      return;
    }

    // Move dealer
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    while (this.players[this.dealerIndex].chips <= 0) {
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    }

    // Move dealer button
    const dealerPos = this.positions[this.dealerIndex];
    if (dealerPos) this.table.moveDealerButton(dealerPos.seat);

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Start pre-flop betting
    this.phase = PHASES.PREFLOP;
    this.startBettingRound();
  }

  postBlinds() {
    const sbIndex = this.getNextActivePlayer(this.dealerIndex);
    const bbIndex = this.getNextActivePlayer(sbIndex);

    const sbPlayer = this.players[sbIndex];
    const bbPlayer = this.players[bbIndex];

    const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
    const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);

    this.placeBet(sbPlayer, sbAmount);
    sbPlayer.lastAction = `SB $${sbAmount}`;

    this.placeBet(bbPlayer, bbAmount);
    bbPlayer.lastAction = `BB $${bbAmount}`;

    this.currentBet = bbAmount;
    this.minRaise = this.bigBlind;

    this.emitStateChange();
  }

  dealHoleCards() {
    this.players.forEach((player, idx) => {
      if (player.chips <= 0) return;

      const cards = this.deck.dealMultiple(2);
      player.holeCards = cards;

      const pos = this.positions[idx];
      if (!pos) return;

      cards.forEach((card, ci) => {
        // Position cards at the player's card position
        const offsetX = (ci - 0.5) * 0.12;
        card.setPosition(0, 1.5, 0); // Start from above

        const targetPos = new THREE.Vector3(
          pos.cardPos.x + offsetX,
          pos.cardPos.y,
          pos.cardPos.z
        );

        card.animateTo(targetPos, null, 3);

        // Human player can see their cards
        if (idx === 0) {
          card.flipUp();
        }

        this.scene.add(card.mesh);
        this.cardMeshes.push(card);
      });
    });

    if (this.audio) this.audio.playSound('card');
  }

  startBettingRound() {
    // Check if enough players can still act
    const canAct = this.players.filter(p => !p.folded && !p.allIn && p.chips > 0);
    if (canAct.length <= 1) {
      // Not enough players to bet, advance directly
      setTimeout(() => this.advancePhase(), 500);
      return;
    }

    // Determine first player to act
    if (this.phase === PHASES.PREFLOP) {
      // After big blind
      const bbIndex = this.getNextActivePlayer(this.getNextActivePlayer(this.dealerIndex));
      this.activePlayerIndex = this.getNextActivePlayer(bbIndex);
    } else {
      // After dealer
      this.activePlayerIndex = this.getNextActivePlayer(this.dealerIndex);
    }

    // Reset bets for new round (except preflop)
    if (this.phase !== PHASES.PREFLOP) {
      this.players.forEach(p => { p.bet = 0; });
      this.currentBet = 0;
    }

    // Mark all active players as needing to act
    this.players.forEach(p => {
      if (!p.folded && !p.allIn && p.chips > 0) {
        p._needsAction = true;
      }
    });

    this.emitStateChange();
    this.promptNextPlayer();
  }

  promptNextPlayer() {
    const player = this.players[this.activePlayerIndex];

    if (!player || player.folded || player.allIn || player.chips <= 0) {
      if (this.checkBettingComplete()) {
        this.advancePhase();
      } else {
        this.activePlayerIndex = this.getNextActivePlayer(this.activePlayerIndex);
        this.promptNextPlayer();
      }
      return;
    }

    this.emitStateChange();

    if (player.isBot) {
      // Bot decision with delay
      const delay = player.bot.actionDelay;
      setTimeout(() => {
        this.executeBotTurn(player);
      }, delay);
    } else {
      // Human player turn
      if (this.onPlayerTurn) {
        this.onPlayerTurn({
          canCheck: this.currentBet <= player.bet,
          canCall: this.currentBet > player.bet,
          callAmount: this.currentBet - player.bet,
          minRaise: Math.min(this.currentBet + this.minRaise, player.chips),
          maxRaise: player.chips,
          currentBet: this.currentBet,
          playerBet: player.bet,
        });
      }
    }
  }

  executeBotTurn(player) {
    if (this.roundComplete) return;

    const gameState = {
      holeCards: player.holeCards,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      playerBet: player.bet,
      playerChips: player.chips,
      minRaise: this.currentBet + this.minRaise,
      phase: this.phase,
    };

    const decision = player.bot.decide(gameState);
    this.executeAction(player, decision.action, decision.amount);
  }

  // Execute a player action (human or bot)
  executeAction(player, action, amount = 0) {
    if (this.roundComplete) return;

    switch (action) {
      case 'fold':
        player.folded = true;
        player.lastAction = 'FOLD';
        player._needsAction = false;
        this.emitMessage(`${player.name} FOLD`);
        if (this.audio) this.audio.playSound('card');
        // Hide their cards
        player.holeCards.forEach(card => {
          card.animateTo(new THREE.Vector3(card.mesh.position.x, card.mesh.position.y + 0.05, card.mesh.position.z - 0.3), null, 3);
          card.flipDown();
        });
        break;

      case 'check':
        player.lastAction = 'CHECK';
        player._needsAction = false;
        this.emitMessage(`${player.name} CHECK`);
        break;

      case 'call': {
        const callAmount = Math.min(this.currentBet - player.bet, player.chips);
        this.placeBet(player, callAmount);
        player.lastAction = `CALL $${callAmount}`;
        player._needsAction = false;
        this.emitMessage(`${player.name} CALL $${callAmount}`);
        if (this.audio) this.audio.playSound('chips');
        this.animateChipsToPot(player);
        break;
      }

      case 'raise': {
        const raiseAmount = Math.min(Math.max(amount, this.currentBet + this.minRaise), player.chips);
        const toAdd = raiseAmount - player.bet;
        this.minRaise = raiseAmount - this.currentBet;
        this.currentBet = raiseAmount;
        this.placeBet(player, toAdd);
        player.lastAction = `RAISE $${raiseAmount}`;
        player._needsAction = false;
        this.emitMessage(`${player.name} RAISE $${raiseAmount}`);
        if (this.audio) this.audio.playSound('chips');
        this.animateChipsToPot(player);
        // Reset action tracking - others need to respond
        this.resetActionsForRaise(player);
        break;
      }

      case 'allin': {
        const allInAmount = player.chips;
        const totalBet = player.bet + allInAmount;
        if (totalBet > this.currentBet) {
          this.minRaise = totalBet - this.currentBet;
          this.currentBet = totalBet;
          this.resetActionsForRaise(player);
        }
        this.placeBet(player, allInAmount);
        player.allIn = true;
        player._needsAction = false;
        player.lastAction = `ALL IN $${totalBet}`;
        this.emitMessage(`${player.name} ALL IN! $${totalBet}`);
        if (this.audio) this.audio.playSound('chips');
        this.animateChipsToPot(player);
        break;
      }
    }

    this.emitStateChange();

    // Big pot taunt when pot grows large
    if (this.pot > this.settings.startingChips * 0.6 && player.isBot && (action === 'raise' || action === 'allin')) {
      this.botTaunt('bigPot');
    }

    // Check if only one player remains
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      this.endRound(activePlayers);
      return;
    }

    // Check if betting is complete
    if (this.checkBettingComplete()) {
      setTimeout(() => this.advancePhase(), 800);
    } else {
      this.activePlayerIndex = this.getNextActivePlayer(this.activePlayerIndex);
      setTimeout(() => this.promptNextPlayer(), 300);
    }
  }

  // Human player actions
  playerFold() { this.executeAction(this.players[0], 'fold'); }
  playerCheck() { this.executeAction(this.players[0], 'check'); }
  playerCall() { this.executeAction(this.players[0], 'call'); }
  playerRaise(amount) { this.executeAction(this.players[0], 'raise', amount); }
  playerAllIn() {
    this.executeAction(this.players[0], 'allin');
    // Bot taunt on all-in
    this.botTaunt('allIn');
  }

  // ===== ABILITIES (single-player) =====
  useAbility(abilityId) {
    const ability = this.abilities[abilityId];
    if (!ability) return { success: false, message: 'Habilidad no encontrada' };

    const player = this.players[0]; // human
    const cd = this.abilityCooldowns[abilityId] || 0;
    if (cd > 0) return { success: false, message: `Cooldown: ${cd} rondas` };
    if (player.chips < ability.cost) return { success: false, message: 'Fichas insuficientes' };

    player.chips -= ability.cost;
    this.abilityCooldowns[abilityId] = ability.cooldown;
    this.emitStateChange();

    switch (abilityId) {
      case 'peek': {
        const nextIdx = this.communityCards.length;
        if (nextIdx < 5) {
          const peekCard = this.deck.peek();
          if (this.onAbilityResult) this.onAbilityResult({ ability: 'peek', card: peekCard });
        }
        break;
      }
      case 'shield':
        this.playerShielded = true;
        this.emitMessage('🛡 Escudo activado');
        break;
      case 'intimidate': {
        const bots = this.players.filter(p => p.isBot && !p.folded && p.holeCards.length > 0);
        if (bots.length > 0) {
          const target = bots[Math.floor(Math.random() * bots.length)];
          const cardIdx = Math.floor(Math.random() * target.holeCards.length);
          const suit = target.holeCards[cardIdx].suit;
          if (this.onAbilityResult) this.onAbilityResult({ ability: 'intimidate', targetName: target.name, suit });
        }
        break;
      }
      case 'swap': {
        if (player.holeCards.length > 0) {
          const oldCard = player.holeCards[0];
          // Remove old card mesh from scene
          this.scene.remove(oldCard.mesh);
          oldCard.dispose();
          // Deal new card
          const newCard = this.deck.deal();
          if (newCard) {
            player.holeCards[0] = newCard;
            // Position and show new card
            const pos = this.positions[0];
            const offsetX = -0.5 * 0.12;
            newCard.setPosition(0, 1.5, 0);
            const targetPos = new THREE.Vector3(pos.cardPos.x + offsetX, pos.cardPos.y, pos.cardPos.z);
            newCard.animateTo(targetPos, null, 3);
            newCard.flipUp();
            this.scene.add(newCard.mesh);
            this.cardMeshes.push(newCard);
            // Replace old in cardMeshes
            const oldIdx = this.cardMeshes.indexOf(oldCard);
            if (oldIdx >= 0) this.cardMeshes.splice(oldIdx, 1);
            if (this.onAbilityResult) this.onAbilityResult({ ability: 'swap', newCards: player.holeCards });
          }
        }
        break;
      }
      case 'doubledown':
        this.playerDoubleDown = true;
        this.emitMessage('⚔ ¡DOBLE O NADA ACTIVADO!');
        break;
    }

    return { success: true };
  }

  getAbilityCooldowns() {
    return { ...this.abilityCooldowns };
  }

  // ===== BOT TAUNTS =====
  botTaunt(category) {
    const taunts = this.botTaunts[category];
    if (!taunts || taunts.length === 0) return;
    const activeBots = this.players.filter(p => p.isBot && !p.folded);
    if (activeBots.length === 0) return;
    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const taunt = taunts[Math.floor(Math.random() * taunts.length)];
    setTimeout(() => {
      this.emitMessage(`${bot.name}: "${taunt}"`);
    }, 800);
  }

  placeBet(player, amount) {
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.bet += actual;
    player.totalBet += actual;
    this.pot += actual;
    if (player.chips <= 0) player.allIn = true;
  }

  resetActionsForRaise(raiser) {
    // Mark that all other non-folded players need to act again
    this.players.forEach(p => {
      if (p !== raiser && !p.folded && !p.allIn) {
        p._needsAction = true;
      }
    });
  }

  checkBettingComplete() {
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn && p.chips > 0);

    // All active players must have matched the current bet
    const allMatched = activePlayers.every(p => p.bet >= this.currentBet);
    if (!allMatched) return false;

    // Check if anyone still needs to act
    const needsAction = activePlayers.some(p => p._needsAction);
    if (needsAction) return false;

    // Everyone has had a chance to act and bets are equal
    // Mark everyone as having acted for this round
    return true;
  }

  advancePhase() {
    // Clear action flags
    this.players.forEach(p => { p._needsAction = false; });

    switch (this.phase) {
      case PHASES.PREFLOP:
        this.phase = PHASES.FLOP;
        this.dealCommunityCards(3);
        break;
      case PHASES.FLOP:
        this.phase = PHASES.TURN;
        this.dealCommunityCards(1);
        break;
      case PHASES.TURN:
        this.phase = PHASES.RIVER;
        this.dealCommunityCards(1);
        break;
      case PHASES.RIVER:
        this.phase = PHASES.SHOWDOWN;
        this.showdown();
        return;
    }

    this.emitMessage(this.phase.toUpperCase());

    // Start new betting round after delay
    setTimeout(() => {
      this.startBettingRound();
    }, 1000);
  }

  dealCommunityCards(count) {
    const comPositions = this.table.getCommunityPositions();

    for (let i = 0; i < count; i++) {
      const card = this.deck.deal();
      if (!card) continue;

      this.communityCards.push(card);
      card.flipUp();

      const posIdx = this.communityCards.length - 1;
      const targetPos = comPositions[posIdx];

      card.setPosition(0, 1.5, -0.5);
      card.animateTo(targetPos, new THREE.Euler(0, 0, 0), 3);

      this.scene.add(card.mesh);
      this.communityCardMeshes.push(card);
    }

    if (this.audio) this.audio.playSound('card');
    this.emitStateChange();
  }

  showdown() {
    // Reveal all remaining players' cards
    const activePlayers = this.players.filter(p => !p.folded);

    activePlayers.forEach(p => {
      p.holeCards.forEach(card => {
        card.flipUp();
      });
    });

    // Evaluate hands
    const playerHands = activePlayers.map(p => ({
      playerIndex: p.index,
      player: p,
      hand: evaluateHand(p.holeCards, this.communityCards),
    }));

    const winners = determineWinners(playerHands);
    this.endRound(winners.map(w => w.player), playerHands);
  }

  endRound(winners, allHands = null) {
    this.roundComplete = true;

    const humanWon = winners.some(w => w.index === 0);

    // Win streak tracking
    if (humanWon) {
      this.winStreak++;
      this.totalHandsWon++;
    } else {
      this.winStreak = 0;
    }

    // Calculate streak bonus
    let streakBonus = 0;
    let streakLabel = '';
    if (humanWon && this.winStreak >= 5) {
      streakBonus = 0.50;
      streakLabel = '🔥🔥🔥 RACHA x5+ (+50%)';
    } else if (humanWon && this.winStreak >= 3) {
      streakBonus = 0.25;
      streakLabel = '🔥🔥 RACHA x3 (+25%)';
    } else if (humanWon && this.winStreak >= 2) {
      streakBonus = 0.10;
      streakLabel = '🔥 RACHA x2 (+10%)';
    }

    // Double Down bonus
    let totalPot = this.pot;
    if (this.playerDoubleDown) {
      if (humanWon) {
        totalPot = Math.floor(totalPot * 2);
      } else {
        // Penalty for losing with doubleDown
        const penalty = Math.min(this.players[0].chips, this.pot);
        this.players[0].chips -= penalty;
      }
    }

    // Apply streak bonus
    if (streakBonus > 0) {
      totalPot = Math.floor(totalPot * (1 + streakBonus));
    }

    // Distribute pot
    const share = Math.floor(totalPot / winners.length);
    winners.forEach(w => {
      w.chips += share;
    });

    const winnerNames = winners.map(w => w.name).join(', ');
    let detail = `${winnerNames} gana $${totalPot}`;

    if (allHands) {
      const winnerHand = allHands.find(h => h.player === winners[0]);
      if (winnerHand) {
        detail += ` con ${winnerHand.hand.name}`;
      }
    }

    if (streakLabel) detail += ` ${streakLabel}`;
    if (this.playerDoubleDown && humanWon) detail += ' ⚔ DOBLE!';

    this.emitMessage(detail);
    this.emitStateChange();

    // Bot taunt
    if (humanWon) {
      this.botTaunt('lose');
    } else {
      this.botTaunt('win');
    }

    // Streak callback
    if (this.onStreakUpdate) {
      this.onStreakUpdate(this.winStreak, this.totalHandsWon, this.totalHandsPlayed);
    }

    // Find newly eliminated players
    const eliminated = this.players.filter(p => p.chips <= 0 && !winners.includes(p));

    if (this.onRoundEnd) {
      this.onRoundEnd({
        gameOver: false,
        winners,
        pot: totalPot,
        detail,
        allHands,
        eliminated: eliminated.map(e => ({ name: e.name, index: e.index })),
        winStreak: this.winStreak,
        streakBonus: streakLabel,
        doubleDown: this.playerDoubleDown && humanWon,
      });
    }
  }

  clearTable() {
    // Remove card meshes from scene
    this.cardMeshes.forEach(card => {
      this.scene.remove(card.mesh);
      card.dispose();
    });
    this.cardMeshes = [];

    this.communityCardMeshes.forEach(card => {
      this.scene.remove(card.mesh);
      card.dispose();
    });
    this.communityCardMeshes = [];

    // Remove chip meshes
    this.chipMeshes.forEach(chip => {
      this.scene.remove(chip.mesh);
      chip.dispose();
    });
    this.chipMeshes = [];
  }

  animateChipsToPot(player) {
    const pos = this.positions[player.index];
    if (!pos) return;

    const betPos = pos.betPos;
    const chipCount = Math.min(Math.ceil(player.bet / 25), 8);
    const colors = [0xff6ec7, 0x00ccff, 0xffd700, 0x00ff88];

    for (let i = 0; i < chipCount; i++) {
      const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.007, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.3,
        metalness: 0.4,
      });
      const chipMesh = new THREE.Mesh(geo, mat);
      chipMesh.position.set(
        betPos.x + (Math.random() - 0.5) * 0.06,
        betPos.y + i * 0.008,
        betPos.z + (Math.random() - 0.5) * 0.06
      );
      chipMesh.castShadow = true;
      this.scene.add(chipMesh);
      this.chipMeshes.push({
        mesh: chipMesh,
        dispose: () => { geo.dispose(); mat.dispose(); },
      });
    }
  }

  getNextActivePlayer(fromIndex) {
    let idx = (fromIndex + 1) % this.players.length;
    let count = 0;
    while (count < this.players.length) {
      if (!this.players[idx].folded && !this.players[idx].allIn && this.players[idx].chips > 0) {
        return idx;
      }
      idx = (idx + 1) % this.players.length;
      count++;
    }
    return fromIndex; // Fallback
  }

  emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        phase: this.phase,
        pot: this.pot,
        currentBet: this.currentBet,
        players: this.players.map(p => ({
          index: p.index,
          name: p.name,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          allIn: p.allIn,
          lastAction: p.lastAction,
          isActive: p.index === this.activePlayerIndex,
          holeCards: p.index === 0 ? p.holeCards : null,
        })),
        communityCards: this.communityCards,
        activePlayerIndex: this.activePlayerIndex,
      });
    }
  }

  emitMessage(msg) {
    if (this.onMessage) this.onMessage(msg);
  }

  update(delta) {
    // Update card animations
    [...this.cardMeshes, ...this.communityCardMeshes].forEach(card => {
      card.update(delta);
    });
  }

  getHumanPlayer() {
    return this.players[0];
  }
}
