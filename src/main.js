import * as THREE from 'three';
import { Environment } from './scene/Environment.js';
import { Table } from './scene/Table.js';
import { Lighting } from './scene/Lighting.js';
import { PostProcessing } from './scene/PostProcessing.js';
import { FPSCamera } from './camera/FPSCamera.js';
import { GameManager } from './game/GameManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { SUIT_SYMBOLS } from './game/Card.js';
import { PlayerHands } from './game/PlayerHands.js';
import { BotModels } from './game/BotModels.js';
import { MultiplayerClient } from './network/MultiplayerClient.js';
import { Tutorial } from './ui/Tutorial.js';

// ===== GLOBALS =====
let renderer, scene, camera;
let environment, table, lighting, postProcessing;
let fpsCamera, gameManager, audioManager, playerHands, botModels;
let mpClient = null;
let tutorial = null;
let clock;
let gameStarted = false;
let gameMode = 'none'; // 'single', 'multi', 'none'

// ===== USER PROFILE =====
const userProfile = {
  name: '',
  avatar: null, // base64 data URL
};

// ===== SETTINGS STATE =====
const settings = {
  numBots: 2,
  difficulty: 'medium',
  startingChips: 1000,
  vhsEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
};

// Multiplayer room settings
const mpSettings = {
  startingChips: 1000,
  abilities: true,
};

// ===== INIT =====
function init() {
  clock = new THREE.Clock();

  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050010);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);

  audioManager = new AudioManager();
  environment = new Environment(scene);
  table = new Table(scene);
  lighting = new Lighting(scene);
  fpsCamera = new FPSCamera(camera);
  postProcessing = new PostProcessing(renderer, scene, camera);
  gameManager = new GameManager(scene, table, audioManager);
  playerHands = new PlayerHands(scene, camera);
  botModels = new BotModels(scene);
  tutorial = new Tutorial();

  window.addEventListener('resize', onResize);
  setupMenuUI();
  setupProfileUI();
  setupLobbyUI();
  setupRoomUI();
  setupGameUI();
  setupAbilitiesUI();
  setupChatUI();
  setupTutorialUI();
  setupEliminationUI();
  setupPeekUI();

  animate();
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  postProcessing.resize(w, h);
}

// ===== RENDER LOOP =====
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  fpsCamera.update(delta);
  environment.update(elapsed);
  lighting.update(elapsed);

  if (gameStarted) {
    if (gameMode === 'single') gameManager.update(delta);
    playerHands.update(delta);
    botModels.update(delta);
  }

  postProcessing.render(elapsed);
}

// ===== SCREEN HELPERS =====
function hideAllScreens() {
  ['main-menu','bot-setup','settings-screen','profile-setup','mp-lobby','room-waiting','game-hud'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}
function showScreen(id) {
  hideAllScreens();
  document.getElementById(id).classList.remove('hidden');
}

// ===== MENU UI =====
function setupMenuUI() {
  document.getElementById('btn-single').addEventListener('click', () => {
    audioManager.init(); audioManager.playSound('click');
    showScreen('bot-setup');
  });

  document.getElementById('btn-multi').addEventListener('click', () => {
    audioManager.init(); audioManager.playSound('click');
    showScreen('profile-setup');
  });

  document.getElementById('btn-tutorial').addEventListener('click', () => {
    audioManager.init(); audioManager.playSound('click');
    tutorial.open();
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    audioManager.init(); audioManager.playSound('click');
    showScreen('settings-screen');
  });

  document.getElementById('btn-back-settings').addEventListener('click', () => {
    audioManager.playSound('click');
    showScreen('main-menu');
  });

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    audioManager.playSound('click');
    showScreen('main-menu');
  });

  // Bot count
  document.querySelectorAll('[data-bots]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-bots]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.numBots = parseInt(btn.dataset.bots);
      audioManager.playSound('click');
    });
  });

  // Difficulty
  document.querySelectorAll('[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.difficulty = btn.dataset.diff;
      audioManager.playSound('click');
    });
  });

  // Chips
  document.querySelectorAll('[data-chips]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-chips]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.startingChips = parseInt(btn.dataset.chips);
      audioManager.playSound('click');
    });
  });

  // VHS
  document.querySelectorAll('[data-vhs]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vhs]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.vhsEnabled = btn.dataset.vhs === 'on';
      postProcessing.setVHS(settings.vhsEnabled);
      audioManager.playSound('click');
    });
  });

  // Volume
  document.getElementById('vol-music').addEventListener('input', e => {
    settings.musicVolume = e.target.value / 100;
    audioManager.setMusicVolume(settings.musicVolume);
  });
  document.getElementById('vol-sfx').addEventListener('input', e => {
    settings.sfxVolume = e.target.value / 100;
    audioManager.setSfxVolume(settings.sfxVolume);
  });

  // Start single player
  document.getElementById('btn-start-game').addEventListener('click', () => {
    audioManager.playSound('click');
    startSinglePlayer();
  });
}

