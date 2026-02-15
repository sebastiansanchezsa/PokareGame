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
import { MultiplayerRenderer } from './game/MultiplayerRenderer.js';
import { RussianRoulette } from './game/RussianRoulette.js';
import { Tutorial } from './ui/Tutorial.js';
import { HAND_NAMES } from './game/PokerLogic.js';
import { ParticleEffects } from './game/ParticleEffects.js';

// ===== GLOBALS =====
let renderer, scene, camera;
let environment, table, lighting, postProcessing;
let fpsCamera, gameManager, audioManager, playerHands, botModels;
let mpClient = null;
let mpRenderer = null;
let russianRoulette = null;
let tutorial = null;
let particleEffects = null;
let clock;
let gameStarted = false;
let gameMode = 'none'; // 'single', 'multi', 'none'
let myPlayerIndex = 0; // my index in multiplayer player list

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
  bloomEnabled: true,
  rouletteEnabled: true,
  brightness: 1.2,
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
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120a1a);
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
  mpRenderer = new MultiplayerRenderer(scene, table);
  russianRoulette = new RussianRoulette(scene, camera);
  particleEffects = new ParticleEffects(scene);
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
    if (gameMode === 'multi') mpRenderer.update(delta);
    playerHands.update(delta);
    botModels.update(delta);
    russianRoulette.update(delta);
    particleEffects.update(delta);
  }

  postProcessing.render(elapsed);
}

