import * as THREE from 'three';

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.setup();
  }

  setup() {
    // Strong ambient for visibility
    const ambient = new THREE.AmbientLight(0x554466, 1.2);
    this.scene.add(ambient);

    // Hemisphere - warm sky, cool ground
    const hemi = new THREE.HemisphereLight(0x887799, 0x443355, 1.0);
    this.scene.add(hemi);

    // Neon pink accent light - left
    const pinkLight = new THREE.PointLight(0xff44bb, 2.5, 14);
    pinkLight.position.set(-4, 2.5, -2);
    pinkLight.castShadow = true;
    this.scene.add(pinkLight);
    this.lights.push({ light: pinkLight, baseIntensity: 2.5, phase: 0 });

    // Neon blue accent light - right
    const blueLight = new THREE.PointLight(0x44aaff, 2.2, 14);
    blueLight.position.set(4, 2.5, -2);
    blueLight.castShadow = true;
    this.scene.add(blueLight);
    this.lights.push({ light: blueLight, baseIntensity: 2.2, phase: 1.5 });

    // Purple accent - back wall
    const purpleLight = new THREE.PointLight(0xaa44ff, 2.0, 12);
    purpleLight.position.set(0, 3, -4);
    this.scene.add(purpleLight);
    this.lights.push({ light: purpleLight, baseIntensity: 2.0, phase: 3.0 });

    // Warm fill behind player
    const warmBack = new THREE.PointLight(0xffaa66, 1.2, 10);
    warmBack.position.set(0, 2, 4);
    this.scene.add(warmBack);

    // Warm under-table glow
    const warmGlow = new THREE.PointLight(0xffaa55, 0.8, 5);
    warmGlow.position.set(0, 0.3, 0);
    this.scene.add(warmGlow);

    // Extra side fills for depth
    const leftFill = new THREE.PointLight(0xff66aa, 0.8, 8);
    leftFill.position.set(-5, 1.5, 1);
    this.scene.add(leftFill);

    const rightFill = new THREE.PointLight(0x6688ff, 0.8, 8);
    rightFill.position.set(5, 1.5, 1);
    this.scene.add(rightFill);

    // Ceiling bounce light for overall brightness
    const ceilingBounce = new THREE.PointLight(0xffddcc, 0.6, 12);
    ceilingBounce.position.set(0, 3.8, 0);
    this.scene.add(ceilingBounce);
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
