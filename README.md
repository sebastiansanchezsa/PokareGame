# POKARE - Retrowave First-Person Poker

Un videojuego de póker Texas Hold'em en primera persona con estética **retrowave/synthwave**, ambientado en una cabaña underground estilo años 80. Incluye **multijugador por código de sala**, habilidades especiales, tutorial animado y animaciones de eliminación.

## 🎮 Características

### Entorno 3D Inmersivo
- Cabaña oscura con iluminación neón (rosa, azul, violeta)
- Mesa de póker 3D oval con felt verde
- Decoraciones: letrero neón "POKARE", jukebox, estantes con botellas, ventana
- Niebla volumétrica y sombras dinámicas
- Lámpara colgante sobre la mesa

### Primera Persona (FPS)
- Cámara con respiración idle sutil
- Movimiento leve de cabeza con el mouse
- Manos visibles del jugador con animaciones (fold, bet, grab card, look card)
- Reloj y anillo como detalles

### Cartas y Fichas 3D
- Cartas 3D con texturas procedurales (cara y dorso retrowave)
- Animaciones de reparto y volteo físico (rotación en eje X)
- Mini-cartas 2D en la esquina inferior izquierda para referencia rápida
- Fichas 3D con valores y colores diferenciados

### IA de Bots (Modo Single Player)
- **Conservador**: juega tight, pocas apuestas grandes
- **Agresivo**: apuestas frecuentes, bluffs
- **Estratégico**: adaptativo según fase y odds
- Modelos 3D con lentes de sol 80s, animaciones de reacción y movimiento idle

### Multijugador por Código de Sala
- Sin necesidad de registro ni inicio de sesión
- **Perfil**: nombre de usuario (obligatorio) + foto de perfil (opcional)
- **Crear sala**: genera un código de 5 caracteres para compartir
- **Unirse**: ingresa el código de un amigo
- El host controla el inicio de partida y las rondas
- Chat en vivo durante la partida
- Servidor WebSocket en Node.js

### Habilidades Especiales (Multijugador)
- **Visión ($100)**: ve la próxima carta comunitaria en secreto
- **Escudo ($150)**: protege tu apuesta de raises
- **Intimidar ($75)**: presiona a los oponentes
- **Fortuna ($200)**: gana +50% del pozo si ganas la mano
- Cada habilidad tiene cooldown de varias rondas

### Animaciones de Eliminación
- Cuando un jugador pierde todas sus fichas: overlay dramático con calavera
- Efecto glitch en el texto, shake de pantalla, pulso de color
- Auto-dismiss o click para cerrar

### Tutorial Animado
- 8 slides interactivos con navegación
- Explica: cartas, fases, acciones, manos de póker, habilidades, multijugador
- Iconos y cartas de ejemplo visuales
- Accesible desde el menú principal

### Post-procesamiento
- Bloom (resplandor neón)
- Aberración cromática
- Efecto VHS opcional (scanlines, ruido, wobble)
- Viñeta cinematográfica
- Color grading rosa/azul

### Audio Procedural
- Música synthwave generada en tiempo real (bass, pads, arpegio, drums)
- Efectos de sonido: cartas, fichas, victoria, derrota
- Volúmenes ajustables

## 🚀 Instalación Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor WebSocket (multijugador)
npm run server

# En otra terminal: iniciar cliente Vite
npm run client

# O en Windows, ambos a la vez:
npm run dev:win
```

- **Cliente**: `http://localhost:3000`
- **Servidor WebSocket**: `ws://localhost:3001` (auto-detectado)

## 🌐 Despliegue en Producción

El juego necesita **2 despliegues separados**:

### 1. Servidor WebSocket → Railway (gratis)
1. Ir a [railway.app](https://railway.app) y crear cuenta
2. Nuevo proyecto → Deploy from GitHub → seleccionar el repo
3. En Settings: **Root Directory** = `server`
4. Railway detecta el `package.json` del server y ejecuta `npm start`
5. Copiar la URL pública (ej: `pokare-server.up.railway.app`)

### 2. Frontend → Netlify (ya desplegado)
1. En Netlify: **Site Settings → Environment Variables**
2. Agregar: `VITE_WS_URL` = `wss://TU-URL-DE-RAILWAY.up.railway.app`
3. Re-deploy el sitio (o push nuevo commit)

El cliente usa `VITE_WS_URL` si existe, o auto-detecta la URL según el host actual.

## 🛠 Tecnología

- **Three.js** - Motor 3D
- **Vite** - Build tool
- **ws** - WebSocket server (multijugador)
- **Web Audio API** - Audio procedural
- **JavaScript ES Modules** - Arquitectura modular

## 📁 Estructura del Proyecto

```
PokareGame/
├── index.html              # HTML + UI completa
├── package.json
├── vite.config.js
├── server/
│   ├── index.js            # WebSocket server principal
│   └── PokerRoom.js        # Lógica de sala + poker server-side
└── src/
    ├── main.js             # Entry point, integración de todos los sistemas
    ├── styles/
    │   └── main.css        # Estilos: menú, lobby, HUD, tutorial, eliminación, chat
    ├── scene/
    │   ├── Environment.js  # Cabaña 3D, decoraciones
    │   ├── Table.js        # Mesa de póker oval
    │   ├── Lighting.js     # Luces neón con flicker
    │   └── PostProcessing.js # Bloom, VHS, aberración cromática
    ├── camera/
    │   └── FPSCamera.js    # Cámara primera persona con breathing
    ├── game/
    │   ├── GameManager.js  # Estado del juego (single player)
    │   ├── PokerLogic.js   # Evaluación de manos Texas Hold'em
    │   ├── Card.js         # Modelo 3D de carta con flip físico
    │   ├── Chip.js         # Modelo 3D de ficha
    │   ├── Deck.js         # Baraja
    │   ├── BotAI.js        # IA de bots
    │   ├── BotModels.js    # Modelos 3D de bots en la mesa
    │   └── PlayerHands.js  # Manos visibles del jugador FPS
    ├── network/
    │   └── MultiplayerClient.js # Cliente WebSocket
    ├── ui/
    │   └── Tutorial.js     # Tutorial animado con 8 slides
    └── audio/
        └── AudioManager.js # Música synthwave y SFX procedural
```

## 🎯 Controles

| Acción | Control |
|--------|---------|
| Mirar alrededor | Mover mouse |
| Fold | Botón FOLD |
| Check | Botón CHECK |
| Call | Botón CALL |
| Raise | Slider + botón RAISE |
| All In | Botón ALL IN |
| Habilidades | Barra lateral derecha (multijugador) |
| Chat | Campo de texto inferior derecho (multijugador) |

## 📝 Licencia

Proyecto de entretenimiento personal.