// ===== SCREEN HELPERS =====
function hideAllScreens() {
  ['main-menu','bot-setup','settings-screen','profile-setup','mp-lobby','room-waiting','game-hud','shop-overlay'].forEach(id => {
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

  document.getElementById('btn-shop').addEventListener('click', () => {
    audioManager.init(); audioManager.playSound('click');
    updateShopBalance();
    showScreen('shop-overlay');
    initShopPreview();
    renderShopPreview();
  });

  document.getElementById('btn-shop-back').addEventListener('click', () => {
    audioManager.playSound('click');
    if (shopPreviewAnim) { cancelAnimationFrame(shopPreviewAnim); shopPreviewAnim = null; }
    clearShopPreview();
    showScreen('main-menu');
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

  // Brightness
  document.getElementById('vol-brightness').addEventListener('input', e => {
    settings.brightness = e.target.value / 100;
    renderer.toneMappingExposure = settings.brightness;
  });

  // Bloom
  document.querySelectorAll('[data-bloom]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-bloom]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.bloomEnabled = btn.dataset.bloom === 'on';
      if (postProcessing.setBloom) postProcessing.setBloom(settings.bloomEnabled);
      audioManager.playSound('click');
    });
  });

  // Russian Roulette toggle
  document.querySelectorAll('[data-roulette]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-roulette]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.rouletteEnabled = btn.dataset.roulette === 'on';
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
    // Find my index in player list
    myPlayerIndex = state.players.findIndex(p => p.id === mpClient.playerId);
    // Render 3D cards/chips on table
    mpRenderer.updateFromState(state, myPlayerIndex);
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
    nextRoundAction = () => { gameStarted = false; gameMode = 'none'; mpRenderer.clearTable(); showScreen('main-menu'); };
    resultDiv.classList.remove('hidden');
  };

  mpClient.onAbilityUsed = (msg) => {
    showAbilityEffect(`${msg.name} usó ${msg.abilityName}!`);
  };

  mpClient.onAbilityResult = (msg) => {
    if (msg.ability === 'peek' && msg.card) {
      showPeekCard(msg.card);
    } else if (msg.ability === 'intimidate') {
      showMessage(`${msg.targetName} tiene una carta de ${msg.suit === 'hearts' ? '♥' : msg.suit === 'diamonds' ? '♦' : msg.suit === 'clubs' ? '♣' : '♠'}`);
    } else if (msg.ability === 'swap' && msg.newCards) {
      showMessage('¡Carta cambiada!');
      // Update mini cards with new hand
      updateMiniCards(msg.newCards);
    } else if (msg.ability === 'doubledown') {
      showMessage('¡DOBLE O NADA ACTIVADO!');
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
  document.getElementById('abilities-bar').style.display = 'flex';
  buildAbilitiesGrid();
  document.getElementById('room-code-hud').style.display = 'none';
  document.getElementById('hud-player-name').textContent = 'TÚ';
  document.getElementById('streak-counter').style.display = 'block';

  gameManager.configure(settings);
  gameManager.onStateChange = updateHUD;
  gameManager.onPlayerTurn = onPlayerTurn;
  gameManager.onRoundEnd = onRoundEnd;
  gameManager.onMessage = showMessage;
  gameManager.onAbilityResult = onSinglePlayerAbilityResult;
  gameManager.onStreakUpdate = onStreakUpdate;

  gameStarted = true;
  audioManager.init(); audioManager.resume();

  setTimeout(() => {
    gameManager.startGame();
    const positions = gameManager.positions;
    const botNames = gameManager.players.filter(p => p.isBot).map(p => p.name);
    botModels.createBots(positions, botNames);
  }, 500);
}

function onSinglePlayerAbilityResult(msg) {
  if (msg.ability === 'peek' && msg.card) {
    showPeekCard(msg.card);
  } else if (msg.ability === 'intimidate') {
    const suitSym = msg.suit === 'hearts' ? '♥' : msg.suit === 'diamonds' ? '♦' : msg.suit === 'clubs' ? '♣' : '♠';
    showMessage(`${msg.targetName} tiene una carta de ${suitSym}`);
    showAbilityEffect(`${msg.targetName}: ${suitSym}`);
  } else if (msg.ability === 'swap' && msg.newCards) {
    showMessage('¡Carta cambiada!');
    updateMiniCards(msg.newCards);
    showAbilityEffect('🔄 ¡CAMBIO!');
  }
}

function onStreakUpdate(streak, won, played) {
  const el = document.getElementById('streak-value');
  if (!el) return;
  if (streak >= 2) {
    el.textContent = `🔥 x${streak}`;
    el.className = streak >= 5 ? 'streak-epic' : streak >= 3 ? 'streak-hot' : 'streak-warm';
  } else {
    el.textContent = '';
    el.className = '';
  }
  const statsEl = document.getElementById('streak-stats');
  if (statsEl) statsEl.textContent = `${won}W / ${played}P`;
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

  // Initialize 3D multiplayer renderer
  mpRenderer.clearTable();

  gameStarted = true;
  audioManager.init(); audioManager.resume();
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
    if (particleEffects) particleEffects.foldEffect();
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
    if (particleEffects) particleEffects.allInEffect();
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
      ${p.doubleDownActive ? '<span style="color:#ff4444">x2</span>' : ''}
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
  const handsDiv = document.getElementById('result-hands');
  handsDiv.innerHTML = '';

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

    // Show hand rankings for all players at showdown
    if (result.allHands) {
      result.allHands.forEach(h => {
        const isWinner = result.winners.some(w => w.index === h.playerIndex);
        const div = document.createElement('div');
        div.className = `result-hand${isWinner ? ' winner' : ''}`;
        const cardsHtml = h.hand && h.hand.cards ? h.hand.cards.slice(0, 5).map(c => {
          return `<div class="mini-card ${c.suit}" style="width:30px;height:44px;font-size:0.55rem">${c.rank}<br>${SUIT_SYMBOLS[c.suit]}</div>`;
        }).join('') : '';
        const handName = h.hand ? h.hand.name : 'Carta Alta';
        div.innerHTML = `<span class="result-hand-name">${h.player.name}</span><div class="result-hand-cards">${cardsHtml}</div><span class="result-hand-type">${handName}</span>`;
        handsDiv.appendChild(div);
      });
    }

    // Russian roulette for eliminated players
    if (result.eliminated && result.eliminated.length > 0) {
      result.eliminated.forEach(e => showElimination(e.name));
    }

    // If human lost, trigger Russian roulette animation
    if (!humanWon) {
      triggerRussianRoulette(true);
    } else {
      // Reward shop coins for winning
      addShopCoins(Math.floor(result.pot * 0.1));
      if (particleEffects) particleEffects.winBurst();
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
  detailEl.textContent = `${winnerNames} gana $${result.pot}${result.doubleDown ? ' (DOBLE O NADA x2!)' : ''}`;

  audioManager.playSound(iWon ? 'win' : 'lose');

  // Show all hands at showdown with hand rankings
  if (result.allHands) {
    result.allHands.forEach(h => {
      const isWinner = result.winners.some(w => w.id === h.playerId);
      const div = document.createElement('div');
      div.className = `result-hand${isWinner ? ' winner' : ''}`;
      const cardsHtml = h.cards.map(c => {
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

  // Russian roulette if I lost
  if (!iWon) {
    triggerRussianRoulette(true);
  } else {
    if (particleEffects) particleEffects.winBurst();
    addShopCoins(Math.floor(result.pot * 0.1));
  }

  document.getElementById('btn-next-round').textContent = 'SIGUIENTE MANO';
  nextRoundAction = () => {
    mpRenderer.clearTable();
    if (mpClient) mpClient.nextRound();
  };

  setTimeout(() => resultDiv.classList.remove('hidden'), 1500);
}

// ===== RUSSIAN ROULETTE =====
async function triggerRussianRoulette(targetIsSelf) {
  if (!russianRoulette || russianRoulette.isPlaying || !settings.rouletteEnabled) return;

  const overlay = document.getElementById('roulette-overlay');
  const textEl = document.getElementById('roulette-text');
  const subEl = document.getElementById('roulette-sub');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.background = 'rgba(0,0,0,0.75)';
    textEl.textContent = 'RULETA RUSA';
    textEl.style.color = '#ff6ec7';
    if (subEl) subEl.textContent = 'El tambor gira...';
  }

  // Phase text updates during animation
  setTimeout(() => { if (subEl) subEl.textContent = 'Apuntando...'; }, 1200);
  setTimeout(() => { if (subEl) subEl.textContent = '...'; }, 3000);

  const survived = await russianRoulette.play(targetIsSelf);

  if (overlay) {
    if (survived) {
      textEl.textContent = '¡SOBREVIVISTE!';
      textEl.style.color = '#00ff88';
      if (subEl) subEl.textContent = 'Click... vacío';
    } else {
      textEl.textContent = 'BANG!';
      textEl.style.color = '#ff2255';
      overlay.style.background = 'rgba(255, 0, 0, 0.5)';
      if (subEl) subEl.textContent = 'No tuviste suerte...';
    }
    // Stop cylinder spinning
    const rings = overlay.querySelectorAll('.cylinder-ring');
    rings.forEach(r => r.style.animationPlayState = 'paused');

    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.background = '';
      textEl.style.color = '';
      rings.forEach(r => r.style.animationPlayState = 'running');
    }, 2500);
  }
}

// ===== ABILITIES UI =====
function buildAbilitiesGrid() {
  const grid = document.getElementById('abilities-grid');
  if (!grid || !gameManager) return;
  grid.innerHTML = '';
  const abilities = gameManager.abilities;
  for (const [id, ab] of Object.entries(abilities)) {
    const btn = document.createElement('button');
    btn.className = 'ability-btn';
    btn.dataset.ability = id;
    btn.title = `${ab.name}: ${ab.desc} ($${ab.cost})`;
    btn.innerHTML = `
      <div class="ability-icon-wrap">${ab.icon}</div>
      <span class="ability-name">${ab.name}</span>
      <span class="ability-cost">${ab.cost > 0 ? '$' + ab.cost : 'GRATIS'}</span>
      <div class="ability-cd" id="cd-${id}"></div>
      <div class="ability-tooltip">${ab.desc}<br>Costo: $${ab.cost} | CD: ${ab.cooldown}r</div>
    `;
    grid.appendChild(btn);
  }
}

function setupAbilitiesUI() {
  // Toggle button
  const toggle = document.getElementById('abilities-toggle');
  const grid = document.getElementById('abilities-grid');
  if (toggle && grid) {
    toggle.addEventListener('click', () => {
      grid.classList.toggle('collapsed');
      toggle.textContent = grid.classList.contains('collapsed') ? 'HABILIDADES ▶' : 'HABILIDADES ▼';
    });
  }

  // Delegate clicks on ability buttons
  if (grid) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.ability-btn');
      if (!btn) return;
      const abilityId = btn.dataset.ability;
      audioManager.playSound('click');

      if (gameMode === 'single') {
        const result = gameManager.useAbility(abilityId);
        if (!result.success) {
          showMessage(result.message);
        } else {
          showAbilityEffect(`¡${gameManager.abilities[abilityId].name} activado!`);
          updateAbilityCooldowns(gameManager.getAbilityCooldowns());
          // Trigger 3D particle effect at player position
          if (botModels) {
            botModels.triggerPlayerAbilityAnim(abilityId, new THREE.Vector3(0, 1.05, 1.2));
          }
        }
      } else if (gameMode === 'multi' && mpClient) {
        mpClient.useAbility(abilityId);
      }
    });
  }
}

function updateAbilityCooldowns(cooldowns) {
  document.querySelectorAll('.ability-btn').forEach(btn => {
    const id = btn.dataset.ability;
    const cd = cooldowns[id] || 0;
    btn.disabled = cd > 0;
    btn.classList.toggle('on-cooldown', cd > 0);
    const cdEl = btn.querySelector('.ability-cd');
    if (cdEl) cdEl.textContent = cd > 0 ? cd : '';
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

// ===== SHOP SYSTEM =====
const shopState = {
  coins: parseInt(localStorage.getItem('pokare_coins') || '0'),
  owned: JSON.parse(localStorage.getItem('pokare_owned') || '[]'),
  equipped: JSON.parse(localStorage.getItem('pokare_equipped') || '{}'),
};

function saveShopState() {
  localStorage.setItem('pokare_coins', shopState.coins.toString());
  localStorage.setItem('pokare_owned', JSON.stringify(shopState.owned));
  localStorage.setItem('pokare_equipped', JSON.stringify(shopState.equipped));
}

// === SHOP 3D PREVIEW ===
let shopPreviewRenderer = null, shopPreviewScene = null, shopPreviewCamera = null;
let shopPreviewMesh = null, shopPreviewAnim = null;
let shopSelectedItem = null;

function initShopPreview() {
  const canvas = document.getElementById('shop-preview-canvas');
  if (!canvas || shopPreviewRenderer) return;
  shopPreviewRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  shopPreviewRenderer.setSize(canvas.width, canvas.height);
  shopPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  shopPreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  shopPreviewRenderer.toneMappingExposure = 1.2;

  shopPreviewScene = new THREE.Scene();
  shopPreviewCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
  shopPreviewCamera.position.set(0, 0.3, 2);
  shopPreviewCamera.lookAt(0, 0, 0);

  const amb = new THREE.AmbientLight(0x554466, 1.5);
  shopPreviewScene.add(amb);
  const key = new THREE.PointLight(0xff6ec7, 2, 8);
  key.position.set(2, 2, 2);
  shopPreviewScene.add(key);
  const fill = new THREE.PointLight(0x44aaff, 1.2, 8);
  fill.position.set(-2, 1, 1);
  shopPreviewScene.add(fill);
}

function renderShopPreview() {
  if (!shopPreviewRenderer || !shopPreviewScene || !shopPreviewCamera) return;
  if (shopPreviewMesh) {
    shopPreviewMesh.rotation.y += 0.012;
  }
  shopPreviewRenderer.render(shopPreviewScene, shopPreviewCamera);
  const overlay = document.getElementById('shop-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    shopPreviewAnim = requestAnimationFrame(renderShopPreview);
  } else {
    shopPreviewAnim = null;
  }
}

function clearShopPreview() {
  if (shopPreviewMesh && shopPreviewScene) {
    shopPreviewScene.remove(shopPreviewMesh);
    shopPreviewMesh.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) {
          c.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        } else {
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      }
    });
    shopPreviewMesh = null;
  }
}

function buildPreviewObject(itemId) {
  clearShopPreview();
  const cat = itemId.split('-')[0];
  const variant = itemId.split('-')[1];
  const group = new THREE.Group();

  if (cat === 'card') {
    // Show a card back with the cosmetic style
    const colors = { gold: [0xffd700, 0xff8c00], neon: [0xff6ec7, 0x7b2ff7], skull: [0x333333, 0x880000], royal: [0x4a0080, 0xc8a84e] };
    const [c1, c2] = colors[variant] || [0xffffff, 0xaaaaaa];
    const canvas = document.createElement('canvas');
    canvas.width = 180; canvas.height = 260;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 180, 260);
    grad.addColorStop(0, '#' + c1.toString(16).padStart(6, '0'));
    grad.addColorStop(1, '#' + c2.toString(16).padStart(6, '0'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 180, 260);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 164, 244);
    ctx.strokeRect(14, 14, 152, 232);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(90, 80); ctx.lineTo(120, 130); ctx.lineTo(90, 180); ctx.lineTo(60, 130); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText('POKARE', 90, 135);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.BoxGeometry(0.7, 0.01, 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, [edgeMat, edgeMat, mat, mat, edgeMat, edgeMat]);
    mesh.rotation.x = -0.3;
    group.add(mesh);
  } else if (cat === 'table') {
    // Show a mini poker table
    const feltColors = { red: 0xaa1122, blue: 0x1144aa, black: 0x222222 };

    // Wood base (extruded ellipse)
    const baseShape = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (i === 0) baseShape.moveTo(Math.cos(a) * 0.7, Math.sin(a) * 0.4);
      else baseShape.lineTo(Math.cos(a) * 0.7, Math.sin(a) * 0.4);
    }
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.5 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.y = -0.02;
    group.add(baseMesh);

    // Felt surface on top
    const feltShape = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (i === 0) feltShape.moveTo(Math.cos(a) * 0.6, Math.sin(a) * 0.32);
      else feltShape.lineTo(Math.cos(a) * 0.6, Math.sin(a) * 0.32);
    }
    const feltGeo = new THREE.ShapeGeometry(feltShape);
    const feltMat = new THREE.MeshStandardMaterial({ color: feltColors[variant] || 0x1a8a40, roughness: 0.9 });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.y = 0.025;
    group.add(feltMesh);

    // Rail (torus-like ring around edge)
    const railPoints = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      railPoints.push(new THREE.Vector3(Math.cos(a) * 0.72, 0.02, Math.sin(a) * 0.42));
    }
    const railPath = new THREE.CatmullRomCurve3(railPoints, true);
    const railGeo = new THREE.TubeGeometry(railPath, 64, 0.025, 8, true);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3a1810, roughness: 0.6, metalness: 0.1 });
    const railMesh = new THREE.Mesh(railGeo, railMat);
    group.add(railMesh);
  } else if (cat === 'emote') {
    // Show emoji on a floating card
    const emojis = { fire: '\u{1F525}', skull: '\u{1F480}', crown: '\u{1F451}' };
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a0a2a';
    ctx.beginPath(); ctx.arc(100, 100, 90, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff6ec7';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(100, 100, 88, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '72px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emojis[variant] || '?', 100, 100);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(0.8, 0.8);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  } else if (cat === 'chip') {
    // Show a spinning chip
    const chipColors = { diamond: [0x00bfff, '#00bfff'], ruby: [0xcc0033, '#cc0033'] };
    const [hex, css] = chipColors[variant] || [0xe74c3c, '#e74c3c'];
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const r = 128;
    ctx.beginPath(); ctx.arc(r, r, r - 4, 0, Math.PI * 2);
    ctx.fillStyle = css; ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(r, r, r - 5, a, a + 0.12);
      ctx.arc(r, r, r - 20, a + 0.12, a, true);
      ctx.closePath();
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(r, r, r * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', r, r);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.06, 32);
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.25, metalness: 0.5, map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = 0.3;
    group.add(mesh);
  }

  shopPreviewMesh = group;
  shopPreviewScene.add(group);
}

