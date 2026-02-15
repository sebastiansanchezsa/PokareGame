import * as THREE from 'three';

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.setup();
  }

  setup() {
    // Strong ambient for visibility
    const ambient = new THREE.AmbientLight(0x443355, 0.9);
    this.scene.add(ambient);

    // Hemisphere - warm sky, cool ground
    const hemi = new THREE.HemisphereLight(0x665588, 0x332244, 0.7);
    this.scene.add(hemi);

    // Neon pink accent light - left
    const pinkLight = new THREE.PointLight(0xff44bb, 2.0, 12);
    pinkLight.position.set(-4, 2.5, -2);
    pinkLight.castShadow = true;
    this.scene.add(pinkLight);
    this.lights.push({ light: pinkLight, baseIntensity: 2.0, phase: 0 });

    // Neon blue accent light - right
    const blueLight = new THREE.PointLight(0x44aaff, 1.8, 12);
    blueLight.position.set(4, 2.5, -2);
    blueLight.castShadow = true;
    this.scene.add(blueLight);
    this.lights.push({ light: blueLight, baseIntensity: 1.8, phase: 1.5 });

    // Purple accent - back wall
    const purpleLight = new THREE.PointLight(0xaa44ff, 1.5, 10);
    purpleLight.position.set(0, 3, -4);
    this.scene.add(purpleLight);
    this.lights.push({ light: purpleLight, baseIntensity: 1.5, phase: 3.0 });

    // Warm fill behind player
    const warmBack = new THREE.PointLight(0xff8844, 0.8, 8);
    warmBack.position.set(0, 2, 4);
    this.scene.add(warmBack);

    // Warm under-table glow
    const warmGlow = new THREE.PointLight(0xff8833, 0.6, 4);
    warmGlow.position.set(0, 0.3, 0);
    this.scene.add(warmGlow);

    // Extra side fills for depth
    const leftFill = new THREE.PointLight(0xff66aa, 0.5, 6);
    leftFill.position.set(-5, 1.5, 1);
    this.scene.add(leftFill);

    const rightFill = new THREE.PointLight(0x6688ff, 0.5, 6);
    rightFill.position.set(5, 1.5, 1);
    this.scene.add(rightFill);
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