// ===== PROFILE UI =====
function setupProfileUI() {
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('avatar-preview');

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      userProfile.avatar = ev.target.result;
      avatarPreview.innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-profile-back').addEventListener('click', () => {
    audioManager.playSound('click');
    showScreen('main-menu');
  });

  document.getElementById('btn-profile-continue').addEventListener('click', () => {
    const nameInput = document.getElementById('username-input');
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = '#ff2255';
      nameInput.placeholder = 'Escribe tu nombre!';
      return;
    }
    userProfile.name = name;
    audioManager.playSound('click');
    connectToMultiplayer();
  });
}

// ===== MULTIPLAYER CONNECTION =====
async function connectToMultiplayer() {
  document.getElementById('lobby-status').textContent = 'Conectando...';
  showScreen('mp-lobby');

  mpClient = new MultiplayerClient();

  mpClient.onMessage = (text, type) => {
    document.getElementById('lobby-status').textContent = text;
  };

  mpClient.onRoomCreated = (code) => {
    showScreen('room-waiting');
    document.getElementById('room-code-display').textContent = code;
  };

  mpClient.onRoomJoined = (code) => {
    showScreen('room-waiting');
    document.getElementById('room-code-display').textContent = code;
  };

  mpClient.onRoomState = (state) => {
    updateRoomPlayersList(state);
  };

  mpClient.onRoomLeft = () => {
    showScreen('mp-lobby');
  };

  mpClient.onGameStarted = () => {
    startMultiplayerGame();
  };

  mpClient.onGameState = (state) => {
    updateMultiplayerHUD(state);
  };

  mpClient.onYourTurn = (turnInfo) => {
    onPlayerTurn(turnInfo);
  };

  mpClient.onPlayerAction = (msg) => {
    audioManager.playSound('chip');
    showMessage(`${msg.name}: ${msg.action.toUpperCase()}`);
  };

  mpClient.onPhaseChange = (phase, cards) => {
    audioManager.playSound('card');
    showMessage(phase.toUpperCase());
  };

  mpClient.onCardsDealt = () => {
    audioManager.playSound('card');
    playerHands.playGrabCard();
  };

  mpClient.onRoundEnd = (result) => {
    onMultiplayerRoundEnd(result);
  };

  mpClient.onGameOver = (msg) => {
    const resultDiv = document.getElementById('round-result');
    document.getElementById('result-title').textContent = 'PARTIDA TERMINADA';
    document.getElementById('result-detail').textContent = msg.winner ? `${msg.winner.name} gana!` : 'Fin';
    document.getElementById('result-hands').innerHTML = '';
    document.getElementById('btn-next-round').textContent = 'VOLVER AL MENÚ';
    nextRoundAction = () => { gameStarted = false; gameMode = 'none'; showScreen('main-menu'); };
    resultDiv.classList.remove('hidden');
  };

  mpClient.onAbilityUsed = (msg) => {
    showAbilityEffect(`${msg.name} usó ${msg.abilityName}!`);
  };

  mpClient.onAbilityResult = (msg) => {
    if (msg.ability === 'peek' && msg.card) {
      showPeekCard(msg.card);
    }
  };

  mpClient.onChat = (msg) => {
    addChatMessage(msg.name, msg.text);
  };

  try {
    await mpClient.connect();
    mpClient.setProfile(userProfile.name, userProfile.avatar);
    document.getElementById('lobby-status').textContent = 'Conectado';
  } catch (e) {
    document.getElementById('lobby-status').textContent = 'Error al conectar al servidor';
  }
}

