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
    this.onComplete = null;
    this.animTime = 0;
    this.animPhase = 'idle';
    this.survived = true;
    this.muzzleFlash = null;
    this.particles = [];
    this._firedParticles = false;
    this.buildRevolver();
  }

  buildRevolver() {
    this.revolverGroup = new THREE.Group();

    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a, metalness: 0.9, roughness: 0.2,
    });

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.014, 0.22, 8), gunMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.11;
    this.revolverGroup.add(barrel);

    // Cylinder
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a, metalness: 0.85, roughness: 0.25,
    });
    this.cylinderMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6), cylinderMat
    );
    this.cylinderMesh.rotation.x = Math.PI / 2;
    this.cylinderMesh.position.z = -0.02;
    this.revolverGroup.add(this.cylinderMesh);

    // Chamber holes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.042, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(Math.cos(a) * 0.018, Math.sin(a) * 0.018, -0.02);
      this.revolverGroup.add(hole);
    }

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.09, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.8, metalness: 0.1 })
    );
    grip.position.set(0, -0.055, 0.02);
    grip.rotation.z = 0.1;
    this.revolverGroup.add(grip);

    // Trigger guard
    const guard = new THREE.Mesh(
      new THREE.TorusGeometry(0.015, 0.003, 8, 12, Math.PI), gunMat
    );
    guard.position.set(0, -0.02, 0.01);
    guard.rotation.x = Math.PI / 2;
    this.revolverGroup.add(guard);

    // Hammer
    this.hammerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.025, 0.01), gunMat
    );
    this.hammerMesh.position.set(0, 0.02, 0.03);
    this.revolverGroup.add(this.hammerMesh);

    // Muzzle flash
    this.muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 })
    );
    this.muzzleFlash.position.z = -0.24;
    this.revolverGroup.add(this.muzzleFlash);

    // === HAND holding the gun ===
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.75 });
    // Palm wrapping around grip
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.04), skinMat);
    palm.position.set(0, -0.04, 0.02);
    this.revolverGroup.add(palm);
    // Fingers curled around grip
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.006, 0.03, 3, 4), skinMat
      );
      finger.position.set(-0.015 + f * 0.01, -0.06, 0.035);
      finger.rotation.x = 0.6;
      this.revolverGroup.add(finger);
    }
    // Thumb on side
    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.007, 0.025, 3, 4), skinMat
    );
    thumb.position.set(0.03, -0.02, 0.02);
    thumb.rotation.z = -0.5;
    this.revolverGroup.add(thumb);

    // Forearm/wrist
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1a1035, roughness: 0.7 });
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.08, 6), skinMat);
    wrist.position.set(0, -0.11, 0.02);
    this.revolverGroup.add(wrist);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 6), sleeveMat);
    sleeve.position.set(0, -0.18, 0.02);
    this.revolverGroup.add(sleeve);

    // Store table quaternion for idle pose
    this.tablePos = new THREE.Vector3(0.6, 0.97, 0.3);
    this.tableQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0, Math.PI * 0.7)
    );
    this.tableScale = 1.0;

    // Place on table (lying flat)
    this.revolverGroup.position.copy(this.tablePos);
    this.revolverGroup.quaternion.copy(this.tableQuat);
    this.revolverGroup.scale.setScalar(this.tableScale);
    this.revolverGroup.visible = true;
    this.scene.add(this.revolverGroup);
  }

  play(targetIsSelf = true) {
    return new Promise((resolve) => {
      this.survived = Math.random() >= (1 / 6);
      this.isPlaying = true;
      this.animTime = 0;
      this.animPhase = 'grab';
      this.targetIsSelf = targetIsSelf;
      this._firedParticles = false;
      this.grabStartPos = this.revolverGroup.position.clone();
      this.grabStartQuat = this.revolverGroup.quaternion.clone();
      this.revolverGroup.visible = true;
      this.onComplete = resolve;
    });
  }

  // Helper: compute FPS weapon position relative to camera
  _weaponPos(rightAmt, upAmt, fwdAmt) {
    const cam = this.camera;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    return cam.position.clone()
      .add(right.multiplyScalar(rightAmt))
      .add(up.multiplyScalar(upAmt))
      .add(fwd.multiplyScalar(fwdAmt));
  }

  _smoothstep(t) { return t * t * (3 - 2 * t); }

  update(delta) {
    if (!this.isPlaying) return;
    this.animTime += delta;
    const camQuat = this.camera.quaternion;

    switch (this.animPhase) {
      case 'grab': {
        // Lift from table to FPS hand position (0-1s)
        const t = this._smoothstep(Math.min(this.animTime / 1.0, 1));
        const target = this._weaponPos(0.22, -0.25, 0.38);
        this.revolverGroup.position.lerpVectors(this.grabStartPos, target, t);
        this.revolverGroup.quaternion.slerpQuaternions(this.grabStartQuat, camQuat, t);
        this.revolverGroup.scale.setScalar(this.tableScale + t * (1 - this.tableScale));
        if (this.animTime >= 1.0) { this.animPhase = 'spin'; this.animTime = 0; }
        break;
      }

      case 'spin': {
        // Hold in view + spin cylinder (0-1.8s)
        const t = Math.min(this.animTime / 1.8, 1);
        const spinSpeed = (1 - t) * 30 + 2;
        this.cylinderMesh.rotation.z += delta * spinSpeed;
        this.revolverGroup.position.copy(this._weaponPos(0.15, -0.12, 0.38));
        this.revolverGroup.quaternion.copy(camQuat);
        if (this.animTime >= 1.8) { this.animPhase = 'aim'; this.animTime = 0; }
        break;
      }

      case 'aim': {
        // Move to aim position (0-0.8s)
        const t = this._smoothstep(Math.min(this.animTime / 0.8, 1));
        const rAmt = this.targetIsSelf ? 0.1 * (1 - t) : 0.12;
        const fAmt = this.targetIsSelf ? 0.38 - t * 0.12 : 0.38;
        this.revolverGroup.position.copy(this._weaponPos(rAmt, -0.08, fAmt));
        this.revolverGroup.quaternion.copy(camQuat);
        this.hammerMesh.rotation.x = -t * 0.4;
        if (this.animTime >= 0.8) { this.animPhase = 'fire'; this.animTime = 0; }
        break;
      }

      case 'fire': {
        // Fire! (0-0.6s)
        const t = this.animTime;
        const rAmt = this.targetIsSelf ? 0 : 0.12;
        const fAmt = this.targetIsSelf ? 0.26 : 0.38;
        this.revolverGroup.position.copy(this._weaponPos(rAmt, -0.08, fAmt));
        // Base orientation from camera
        const baseQuat = camQuat.clone();
        this.hammerMesh.rotation.x = 0;

        if (!this.survived) {
          // BANG
          const flash = Math.max(0, 1 - t * 5);
          this.muzzleFlash.material.opacity = flash;
          this.muzzleFlash.scale.setScalar(1 + t * 3);
          // Recoil via local quaternion offset
          const recoilAmt = Math.sin(t * 20) * Math.max(0, 0.06 - t * 0.12);
          const recoilQ = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), -recoilAmt
          );
          baseQuat.multiply(recoilQ);
          // Spawn particles once
          if (!this._firedParticles) {
            this._firedParticles = true;
            this.spawnParticles();
          }
        } else {
          this.muzzleFlash.material.opacity = 0;
        }
        this.revolverGroup.quaternion.copy(baseQuat);

        if (this.animTime >= 0.6) { this.animPhase = 'result'; this.animTime = 0; }
        break;
      }

      case 'result': {
        // Lower gun (0-2s)
        const t = this._smoothstep(Math.min(this.animTime / 2.0, 1));
        this.revolverGroup.position.copy(this._weaponPos(0.2, -0.08 - t * 0.35, 0.35));
        this.revolverGroup.quaternion.copy(camQuat);
        this.muzzleFlash.material.opacity = 0;
        if (this.animTime >= 2.0) this.finish();
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
      p.velocity.y -= 0.5 * delta;
      p.mesh.material.opacity = p.life / p.maxLife;
      return true;
    });
  }

  spawnParticles() {
    const muzzleWorld = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzleWorld);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    for (let i = 0; i < 15; i++) {
      const geo = new THREE.SphereGeometry(0.005 + Math.random() * 0.01, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: i < 7 ? 0xffaa00 : 0x888888,
        transparent: true, opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(muzzleWorld);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          fwd.x * 1.5 + (Math.random() - 0.5) * 0.6,
          fwd.y * 1.5 + Math.random() * 0.4,
          fwd.z * 1.5 + (Math.random() - 0.5) * 0.6
        ),
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
      });
    }
  }

  finish() {
    this.isPlaying = false;
    this.animPhase = 'idle';
    this.muzzleFlash.material.opacity = 0;
    this.muzzleFlash.scale.setScalar(1);
    this.hammerMesh.rotation.x = 0;

    // Return gun to table
    this.revolverGroup.position.copy(this.tablePos);
    this.revolverGroup.quaternion.copy(this.tableQuat);
    this.revolverGroup.scale.setScalar(this.tableScale);
    this.revolverGroup.visible = true;

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
