import * as THREE from 'three';

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.setup();
  }

  setup() {
    // Ambient - very dim
    const ambient = new THREE.AmbientLight(0x1a0a2a, 0.3);
    this.scene.add(ambient);

    // Hemisphere light - subtle sky/ground
    const hemi = new THREE.HemisphereLight(0x1a0033, 0x0a0015, 0.2);
    this.scene.add(hemi);

    // Neon pink accent light - left
    const pinkLight = new THREE.PointLight(0xff00aa, 1.2, 8);
    pinkLight.position.set(-4, 2.5, -2);
    pinkLight.castShadow = true;
    this.scene.add(pinkLight);
    this.lights.push({ light: pinkLight, baseIntensity: 1.2, phase: 0 });

    // Neon blue accent light - right
    const blueLight = new THREE.PointLight(0x00aaff, 1.0, 8);
    blueLight.position.set(4, 2.5, -2);
    blueLight.castShadow = true;
    this.scene.add(blueLight);
    this.lights.push({ light: blueLight, baseIntensity: 1.0, phase: 1.5 });

    // Purple accent - back
    const purpleLight = new THREE.PointLight(0x8800ff, 0.8, 6);
    purpleLight.position.set(0, 3, -4);
    this.scene.add(purpleLight);
    this.lights.push({ light: purpleLight, baseIntensity: 0.8, phase: 3.0 });

    // Warm under-table glow
    const warmGlow = new THREE.PointLight(0xff6600, 0.3, 3);
    warmGlow.position.set(0, 0.3, 0);
    this.scene.add(warmGlow);
  }

  update(time) {
    // Subtle neon flicker
    this.lights.forEach(entry => {
      const flicker = Math.sin(time * 1.5 + entry.phase) * 0.1
        + Math.sin(time * 4.7 + entry.phase * 2) * 0.05;
      entry.light.intensity = entry.baseIntensity + flicker;
    });
  }
}
