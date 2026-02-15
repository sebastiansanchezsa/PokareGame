import * as THREE from 'three';

export class ParticleEffects {
  constructor(scene) {
    this.scene = scene;
    this.systems = [];
  }

  // Gold coin burst for winning
  winBurst(position = new THREE.Vector3(0, 1.2, -0.5)) {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y + Math.random() * 0.2;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 3
      ));
      // Gold/yellow colors
      const gold = Math.random() * 0.3;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.7 + gold;
      colors[i * 3 + 2] = gold * 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      type: 'burst',
      mesh: points,
      velocities,
      life: 2.0,
      maxLife: 2.0,
      gravity: -6,
    });
  }

  // Pink/magenta sparkles for fold
  foldEffect(position = new THREE.Vector3(0, 1.1, 0.8)) {
    const count = 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 1
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      color: 0xff4488,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      type: 'burst',
      mesh: points,
      velocities,
      life: 1.2,
      maxLife: 1.2,
      gravity: -3,
    });
  }

  // Blue energy ring for all-in
  allInEffect(position = new THREE.Vector3(0, 1.0, 0)) {
    // Expanding ring of particles
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 0.1;
      positions[i * 3] = position.x + Math.cos(angle) * r;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * r;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * 3,
        Math.random() * 1.5,
        Math.sin(angle) * 3
      ));
      // Blue to cyan
      colors[i * 3] = 0.2;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      type: 'burst',
      mesh: points,
      velocities,
      life: 1.5,
      maxLife: 1.5,
      gravity: -1,
    });
  }

  // Card deal swoosh trail
  dealEffect(from, to) {
    const count = 15;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    const dir = new THREE.Vector3().subVectors(to, from).normalize();

    for (let i = 0; i < count; i++) {
      const t = i / count;
      positions[i * 3] = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = from.y + (to.y - from.y) * t + Math.random() * 0.1;
      positions[i * 3 + 2] = from.z + (to.z - from.z) * t + (Math.random() - 0.5) * 0.1;
      velocities.push(new THREE.Vector3(
        dir.x * 0.5 + (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        dir.z * 0.5 + (Math.random() - 0.5) * 0.5
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.03,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      type: 'burst',
      mesh: points,
      velocities,
      life: 0.8,
      maxLife: 0.8,
      gravity: -2,
    });
  }

  // Community card reveal - sparkle burst
  communityReveal(position) {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.1;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 2
      ));
      // White/purple sparkle
      const t = Math.random();
      colors[i * 3] = 0.8 + t * 0.2;
      colors[i * 3 + 1] = 0.5 + t * 0.3;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      type: 'burst',
      mesh: points,
      velocities,
      life: 1.0,
      maxLife: 1.0,
      gravity: -4,
    });
  }

  // Chip collect swirl toward pot
  chipCollect(from, to) {
    const count = 25;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const targets = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = from.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = from.y + Math.random() * 0.1;
      positions[i * 3 + 2] = from.z + (Math.random() - 0.5) * 0.4;
      targets.push({
        target: to.clone(),
        delay: Math.random() * 0.3,
        speed: 2 + Math.random() * 2,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0xffd700,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      type: 'attract',
      mesh: points,
      targets,
      life: 1.5,
      maxLife: 1.5,
    });
  }

  update(delta) {
    for (let i = this.systems.length - 1; i >= 0; i--) {
      const sys = this.systems[i];
      sys.life -= delta;

      if (sys.life <= 0) {
        this.scene.remove(sys.mesh);
        sys.mesh.geometry.dispose();
        sys.mesh.material.dispose();
        this.systems.splice(i, 1);
        continue;
      }

      const progress = 1 - (sys.life / sys.maxLife);
      sys.mesh.material.opacity = Math.max(0, 1 - progress * progress);

      const posAttr = sys.mesh.geometry.getAttribute('position');

      if (sys.type === 'burst') {
        for (let j = 0; j < posAttr.count; j++) {
          const v = sys.velocities[j];
          posAttr.array[j * 3] += v.x * delta;
          posAttr.array[j * 3 + 1] += v.y * delta;
          posAttr.array[j * 3 + 2] += v.z * delta;
          v.y += sys.gravity * delta;
          v.x *= 0.98;
          v.z *= 0.98;
        }
      } else if (sys.type === 'attract') {
        for (let j = 0; j < posAttr.count; j++) {
          const t = sys.targets[j];
          if (progress < t.delay) continue;
          const px = posAttr.array[j * 3];
          const py = posAttr.array[j * 3 + 1];
          const pz = posAttr.array[j * 3 + 2];
          const dx = t.target.x - px;
          const dy = t.target.y - py;
          const dz = t.target.z - pz;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (len > 0.05) {
            const s = t.speed * delta;
            posAttr.array[j * 3] += (dx / len) * s;
            posAttr.array[j * 3 + 1] += (dy / len) * s;
            posAttr.array[j * 3 + 2] += (dz / len) * s;
          }
        }
      }

      posAttr.needsUpdate = true;
    }
  }
}
