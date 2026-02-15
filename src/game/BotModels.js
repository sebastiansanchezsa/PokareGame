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
  }

  createBots(positions, botNames) {
    this.dispose();
    for (let i = 1; i < positions.length; i++) {
      const pos = positions[i];
      const name = botNames[i - 1] || 'BOT';
      const model = this.createCharacter(pos, i, name);
      this.models.push(model);
      this.scene.add(model.group);
    }
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

    // Lower torso / waist
    const waistGeo = new THREE.BoxGeometry(0.32, 0.15, 0.18);
    const waist = new THREE.Mesh(waistGeo, jacketMat);
    waist.position.y = 0.35;
    waist.castShadow = true;
    group.add(waist);

    // Belt
    const beltGeo = new THREE.BoxGeometry(0.33, 0.025, 0.19);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.4, metalness: 0.3 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.32;
    group.add(belt);

    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.035, 0.025, 0.015);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.8, roughness: 0.2 });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.32, 0.1);
    group.add(buckle);

    // Upper torso / jacket
    const torsoGeo = new THREE.BoxGeometry(0.38, 0.35, 0.2);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 0.58;
    torso.castShadow = true;
    group.add(torso);

    // Jacket lapels (V-shape)
    const lapelLGeo = new THREE.BoxGeometry(0.06, 0.2, 0.015);
    const lapelL = new THREE.Mesh(lapelLGeo, lapelMat);
    lapelL.position.set(-0.1, 0.62, 0.105);
    lapelL.rotation.z = 0.15;
    group.add(lapelL);

    const lapelR = new THREE.Mesh(lapelLGeo, lapelMat);
    lapelR.position.set(0.1, 0.62, 0.105);
    lapelR.rotation.z = -0.15;
    group.add(lapelR);

    // Shirt visible in V
    const shirtGeo = new THREE.BoxGeometry(0.12, 0.18, 0.01);
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.position.set(0, 0.64, 0.1);
    group.add(shirt);

    // Tie
    const tieGeo = new THREE.BoxGeometry(0.04, 0.2, 0.012);
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 0.58, 0.108);
    group.add(tie);

    // Tie knot
    const knotGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const knot = new THREE.Mesh(knotGeo, tieMat);
    knot.position.set(0, 0.72, 0.11);
    group.add(knot);

    // Shoulders (rounded)
    [-1, 1].forEach(side => {
      const shoulderGeo = new THREE.SphereGeometry(0.065, 8, 8);
      const shoulder = new THREE.Mesh(shoulderGeo, jacketMat);
      shoulder.position.set(side * 0.22, 0.73, 0);
      shoulder.castShadow = true;
      group.add(shoulder);
    });

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.08, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.79;
    group.add(neck);

    // Shirt collar
    const collarGeo = new THREE.BoxGeometry(0.18, 0.04, 0.14);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.set(0, 0.76, 0.02);
    group.add(collar);

    // === HEAD GROUP (animated separately) ===
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.92;

    // Head (slightly oval)
    const headGeo = new THREE.SphereGeometry(0.115, 14, 12);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(1, 1.05, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.015, 0.03, 4);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.01, 0.11);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);

    // Ears
    [-1, 1].forEach(side => {
      const earGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.115, 0, 0);
      ear.scale.set(0.6, 1, 0.8);
      headGroup.add(ear);
    });

    // Mouth line
    const mouthGeo = new THREE.BoxGeometry(0.04, 0.005, 0.005);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8a4030, roughness: 0.9 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.045, 0.1);
    headGroup.add(mouth);

    // Eyebrows
    [-1, 1].forEach(side => {
      const browGeo = new THREE.BoxGeometry(0.04, 0.008, 0.008);
      const brow = new THREE.Mesh(browGeo, hairMat);
      brow.position.set(side * 0.04, 0.035, 0.1);
      brow.rotation.z = side * -0.1;
      headGroup.add(brow);
    });

    // Sunglasses bridge
    const bridgeGeo = new THREE.BoxGeometry(0.22, 0.012, 0.02);
    const bridge = new THREE.Mesh(bridgeGeo, glassesMat);
    bridge.position.set(0, 0.01, 0.108);
    headGroup.add(bridge);

    // Sunglasses lenses
    [-1, 1].forEach(side => {
      const lensGeo = new THREE.BoxGeometry(0.072, 0.04, 0.015);
      const lens = new THREE.Mesh(lensGeo, lenseMat);
      lens.position.set(side * 0.048, 0.005, 0.112);
      headGroup.add(lens);
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

    // Left arm
    const leftUpperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    leftUpperArm.position.set(-0.26, 0.55, 0.02);
    leftUpperArm.rotation.z = 0.35;
    leftUpperArm.rotation.x = -0.3;
    leftUpperArm.castShadow = true;
    group.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(forearmGeo, jacketMat);
    leftForearm.position.set(-0.3, 0.3, 0.05);
    leftForearm.rotation.z = 0.1;
    leftForearm.rotation.x = -0.8;
    leftForearm.castShadow = true;
    group.add(leftForearm);

    // Right arm
    const rightUpperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    rightUpperArm.position.set(0.26, 0.55, 0.02);
    rightUpperArm.rotation.z = -0.35;
    rightUpperArm.rotation.x = -0.3;
    rightUpperArm.castShadow = true;
    group.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(forearmGeo, jacketMat);
    rightForearm.position.set(0.3, 0.3, 0.05);
    rightForearm.rotation.z = -0.1;
    rightForearm.rotation.x = -0.8;
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
    leftHand.position.set(-0.22, 0.14, -0.1);
    group.add(leftHand);

    const rightHand = handParts(1);
    rightHand.position.set(0.22, 0.14, -0.1);
    group.add(rightHand);

    // Wristwatch on left hand
    const watchGeo = new THREE.BoxGeometry(0.025, 0.01, 0.03);
    const watchMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.8, roughness: 0.2 });
    const watch = new THREE.Mesh(watchGeo, watchMat);
    watch.position.set(-0.22, 0.18, -0.05);
    group.add(watch);

    // Watch face
    const watchFaceGeo = new THREE.BoxGeometry(0.015, 0.012, 0.015);
    const watchFaceMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, metalness: 0.3, roughness: 0.2 });
    const watchFace = new THREE.Mesh(watchFaceGeo, watchFaceMat);
    watchFace.position.set(-0.22, 0.185, -0.05);
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
    // Place model so belt (local Y ~0.32) aligns with table edge (~0.88)
    // group.y = 0.88 - 0.32 = 0.56
    const seatPos = pos.seat;
    group.position.set(seatPos.x, 0.56, seatPos.z);
    // Only rotate around Y axis to face table center — DO NOT use lookAt
    group.rotation.y = Math.atan2(-seatPos.x, -seatPos.z);

    // === NAME TAG ===
    const nameSprite = this.createNameTag(name, neonColor);
    nameSprite.position.set(0, 1.15, 0);
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
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(20, 10, 216, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.5, 0.125, 1);
    return sprite;
  }

  update(delta) {
    this.models.forEach(model => {
      model.time += delta;
      const t = model.time;

      // === BREATHING (torso subtle scale) ===
      const breath = Math.sin(t * 1.2 + model.breathPhase) * 0.003;
      model.torso.scale.y = 1 + breath;
      model.torso.scale.z = 1 + breath * 0.5;

      // === HEAD IDLE MOVEMENT ===
      if (!model.reactionAnim) {
        const headBob = Math.sin(t * 0.7) * 0.004;
        const headTilt = Math.sin(t * 0.4 + 1.5) * 0.025;
        const headNod = Math.sin(t * 0.25) * 0.015;
        const headTurn = Math.sin(t * 0.15 + 2) * 0.04;

        model.headGroup.position.y = 0.92 + headBob;
        model.headGroup.rotation.z = headTilt;
        model.headGroup.rotation.x = headNod;
        model.headGroup.rotation.y = headTurn;
      }

      // === BLINKING (close mouth slightly) ===
      model.blinkTimer -= delta;
      if (model.blinkTimer <= 0) {
        model.blinkTimer = 2 + Math.random() * 4;
        // Quick blink by scaling lenses
        const lenses = model.headGroup.children.filter(c =>
          c.material && c.material.emissiveIntensity !== undefined && c.material.emissiveIntensity > 0
        );
        lenses.forEach(l => {
          l.scale.y = 0.1;
          setTimeout(() => { l.scale.y = 1; }, 120);
        });
      }

      // === HAND FIDGET ===
      model.fidgetTimer -= delta;
      if (model.fidgetTimer <= 0) {
        model.fidgetTimer = 4 + Math.random() * 6;
        const hand = Math.random() > 0.5 ? model.rightHand : model.leftHand;
        const origY = hand.position.y;
        hand.position.y += 0.02;
        setTimeout(() => { hand.position.y = origY; }, 400);
      }

      // Subtle hand sway
      const handSway = Math.sin(t * 0.6 + model.breathPhase) * 0.003;
      model.leftHand.position.y = 0.14 + handSway;
      model.rightHand.position.y = 0.14 - handSway;

      // === REACTION ANIMATIONS ===
      if (model.reactionAnim) {
        model.reactionTime += delta;
        const rt = model.reactionTime;
        const anim = model.reactionAnim;

        if (anim === 'fold') {
          // Slump: head down, shoulders drop
          const progress = Math.min(rt / 0.4, 1);
          model.headGroup.rotation.x = 0.25 * progress;
          model.headGroup.position.y = 0.92 - 0.02 * progress;
          model.torso.position.z = -0.01 * progress;
          if (rt > 1.2) this.clearReaction(model);
        } else if (anim === 'raise') {
          // Lean forward confidently
          const progress = Math.min(rt / 0.3, 1);
          model.torso.position.z = 0.03 * progress;
          model.headGroup.rotation.x = -0.08 * progress;
          model.headGroup.position.y = 0.92 + 0.01 * progress;
          if (rt > 0.8) this.clearReaction(model);
        } else if (anim === 'allin') {
          // Dramatic lean forward, arms spread
          const progress = Math.min(rt / 0.25, 1);
          model.torso.position.z = 0.05 * progress;
          model.headGroup.rotation.x = -0.12 * progress;
          model.headGroup.position.y = 0.92 + 0.015 * progress;
          model.leftUpperArm.rotation.z = (0.35 + 0.15 * progress);
          model.rightUpperArm.rotation.z = -(0.35 + 0.15 * progress);
          if (rt > 1.5) this.clearReaction(model);
        } else if (anim === 'win') {
          // Head up, slight lean back
          const progress = Math.min(rt / 0.3, 1);
          model.headGroup.rotation.x = -0.15 * progress;
          model.headGroup.position.y = 0.92 + 0.02 * progress;
          if (rt > 1.5) this.clearReaction(model);
        }
      }
    });
  }

  clearReaction(model) {
    model.reactionAnim = null;
    model.reactionTime = 0;
    // Smoothly reset positions
    model.torso.position.z = 0;
    model.headGroup.position.y = 0.92;
    model.headGroup.rotation.x = 0;
    model.leftUpperArm.rotation.z = 0.35;
    model.rightUpperArm.rotation.z = -0.35;
  }

  triggerReaction(botIndex, type) {
    const model = this.models.find(m => m.index === botIndex);
    if (!model) return;
    model.reactionAnim = type;
    model.reactionTime = 0;
  }

  dispose() {
    this.models.forEach(model => {
      model.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
      this.scene.remove(model.group);
    });
    this.models = [];
  }
}