function selectShopItem(itemEl) {
  document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('selected'));
  itemEl.classList.add('selected');

  const id = itemEl.dataset.item;
  const price = parseInt(itemEl.dataset.price);
  const name = itemEl.querySelector('.shop-item-name').textContent;
  const desc = itemEl.dataset.desc || '';
  const rarity = itemEl.dataset.rarity || '';
  const category = id.split('-')[0];

  shopSelectedItem = { id, price, name, category };

  document.getElementById('shop-preview-name').textContent = name;
  document.getElementById('shop-preview-desc').textContent = desc;
  const rarEl = document.getElementById('shop-preview-rarity');
  rarEl.textContent = rarity;
  rarEl.className = 'shop-preview-rarity ' + rarity;

  const buyBtn = document.getElementById('shop-buy-btn');
  buyBtn.disabled = false;
  buyBtn.className = 'shop-buy-btn';

  if (shopState.owned.includes(id)) {
    if (shopState.equipped[category] === id) {
      buyBtn.textContent = 'EQUIPADO';
      buyBtn.classList.add('equipped');
      buyBtn.disabled = true;
    } else {
      buyBtn.textContent = 'EQUIPAR';
      buyBtn.classList.add('owned');
    }
  } else {
    buyBtn.textContent = `COMPRAR - $${price.toLocaleString()}`;
  }

  buildPreviewObject(id);
}

