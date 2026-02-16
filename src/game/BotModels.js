import * as THREE from 'three';

/**
 * Detailed 3D humanoid character models for poker players.
 * Each character has a full body with suit, facial features, hair,
 * accessories, and idle/reaction animations.
 */
export class BotModels {
  constructor(scene) {
    this.scene = scene;
    this.models = [];
    this.chairs = [];
    this.abilityEffects = [];
  }

  createBots(positions, botNames) {
    this.dispose();
    for (let i = 1; i < positions.length; i++) {
      const pos = positions[i];
      const name = botNames[i - 1] || 'BOT';
      const model = this.createCharacter(pos, i, name);
      this.models.push(model);
      this.scene.add(model.group);
      this.createChair(pos, i);
    }
    // Also create chair at player seat (position 0)
    if (positions.length > 0) {
      this.createChair(positions[0], 0);
    }
  }

  createChair(pos, index) {
    const chair = new THREE.Group();
    const seatPos = pos.seat;
    const pushFactor = index === 0 ? 1.15 : 1.3;
    const px = seatPos.x * pushFactor;
    const pz = seatPos.z * pushFactor;

    // World-scale chair: seat at y=0.68, legs to floor
    const seatHeight = 0.68;
    const seatW = 0.18, seatD = 0.18;
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x2a0a1a, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a0a08, roughness: 0.4, metalness: 0.3 });

    // Seat cushion
    const cushionGeo = new THREE.BoxGeometry(seatW, 0.025, seatD);
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.y = seatHeight;
    chair.add(cushion);

    // Backrest
    const backGeo = new THREE.BoxGeometry(seatW, 0.25, 0.025);
    const back = new THREE.Mesh(backGeo, cushionMat);
    back.position.set(0, seatHeight + 0.14, -seatD * 0.45);
    chair.add(back);

    // 4 legs from floor to seat
    const legH = seatHeight;
    const legGeo = new THREE.CylinderGeometry(0.012, 0.012, legH, 6);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(sx * seatW * 0.4, legH / 2, sz * seatD * 0.4);
      chair.add(leg);
    });

    chair.position.set(px, 0, pz);
    chair.rotation.y = Math.atan2(-px, -pz);
    this.scene.add(chair);
    this.chairs.push(chair);
  }

  createCharacter(pos, index, name) {
    const group = new THREE.Group();

    // === CHARACTER VARIATIONS ===
    const skinTones = [0xc68642, 0xe0ac69, 0x8d5524, 0xf1c27d];
    const jacketPalette = [
      { main: 0x1a1035, lapel: 0x221545 },
      { main: 0x2a0818, lapel: 0x3a1020 },
      { main: 0x0a1825, lapel: 0x122535 },
      { main: 0x1a1a08, lapel: 0x282810 },
    ];
    const shirtPalette = [0xf0eee8, 0xe8e0d8, 0xd8d0c8, 0xe8e8f0];
    const tiePalette = [0xcc2244, 0x2244cc, 0xc8a84e, 0x22cc88];
    const hairPalette = [0x1a0a0a, 0x3a2510, 0x0a0a0a, 0x5a3a1a];
    const accentNeon = [0xff6ec7, 0x00ccff, 0x8800ff, 0x00ff88];

    const idx = (index - 1) % 4;
    const skinColor = skinTones[idx];
    const jacket = jacketPalette[idx];
    const shirtColor = shirtPalette[idx];
    const tieColor = tiePalette[idx];
    const hairColor = hairPalette[idx];
    const neonColor = accentNeon[idx];

    // === MATERIALS ===
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75, metalness: 0.0 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: jacket.main, roughness: 0.7, metalness: 0.05 });
    const lapelMat = new THREE.MeshStandardMaterial({ color: jacket.lapel, roughness: 0.6, metalness: 0.08 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
    const tieMat = new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.5, metalness: 0.15 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x15101a, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0a0808, roughness: 0.4, metalness: 0.2 });
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.9, roughness: 0.05 });
    const lenseMat = new THREE.MeshStandardMaterial({
      color: 0x1a0030, metalness: 0.95, roughness: 0.02,
      emissive: neonColor, emissiveIntensity: 0.08,
    });

    // === BODY PARTS ===

    // Shoulders (rounded)
    [-1, 1].forEach(side => {
      const shoulderGeo = new THREE.SphereGeometry(0.065, 8, 8);
      const shoulder = new THREE.Mesh(shoulderGeo, jacketMat);
      shoulder.position.set(side * 0.22, 0.73, 0);
      shoulder.castShadow = true;
      group.add(shoulder);
    });


    // Temple arms
    [-1, 1].forEach(side => {
      const templeGeo = new THREE.BoxGeometry(0.005, 0.008, 0.1);
      const temple = new THREE.Mesh(templeGeo, glassesMat);
      temple.position.set(side * 0.11, 0.01, 0.06);
      headGroup.add(temple);
    });

    // Hair - varies by index
    const hairStyles = [
      () => { // Slicked back
        const g = new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const m = new THREE.Mesh(g, hairMat);
        m.position.set(0, 0.025, -0.015);
        return m;
      },
      () => { // Short cropped
        const g = new THREE.SphereGeometry(0.118, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const m = new THREE.Mesh(g, hairMat);
        m.position.set(0, 0.02, -0.005);
        return m;
      },
      () => { // Pompadour - taller on top
        const g1 = new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const m1 = new THREE.Mesh(g1, hairMat);
        m1.position.set(0, 0.025, -0.01);
        const g2 = new THREE.BoxGeometry(0.14, 0.06, 0.08);
        const m2 = new THREE.Mesh(g2, hairMat);
        m2.position.set(0, 0.1, 0.03);
        const hg = new THREE.Group();
        hg.add(m1); hg.add(m2);
        return hg;
      },
      () => { // Buzzcut (very close)
        const g = new THREE.SphereGeometry(0.117, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.48);
        const m = new THREE.Mesh(g, hairMat);
        m.position.set(0, 0.018, -0.005);
        return m;
      },
    ];
    const hairMesh = hairStyles[idx]();
    headGroup.add(hairMesh);

    group.add(headGroup);

    // === ARMS ===
    const upperArmGeo = new THREE.CapsuleGeometry(0.04, 0.22, 4, 8);
    const forearmGeo = new THREE.CapsuleGeometry(0.035, 0.2, 4, 8);

    // Left arm - angled forward so forearms rest on table
    const leftUpperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    leftUpperArm.position.set(-0.24, 0.58, 0.06);
    leftUpperArm.rotation.z = 0.3;
    leftUpperArm.rotation.x = -0.7;
    leftUpperArm.castShadow = true;
    group.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(forearmGeo, jacketMat);
    leftForearm.position.set(-0.18, 0.38, 0.2);
    leftForearm.rotation.z = 0.05;
    leftForearm.rotation.x = -1.35;
    leftForearm.castShadow = true;
    group.add(leftForearm);

    // Right arm - angled forward so forearms rest on table
    const rightUpperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    rightUpperArm.position.set(0.24, 0.58, 0.06);
    rightUpperArm.rotation.z = -0.3;
    rightUpperArm.rotation.x = -0.7;
    rightUpperArm.castShadow = true;
    group.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(forearmGeo, jacketMat);
    rightForearm.position.set(0.18, 0.38, 0.2);
    rightForearm.rotation.z = -0.05;
    rightForearm.rotation.x = -1.35;
    rightForearm.castShadow = true;
    group.add(rightForearm);

    // === HANDS (with finger detail) ===
    const handParts = (side) => {
      const hg = new THREE.Group();
      const palmGeo = new THREE.BoxGeometry(0.045, 0.02, 0.04);
      const palm = new THREE.Mesh(palmGeo, skinMat);
      hg.add(palm);

      // 4 fingers
      for (let f = 0; f < 4; f++) {
        const fingerGeo = new THREE.CapsuleGeometry(0.006, 0.025, 3, 4);
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        finger.position.set(-0.015 + f * 0.01, 0, -0.03);
        finger.rotation.x = -0.3;
        hg.add(finger);
      }

      // Thumb
      const thumbGeo = new THREE.CapsuleGeometry(0.007, 0.02, 3, 4);
      const thumb = new THREE.Mesh(thumbGeo, skinMat);
      thumb.position.set(side * 0.025, 0, -0.01);
      thumb.rotation.z = side * 0.5;
      hg.add(thumb);

      return hg;
    };

    const leftHand = handParts(-1);
    leftHand.position.set(-0.12, 0.32, 0.28);
    leftHand.rotation.x = -0.3;
    group.add(leftHand);

    const rightHand = handParts(1);
    rightHand.position.set(0.12, 0.32, 0.28);
    rightHand.rotation.x = -0.3;
    group.add(rightHand);

    // Wristwatch on left wrist
    const watchGeo = new THREE.BoxGeometry(0.025, 0.01, 0.03);
    const watchMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.8, roughness: 0.2 });
    const watch = new THREE.Mesh(watchGeo, watchMat);
    watch.position.set(-0.14, 0.34, 0.22);
    group.add(watch);

    // Watch face
    const watchFaceGeo = new THREE.BoxGeometry(0.015, 0.012, 0.015);
    const watchFaceMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, metalness: 0.3, roughness: 0.2 });
    const watchFace = new THREE.Mesh(watchFaceGeo, watchFaceMat);
    watchFace.position.set(-0.14, 0.345, 0.22);
    group.add(watchFace);

    // Neon lapel pin
    const pinGeo = new THREE.SphereGeometry(0.01, 6, 6);
    const pinMat = new THREE.MeshBasicMaterial({ color: neonColor });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(-0.12, 0.7, 0.11);
    group.add(pin);

    // Pocket square
    const pocketGeo = new THREE.BoxGeometry(0.03, 0.025, 0.008);
    const pocketMat = new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.6 });
    const pocket = new THREE.Mesh(pocketGeo, pocketMat);
    pocket.position.set(0.1, 0.68, 0.105);
    group.add(pocket);

    // === LOWER BODY (mostly hidden by table, but visible from sides) ===
    // Legs (seated)
    [-1, 1].forEach(side => {
      const thighGeo = new THREE.CapsuleGeometry(0.055, 0.25, 4, 8);
      const thigh = new THREE.Mesh(thighGeo, pantsMat);
      thigh.position.set(side * 0.1, 0.12, 0.1);
      thigh.rotation.x = -1.4;
      group.add(thigh);

      // Lower leg
      const shinGeo = new THREE.CapsuleGeometry(0.045, 0.25, 4, 8);
      const shin = new THREE.Mesh(shinGeo, pantsMat);
      shin.position.set(side * 0.1, -0.1, 0.25);
      shin.rotation.x = -0.2;
      group.add(shin);

      // Shoe
      const shoeGeo = new THREE.BoxGeometry(0.065, 0.03, 0.1);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(side * 0.1, -0.28, 0.35);
      group.add(shoe);
    });

    // === POSITION AT TABLE ===
    // Scale model to fit table proportions (table ~4 units wide)
    const modelScale = 0.55;
    group.scale.setScalar(modelScale);

    // Push seat to table edge: table rx=2, ry=1.2; seats at rx=1.6, ry=0.95
    // Factor 1.3 puts them right at the rail edge
    const seatPos = pos.seat;
    const pushFactor = 1.3;
    const px = seatPos.x * pushFactor;
    const pz = seatPos.z * pushFactor;

    // At 0.55 scale: belt (local 0.32) = 0.176 world units above group origin
    // Table surface at Y=0.95 → group.y = 0.95 - 0.176 = 0.774
    group.position.set(px, 0.774, pz);
    // Only rotate around Y axis to face table center
    group.rotation.y = Math.atan2(-px, -pz);

    // === NAME TAG ===
    const nameSprite = this.createNameTag(name, neonColor);
    // Position above head in local space
    nameSprite.position.set(0, 1.2, 0);
    // Counter-scale preserving 4:1 aspect ratio (0.5 x 0.125 base)
    const tagFactor = 0.6 / modelScale;
    nameSprite.scale.set(0.5 * tagFactor, 0.125 * tagFactor, 1);
    group.add(nameSprite);

    return {
      group,
      headGroup,
      torso,
      leftHand,
      rightHand,
      leftForearm,
      rightForearm,
      leftUpperArm,
      rightUpperArm,
      mouth,
      index,
      name,
      time: Math.random() * 10,
      breathPhase: Math.random() * Math.PI * 2,
      blinkTimer: 2 + Math.random() * 3,
      fidgetTimer: 3 + Math.random() * 5,
      reactionAnim: null,
      reactionTime: 0,
    };
  }

