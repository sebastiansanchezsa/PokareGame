import * as THREE from 'three';

/**
 * Russian Roulette mechanic - after losing a round, the winner "shoots" the loser.
 * 1/6 chance of elimination (death). Full 3D animation with revolver model.
 */
export class RussianRoulette {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.revolverGroup = null;
    this.cylinderMesh = null;
    this.isPlaying = false;
    this.onComplete = null; // callback(survived: boolean)
    this.animTime = 0;
    this.animPhase = 'idle'; // idle, raise, spin, aim, fire, result
    this.survived = true;
    this.muzzleFlash = null;
    this.particles = [];
    this.buildRevolver();
  }

  buildRevolver() {
    this.revolverGroup = new THREE.Group();
    this.revolverGroup.visible = false;

    // Gun body (barrel)
    const barrelGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.22, 8);
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.11;
    this.revolverGroup.add(barrel);

    // Cylinder (the rotating part with chambers)
    const cylinderGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      metalness: 0.85,
      roughness: 0.25,
    });
    this.cylinderMesh = new THREE.Mesh(cylinderGeo, cylinderMat);
    this.cylinderMesh.rotation.x = Math.PI / 2;
    this.cylinderMesh.position.z = -0.02;
    this.revolverGroup.add(this.cylinderMesh);

    // Chamber holes (6 chambers)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const holeGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.042, 8);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(
        Math.cos(angle) * 0.018,
        Math.sin(angle) * 0.018,
        -0.02
      );
      this.revolverGroup.add(hole);
    }

    // Grip/handle
    const gripGeo = new THREE.BoxGeometry(0.025, 0.09, 0.03);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x4a2a1a,
      roughness: 0.8,
      metalness: 0.1,
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.055, 0.02);
    grip.rotation.z = 0.1;
    this.revolverGroup.add(grip);

    // Trigger guard
    const guardGeo = new THREE.TorusGeometry(0.015, 0.003, 8, 12, Math.PI);
    const guard = new THREE.Mesh(guardGeo, gunMat);
    guard.position.set(0, -0.02, 0.01);
    guard.rotation.x = Math.PI / 2;
    this.revolverGroup.add(guard);

    // Hammer
    const hammerGeo = new THREE.BoxGeometry(0.008, 0.025, 0.01);
    const hammer = new THREE.Mesh(hammerGeo, gunMat);
    hammer.position.set(0, 0.02, 0.03);
    this.revolverGroup.add(hammer);
    this.hammerMesh = hammer;

    // Muzzle flash (initially hidden)
    const flashGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
    });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.position.z = -0.24;
    this.revolverGroup.add(this.muzzleFlash);

    // Position relative to camera (will be moved during animation)
    this.revolverGroup.position.set(0.3, -0.4, -0.5);
    this.scene.add(this.revolverGroup);
  }

  /**
   * Play the Russian Roulette sequence
   * @param {boolean} targetIsSelf - true if the player lost (gun aimed at camera)
   * @returns {Promise<boolean>} - resolves with true if survived
   */
  play(targetIsSelf = true) {
    return new Promise((resolve) => {
      // 1 in 6 chance of death
      this.survived = Math.random() >= (1 / 6);
      this.isPlaying = true;
      this.animTime = 0;
      this.animPhase = 'raise';
      this.targetIsSelf = targetIsSelf;

      this.revolverGroup.visible = true;
      this.revolverGroup.position.set(0.4, -0.5, -0.6);
      this.revolverGroup.rotation.set(0, 0, 0);

      this.onComplete = resolve;
    });
  }

  /**
   * Update animation each frame
   */
  update(delta) {
    if (!this.isPlaying) return;
    this.animTime += delta;

    // Attach revolver to camera
    const camPos = this.camera.position.clone();
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    switch (this.animPhase) {
      case 'raise': {
        // Raise gun from bottom-right (0 - 1.2s)
        const t = Math.min(this.animTime / 1.2, 1);
        const ease = t * t * (3 - 2 * t); // smoothstep
        const offset = camRight.clone().multiplyScalar(0.25 - ease * 0.15)
          .add(camUp.clone().multiplyScalar(-0.3 + ease * 0.2))
          .add(camDir.clone().multiplyScalar(0.4));
        this.revolverGroup.position.copy(camPos).add(offset);
        this.revolverGroup.quaternion.copy(this.camera.quaternion);

        if (this.animTime >= 1.2) {
          this.animPhase = 'spin';
          this.animTime = 0;
        }
        break;
      }

      case 'spin': {
        // Spin the cylinder (0 - 1.8s)
        const t = Math.min(this.animTime / 1.8, 1);
        const spinSpeed = (1 - t) * 30 + 2; // fast to slow
        this.cylinderMesh.rotation.z += delta * spinSpeed;

        const offset = camRight.clone().multiplyScalar(0.1)
          .add(camUp.clone().multiplyScalar(-0.1))
          .add(camDir.clone().multiplyScalar(0.4));
        this.revolverGroup.position.copy(camPos).add(offset);
        this.revolverGroup.quaternion.copy(this.camera.quaternion);

        if (this.animTime >= 1.8) {
          this.animPhase = 'aim';
          this.animTime = 0;
        }
        break;
      }

      case 'aim': {
        // Aim at target (0 - 1s)
        const t = Math.min(this.animTime / 1.0, 1);
        const ease = t * t * (3 - 2 * t);

        let offset;
        if (this.targetIsSelf) {
          // Gun comes toward camera (aimed at player)
          offset = camRight.clone().multiplyScalar(0.1 * (1 - ease))
            .add(camUp.clone().multiplyScalar(-0.05))
            .add(camDir.clone().multiplyScalar(0.4 - ease * 0.15));
        } else {
          // Gun aimed forward (at opponent)
          offset = camRight.clone().multiplyScalar(0.15)
            .add(camUp.clone().multiplyScalar(-0.08))
            .add(camDir.clone().multiplyScalar(0.35));
        }
        this.revolverGroup.position.copy(camPos).add(offset);
        this.revolverGroup.quaternion.copy(this.camera.quaternion);

        // Cock the hammer
        this.hammerMesh.rotation.x = -ease * 0.4;

        if (this.animTime >= 1.0) {
          this.animPhase = 'fire';
          this.animTime = 0;
        }
        break;
      }

      case 'fire': {
        // Fire! (0 - 0.3s)
        const t = this.animTime;

        const offset = camRight.clone().multiplyScalar(this.targetIsSelf ? 0 : 0.15)
          .add(camUp.clone().multiplyScalar(-0.05))
          .add(camDir.clone().multiplyScalar(this.targetIsSelf ? 0.25 : 0.35));
        this.revolverGroup.position.copy(camPos).add(offset);
        this.revolverGroup.quaternion.copy(this.camera.quaternion);

        // Hammer strikes forward
        this.hammerMesh.rotation.x = 0;

        if (!this.survived) {
          // BANG - muzzle flash
          const flashOpacity = Math.max(0, 1 - t * 5);
          this.muzzleFlash.material.opacity = flashOpacity;
          this.muzzleFlash.scale.setScalar(1 + t * 3);

          // Recoil
          const recoil = Math.sin(t * 20) * Math.max(0, 0.05 - t * 0.15);
          this.revolverGroup.rotation.x -= recoil;
        } else {
          // Click - no fire, just a click sound moment
          this.muzzleFlash.material.opacity = 0;
        }

        if (this.animTime >= 0.5) {
          this.animPhase = 'result';
          this.animTime = 0;
        }
        break;
      }

      case 'result': {
        // Show result (0 - 2s)
        const t = Math.min(this.animTime / 2.0, 1);

        if (!this.survived) {
          // Death effect - screen goes red, gun recoils
          // (handled by overlay in main.js)
        }

        // Lower gun
        const ease = t * t;
        const offset = camRight.clone().multiplyScalar(0.2)
          .add(camUp.clone().multiplyScalar(-0.1 - ease * 0.4))
          .add(camDir.clone().multiplyScalar(0.35));
        this.revolverGroup.position.copy(camPos).add(offset);
        this.revolverGroup.quaternion.copy(this.camera.quaternion);
        this.muzzleFlash.material.opacity = 0;

        if (this.animTime >= 2.0) {
          this.finish();
        }
        break;
      }
    }

    // Update particles
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        return false;
      }
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.mesh.material.opacity = p.life / p.maxLife;
      return true;
    });
  }

  /**
   * Spawn smoke/spark particles at muzzle
   */
  spawnParticles() {
    const muzzleWorld = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzleWorld);

    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.005 + Math.random() * 0.01, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: i < 6 ? 0xffaa00 : 0x888888,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(muzzleWorld);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.3,
          (Math.random() - 0.5) * 0.5
        ),
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
      });
    }
  }

  finish() {
    this.isPlaying = false;
    this.animPhase = 'idle';
    this.revolverGroup.visible = false;
    this.muzzleFlash.material.opacity = 0;

    if (this.onComplete) {
      this.onComplete(this.survived);
      this.onComplete = null;
    }
  }

  dispose() {
    if (this.revolverGroup) {
      this.scene.remove(this.revolverGroup);
      this.revolverGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}
