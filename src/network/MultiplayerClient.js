// Client-side WebSocket multiplayer connection

export class MultiplayerClient {
  constructor() {
    this.ws = null;
    this.playerId = null;
    this.roomCode = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Event callbacks
    this.onConnect = null;
    this.onDisconnect = null;
    this.onError = null;
    this.onRoomCreated = null;
    this.onRoomJoined = null;
    this.onRoomState = null;
    this.onRoomLeft = null;
    this.onGameStarted = null;
    this.onGameState = null;
    this.onYourCards = null;
    this.onYourTurn = null;
    this.onPlayerAction = null;
    this.onPhaseChange = null;
    this.onCardsDealt = null;
    this.onRoundEnd = null;
    this.onGameOver = null;
    this.onAbilityUsed = null;
    this.onAbilityResult = null;
    this.onRouletteEvent = null;
    this.onChat = null;
    this.onMessage = null; // generic error/info messages
  }

  connect(url) {
    if (!url) {
      // 1. Check for env var set at build time (e.g. on Netlify)
      const envUrl = import.meta.env.VITE_WS_URL;
      if (envUrl) {
        url = envUrl;
      } else {
        // 2. Auto-detect from current page location
        const loc = window.location;
        const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = loc.hostname === 'localhost' || loc.hostname === '127.0.0.1'
          ? `${loc.hostname}:3001`
          : loc.host;
        url = `${protocol}//${host}`;
      }
    }
    console.log('[MP] Connecting to:', url);
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log('[MP] Connected to server');
          if (this.onConnect) this.onConnect();
          resolve();
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log('[MP] Disconnected');
          if (this.onDisconnect) this.onDisconnect();
          this.tryReconnect(url);
        };

        this.ws.onerror = (err) => {
          console.error('[MP] WebSocket error');
          if (this.onError) this.onError('Error de conexión al servidor');
          reject(err);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (e) {
            console.error('[MP] Invalid message:', e);
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  tryReconnect(url) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    console.log(`[MP] Reconnecting... attempt ${this.reconnectAttempts}`);
    setTimeout(() => {
      this.connect(url).catch(() => {});
    }, 2000 * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ===== Actions =====

  setProfile(name, avatar) {
    this.send({ type: 'setProfile', name, avatar });
  }

  createRoom(settings = {}) {
    this.send({
      type: 'createRoom',
      startingChips: settings.startingChips || 1000,
      smallBlind: settings.smallBlind || 10,
      bigBlind: settings.bigBlind || 20,
      maxPlayers: settings.maxPlayers || 5,
      abilities: settings.abilities !== false,
    });
  }

  joinRoom(code) {
    this.send({ type: 'joinRoom', code: code.toUpperCase() });
  }

  leaveRoom() {
    this.send({ type: 'leaveRoom' });
    this.roomCode = null;
  }

  startGame() {
    this.send({ type: 'startGame' });
  }

  // Game actions
  fold() { this.send({ type: 'playerAction', action: 'fold' }); }
  check() { this.send({ type: 'playerAction', action: 'check' }); }
  call() { this.send({ type: 'playerAction', action: 'call' }); }
  raise(amount) { this.send({ type: 'playerAction', action: 'raise', amount }); }
  allIn() { this.send({ type: 'playerAction', action: 'allin' }); }

  useAbility(abilityId) {
    this.send({ type: 'useAbility', ability: abilityId });
  }

  sendRouletteEvent(phase, survived, victimIndex) {
    this.send({ type: 'rouletteEvent', phase, survived, victimIndex });
  }

  nextRound() {
    this.send({ type: 'nextRound' });
  }

  sendChat(text) {
    this.send({ type: 'chatMessage', text });
  }

  // ===== Message Handler =====

  handleMessage(msg) {
    switch (msg.type) {
      case 'welcome':
        this.playerId = msg.playerId;
        break;

      case 'profileSet':
        break;

      case 'roomCreated':
        this.roomCode = msg.code;
        if (this.onRoomCreated) this.onRoomCreated(msg.code, msg.settings);
        break;

      case 'roomJoined':
        this.roomCode = msg.code;
        if (this.onRoomJoined) this.onRoomJoined(msg.code, msg.settings);
        break;

      case 'roomState':
        if (this.onRoomState) this.onRoomState(msg);
        break;

      case 'roomLeft':
        this.roomCode = null;
        if (this.onRoomLeft) this.onRoomLeft();
        break;

      case 'error':
        if (this.onMessage) this.onMessage(msg.message, 'error');
        break;

      case 'gameStarted':
        if (this.onGameStarted) this.onGameStarted();
        break;

      case 'gameState':
        if (this.onGameState) this.onGameState(msg);
        break;

      case 'yourCards':
        if (this.onYourCards) this.onYourCards(msg.cards);
        break;

      case 'yourTurn':
        if (this.onYourTurn) this.onYourTurn(msg);
        break;

      case 'playerAction':
        if (this.onPlayerAction) this.onPlayerAction(msg);
        break;

      case 'phaseChange':
        if (this.onPhaseChange) this.onPhaseChange(msg.phase, msg.communityCards);
        break;

      case 'cardsDealt':
        if (this.onCardsDealt) this.onCardsDealt();
        break;

      case 'roundEnd':
        if (this.onRoundEnd) this.onRoundEnd(msg);
        break;

      case 'gameOver':
        if (this.onGameOver) this.onGameOver(msg);
        break;

      case 'abilityUsed':
        if (this.onAbilityUsed) this.onAbilityUsed(msg);
        break;

      case 'abilityResult':
        if (this.onAbilityResult) this.onAbilityResult(msg);
        break;

      case 'rouletteEvent':
        if (this.onRouletteEvent) this.onRouletteEvent(msg);
        break;

      case 'chat':
        if (this.onChat) this.onChat(msg);
        break;
    }
  }
}