createNameTag(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);

  // Fallback para roundRect
  const r = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.moveTo(20 + r, 10);
  ctx.lineTo(236 - r, 10);
  ctx.quadraticCurveTo(236, 10, 236, 10 + r);
  ctx.lineTo(236, 54 - r);
  ctx.quadraticCurveTo(236, 54, 236 - r, 54);
  ctx.lineTo(20 + r, 54);
  ctx.quadraticCurveTo(20, 54, 20, 54 - r);
  ctx.lineTo(20, 10 + r);
  ctx.quadraticCurveTo(20, 10, 20 + r, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.userData._texture = tex; // para liberar luego

  return sprite;
}


  // Base positions for head/hands (constants to prevent drift)
  static HEAD_BASE_Y = 0.92;
  static HAND_BASE_Y = 0.32;

  update(delta) {
    this.updateRagdolls(delta);
    this.models.forEach(model => {
      if (model.isDead) return;
      model.time += delta;
      const t = model.time;
      const HY = BotModels.HEAD_BASE_Y;

      // === BREATHING (torso subtle scale) ===
      const breath = Math.sin(t * 1.2 + model.breathPhase) * 0.002;
      model.torso.scale.y = 1 + breath;
      model.torso.scale.z = 1 + breath * 0.5;

      // === HEAD IDLE MOVEMENT (small values to prevent detach) ===
      if (!model.reactionAnim) {
        const headBob = Math.sin(t * 0.7) * 0.002;
        const headTilt = Math.sin(t * 0.4 + 1.5) * 0.015;
        const headNod = Math.sin(t * 0.25) * 0.01;
        const headTurn = Math.sin(t * 0.15 + 2) * 0.025;

        model.headGroup.position.y = HY + headBob;
        model.headGroup.rotation.z = headTilt;
        model.headGroup.rotation.x = headNod;
        model.headGroup.rotation.y = headTurn;
      }

      // === BLINKING ===
      model.blinkTimer -= delta;
      if (model.blinkTimer <= 0) {
        model.blinkTimer = 2 + Math.random() * 4;
        const lenses = model.headGroup.children.filter(c =>
          c.material && c.material.emissiveIntensity !== undefined && c.material.emissiveIntensity > 0
        );
        lenses.forEach(l => {
          l.scale.y = 0.1;
          setTimeout(() => { if (l.parent) l.scale.y = 1; }, 120);
        });
      }

      // === HAND FIDGET ===
      model.fidgetTimer -= delta;
      if (model.fidgetTimer <= 0) {
        model.fidgetTimer = 4 + Math.random() * 6;
      }

      // Subtle hand sway (on table)
      const handSway = Math.sin(t * 0.6 + model.breathPhase) * 0.002;
      model.leftHand.position.y = BotModels.HAND_BASE_Y + handSway;
      model.rightHand.position.y = BotModels.HAND_BASE_Y - handSway;
      // Subtle finger tap
      const tapL = Math.sin(t * 1.5 + model.breathPhase) * 0.003;
      model.leftHand.position.z = 0.28 + tapL;
      model.rightHand.position.z = 0.28 - tapL;

      // === REACTION ANIMATIONS (clamped movements) ===
      if (model.reactionAnim) {
        model.reactionTime += delta;
        const rt = model.reactionTime;
        const anim = model.reactionAnim;

        if (anim === 'fold') {
          const p = Math.min(rt / 0.4, 1);
          model.headGroup.rotation.x = 0.12 * p;
          model.headGroup.position.y = HY - 0.01 * p;
          if (rt > 1.2) this.clearReaction(model);
        } else if (anim === 'raise') {
          const p = Math.min(rt / 0.3, 1);
          model.headGroup.rotation.x = -0.06 * p;
          model.headGroup.position.y = HY + 0.005 * p;
          if (rt > 0.8) this.clearReaction(model);
        } else if (anim === 'allin') {
          const p = Math.min(rt / 0.25, 1);
          model.headGroup.rotation.x = -0.08 * p;
          model.headGroup.position.y = HY + 0.008 * p;
          model.leftUpperArm.rotation.z = (0.35 + 0.1 * p);
          model.rightUpperArm.rotation.z = -(0.35 + 0.1 * p);
          if (rt > 1.5) this.clearReaction(model);
        } else if (anim === 'win') {
          const p = Math.min(rt / 0.3, 1);
          model.headGroup.rotation.x = -0.08 * p;
          model.headGroup.position.y = HY + 0.01 * p;
          if (rt > 1.5) this.clearReaction(model);
        }
      }
    });

    // Update ability effects
    this.updateAbilityEffects(delta);
  }

  clearReaction(model) {
    model.reactionAnim = null;
    model.reactionTime = 0;
    model.torso.position.z = 0;
    model.headGroup.position.y = BotModels.HEAD_BASE_Y;
    model.headGroup.rotation.set(0, 0, 0);
    model.leftUpperArm.rotation.z = 0.3;
    model.rightUpperArm.rotation.z = -0.3;
  }

  triggerReaction(botIndex, type) {
    const model = this.models.find(m => m.index === botIndex);
    if (!model) return;
    model.reactionAnim = type;
    model.reactionTime = 0;
  }

  // === ABILITY EFFECTS ===
  // Ability color/style map
  static ABILITY_STYLES = {
    peek: { color: 0x00ccff, symbol: '👁', pattern: 'spiral' },
    shield: { color: 0xbb88ff, symbol: '🛡', pattern: 'ring' },
    intimidate: { color: 0xff3c3c, symbol: '👻', pattern: 'burst' },
    swap: { color: 0x00ff88, symbol: '🔄', pattern: 'swirl' },
    doubledown: { color: 0xffd700, symbol: '⚔', pattern: 'burst' },
    xray: { color: 0x00ffcc, symbol: '🔍', pattern: 'spiral' },
    freeze: { color: 0x88ddff, symbol: '❄', pattern: 'ring' },
    luck: { color: 0x44ff44, symbol: '🍀', pattern: 'swirl' },
    steal: { color: 0xff8800, symbol: '💰', pattern: 'burst' },
    mirror: { color: 0xccccff, symbol: '🪞', pattern: 'ring' },
    smoke: { color: 0x888888, symbol: '💨', pattern: 'cloud' },
    rage: { color: 0xff2200, symbol: '🔥', pattern: 'burst' },
    calm: { color: 0x66bbff, symbol: '🧘', pattern: 'ring' },
    bluff: { color: 0xff66cc, symbol: '🎭', pattern: 'swirl' },
    reload: { color: 0x44ff88, symbol: '🔋', pattern: 'spiral' },
    oracle: { color: 0xaa44ff, symbol: '🔮', pattern: 'spiral' },
    sabotage: { color: 0xff4400, symbol: '💣', pattern: 'burst' },
    revival: { color: 0x44ffff, symbol: '💎', pattern: 'ring' },
    tax: { color: 0xccaa44, symbol: '📜', pattern: 'swirl' },
    insight: { color: 0xff88ff, symbol: '🧠', pattern: 'spiral' },
    wildcard: { color: 0xffffff, symbol: '🃏', pattern: 'burst' },
    phantom: { color: 0x8844aa, symbol: '👤', pattern: 'cloud' },
    jackpot: { color: 0xffdd00, symbol: '🎰', pattern: 'burst' },
    aura: { color: 0xffcc88, symbol: '✨', pattern: 'ring' },
    counter: { color: 0x4488ff, symbol: '⚡', pattern: 'burst' },
  };

  spawnAbilityEffect(abilityId, worldPos) {
    const style = BotModels.ABILITY_STYLES[abilityId] || { color: 0xff6ec7, pattern: 'burst' };
    const particles = [];
    const group = new THREE.Group();
    group.position.copy(worldPos);
    group.position.y += 0.15;

    const count = style.pattern === 'burst' ? 20 : style.pattern === 'ring' ? 16 : 12;

    for (let i = 0; i < count; i++) {
      const size = 0.01 + Math.random() * 0.02;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);

      let vx = 0, vy = 0, vz = 0;
      if (style.pattern === 'burst') {
        vx = (Math.random() - 0.5) * 0.8;
        vy = Math.random() * 0.5 + 0.2;
        vz = (Math.random() - 0.5) * 0.8;
      } else if (style.pattern === 'ring') {
        const a = (i / count) * Math.PI * 2;
        vx = Math.cos(a) * 0.3;
        vy = 0.1 + Math.random() * 0.1;
        vz = Math.sin(a) * 0.3;
      } else if (style.pattern === 'spiral') {
        const a = (i / count) * Math.PI * 4;
        const r = 0.1 + (i / count) * 0.2;
        vx = Math.cos(a) * r;
        vy = 0.3 + (i / count) * 0.3;
        vz = Math.sin(a) * r;
      } else if (style.pattern === 'swirl') {
        const a = (i / count) * Math.PI * 3;
        vx = Math.cos(a) * 0.25;
        vy = 0.2;
        vz = Math.sin(a) * 0.25;
      } else { // cloud
        vx = (Math.random() - 0.5) * 0.3;
        vy = Math.random() * 0.15;
        vz = (Math.random() - 0.5) * 0.3;
      }

      mesh.position.set(0, 0, 0);
      group.add(mesh);
      particles.push({ mesh, vx, vy, vz, life: 1.0 + Math.random() * 0.5 });
    }

    this.scene.add(group);
    this.abilityEffects.push({ group, particles, age: 0, maxAge: 1.5 });
  }

  updateAbilityEffects(delta) {
    this.abilityEffects = this.abilityEffects.filter(effect => {
      effect.age += delta;
      if (effect.age > effect.maxAge) {
        effect.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
        this.scene.remove(effect.group);
        return false;
      }
      const progress = effect.age / effect.maxAge;
      effect.particles.forEach(p => {
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.vy -= delta * 0.3; // gravity
        p.mesh.material.opacity = Math.max(0, 1 - progress);
        p.mesh.scale.setScalar(1 - progress * 0.5);
      });
      return true;
    });
  }

  // Trigger ability visual at a bot's hand position
  triggerAbilityAnim(botIndex, abilityId) {
    const model = this.models.find(m => m.index === botIndex);
    if (model) {
      const worldPos = new THREE.Vector3();
      model.rightHand.getWorldPosition(worldPos);
      this.spawnAbilityEffect(abilityId, worldPos);
      // Raise hand gesture
      const origZ = model.rightUpperArm.rotation.z;
      model.rightUpperArm.rotation.z = origZ - 0.3;
      model.rightForearm.rotation.x = -1.2;
      setTimeout(() => {
        if (model.rightUpperArm) {
          model.rightUpperArm.rotation.z = origZ;
          model.rightForearm.rotation.x = -0.8;
        }
      }, 800);
    }
  }

  // Trigger ability at player's position (for local player visual)
  triggerPlayerAbilityAnim(abilityId, playerPos) {
    const pos = playerPos || new THREE.Vector3(0, 1.0, 1.0);
    this.spawnAbilityEffect(abilityId, pos);
  }

  // === RAGDOLL DEATH ===
  triggerRagdoll(botIndex) {
    const model = this.models.find(m => m.index === botIndex);
    if (!model) return;

    model.isDead = true;
    const group = model.group;
    const worldPos = new THREE.Vector3();
    group.getWorldPosition(worldPos);

    // Detach each child into its own ragdoll piece
    const pieces = [];
    const children = [...group.children];
    children.forEach(child => {
      if (!child.isMesh && !child.isGroup) return;
      // Get world position/rotation before detaching
      const wPos = new THREE.Vector3();
      child.getWorldPosition(wPos);
      const wQuat = new THREE.Quaternion();
      child.getWorldQuaternion(wQuat);
      const wScale = new THREE.Vector3();
      child.getWorldScale(wScale);

      group.remove(child);
      child.position.copy(wPos);
      child.quaternion.copy(wQuat);
      child.scale.copy(wScale);
      this.scene.add(child);

      // Random explosion velocity away from table center + upward
      const dir = wPos.clone().sub(new THREE.Vector3(0, wPos.y, 0)).normalize();
      pieces.push({
        mesh: child,
        velocity: new THREE.Vector3(
          dir.x * (1.5 + Math.random() * 2),
          2 + Math.random() * 3,
          dir.z * (1.5 + Math.random() * 2)
        ),
        angularVel: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        age: 0,
      });
    });

    // Remove original group
    this.scene.remove(group);

    // Store ragdoll for update
    if (!this.ragdolls) this.ragdolls = [];
    this.ragdolls.push({ pieces, age: 0, maxAge: 3.5 });

    // Also knock over the chair
    const chairIdx = this.chairs.findIndex((_, ci) => ci === botIndex);
    if (chairIdx >= 0 && this.chairs[chairIdx]) {
      const chair = this.chairs[chairIdx];
      if (!this.ragdolls) this.ragdolls = [];
      const cPieces = [];
      const cPos = chair.position.clone();
      cPieces.push({
        mesh: chair,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          1 + Math.random(),
          (Math.random() - 0.5) * 2
        ),
        angularVel: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 5
        ),
        age: 0,
      });
      this.ragdolls.push({ pieces: cPieces, age: 0, maxAge: 3.5 });
    }

    // Spawn blood particles
    for (let i = 0; i < 25; i++) {
      const geo = new THREE.SphereGeometry(0.008 + Math.random() * 0.015, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xcc0000, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(worldPos);
      mesh.position.y += 0.3;
      this.scene.add(mesh);
      this.abilityEffects.push({
        group: mesh, particles: [{
          mesh, vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          vz: (Math.random() - 0.5) * 2,
        }], age: 0, maxAge: 2,
      });
    }
  }

