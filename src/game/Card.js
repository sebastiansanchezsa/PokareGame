import * as THREE from 'three';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = {
  hearts: 0xff2255,
  diamonds: 0xff2255,
  clubs: 0xe0e0ff,
  spades: 0xe0e0ff,
};

export class Card3D {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
    this.faceUp = false;
    this.mesh = null;
    this.targetPos = null;
    this.targetRot = null;
    this.animSpeed = 4;
    this.createMesh();
  }

  get symbol() {
    return SUIT_SYMBOLS[this.suit];
  }

  get color() {
    return SUIT_COLORS[this.suit];
  }

  get value() {
    const idx = RANKS.indexOf(this.rank);
    return idx + 2; // 2-14
  }

  createMesh() {
    const width = 0.09;
    const height = 0.13;
    const depth = 0.003;

    const group = new THREE.Group();

    // Card body
    const geo = new THREE.BoxGeometry(width, depth, height);

    // Front face material (white with card info via canvas)
    const frontCanvas = this.createCardFaceCanvas();
    const frontTexture = new THREE.CanvasTexture(frontCanvas);
    frontTexture.minFilter = THREE.LinearFilter;

    // Back face material (retrowave pattern)
    const backCanvas = this.createCardBackCanvas();
    const backTexture = new THREE.CanvasTexture(backCanvas);
    backTexture.minFilter = THREE.LinearFilter;

    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.7, metalness: 0.0 });
    const materials = [
      edgeMat, // right
      edgeMat, // left
      new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.65, metalness: 0.0, color: 0xdddddd }), // top (face)
      new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.6, metalness: 0.0, color: 0xdddddd }), // bottom (back)
      edgeMat, // front
      edgeMat, // back
    ];

    const cardMesh = new THREE.Mesh(geo, materials);
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    group.add(cardMesh);

    this.mesh = group;
    this.cardBody = cardMesh;

    // Start face down
    this.setFaceDown();
  }

  createCardFaceCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 260;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, 180, 260);

    // Border with rounded look
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 174, 254);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 168, 248);

    // Color
    const isRed = this.suit === 'hearts' || this.suit === 'diamonds';
    ctx.fillStyle = isRed ? '#dd1133' : '#111133';

    // Top-left rank + suit
    ctx.font = 'bold 22px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.rank, 20, 28);
    ctx.font = '18px serif';
    ctx.fillText(this.symbol, 20, 48);

    // Bottom-right rank + suit (rotated)
    ctx.save();
    ctx.translate(90, 130);
    ctx.rotate(Math.PI);
    ctx.translate(-90, -130);
    ctx.font = 'bold 22px "Georgia", serif';
    ctx.fillText(this.rank, 20, 28);
    ctx.font = '18px serif';
    ctx.fillText(this.symbol, 20, 48);
    ctx.restore();

    // Draw pip layout based on rank (realistic poker card positions)
    this.drawPips(ctx, 180, 260);

    return canvas;
  }

  drawPips(ctx, w, h) {
    const isRed = this.suit === 'hearts' || this.suit === 'diamonds';
    ctx.fillStyle = isRed ? '#dd1133' : '#111133';
    const sym = this.symbol;
    const pipSize = 22;
    const cx = w / 2;

    const drawPip = (x, y, size, inverted) => {
      ctx.save();
      if (inverted) {
        ctx.translate(x, y);
        ctx.rotate(Math.PI);
        ctx.translate(-x, -y);
      }
      ctx.font = `${size || pipSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, x, y);
      ctx.restore();
    };

    const isFace = ['J', 'Q', 'K'].includes(this.rank);

    if (this.rank === 'A') {
      // Ace: one large center pip
      ctx.font = '64px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, cx, h / 2);
    } else if (isFace) {
      // Face cards: draw a decorative center
      this.drawFaceCard(ctx, w, h);
    } else {
      // Number cards: pip positions per rank (standard poker layout)
      const cols = { L: 55, C: cx, R: 125 };
      const rows = { T1: 70, T2: 95, M1: 115, M: h/2, M2: 145, B2: 165, B1: 190 };
      const pipPositions = {
        '2': [[cols.C, rows.T1, false], [cols.C, rows.B1, true]],
        '3': [[cols.C, rows.T1, false], [cols.C, rows.M, false], [cols.C, rows.B1, true]],
        '4': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
        '5': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.C, rows.M, false], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
        '6': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.L, rows.M, false], [cols.R, rows.M, false], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
        '7': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.C, rows.T2, false], [cols.L, rows.M, false], [cols.R, rows.M, false], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
        '8': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.C, rows.T2, false], [cols.L, rows.M, false], [cols.R, rows.M, false], [cols.C, rows.B2, true], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
        '9': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.L, rows.T2, false], [cols.R, rows.T2, false], [cols.C, rows.M, false], [cols.L, rows.B2, true], [cols.R, rows.B2, true], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
        '10': [[cols.L, rows.T1, false], [cols.R, rows.T1, false], [cols.C, 82, false], [cols.L, rows.T2, false], [cols.R, rows.T2, false], [cols.L, rows.B2, true], [cols.R, rows.B2, true], [cols.C, 178, true], [cols.L, rows.B1, true], [cols.R, rows.B1, true]],
      };

      const pips = pipPositions[this.rank];
      if (pips) {
        pips.forEach(([x, y, inv]) => drawPip(x, y, pipSize, inv));
      }
    }
  }

  drawFaceCard(ctx, w, h) {
    const isRed = this.suit === 'hearts' || this.suit === 'diamonds';
    const cx = w / 2;
    const cy = h / 2;

    // Decorative border for face cards
    ctx.strokeStyle = isRed ? '#dd113355' : '#11113355';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 55, w - 70, h - 110);

    // Crown/symbol based on rank
    ctx.fillStyle = isRed ? '#dd1133' : '#111133';
    ctx.font = 'bold 42px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const faceSymbols = { J: '♞', Q: '♛', K: '♚' };
    ctx.fillText(faceSymbols[this.rank] || this.rank, cx, cy - 10);

    // Suit below
    ctx.font = '28px serif';
    ctx.fillText(this.symbol, cx, cy + 30);

    // Decorative corners
    ctx.font = '14px serif';
    ctx.fillText(this.symbol, 44, 66);
    ctx.fillText(this.symbol, w - 44, 66);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI);
    ctx.translate(-cx, -cy);
    ctx.fillText(this.symbol, 44, 66);
    ctx.fillText(this.symbol, w - 44, 66);
    ctx.restore();
  }

  createCardBackCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(0, 0, 128, 192);

    // Border
    ctx.strokeStyle = '#ff6ec7';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, 118, 182);

    // Inner border
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 108, 172);

    // Grid pattern
    ctx.strokeStyle = 'rgba(255, 110, 199, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 15; i < 128; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 15);
      ctx.lineTo(i, 177);
      ctx.stroke();
    }
    for (let i = 15; i < 192; i += 12) {
      ctx.beginPath();
      ctx.moveTo(15, i);
      ctx.lineTo(113, i);
      ctx.stroke();
    }

    // Center diamond
    ctx.fillStyle = '#ff6ec7';
    ctx.beginPath();
    ctx.moveTo(64, 60);
    ctx.lineTo(84, 96);
    ctx.lineTo(64, 132);
    ctx.lineTo(44, 96);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a0a2a';
    ctx.beginPath();
    ctx.moveTo(64, 70);
    ctx.lineTo(76, 96);
    ctx.lineTo(64, 122);
    ctx.lineTo(52, 96);
    ctx.closePath();
    ctx.fill();

    return canvas;
  }

  setFaceUp() {
    this.faceUp = true;
    // Face up = top side visible (no rotation needed beyond base)
  }

  setFaceDown() {
    this.faceUp = false;
    // Flip 180 degrees around X axis so back is up
    this.mesh.rotation.x = Math.PI;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  animateTo(targetPos, targetRot, speed = 4) {
    this.targetPos = targetPos.clone();
    this.targetRot = targetRot ? targetRot.clone() : null;
    this.animSpeed = speed;
  }

  flipUp(duration = 0.5) {
    this.faceUp = true;
    this.targetRot = new THREE.Euler(0, 0, 0);
    this.animSpeed = 1 / duration;
  }

  flipDown(duration = 0.5) {
    this.faceUp = false;
    this.targetRot = new THREE.Euler(Math.PI, 0, 0);
    this.animSpeed = 1 / duration;
  }

  update(delta) {
    if (this.targetPos) {
      const lerpFactor = Math.min(1, delta * this.animSpeed * 1.5);
      this.mesh.position.lerp(this.targetPos, lerpFactor);
      if (this.mesh.position.distanceTo(this.targetPos) < 0.002) {
        this.mesh.position.copy(this.targetPos);
        this.targetPos = null;
      }
    }

    if (this.targetRot) {
      this.mesh.rotation.x += (this.targetRot.x - this.mesh.rotation.x) * delta * this.animSpeed * 2;
      this.mesh.rotation.y += (this.targetRot.y - this.mesh.rotation.y) * delta * this.animSpeed * 2;
      this.mesh.rotation.z += (this.targetRot.z - this.mesh.rotation.z) * delta * this.animSpeed * 2;

      const dx = Math.abs(this.mesh.rotation.x - this.targetRot.x);
      const dy = Math.abs(this.mesh.rotation.y - this.targetRot.y);
      const dz = Math.abs(this.mesh.rotation.z - this.targetRot.z);
      if (dx + dy + dz < 0.01) {
        this.mesh.rotation.set(this.targetRot.x, this.targetRot.y, this.targetRot.z);
        this.targetRot = null;
      }
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
    }
  }
}

export { SUITS, RANKS, SUIT_SYMBOLS };
