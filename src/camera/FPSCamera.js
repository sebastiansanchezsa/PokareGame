import * as THREE from 'three';

export class FPSCamera {
  constructor(camera) {
    this.camera = camera;
    this.time = 0;

    // Base position - seated at the table
    this.basePosition = new THREE.Vector3(0, 1.55, 1.8);
    this.lookTarget = new THREE.Vector3(0, 0.95, -0.5);

    // Idle breathing parameters
    this.breathAmplitude = 0.008;
    this.breathFrequency = 0.4;

    // Subtle head sway
    this.swayAmplitude = 0.003;
    this.swayFrequency = 0.15;

    // Look around parameters
    this.lookRange = { x: 0.3, y: 0.15 };
    this.currentLook = { x: 0, y: 0 };
    this.targetLook = { x: 0, y: 0 };
    this.lookSmoothing = 3;

    // Mouse interaction
    this.mouseEnabled = true;
    this.mouseInfluence = 0.15;

    this.setup();
  }

  setup() {
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookTarget);

    // Mouse move listener for subtle look
    document.addEventListener('mousemove', (e) => {
      if (!this.mouseEnabled) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      this.targetLook.x = nx * this.lookRange.x * this.mouseInfluence;
      this.targetLook.y = -ny * this.lookRange.y * this.mouseInfluence;
    });
  }

  update(delta) {
    this.time += delta;

    // Breathing motion (up/down)
    const breathOffset = Math.sin(this.time * Math.PI * 2 * this.breathFrequency) * this.breathAmplitude;

    // Subtle sway (side to side)
    const swayX = Math.sin(this.time * Math.PI * 2 * this.swayFrequency) * this.swayAmplitude;
    const swayZ = Math.cos(this.time * Math.PI * 2 * this.swayFrequency * 0.7) * this.swayAmplitude * 0.5;

    // Smooth mouse look
    this.currentLook.x += (this.targetLook.x - this.currentLook.x) * delta * this.lookSmoothing;
    this.currentLook.y += (this.targetLook.y - this.currentLook.y) * delta * this.lookSmoothing;

    // Apply position
    this.camera.position.set(
      this.basePosition.x + swayX + this.currentLook.x,
      this.basePosition.y + breathOffset + this.currentLook.y,
      this.basePosition.z + swayZ
    );

    // Look at table center with slight offset from mouse
    const lookX = this.lookTarget.x + this.currentLook.x * 0.5;
    const lookY = this.lookTarget.y + this.currentLook.y * 0.3;
    this.camera.lookAt(lookX, lookY, this.lookTarget.z);
  }
}