updateRagdolls(delta) {
  if (!this.ragdolls) return;

  this.ragdolls = this.ragdolls.filter(ragdoll => {
    ragdoll.age += delta;

    if (ragdoll.age > ragdoll.maxAge) {
      ragdoll.pieces.forEach(p => {
        p.mesh.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (c.material.map) c.material.map.dispose();
            c.material.dispose();
          }
        });
        this.scene.remove(p.mesh);
      });
      return false;
    }

    ragdoll.pieces.forEach(p => {
      p.age += delta;

      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 9.8 * delta;

      if (p.mesh.position.y < 0.02) {
        p.mesh.position.y = 0.02;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
        p.angularVel.multiplyScalar(0.5);
      }

      p.mesh.rotation.x += p.angularVel.x * delta;
      p.mesh.rotation.y += p.angularVel.y * delta;
      p.mesh.rotation.z += p.angularVel.z * delta;

      const fadeStart = ragdoll.maxAge - 1;
      if (ragdoll.age > fadeStart) {
        const fade = 1 - (ragdoll.age - fadeStart);
        p.mesh.traverse(c => {
          if (c.material && c.material.opacity !== undefined) {
            c.material.transparent = true;
            c.material.opacity = Math.max(0, fade);
          }
        });
      }
    });

    return true;
  });
}


dispose() {
  this.models.forEach(m => {
    m.group.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (c.material.map) c.material.map.dispose();
        c.material.dispose();
      }
      if (c.userData && c.userData._texture) {
        c.userData._texture.dispose();
      }
    });
    this.scene.remove(m.group);
  });
    this.models = [];
    this.chairs.forEach(chair => {
      chair.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      this.scene.remove(chair);
    });
    this.chairs = [];
    this.abilityEffects.forEach(e => {
      e.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      this.scene.remove(e.group);
    });
    this.abilityEffects = [];
  }
}
