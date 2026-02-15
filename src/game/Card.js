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

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3 }), // right
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3 }), // left
      new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.4 }), // top (face)
      new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.4 }), // bottom (back)
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3 }), // front
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3 }), // back
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
    canvas.width = 128;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(0, 0, 128, 192);

    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 122, 186);

    // Color
    const isRed = this.suit === 'hearts' || this.suit === 'diamonds';
    ctx.fillStyle = isRed ? '#ff2255' : '#1a1a3a';

    // Top-left rank
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.rank, 8, 32);

    // Top-left suit
    ctx.font = '22px serif';
    ctx.fillText(this.symbol, 10, 55);

    // Center suit (large)
    ctx.font = '60px serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.symbol, 64, 110);

    // Bottom-right (rotated)
    ctx.save();
    ctx.translate(64, 96);
    ctx.rotate(Math.PI);
    ctx.translate(-64, -96);
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.rank, 8, 32);
    ctx.font = '22px serif';
    ctx.fillText(this.symbol, 10, 55);
    ctx.restore();

    return canvas;
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
      this.mesh.position.lerp(this.targetPos, delta * this.animSpeed);
      if (this.mesh.position.distanceTo(this.targetPos) < 0.001) {
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
