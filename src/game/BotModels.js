import * as THREE from 'three';

// Simple stylized bot player models sitting at the table
export class BotModels {
  constructor(scene) {
    this.scene = scene;
    this.models = [];
  }

  // Create bot models at given positions
  createBots(positions, botNames) {
    // Remove old models
    this.dispose();

    // Skip index 0 (human player)
    for (let i = 1; i < positions.length; i++) {
      const pos = positions[i];
      const name = botNames[i - 1] || 'BOT';
      const model = this.createBotModel(pos, i);
      this.models.push(model);
      this.scene.add(model.group);
    }
  }

  createBotModel(pos, index) {
    const group = new THREE.Group();

    // Colors vary per bot
    const jacketColors = [0x1a0a30, 0x2a0515, 0x0a1a2a, 0x1a1a0a];
    const shirtColors = [0x15082a, 0x200a15, 0x081520, 0x151508];
    const jacketColor = jacketColors[(index - 1) % jacketColors.length];
    const shirtColor = shirtColors[(index - 1) % shirtColors.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc49464, roughness: 0.7 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.8, metalness: 0.1 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.35, 0.45, 0.2);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 0.55;
    torso.castShadow = true;
    group.add(torso);

    // Shirt collar / V-neck
    const collarGeo = new THREE.BoxGeometry(0.15, 0.08, 0.21);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.set(0, 0.75, 0);
    group.add(collar);

    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 0.92;
    head.castShadow = true;
    group.add(head);

    // Sunglasses (every bot wears shades - it's the 80s!)
    const glassesBarGeo = new THREE.BoxGeometry(0.2, 0.015, 0.03);
    const glassesMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a1a,
      metalness: 0.8,
      roughness: 0.1,
    });
    const glassesBar = new THREE.Mesh(glassesBarGeo, glassesMat);
    glassesBar.position.set(0, 0.93, 0.1);
    group.add(glassesBar);

    // Lens left
    const lensGeo = new THREE.BoxGeometry(0.07, 0.04, 0.02);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x220044,
      metalness: 0.9,
      roughness: 0.05,
      emissive: 0x110022,
      emissiveIntensity: 0.2,
    });
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(-0.055, 0.925, 0.11);
    group.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.set(0.055, 0.925, 0.11);
    group.add(lensR);

    // Hair (slicked back 80s style)
    const hairGeo = new THREE.SphereGeometry(0.125, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairColors = [0x1a0a0a, 0x3a2a1a, 0x1a1a1a, 0x2a1a0a];
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColors[(index - 1) % hairColors.length],
      roughness: 0.9,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.95, -0.01);
    group.add(hair);

    // Arms on table
    const armGeo = new THREE.CapsuleGeometry(0.04, 0.3, 4, 8);

    // Left arm
    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.position.set(-0.22, 0.35, 0.05);
    leftArm.rotation.z = 0.3;
    leftArm.rotation.x = -0.4;
    leftArm.castShadow = true;
    group.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.position.set(0.22, 0.35, 0.05);
    rightArm.rotation.z = -0.3;
    rightArm.rotation.x = -0.4;
    rightArm.castShadow = true;
    group.add(rightArm);

    // Hands on table
    const handGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.28, 0.15, -0.08);
    group.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.28, 0.15, -0.08);
    group.add(rightHand);

    // Neon accent on jacket (lapel pin or stripe)
    const accentColors = [0xff6ec7, 0x00ccff, 0x8800ff, 0x00ff88];
    const accentGeo = new THREE.BoxGeometry(0.02, 0.08, 0.01);
    const accentMat = new THREE.MeshBasicMaterial({
      color: accentColors[(index - 1) % accentColors.length],
    });
    const accent = new THREE.Mesh(accentGeo, accentMat);
    accent.position.set(-0.12, 0.7, 0.11);
    group.add(accent);

    // Position at the table
    const seatPos = pos.seat;
    const angle = pos.angle;

    group.position.set(seatPos.x, seatPos.y - 0.96, seatPos.z);
    // Face toward center of table
    group.rotation.y = Math.atan2(-seatPos.x, -seatPos.z);

    return {
      group,
      headMesh: head,
      index,
      baseHeadY: 0.92,
      time: Math.random() * 10, // Offset for idle animation
    };
  }

  update(delta) {
    this.models.forEach(model => {
      model.time += delta;

      // Subtle idle head movement
      const headBob = Math.sin(model.time * 0.8) * 0.005;
      const headTilt = Math.sin(model.time * 0.5 + 1.5) * 0.03;

      model.headMesh.position.y = model.baseHeadY + headBob;
      model.headMesh.rotation.z = headTilt;
      model.headMesh.rotation.x = Math.sin(model.time * 0.3) * 0.02;
    });
  }

  // Trigger a reaction animation on a specific bot
  triggerReaction(botIndex, type) {
    const model = this.models.find(m => m.index === botIndex);
    if (!model) return;

    // Quick head movement based on reaction type
    switch (type) {
      case 'fold':
        // Look down briefly
        model.headMesh.rotation.x = 0.2;
        setTimeout(() => { model.headMesh.rotation.x = 0; }, 800);
        break;
      case 'raise':
        // Lean forward slightly
        model.group.children[0].position.z += 0.02; // torso
        setTimeout(() => { model.group.children[0].position.z -= 0.02; }, 600);
        break;
      case 'allin':
        // Dramatic lean
        model.group.children[0].position.z += 0.04;
        model.headMesh.rotation.x = -0.1;
        setTimeout(() => {
          model.group.children[0].position.z -= 0.04;
          model.headMesh.rotation.x = 0;
        }, 1000);
        break;
    }
  }

  dispose() {
    this.models.forEach(model => {
      model.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.scene.remove(model.group);
    });
    this.models = [];
  }
}