function updateShopBalance() {
  const el = document.getElementById('shop-balance');
  if (el) el.textContent = shopState.coins.toLocaleString();

  document.querySelectorAll('.shop-item').forEach(item => {
    const id = item.dataset.item;
    const category = id.split('-')[0];
    item.classList.remove('owned', 'equipped');
    if (shopState.owned.includes(id)) {
      item.classList.add('owned');
      if (shopState.equipped[category] === id) item.classList.add('equipped');
    }
  });

  // Update buy button if item selected
  if (shopSelectedItem) {
    const buyBtn = document.getElementById('shop-buy-btn');
    const { id, price, category } = shopSelectedItem;
    buyBtn.disabled = false;
    buyBtn.className = 'shop-buy-btn';
    if (shopState.owned.includes(id)) {
      if (shopState.equipped[category] === id) {
        buyBtn.textContent = 'EQUIPADO';
        buyBtn.classList.add('equipped');
        buyBtn.disabled = true;
      } else {
        buyBtn.textContent = 'EQUIPAR';
        buyBtn.classList.add('owned');
      }
    } else {
      buyBtn.textContent = `COMPRAR - $${price.toLocaleString()}`;
    }
  }
}

function setupShopUI() {
  initShopPreview();

  // Tab filtering
  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.tab;
      document.querySelectorAll('.shop-item').forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.cat === cat) ? '' : 'none';
      });
    });
  });

  // Item selection (click item to preview)
  document.querySelectorAll('.shop-item').forEach(item => {
    item.addEventListener('click', () => {
      selectShopItem(item);
      audioManager.playSound('click');
    });
  });

  // Buy / Equip button
  document.getElementById('shop-buy-btn').addEventListener('click', () => {
    if (!shopSelectedItem) return;
    const { id, price, name, category } = shopSelectedItem;

    if (shopState.owned.includes(id)) {
      shopState.equipped[category] = id;
      saveShopState();
      updateShopBalance();
      showMessage(`Equipado: ${name}`);
      audioManager.playSound('click');
      return;
    }
    if (shopState.coins < price) {
      showMessage('Fichas insuficientes');
      return;
    }
    shopState.coins -= price;
    shopState.owned.push(id);
    shopState.equipped[category] = id;
    saveShopState();
    updateShopBalance();
    showMessage(`Comprado: ${name}`);
    audioManager.playSound('win');
  });
}

