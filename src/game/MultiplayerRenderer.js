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
    this.cardMeshes = [];          // all 3D card objects on table
    this.communityCardMeshes = [];
    this.chipMeshes = [];
    this.playerPositions = [];
    this.lastPhase = '';
    this.lastCommunityCount = 0;
    this.playerCardMap = new Map(); // playerId -> [Card3D]
    this.myCards = [];              // local player's 3D hole cards
    this.suspenseActive = false;
    this.suspenseCard = null;
    this.onSuspenseComplete = null;
  }

  /**
   * Set up positions for N players
   */
  setupPositions(numPlayers) {
    this.playerPositions = this.table.getPlayerPositions(numPlayers);
  }

  /**
   * Called with full game state from server. Renders/updates 3D objects.
   * @param {Object} state - server game state
   * @param {number} myIndex - this player's index in state.players
   */
  updateFromState(state, myIndex) {
    const numPlayers = state.players.length;
    if (this.playerPositions.length !== numPlayers) {
      this.setupPositions(numPlayers - 1); // -1 because getPlayerPositions takes bot count
    }

    // Deal hole cards for each player (face down for others, face up for self)
    state.players.forEach((p, idx) => {
      if (!p.hasCards && !p.cards) return;
      if (this.playerCardMap.has(p.id)) return; // already dealt

      const pos = this.playerPositions[idx];
      if (!pos) return;

      const cards = [];
      const holeCards = (idx === myIndex && state.yourCards) ? state.yourCards : p.cards;

      for (let ci = 0; ci < 2; ci++) {
        let card3d;
        if (holeCards && holeCards[ci]) {
          card3d = new Card3D(holeCards[ci].rank, holeCards[ci].suit);
        } else {
          // Unknown card - show face down
          card3d = new Card3D('A', 'spades'); // placeholder
        }

        const offsetX = (ci - 0.5) * 0.12;
        card3d.setPosition(0, 1.5, 0); // start from above

        const targetPos = new THREE.Vector3(
          pos.cardPos.x + offsetX,
          pos.cardPos.y,
          pos.cardPos.z
        );
        card3d.animateTo(targetPos, null, 3);

        // Only flip up own cards or during showdown
        if (idx === myIndex || (state.phase === 'showdown' && holeCards && holeCards[ci])) {
          card3d.flipUp();
        }

        this.scene.add(card3d.mesh);
        this.cardMeshes.push(card3d);
        cards.push(card3d);
      }

      this.playerCardMap.set(p.id, cards);
      if (idx === myIndex) this.myCards = cards;
    });

    // Showdown: flip up all cards that we now know
    if (state.phase === 'showdown') {
      state.players.forEach((p, idx) => {
        if (p.cards && this.playerCardMap.has(p.id)) {
          const cards3d = this.playerCardMap.get(p.id);
          p.cards.forEach((c, ci) => {
            if (cards3d[ci] && c) {
              // Replace card texture if it was a placeholder
              if (!cards3d[ci].faceUp) {
                this.scene.remove(cards3d[ci].mesh);
                cards3d[ci].dispose();
                const newCard = new Card3D(c.rank, c.suit);
                const pos = this.playerPositions[idx];
                const offsetX = (ci - 0.5) * 0.12;
                newCard.mesh.position.set(
                  pos.cardPos.x + offsetX,
                  pos.cardPos.y,
                  pos.cardPos.z
                );
                newCard.flipUp();
                this.scene.add(newCard.mesh);
                cards3d[ci] = newCard;
                this.cardMeshes.push(newCard);
              }
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

    // Chips visualization
    this.updateChips(state);
  }

  /**
   * Render community cards with animations. River gets special suspense.
   */
  updateCommunityCards(serverCards, phase) {
    const comPositions = this.table.getCommunityPositions();
    const currentCount = this.communityCardMeshes.length;
    const targetCount = serverCards.length;

    if (targetCount <= currentCount) return;

    // Deal new community cards
    for (let i = currentCount; i < targetCount; i++) {
      const c = serverCards[i];
      const isRiver = (i === 4); // 5th card = river

      const card3d = new Card3D(c.rank, c.suit);

      if (isRiver && !this.suspenseActive) {
        // EPIC RIVER SUSPENSE ANIMATION
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

  /**
   * Epic suspense animation for river card
   */
  playSuspenseReveal(card3d, targetPos) {
    this.suspenseActive = true;
    this.suspenseCard = card3d;

    // Start high above, face down, slowly descend
    card3d.setPosition(0, 2.5, -0.5);
    card3d.mesh.rotation.x = Math.PI; // face down

    // Phase 1: Slow descent to hover position (1.5s)
    const hoverPos = new THREE.Vector3(targetPos.x, targetPos.y + 0.4, targetPos.z);
    card3d.animateTo(hoverPos, null, 1.2);

    // Phase 2: Pause, then dramatic flip (after 1.5s)
    setTimeout(() => {
      // Wobble effect
      card3d.animSpeed = 0.5;
      card3d.animateTo(
        new THREE.Vector3(targetPos.x, targetPos.y + 0.3, targetPos.z),
        null, 0.8
      );
    }, 1500);

    // Phase 3: Fast flip and slam down (after 2.5s)
    setTimeout(() => {
      card3d.flipUp();
      card3d.animateTo(targetPos, new THREE.Euler(0, 0, 0), 8);
      this.suspenseActive = false;
      this.suspenseCard = null;
      if (this.onSuspenseComplete) this.onSuspenseComplete();
    }, 2800);
  }

  /**
   * Render chip stacks near each player's bet position
   */
  updateChips(state) {
    // Clear old chips
    this.chipMeshes.forEach(c => {
      this.scene.remove(c.mesh);
      c.dispose();
    });
    this.chipMeshes = [];

    const colors = [0xff6ec7, 0x00ccff, 0xffd700, 0x00ff88];

    state.players.forEach((p, idx) => {
      if (p.bet <= 0) return;
      const pos = this.playerPositions[idx];
      if (!pos) return;

      const chipCount = Math.min(Math.ceil(p.bet / 25), 8);
      for (let i = 0; i < chipCount; i++) {
        const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.007, 12);
        const mat = new THREE.MeshStandardMaterial({
          color: colors[i % colors.length],
          roughness: 0.3,
          metalness: 0.4,
        });
        const chipMesh = new THREE.Mesh(geo, mat);
        chipMesh.position.set(
          pos.betPos.x + (Math.random() - 0.5) * 0.06,
          pos.betPos.y + i * 0.008,
          pos.betPos.z + (Math.random() - 0.5) * 0.06
        );
        chipMesh.castShadow = true;
        this.scene.add(chipMesh);
        this.chipMeshes.push({
          mesh: chipMesh,
          dispose: () => { geo.dispose(); mat.dispose(); },
        });
      }
    });
  }

  /**
   * Update card animations each frame
   */
  update(delta) {
    this.cardMeshes.forEach(card => card.update(delta));
  }

  /**
   * Clear all 3D objects for new round
   */
  clearTable() {
    this.cardMeshes.forEach(card => {
      this.scene.remove(card.mesh);
      card.dispose();
    });
    this.cardMeshes = [];
    this.communityCardMeshes = [];
    this.myCards = [];
    this.playerCardMap.clear();

    this.chipMeshes.forEach(c => {
      this.scene.remove(c.mesh);
      c.dispose();
    });
    this.chipMeshes = [];

    this.lastPhase = '';
    this.lastCommunityCount = 0;
    this.suspenseActive = false;
    this.suspenseCard = null;
  }
}