// ===== LOBBY UI =====
function setupLobbyUI() {
  // MP chips
  document.querySelectorAll('[data-mp-chips]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mp-chips]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mpSettings.startingChips = parseInt(btn.dataset.mpChips);
      audioManager.playSound('click');
    });
  });

  // MP abilities
  document.querySelectorAll('[data-mp-abilities]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mp-abilities]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mpSettings.abilities = btn.dataset.mpAbilities === 'on';
      audioManager.playSound('click');
    });
  });

  document.getElementById('btn-create-room').addEventListener('click', () => {
    if (!mpClient || !mpClient.connected) {
      document.getElementById('lobby-status').textContent = 'No conectado al servidor';
      return;
    }
    audioManager.playSound('click');
    mpClient.createRoom(mpSettings);
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    if (!mpClient || !mpClient.connected) {
      document.getElementById('lobby-status').textContent = 'No conectado al servidor';
      return;
    }
    const code = document.getElementById('room-code-input').value.trim();
    if (!code || code.length < 5) {
      document.getElementById('lobby-status').textContent = 'Código inválido';
      return;
    }
    audioManager.playSound('click');
    mpClient.joinRoom(code);
  });

  document.getElementById('btn-lobby-back').addEventListener('click', () => {
    audioManager.playSound('click');
    if (mpClient) mpClient.disconnect();
    showScreen('main-menu');
  });
}

// ===== ROOM UI =====
function setupRoomUI() {
  document.getElementById('btn-room-start').addEventListener('click', () => {
    audioManager.playSound('click');
    if (mpClient) mpClient.startGame();
  });

  document.getElementById('btn-room-leave').addEventListener('click', () => {
    audioManager.playSound('click');
    if (mpClient) mpClient.leaveRoom();
    showScreen('mp-lobby');
  });
}

function updateRoomPlayersList(state) {
  const list = document.getElementById('room-players-list');
  list.innerHTML = '';
  const isHost = mpClient && mpClient.playerId === state.hostId;
  const startBtn = document.getElementById('btn-room-start');
  startBtn.style.display = isHost ? 'inline-block' : 'none';

  state.players.forEach(p => {
    const card = document.createElement('div');
    card.className = `room-player-card${p.id === state.hostId ? ' host' : ''}`;
    card.innerHTML = `
      <div class="room-player-avatar">${p.avatar ? `<img src="${p.avatar}">` : '?'}</div>
      <span class="room-player-name">${p.name}</span>
      ${p.id === state.hostId ? '<span class="room-player-host-badge">HOST</span>' : ''}
    `;
    list.appendChild(card);
  });
}

// ===== START SINGLE PLAYER =====
function startSinglePlayer() {
  gameMode = 'single';
  showScreen('game-hud');
  document.getElementById('chat-box').style.display = 'none';
  document.getElementById('abilities-bar').style.display = 'none';
  document.getElementById('room-code-hud').style.display = 'none';
  document.getElementById('hud-player-name').textContent = 'TÚ';

  gameManager.configure(settings);
  gameManager.onStateChange = updateHUD;
  gameManager.onPlayerTurn = onPlayerTurn;
  gameManager.onRoundEnd = onRoundEnd;
  gameManager.onMessage = showMessage;

  gameStarted = true;
  audioManager.init(); audioManager.resume(); audioManager.startMusic();

  setTimeout(() => {
    gameManager.startGame();
    const positions = gameManager.positions;
    const botNames = gameManager.players.filter(p => p.isBot).map(p => p.name);
    botModels.createBots(positions, botNames);
  }, 500);
}

