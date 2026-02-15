import * as THREE from 'three';

// First-person visible hands on the table
export class PlayerHands {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.time = 0;

    // Animation state
    this.state = 'idle'; // idle, grabCard, lookCard, bet, fold
    this.animProgress = 0;
    this.animDuration = 0.6;
    this.animCallback = null;

    // Base positions (relative to camera, in world space they'll be set each frame)
    this.leftRestPos = new THREE.Vector3(-0.22, -0.35, -0.35);
    this.rightRestPos = new THREE.Vector3(0.22, -0.35, -0.35);
    this.leftRestRot = new THREE.Euler(0.3, 0.2, -0.1);
    this.rightRestRot = new THREE.Euler(0.3, -0.2, 0.1);

    this.buildHands();
    this.scene.add(this.group);
  }

  buildHands() {
    // Skin-toned material
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.7,
      metalness: 0.0,
    });

    const darkSkinMat = new THREE.MeshStandardMaterial({
      color: 0xc49464,
      roughness: 0.7,
      metalness: 0.0,
    });

    // Sleeve material (dark jacket)
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a20,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Build left hand
    this.leftHand = this.createHand(skinMat, darkSkinMat, sleeveMat, false);
    this.leftHand.position.copy(this.leftRestPos);
    this.leftHand.rotation.copy(this.leftRestRot);
    this.group.add(this.leftHand);

    // Build right hand
    this.rightHand = this.createHand(skinMat, darkSkinMat, sleeveMat, true);
    this.rightHand.position.copy(this.rightRestPos);
    this.rightHand.rotation.copy(this.rightRestRot);
    this.group.add(this.rightHand);
  }

  createHand(skinMat, darkMat, sleeveMat, isRight) {
    const hand = new THREE.Group();
    const mirror = isRight ? 1 : -1;

    // Forearm / sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.25, 8);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(0, 0, 0.12);
    sleeve.rotation.x = Math.PI / 2;
    hand.add(sleeve);

    // Wrist
    const wristGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.04, 8);
    const wrist = new THREE.Mesh(wristGeo, skinMat);
    wrist.position.set(0, 0, -0.01);
    wrist.rotation.x = Math.PI / 2;
    hand.add(wrist);

    // Palm
    const palmGeo = new THREE.BoxGeometry(0.07, 0.02, 0.07);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.position.set(0, -0.005, -0.06);
    hand.add(palm);

    // Fingers
    const fingerPositions = [
      { x: -0.025 * mirror, z: -0.1, len: 0.05, thick: 0.008 },  // Index
      { x: -0.008 * mirror, z: -0.105, len: 0.055, thick: 0.008 }, // Middle
      { x: 0.01 * mirror, z: -0.1, len: 0.048, thick: 0.007 },    // Ring
      { x: 0.025 * mirror, z: -0.09, len: 0.04, thick: 0.007 },   // Pinky
    ];

    fingerPositions.forEach(fp => {
      // Finger base
      const fGeo = new THREE.CapsuleGeometry(fp.thick, fp.len, 4, 6);
      const finger = new THREE.Mesh(fGeo, skinMat);
      finger.position.set(fp.x, -0.005, fp.z - fp.len / 2);
      finger.rotation.x = Math.PI / 2;
      hand.add(finger);
    });

    // Thumb
    const thumbGeo = new THREE.CapsuleGeometry(0.009, 0.04, 4, 6);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(-0.04 * mirror, -0.005, -0.05);
    thumb.rotation.set(Math.PI / 2, 0, 0.5 * mirror);
    hand.add(thumb);

    // Watch on left hand
    if (!isRight) {
      const watchBandGeo = new THREE.TorusGeometry(0.032, 0.005, 6, 16);
      const watchBandMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.5, roughness: 0.3 });
      const watchBand = new THREE.Mesh(watchBandGeo, watchBandMat);
      watchBand.position.set(0, 0, 0.01);
      watchBand.rotation.x = Math.PI / 2;
      hand.add(watchBand);

      const watchFaceGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.006, 12);
      const watchFaceMat = new THREE.MeshStandardMaterial({
        color: 0x00ccff,
        emissive: 0x00ccff,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.1,
      });
      const watchFace = new THREE.Mesh(watchFaceGeo, watchFaceMat);
      watchFace.position.set(0, 0.015, 0.01);
      hand.add(watchFace);
    }

    // Ring on right hand
    if (isRight) {
      const ringGeo = new THREE.TorusGeometry(0.01, 0.002, 6, 16);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xffd700,
        emissiveIntensity: 0.05,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0.01, -0.005, -0.08);
      ring.rotation.x = Math.PI / 2;
      hand.add(ring);
    }

    hand.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    return hand;
  }

  // Trigger animations
  playGrabCard(callback) {
    this.state = 'grabCard';
    this.animProgress = 0;
    this.animDuration = 0.8;
    this.animCallback = callback;
  }

  playLookCard(callback) {
    this.state = 'lookCard';
    this.animProgress = 0;
    this.animDuration = 1.2;
    this.animCallback = callback;
  }

  playBet(callback) {
    this.state = 'bet';
    this.animProgress = 0;
    this.animDuration = 0.6;
    this.animCallback = callback;
  }

  playFold(callback) {
    this.state = 'fold';
    this.animProgress = 0;
    this.animDuration = 0.7;
    this.animCallback = callback;
  }

  returnToIdle() {
    this.state = 'idle';
    this.animProgress = 0;
  }

  update(delta) {
    this.time += delta;

    // Position hands relative to camera
    const camPos = this.camera.position;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camRight = new THREE.Vector3().crossVectors(camDir, this.camera.up).normalize();
    const camUp = this.camera.up.clone();

    // Base world position for hands group
    this.group.position.copy(camPos);
    this.group.quaternion.copy(this.camera.quaternion);

    // Animate based on state
    if (this.state !== 'idle') {
      this.animProgress += delta / this.animDuration;

      if (this.animProgress >= 1) {
        this.animProgress = 1;
        const cb = this.animCallback;
        this.animCallback = null;
        this.state = 'idle';
        if (cb) cb();
      }
    }

    // Apply animation offsets
    const t = this.animProgress;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad

    switch (this.state) {
      case 'idle':
        this.applyIdleAnimation();
        break;
      case 'grabCard':
        this.applyGrabCardAnimation(ease);
        break;
      case 'lookCard':
        this.applyLookCardAnimation(ease);
        break;
      case 'bet':
        this.applyBetAnimation(ease);
        break;
      case 'fold':
        this.applyFoldAnimation(ease);
        break;
    }
  }

  applyIdleAnimation() {
    // Subtle breathing movement
    const breathY = Math.sin(this.time * 1.5) * 0.003;
    const breathZ = Math.cos(this.time * 1.2) * 0.002;

    this.leftHand.position.set(
      this.leftRestPos.x + Math.sin(this.time * 0.8) * 0.001,
      this.leftRestPos.y + breathY,
      this.leftRestPos.z + breathZ
    );
    this.leftHand.rotation.copy(this.leftRestRot);

    this.rightHand.position.set(
      this.rightRestPos.x + Math.cos(this.time * 0.9) * 0.001,
      this.rightRestPos.y + breathY,
      this.rightRestPos.z + breathZ
    );
    this.rightHand.rotation.copy(this.rightRestRot);
  }

  applyGrabCardAnimation(t) {
    // Right hand reaches forward to grab cards
    const reachZ = t < 0.5 ? t * 2 * -0.15 : (1 - t) * 2 * -0.15;
    const reachY = t < 0.5 ? t * 2 * 0.05 : (1 - t) * 2 * 0.05;

    this.rightHand.position.set(
      this.rightRestPos.x - 0.05 * t,
      this.rightRestPos.y + reachY,
      this.rightRestPos.z + reachZ
    );
    this.rightHand.rotation.set(
      this.rightRestRot.x + t * 0.3,
      this.rightRestRot.y,
      this.rightRestRot.z
    );

    // Left hand stays still with slight movement
    this.applyIdleForHand(this.leftHand, this.leftRestPos, this.leftRestRot);
  }

  applyLookCardAnimation(t) {
    // Both hands come up to look at cards
    const liftY = Math.sin(t * Math.PI) * 0.12;
    const tiltX = Math.sin(t * Math.PI) * -0.4;

    this.leftHand.position.set(
      this.leftRestPos.x + 0.05,
      this.leftRestPos.y + liftY,
      this.leftRestPos.z - 0.05
    );
    this.leftHand.rotation.set(
      this.leftRestRot.x + tiltX,
      this.leftRestRot.y,
      this.leftRestRot.z
    );

    this.rightHand.position.set(
      this.rightRestPos.x - 0.05,
      this.rightRestPos.y + liftY,
      this.rightRestPos.z - 0.05
    );
    this.rightHand.rotation.set(
      this.rightRestRot.x + tiltX,
      this.rightRestRot.y,
      this.rightRestRot.z
    );
  }

  applyBetAnimation(t) {
    // Right hand pushes forward (pushing chips)
    const pushZ = Math.sin(t * Math.PI) * -0.2;
    const pushY = Math.sin(t * Math.PI) * 0.03;

    this.rightHand.position.set(
      this.rightRestPos.x,
      this.rightRestPos.y + pushY,
      this.rightRestPos.z + pushZ
    );
    this.rightHand.rotation.set(
      this.rightRestRot.x + Math.sin(t * Math.PI) * 0.2,
      this.rightRestRot.y,
      this.rightRestRot.z
    );

    this.applyIdleForHand(this.leftHand, this.leftRestPos, this.leftRestRot);
  }

  applyFoldAnimation(t) {
    // Both hands push cards forward
    const pushZ = Math.sin(t * Math.PI) * -0.18;
    const pushY = Math.sin(t * Math.PI) * 0.04;

    this.leftHand.position.set(
      this.leftRestPos.x + 0.03,
      this.leftRestPos.y + pushY,
      this.leftRestPos.z + pushZ
    );
    this.rightHand.position.set(
      this.rightRestPos.x - 0.03,
      this.rightRestPos.y + pushY,
      this.rightRestPos.z + pushZ
    );

    const rot = Math.sin(t * Math.PI) * 0.15;
    this.leftHand.rotation.set(this.leftRestRot.x + rot, this.leftRestRot.y, this.leftRestRot.z);
    this.rightHand.rotation.set(this.rightRestRot.x + rot, this.rightRestRot.y, this.rightRestRot.z);
  }

  applyIdleForHand(hand, restPos, restRot) {
    const breathY = Math.sin(this.time * 1.5) * 0.003;
    hand.position.set(restPos.x, restPos.y + breathY, restPos.z);
    hand.rotation.copy(restRot);
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.scene.remove(this.group);
  }
}