function addShopCoins(amount) {
  shopState.coins += amount;
  saveShopState();
}

// ===== MUSIC PLAYER / RADIO =====
const musicPlayer = {
  audio: null,
  tracks: [],
  currentIndex: -1,
  playing: false,
  radioMode: false,
};

const radioStations = {
  synthwave: { name: 'Synthwave FM', url: 'https://stream.synthwave.hu/listen/synthwave/radio.mp3' },
  retrowave: { name: 'Nightride FM', url: 'https://stream.nightride.fm/nightride.m4a' },
  chillwave: { name: 'Chillsynth FM', url: 'https://stream.nightride.fm/chillsynth.m4a' },
  vaporwave: { name: 'Vaporwave FM', url: 'https://stream.nightride.fm/ebsm.m4a' },
};

function setupMusicPlayerUI() {
  const toggle = document.getElementById('mp-toggle');
  const panel = document.getElementById('mp-panel');
  const playBtn = document.getElementById('mp-play');
  const prevBtn = document.getElementById('mp-prev');
  const nextBtn = document.getElementById('mp-next');
  const volSlider = document.getElementById('mp-volume');
  const fileInput = document.getElementById('mp-file');

  toggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });

  // File upload
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      musicPlayer.tracks.push({ name: file.name.replace(/\.[^.]+$/, ''), url });
    });
    if (musicPlayer.tracks.length > 0 && musicPlayer.currentIndex === -1) {
      musicPlayer.currentIndex = 0;
      loadTrack(0);
    }
    updateMPDisplay();
  });

  // Play / Pause
  playBtn.addEventListener('click', () => {
    if (!musicPlayer.audio || (musicPlayer.tracks.length === 0 && !musicPlayer.radioMode)) return;
    if (musicPlayer.playing) {
      musicPlayer.audio.pause();
      musicPlayer.playing = false;
      playBtn.innerHTML = '&#9654;';
    } else {
      musicPlayer.audio.play().catch(() => {});
      musicPlayer.playing = true;
      playBtn.innerHTML = '&#9646;&#9646;';
    }
  });

  // Prev / Next
  prevBtn.addEventListener('click', () => {
    if (musicPlayer.tracks.length === 0) return;
    hideYTEmbed();
    musicPlayer.radioMode = false;
    musicPlayer.currentIndex = (musicPlayer.currentIndex - 1 + musicPlayer.tracks.length) % musicPlayer.tracks.length;
    loadTrack(musicPlayer.currentIndex);
    if (musicPlayer.playing) musicPlayer.audio.play().catch(() => {});
    updateMPDisplay();
    clearActiveRadio();
  });

  nextBtn.addEventListener('click', () => {
    if (musicPlayer.tracks.length === 0) return;
    hideYTEmbed();
    musicPlayer.radioMode = false;
    musicPlayer.currentIndex = (musicPlayer.currentIndex + 1) % musicPlayer.tracks.length;
    loadTrack(musicPlayer.currentIndex);
    if (musicPlayer.playing) musicPlayer.audio.play().catch(() => {});
    updateMPDisplay();
    clearActiveRadio();
  });

  volSlider.addEventListener('input', (e) => {
    if (musicPlayer.audio) musicPlayer.audio.volume = e.target.value / 100;
  });

  // Radio stations
  document.querySelectorAll('.mp-radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stationId = btn.dataset.radio;
      const station = radioStations[stationId];
      if (!station) return;

      clearActiveRadio();
      hideYTEmbed();
      btn.classList.add('active');

      if (musicPlayer.audio) { musicPlayer.audio.pause(); }
      musicPlayer.audio = new Audio(station.url);
      musicPlayer.audio.volume = (volSlider.value || 50) / 100;
      musicPlayer.audio.crossOrigin = 'anonymous';
      musicPlayer.radioMode = true;
      musicPlayer.playing = true;
      musicPlayer.audio.play().catch(() => {
        showMessage('No se pudo conectar a la radio');
      });
      document.getElementById('mp-now').textContent = station.name;
      document.getElementById('mp-play').innerHTML = '&#9646;&#9646;';
    });
  });

  // YouTube - supports both URL and search query
  document.getElementById('mp-yt-add').addEventListener('click', () => {
    const input = document.getElementById('mp-yt-url');
    const query = input.value.trim();
    if (!query) return;

    // Check if it's a direct YouTube URL
    const videoId = extractYTVideoId(query);
    if (videoId) {
      playYouTubeEmbed(videoId);
    } else {
      // Treat as search query - open YouTube search results in embed
      playYouTubeSearch(query);
    }
    input.value = '';
  });

  // Also submit on Enter key
  document.getElementById('mp-yt-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('mp-yt-add').click();
    }
  });
}