// ===== START MULTIPLAYER GAME =====
function startMultiplayerGame() {
  gameMode = 'multi';
  showScreen('game-hud');
  document.getElementById('chat-box').style.display = 'flex';
  document.getElementById('abilities-bar').style.display = 'flex';
  document.getElementById('room-code-hud').style.display = 'block';
  document.getElementById('room-code-hud').textContent = `SALA: ${mpClient.roomCode}`;
  document.getElementById('hud-player-name').textContent = userProfile.name;

  if (userProfile.avatar) {
    document.getElementById('hud-avatar').innerHTML = `<img src="${userProfile.avatar}">`;
  }

  gameStarted = true;
  audioManager.init(); audioManager.resume(); audioManager.startMusic();
  showMessage('PARTIDA INICIADA');
}

// ===== GAME UI =====
let playerTurnState = null;
let nextRoundAction = null;

function setupGameUI() {
  document.getElementById('btn-fold').addEventListener('click', () => {
    if (!playerTurnState) return;
    audioManager.playSound('click');
    playerTurnState = null;
    disableBettingControls();
    playerHands.playFold();
    if (gameMode === 'single') gameManager.playerFold();
    else if (mpClient) mpClient.fold();
  });

  document.getElementById('btn-check').addEventListener('click', () => {
    if (!playerTurnState) return;
    audioManager.playSound('click');
    playerTurnState = null;
    disableBettingControls();
    if (gameMode === 'single') gameManager.playerCheck();
    else if (mpClient) mpClient.check();
  });

  document.getElementById('btn-call').addEventListener('click', () => {
    if (!playerTurnState) return;
    audioManager.playSound('click');
    playerTurnState = null;
    disableBettingControls();
    playerHands.playBet();
    if (gameMode === 'single') gameManager.playerCall();
    else if (mpClient) mpClient.call();
  });

  document.getElementById('btn-raise').addEventListener('click', () => {
    if (!playerTurnState) return;
    const amount = parseInt(document.getElementById('raise-slider').value);
    audioManager.playSound('click');
    playerTurnState = null;
    disableBettingControls();
    playerHands.playBet();
    if (gameMode === 'single') gameManager.playerRaise(amount);
    else if (mpClient) mpClient.raise(amount);
  });

  document.getElementById('btn-allin').addEventListener('click', () => {
    if (!playerTurnState) return;
    audioManager.playSound('click');
    playerTurnState = null;
    disableBettingControls();
    playerHands.playBet();
    if (gameMode === 'single') gameManager.playerAllIn();
    else if (mpClient) mpClient.allIn();
  });

  document.getElementById('raise-slider').addEventListener('input', () => {
    document.getElementById('raise-value').textContent = `$${document.getElementById('raise-slider').value}`;
  });

  document.getElementById('btn-next-round').addEventListener('click', () => {
    audioManager.playSound('click');
    document.getElementById('round-result').classList.add('hidden');
    if (nextRoundAction) nextRoundAction();
  });
}

function onPlayerTurn(turnState) {
  playerTurnState = turnState;
  const btnCheck = document.getElementById('btn-check');
  const btnCall = document.getElementById('btn-call');

  document.getElementById('btn-fold').disabled = false;
  document.getElementById('btn-raise').disabled = false;
  document.getElementById('btn-allin').disabled = false;

  if (turnState.canCheck) {
    btnCheck.disabled = false; btnCheck.classList.remove('hidden');
    btnCall.classList.add('hidden');
  } else {
    btnCheck.disabled = true; btnCheck.classList.add('hidden');
    btnCall.classList.remove('hidden'); btnCall.disabled = false;
    document.getElementById('call-amount').textContent = `$${turnState.callAmount}`;
  }

  const slider = document.getElementById('raise-slider');
  slider.min = turnState.minRaise; slider.max = turnState.maxRaise; slider.value = turnState.minRaise;
  document.getElementById('raise-value').textContent = `$${turnState.minRaise}`;
  document.getElementById('betting-controls').classList.add('active-turn');
}

