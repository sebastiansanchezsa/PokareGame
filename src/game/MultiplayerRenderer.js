import * as THREE from 'three';
import { Card3D, SUIT_SYMBOLS } from './Card.js';

/**
 * Renders 3D cards and chips on the table based on server game state.
 * Used in multiplayer mode where GameManager doesn't run locally.
 */
export class MultiplayerRenderer {
  constructor(scene, table) {
    this.scene = scene;
    this.table = table;
    this.cardMeshes = [];
    this.communityCardMeshes = [];
    this.chipMeshes = [];
    this.playerPositions = [];
    this.lastPhase = '';
    this.lastCommunityCount = 0;
    this.playerCardMap = new Map();
    this.myCards = [];
    this.suspenseActive = false;
    this.suspenseCard = null;
    this.onSuspenseComplete = null;
    this._lastMyIndex = -1;
    this._lastNumPlayers = 0;
  }

  /**
   * Set up positions for N players, remapped so local player is always at position 0 (front).
   */
  setupPositions(numPlayers, myIndex) {
    const rawPositions = this.table.getPlayerPositions(numPlayers - 1);
    // Remap: local player goes to position 0 (front of table)
    this.playerPositions = [];
    for (let i = 0; i < numPlayers; i++) {
      const remapped = (i - myIndex + numPlayers) % numPlayers;
      this.playerPositions[i] = rawPositions[remapped];
    }
    this._lastMyIndex = myIndex;
    this._lastNumPlayers = numPlayers;
  }

  /**
   * Called with full game state from server. Renders/updates 3D objects.
   */
  updateFromState(state, myIndex) {
    const numPlayers = state.players.length;
    if (numPlayers !== this._lastNumPlayers || myIndex !== this._lastMyIndex) {
      this.setupPositions(numPlayers, myIndex);
    }

    // Deal hole cards for each player
    state.players.forEach((p, idx) => {
      if (!p.hasCards && !p.cards) return;
      if (this.playerCardMap.has(p.id)) return;

      const pos = this.playerPositions[idx];
      if (!pos) return;

      const cards = [];
      // Local player uses yourCards, others use p.cards (null unless showdown)
      const isMe = idx === myIndex;
      const holeCards = isMe ? state.yourCards : p.cards;

      for (let ci = 0; ci < 2; ci++) {
        let card3d;
        if (holeCards && holeCards[ci]) {
          card3d = new Card3D(holeCards[ci].rank, holeCards[ci].suit);
        } else {
          card3d = new Card3D('A', 'spades');
        }

        const offsetX = (ci - 0.5) * 0.12;
        card3d.setPosition(0, 1.5, 0);

        const targetPos = new THREE.Vector3(
          pos.cardPos.x + offsetX,
          pos.cardPos.y,
          pos.cardPos.z
        );
        card3d.animateTo(targetPos, null, 3);

        // Only flip up own cards or during showdown with known cards
        if (isMe || (state.phase === 'showdown' && holeCards && holeCards[ci])) {
          card3d.flipUp();
        }

        this.scene.add(card3d.mesh);
        this.cardMeshes.push(card3d);
        cards.push(card3d);
      }

      this.playerCardMap.set(p.id, cards);
      if (isMe) this.myCards = cards;
    });

    // Showdown: reveal all cards we now know
    if (state.phase === 'showdown') {
      state.players.forEach((p, idx) => {
        if (p.cards && this.playerCardMap.has(p.id)) {
          const cards3d = this.playerCardMap.get(p.id);
          const pos = this.playerPositions[idx];
          p.cards.forEach((c, ci) => {
            if (cards3d[ci] && c && !cards3d[ci].faceUp) {
              this.scene.remove(cards3d[ci].mesh);
              cards3d[ci].dispose();
              const newCard = new Card3D(c.rank, c.suit);
              const offsetX = (ci - 0.5) * 0.12;
              newCard.mesh.position.set(pos.cardPos.x + offsetX, pos.cardPos.y, pos.cardPos.z);
              newCard.flipUp();
              this.scene.add(newCard.mesh);
              cards3d[ci] = newCard;
              this.cardMeshes.push(newCard);
            }
          });
        }
      });
    }

    // Fold animation
    state.players.forEach((p) => {
      if (p.folded && this.playerCardMap.has(p.id)) {
        const cards3d = this.playerCardMap.get(p.id);
        cards3d.forEach(c => {
          if (!c._folded) {
            c._folded = true;
            c.flipDown();
            const foldPos = c.mesh.position.clone();
            foldPos.y += 0.05;
            foldPos.z -= 0.2;
            c.animateTo(foldPos, null, 2);
          }
        });
      }
    });

    // Community cards
    this.updateCommunityCards(state.communityCards || [], state.phase);

    // Chips
    this.updateChips(state, myIndex);
  }