function clearActiveRadio() {
  document.querySelectorAll('.mp-radio-btn').forEach(b => b.classList.remove('active'));
}

function extractYTVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function playYouTubeEmbed(videoId) {
  // Stop current audio
  if (musicPlayer.audio) { musicPlayer.audio.pause(); musicPlayer.playing = false; }
  clearActiveRadio();
  musicPlayer.radioMode = true;
  musicPlayer.playing = true;

  // Show embedded player in the panel
  const embedDiv = document.getElementById('mp-yt-embed');
  const iframe = document.getElementById('mp-yt-iframe');
  embedDiv.classList.remove('hidden');
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  document.getElementById('mp-now').textContent = `YouTube`;
  document.getElementById('mp-play').innerHTML = '&#9646;&#9646;';
}

function playYouTubeSearch(query) {
  // Stop current audio
  if (musicPlayer.audio) { musicPlayer.audio.pause(); musicPlayer.playing = false; }
  clearActiveRadio();
  musicPlayer.radioMode = true;

  // Show YouTube search results in the embed iframe
  const embedDiv = document.getElementById('mp-yt-embed');
  const iframe = document.getElementById('mp-yt-iframe');
  embedDiv.classList.remove('hidden');
  const encoded = encodeURIComponent(query);
  iframe.src = `https://www.youtube.com/embed?listType=search&list=${encoded}`;

  document.getElementById('mp-now').textContent = `Buscando: ${query}`;
}