function disableBettingControls() {
  ['btn-fold','btn-check','btn-call','btn-raise','btn-allin'].forEach(id => document.getElementById(id).disabled = true);
  document.getElementById('betting-controls').classList.remove('active-turn');
}

// ===== HUD UPDATE (single player) =====
function updateHUD(state) {
  document.getElementById('pot-value').textContent = `$${state.pot}`;
  const phaseNames = { waiting:'ESPERANDO...', preflop:'PRE-FLOP', flop:'FLOP', turn:'TURN', river:'RIVER', showdown:'SHOWDOWN' };
  document.getElementById('round-phase').textContent = phaseNames[state.phase] || state.phase.toUpperCase();

  const human = state.players.find(p => p.index === 0);
  if (human) document.getElementById('player-chips').textContent = `$${human.chips}`;

  // Mini cards bottom-left
  updateMiniCards(human?.holeCards || []);

  // Community cards HUD
  updateCommunityHUD(state.communityCards || []);

  // Other players
  const playersDiv = document.getElementById('players-display');
  playersDiv.innerHTML = '';
  state.players.forEach(p => {
    if (p.index === 0) return;
    const tag = document.createElement('div');
    tag.className = 'player-tag';
    if (p.isActive) tag.classList.add('active-turn');
    if (p.folded) tag.classList.add('folded');
    tag.innerHTML = `
      <span class="p-name">${p.name}</span>
      <span class="p-chips">$${p.chips}</span>
      <span class="p-action">${p.lastAction || ''}</span>
      ${p.bet > 0 ? `<span class="p-bet">Apuesta: $${p.bet}</span>` : ''}
    `;
    playersDiv.appendChild(tag);
    if (p.lastAction && botModels) {
      const act = p.lastAction.toLowerCase();
      if (act.includes('fold')) botModels.triggerReaction(p.index, 'fold');
      else if (act.includes('raise')) botModels.triggerReaction(p.index, 'raise');
      else if (act.includes('all in')) botModels.triggerReaction(p.index, 'allin');
    }
  });
}

// ===== HUD UPDATE (multiplayer) =====
function updateMultiplayerHUD(state) {
  document.getElementById('pot-value').textContent = `$${state.pot}`;
  const phaseNames = { waiting:'ESPERANDO...', preflop:'PRE-FLOP', flop:'FLOP', turn:'TURN', river:'RIVER', showdown:'SHOWDOWN' };
  document.getElementById('round-phase').textContent = phaseNames[state.phase] || state.phase.toUpperCase();
  document.getElementById('player-chips').textContent = `$${state.yourChips}`;

  // Mini cards
  updateMiniCards(state.yourCards || []);

  // Community
  updateCommunityHUD(state.communityCards || []);

  // Update abilities cooldowns
  if (state.abilityCooldowns) updateAbilityCooldowns(state.abilityCooldowns);

  // Other players
  const playersDiv = document.getElementById('players-display');
  playersDiv.innerHTML = '';
  state.players.forEach(p => {
    if (p.id === mpClient.playerId) return;
    const tag = document.createElement('div');
    tag.className = 'player-tag';
    if (p.isActive) tag.classList.add('active-turn');
    if (p.folded) tag.classList.add('folded');
    const avatarHtml = p.avatar ? `<img src="${p.avatar}" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:4px">` : '';
    tag.innerHTML = `
      ${avatarHtml}<span class="p-name">${p.name}</span>
      <span class="p-chips">$${p.chips}</span>
      <span class="p-action">${p.lastAction || ''}</span>
      ${p.bet > 0 ? `<span class="p-bet">$${p.bet}</span>` : ''}
      ${p.shielded ? '<span style="color:#bb88ff">🛡</span>' : ''}
      ${p.fortuneActive ? '<span style="color:#ffd700">🍀</span>' : ''}
    `;
    playersDiv.appendChild(tag);
  });
}