  updateCommunityCards(serverCards, phase) {
    const comPositions = this.table.getCommunityPositions();
    const currentCount = this.communityCardMeshes.length;
    const targetCount = serverCards.length;
    if (targetCount <= currentCount) return;

    for (let i = currentCount; i < targetCount; i++) {
      const c = serverCards[i];
      const isRiver = (i === 4);
      const card3d = new Card3D(c.rank, c.suit);

      if (isRiver && !this.suspenseActive) {
        this.playSuspenseReveal(card3d, comPositions[i]);
      } else {
        card3d.setPosition(0, 1.5, -0.5);
        card3d.flipUp();
        card3d.animateTo(comPositions[i], new THREE.Euler(0, 0, 0), 3);
      }

      this.scene.add(card3d.mesh);
      this.communityCardMeshes.push(card3d);
      this.cardMeshes.push(card3d);
    }
  }

  playSuspenseReveal(card3d, targetPos) {
    this.suspenseActive = true;
    this.suspenseCard = card3d;
    card3d.setPosition(0, 2.5, -0.5);
    card3d.mesh.rotation.x = Math.PI;

    const hoverPos = new THREE.Vector3(targetPos.x, targetPos.y + 0.4, targetPos.z);
    card3d.animateTo(hoverPos, null, 1.2);

    setTimeout(() => {
      card3d.animSpeed = 0.5;
      card3d.animateTo(new THREE.Vector3(targetPos.x, targetPos.y + 0.3, targetPos.z), null, 0.8);
    }, 1500);

    setTimeout(() => {
      card3d.flipUp();
      card3d.animateTo(targetPos, new THREE.Euler(0, 0, 0), 8);
      this.suspenseActive = false;
      this.suspenseCard = null;
      if (this.onSuspenseComplete) this.onSuspenseComplete();
    }, 2800);
  }

  /**
   * Render realistic poker chips with canvas textures
   */
  createChipTexture(color, value) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = size / 2;

    // Main circle
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Edge dashes (8 white stripes around rim)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x1 = r + Math.cos(a) * (r - 6);
      const y1 = r + Math.sin(a) * (r - 6);
      const x2 = r + Math.cos(a) * (r - 16);
      const y2 = r + Math.sin(a) * (r - 16);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // Inner circle
    ctx.beginPath();
    ctx.arc(r, r, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Value text
    if (value) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size * 0.28}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.fillText(value, r, r);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  updateChips(state, myIndex) {
    this.chipMeshes.forEach(c => { this.scene.remove(c.mesh); c.dispose(); });
    this.chipMeshes = [];

    const chipDefs = [
      { min: 0, color: '#e74c3c', hex: 0xe74c3c, label: '5' },
      { min: 25, color: '#2ecc71', hex: 0x2ecc71, label: '25' },
      { min: 100, color: '#3498db', hex: 0x3498db, label: '100' },
      { min: 500, color: '#f39c12', hex: 0xf39c12, label: '500' },
    ];

    state.players.forEach((p, idx) => {
      if (p.bet <= 0) return;
      const pos = this.playerPositions[idx];
      if (!pos) return;

      let remaining = p.bet;
      let stackY = 0;
      for (let d = chipDefs.length - 1; d >= 0; d--) {
        const def = chipDefs[d];
        const val = def.min || 5;
        const count = Math.min(Math.floor(remaining / val), 5);
        remaining -= count * val;
        for (let i = 0; i < count; i++) {
          const tex = this.createChipTexture(def.color, def.label);
          const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16);
          const mat = new THREE.MeshStandardMaterial({
            color: def.hex, roughness: 0.25, metalness: 0.5,
            map: tex,
          });
          const chipMesh = new THREE.Mesh(geo, mat);
          chipMesh.position.set(
            pos.betPos.x + (Math.random() - 0.5) * 0.04,
            pos.betPos.y + stackY,
            pos.betPos.z + (Math.random() - 0.5) * 0.04
          );
          chipMesh.castShadow = true;
          this.scene.add(chipMesh);
          this.chipMeshes.push({ mesh: chipMesh, dispose: () => { geo.dispose(); mat.dispose(); tex.dispose(); } });
          stackY += 0.009;
        }
      }
      // At least 1 chip if remaining
      if (p.bet > 0 && stackY === 0) {
        const tex = this.createChipTexture('#e74c3c', '5');
        const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.25, metalness: 0.5, map: tex });
        const chipMesh = new THREE.Mesh(geo, mat);
        chipMesh.position.set(pos.betPos.x, pos.betPos.y, pos.betPos.z);
        chipMesh.castShadow = true;
        this.scene.add(chipMesh);
        this.chipMeshes.push({ mesh: chipMesh, dispose: () => { geo.dispose(); mat.dispose(); tex.dispose(); } });
      }
    });
  }

  update(delta) {
    this.cardMeshes.forEach(card => card.update(delta));
  }

  clearTable() {
    this.cardMeshes.forEach(card => { this.scene.remove(card.mesh); card.dispose(); });
    this.cardMeshes = [];
    this.communityCardMeshes = [];
    this.myCards = [];
    this.playerCardMap.clear();
    this.chipMeshes.forEach(c => { this.scene.remove(c.mesh); c.dispose(); });
    this.chipMeshes = [];
    this.lastPhase = '';
    this.lastCommunityCount = 0;
    this.suspenseActive = false;
    this.suspenseCard = null;
  }
}
