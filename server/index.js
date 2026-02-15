import { WebSocketServer } from 'ws';
import { PokerRoom } from './PokerRoom.js';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();
let nextPlayerId = 1;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Ensure unique
  while (rooms.has(code)) {
    code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function cleanupEmptyRooms() {
  for (const [code, room] of rooms) {
    if (room.players.length === 0 && Date.now() - room.createdAt > 60000) {
      rooms.delete(code);
      console.log(`[CLEANUP] Room ${code} removed`);
    }
  }
}
setInterval(cleanupEmptyRooms, 30000);

wss.on('connection', (ws) => {
  const playerId = nextPlayerId++;
  ws.playerId = playerId;
  ws.roomCode = null;
  ws.playerInfo = { id: playerId, name: 'Jugador', avatar: null };

  console.log(`[CONNECT] Player ${playerId} connected`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('[ERROR] Invalid message:', e.message);
    }
  });

  ws.on('close', () => {
    console.log(`[DISCONNECT] Player ${playerId}`);
    if (ws.roomCode && rooms.has(ws.roomCode)) {
      const room = rooms.get(ws.roomCode);
      room.removePlayer(playerId);
      if (room.players.length === 0) {
        // Keep room for 60s in case of reconnect
        room.emptyAt = Date.now();
      }
    }
  });

  send(ws, { type: 'welcome', playerId });
});

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'setProfile':
      ws.playerInfo.name = (msg.name || 'Jugador').slice(0, 20);
      ws.playerInfo.avatar = msg.avatar || null; // base64 string or null
      send(ws, { type: 'profileSet', player: ws.playerInfo });
      break;

    case 'createRoom': {
      const code = generateRoomCode();
      const room = new PokerRoom(code, {
        startingChips: msg.startingChips || 1000,
        smallBlind: msg.smallBlind || 10,
        bigBlind: msg.bigBlind || 20,
        maxPlayers: msg.maxPlayers || 5,
        abilities: msg.abilities !== false,
      });
      rooms.set(code, room);
      room.addPlayer(ws);
      ws.roomCode = code;
      console.log(`[ROOM] ${ws.playerInfo.name} created room ${code}`);
      send(ws, { type: 'roomCreated', code, settings: room.settings });
      broadcastRoomState(room);
      break;
    }

    case 'joinRoom': {
      const code = (msg.code || '').toUpperCase();
      if (!rooms.has(code)) {
        send(ws, { type: 'error', message: 'Sala no encontrada' });
        return;
      }
      const room = rooms.get(code);
      if (room.players.length >= room.settings.maxPlayers) {
        send(ws, { type: 'error', message: 'Sala llena' });
        return;
      }
      if (room.gameStarted) {
        send(ws, { type: 'error', message: 'Partida en curso' });
        return;
      }
      room.addPlayer(ws);
      ws.roomCode = code;
      console.log(`[ROOM] ${ws.playerInfo.name} joined room ${code}`);
      send(ws, { type: 'roomJoined', code, settings: room.settings });
      broadcastRoomState(room);
      break;
    }

    case 'leaveRoom': {
      if (ws.roomCode && rooms.has(ws.roomCode)) {
        const room = rooms.get(ws.roomCode);
        room.removePlayer(ws.playerId);
        broadcastRoomState(room);
      }
      ws.roomCode = null;
      send(ws, { type: 'roomLeft' });
      break;
    }

    case 'startGame': {
      if (!ws.roomCode || !rooms.has(ws.roomCode)) return;
      const room = rooms.get(ws.roomCode);
      if (room.hostId !== ws.playerId) {
        send(ws, { type: 'error', message: 'Solo el host puede iniciar' });
        return;
      }
      if (room.players.length < 2) {
        send(ws, { type: 'error', message: 'Mínimo 2 jugadores' });
        return;
      }
      room.startGame();
      break;
    }

    case 'playerAction': {
      if (!ws.roomCode || !rooms.has(ws.roomCode)) return;
      const room = rooms.get(ws.roomCode);
      room.handlePlayerAction(ws.playerId, msg.action, msg.amount);
      break;
    }

    case 'useAbility': {
      if (!ws.roomCode || !rooms.has(ws.roomCode)) return;
      const room = rooms.get(ws.roomCode);
      room.handleAbility(ws.playerId, msg.ability);
      break;
    }

    case 'nextRound': {
      if (!ws.roomCode || !rooms.has(ws.roomCode)) return;
      const room = rooms.get(ws.roomCode);
      if (room.hostId === ws.playerId) {
        room.startNewRound();
      }
      break;
    }

    case 'chatMessage': {
      if (!ws.roomCode || !rooms.has(ws.roomCode)) return;
      const room = rooms.get(ws.roomCode);
      room.broadcast({
        type: 'chat',
        playerId: ws.playerId,
        name: ws.playerInfo.name,
        text: (msg.text || '').slice(0, 200),
      });
      break;
    }
  }
}

function broadcastRoomState(room) {
  room.broadcast({
    type: 'roomState',
    code: room.code,
    hostId: room.hostId,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      chips: p.chips,
      ready: p.ready,
    })),
    gameStarted: room.gameStarted,
    settings: room.settings,
  });
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

console.log(`POKARE Multiplayer Server running on port ${PORT}`);