// ===== MINI CARDS (bottom-left 2D) =====
function updateMiniCards(cards) {
  const container = document.getElementById('mini-cards');
  container.innerHTML = '';
  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = `mini-card ${card.suit}`;
    div.innerHTML = `<div>${card.rank}</div><div>${SUIT_SYMBOLS[card.suit]}</div>`;
    container.appendChild(div);
  });
}

// ===== COMMUNITY CARDS HUD =====
function updateCommunityHUD(cards) {
  let communityDiv = document.querySelector('.community-cards-hud');
  if (!communityDiv) {
    communityDiv = document.createElement('div');
    communityDiv.className = 'community-cards-hud';
    document.getElementById('game-hud').appendChild(communityDiv);
  }
  communityDiv.innerHTML = '';
  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = `community-card ${card.suit}`;
    div.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>`;
    communityDiv.appendChild(div);
  });
}

// ===== ROUND END (single) =====
function onRoundEnd(result) {
  disableBettingControls();
  const resultDiv = document.getElementById('round-result');
  const titleEl = document.getElementById('result-title');
  const detailEl = document.getElementById('result-detail');
  document.getElementById('result-hands').innerHTML = '';

  if (result.gameOver) {
    titleEl.textContent = 'PARTIDA TERMINADA';
    detailEl.textContent = result.winner ? `${result.winner.name} gana la partida!` : 'Fin del juego';
    document.getElementById('btn-next-round').textContent = 'NUEVA PARTIDA';
    nextRoundAction = () => {
      gameManager.startGame();
      botModels.createBots(gameManager.positions, gameManager.players.filter(p => p.isBot).map(p => p.name));
    };
  } else {
    const humanWon = result.winners.some(w => w.index === 0);
    titleEl.textContent = humanWon ? '¡GANASTE!' : 'PERDISTE';
    detailEl.textContent = result.detail;
    audioManager.playSound(humanWon ? 'win' : 'lose');

    // Show elimination animations
    if (result.eliminated) {
      result.eliminated.forEach(e => showElimination(e.name));
    }

    document.getElementById('btn-next-round').textContent = 'SIGUIENTE MANO';
    nextRoundAction = () => gameManager.startNewRound();
  }

  setTimeout(() => resultDiv.classList.remove('hidden'), 1500);
}

// ===== ROUND END (multiplayer) =====
function onMultiplayerRoundEnd(result) {
  disableBettingControls();
  const resultDiv = document.getElementById('round-result');
  const titleEl = document.getElementById('result-title');
  const detailEl = document.getElementById('result-detail');
  const handsDiv = document.getElementById('result-hands');
  handsDiv.innerHTML = '';

  const myId = mpClient.playerId;
  const iWon = result.winners.some(w => w.id === myId);

  titleEl.textContent = iWon ? '¡GANASTE!' : 'PERDISTE';
  const winnerNames = result.winners.map(w => w.name).join(', ');
  detailEl.textContent = `${winnerNames} gana $${result.pot}${result.fortuneBonus ? ' (Fortuna +50%)' : ''}`;

  audioManager.playSound(iWon ? 'win' : 'lose');

  // Show all hands at showdown
  if (result.allHands) {
    result.allHands.forEach(h => {
      const isWinner = result.winners.some(w => w.id === h.playerId);
      const div = document.createElement('div');
      div.className = `result-hand${isWinner ? ' winner' : ''}`;
      const cardsHtml = h.cards.map(c => {
        const isRed = c.suit === 'hearts' || c.suit === 'diamonds';
        return `<div class="mini-card ${c.suit}" style="width:30px;height:44px;font-size:0.55rem">${c.rank}<br>${SUIT_SYMBOLS[c.suit]}</div>`;
      }).join('');
      div.innerHTML = `<span class="result-hand-name">${h.name}</span><div class="result-hand-cards">${cardsHtml}</div><span class="result-hand-type">${h.handName}</span>`;
      handsDiv.appendChild(div);
    });
  }

  // Eliminations
  if (result.eliminated && result.eliminated.length > 0) {
    result.eliminated.forEach(e => showElimination(e.name));
  }

  const isHost = mpClient.playerId === (mpClient._hostId || 0);
  document.getElementById('btn-next-round').textContent = 'SIGUIENTE MANO';
  nextRoundAction = () => { if (mpClient) mpClient.nextRound(); };

  setTimeout(() => resultDiv.classList.remove('hidden'), 1500);
}

// ===== ABILITIES UI =====
function setupAbilitiesUI() {
  document.querySelectorAll('.ability-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!mpClient || gameMode !== 'multi') return;
      const abilityId = btn.dataset.ability;
      audioManager.playSound('click');
      mpClient.useAbility(abilityId);
    });
  });
}

function updateAbilityCooldowns(cooldowns) {
  document.querySelectorAll('.ability-btn').forEach(btn => {
    const id = btn.dataset.ability;
    const cd = cooldowns[id] || 0;
    btn.disabled = cd > 0;
    btn.classList.toggle('on-cooldown', cd > 0);
    if (cd > 0) {
      btn.title = `Cooldown: ${cd} rondas`;
    }
  });
}

function showAbilityEffect(text) {
  const overlay = document.getElementById('ability-overlay');
  const content = document.getElementById('ability-effect-content');
  content.textContent = text;
  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 2000);
}

// ===== PEEK UI =====
function setupPeekUI() {
  document.getElementById('btn-peek-close').addEventListener('click', () => {
    document.getElementById('peek-overlay').classList.add('hidden');
  });
}

function showPeekCard(card) {
  const peekCard = document.getElementById('peek-card');
  peekCard.className = `peek-card ${card.suit}`;
  peekCard.innerHTML = `<div>${card.rank}</div><div style="font-size:2.5rem">${SUIT_SYMBOLS[card.suit]}</div>`;
  document.getElementById('peek-overlay').classList.remove('hidden');
  audioManager.playSound('card');
}

// ===== ELIMINATION ANIMATIONS =====
function setupEliminationUI() {
  // Auto-dismiss on click
  document.getElementById('elimination-overlay').addEventListener('click', () => {
    document.getElementById('elimination-overlay').classList.add('hidden');
  });
}

function showElimination(playerName) {
  const overlay = document.getElementById('elimination-overlay');
  document.getElementById('elim-name').textContent = playerName;
  overlay.classList.remove('hidden');
  audioManager.playSound('lose');

  setTimeout(() => overlay.classList.add('hidden'), 3000);
}

// ===== CHAT UI =====
function setupChatUI() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-chat-send');

  const sendChat = () => {
    const text = input.value.trim();
    if (!text || !mpClient) return;
    mpClient.sendChat(text);
    addChatMessage(userProfile.name, text);
    input.value = '';
  };

  sendBtn.addEventListener('click', sendChat);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
  });
}

function addChatMessage(name, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<span class="chat-name">${name}:</span> ${text}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  // Limit to 50 messages
  while (container.children.length > 50) container.removeChild(container.firstChild);
}

// ===== TUTORIAL UI =====
function setupTutorialUI() {
  // Tutorial is already set up in the Tutorial class constructor
}

// ===== MESSAGE SYSTEM =====
let messageTimeout = null;
function showMessage(text) {
  const el = document.getElementById('hud-message');
  el.textContent = text;
  el.classList.add('visible');
  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => el.classList.remove('visible'), 2000);
}

// ===== START =====
init();
