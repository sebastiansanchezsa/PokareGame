import * as THREE from 'three';

const CHIP_VALUES = [
  { value: 5, color: 0xff2255, label: '5' },
  { value: 10, color: 0x00aaff, label: '10' },
  { value: 25, color: 0x00ff88, label: '25' },
  { value: 50, color: 0xff6ec7, label: '50' },
  { value: 100, color: 0xffd700, label: '100' },
  { value: 500, color: 0x8800ff, label: '500' },
];

export class Chip3D {
  constructor(value = 25) {
    this.value = value;
    this.mesh = null;
    this.targetPos = null;
    this.animSpeed = 5;
    this.createMesh();
  }

  getChipConfig() {
    return CHIP_VALUES.find(c => c.value === this.value) || CHIP_VALUES[2];
  }

  createMesh() {
    const config = this.getChipConfig();
    const radius = 0.03;
    const height = 0.008;

    const group = new THREE.Group();

    // Chip body
    const geo = new THREE.CylinderGeometry(radius, radius, height, 24);

    // Create chip texture
    const topCanvas = this.createChipCanvas(config);
    const topTexture = new THREE.CanvasTexture(topCanvas);

    const materials = [
      new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.3,
        metalness: 0.4,
      }), // side
      new THREE.MeshStandardMaterial({
        map: topTexture,
        roughness: 0.3,
        metalness: 0.2,
      }), // top
      new THREE.MeshStandardMaterial({
        map: topTexture,
        roughness: 0.3,
        metalness: 0.2,
      }), // bottom
    ];

    const chipMesh = new THREE.Mesh(geo, materials);
    chipMesh.castShadow = true;
    group.add(chipMesh);

    // Edge markings (white stripes around edge)
    const stripeCount = 8;
    for (let i = 0; i < stripeCount; i++) {
      const angle = (i / stripeCount) * Math.PI * 2;
      const stripeGeo = new THREE.BoxGeometry(0.004, height + 0.001, 0.002);
      const stripeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(
        Math.cos(angle) * (radius - 0.001),
        0,
        Math.sin(angle) * (radius - 0.001)
      );
      stripe.rotation.y = -angle;
      group.add(stripe);
    }

    this.mesh = group;
  }

  createChipCanvas(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Base color
    const hex = config.color.toString(16).padStart(6, '0');
    ctx.fillStyle = `#${hex}`;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Center
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(32, 32, 15, 0, Math.PI * 2);
    ctx.fill();

    // Value text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.label, 32, 33);

    return canvas;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  animateTo(targetPos, speed = 5) {
    this.targetPos = targetPos.clone();
    this.animSpeed = speed;
  }

  update(delta) {
    if (this.targetPos) {
      this.mesh.position.lerp(this.targetPos, delta * this.animSpeed);
      if (this.mesh.position.distanceTo(this.targetPos) < 0.001) {
        this.mesh.position.copy(this.targetPos);
        this.targetPos = null;
      }
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}

// Create a stack of chips representing a value
export function createChipStack(totalValue, basePosition) {
  const chips = [];
  let remaining = totalValue;

  // Break down value into chip denominations
  const sortedValues = [...CHIP_VALUES].sort((a, b) => b.value - a.value);

  sortedValues.forEach(config => {
    while (remaining >= config.value) {
      remaining -= config.value;
      const chip = new Chip3D(config.value);
      chips.push(chip);
    }
  });

  // Stack them
  chips.forEach((chip, i) => {
    chip.setPosition(
      basePosition.x + (Math.random() - 0.5) * 0.005,
      basePosition.y + i * 0.009,
      basePosition.z + (Math.random() - 0.5) * 0.005
    );
  });

  return chips;
}

export { CHIP_VALUES };