function hideYTEmbed() {
  const embedDiv = document.getElementById('mp-yt-embed');
  const iframe = document.getElementById('mp-yt-iframe');
  if (embedDiv) embedDiv.classList.add('hidden');
  if (iframe) iframe.src = '';
}

function loadTrack(idx) {
  if (idx < 0 || idx >= musicPlayer.tracks.length) return;
  hideYTEmbed();
  if (musicPlayer.audio) { musicPlayer.audio.pause(); musicPlayer.audio.src = ''; }
  musicPlayer.radioMode = false;
  musicPlayer.audio = new Audio(musicPlayer.tracks[idx].url);
  musicPlayer.audio.volume = (document.getElementById('mp-volume')?.value || 50) / 100;
  musicPlayer.audio.addEventListener('ended', () => {
    musicPlayer.currentIndex = (musicPlayer.currentIndex + 1) % musicPlayer.tracks.length;
    loadTrack(musicPlayer.currentIndex);
    musicPlayer.audio.play().catch(() => {});
    updateMPDisplay();
  });
  updateMPDisplay();
}

function updateMPDisplay() {
  const now = document.getElementById('mp-now');
  if (!now) return;
  if (musicPlayer.radioMode) return;
  if (musicPlayer.tracks.length === 0) {
    now.textContent = 'Sin pista';
  } else {
    now.textContent = musicPlayer.tracks[musicPlayer.currentIndex]?.name || 'Sin pista';
  }
}

// ===== IMPROVED COOLDOWN DISPLAY =====
function updateAbilityCooldownsDisplay(cooldowns) {
  document.querySelectorAll('.ability-btn').forEach(btn => {
    const id = btn.dataset.ability;
    const cd = cooldowns[id] || 0;
    btn.disabled = cd > 0;
    btn.classList.toggle('on-cooldown', cd > 0);
    const cdEl = document.getElementById(`cd-${id}`);
    if (cdEl) {
      cdEl.textContent = cd > 0 ? `${cd}T` : '';
    }
    if (cd > 0) {
      btn.title = `Cooldown: ${cd} rondas`;
    }
  });
}

// ===== START =====
function boot() {
  init();
  setupShopUI();
  setupMusicPlayerUI();
}
boot();
