import * as THREE from 'three';

export class FPSCamera {
  constructor(camera) {
    this.camera = camera;
    this.time = 0;

    // Base position - seated at the table (Z = seat 1.35 + 0.2 head offset)
    this.basePosition = new THREE.Vector3(0, 1.55, 1.55);
    this.lookTarget = new THREE.Vector3(0, 1.0, 0);

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

    // Touch interaction
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.touchStart = { x: 0, y: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.touchSensitivity = 0.4;

    this.setup();
  }

  setup() {
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookTarget);

    // Mouse move listener for subtle look
    this._onMouseMove = (e) => {
      if (!this.mouseEnabled) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      this.targetLook.x = nx * this.lookRange.x * this.mouseInfluence;
      this.targetLook.y = -ny * this.lookRange.y * this.mouseInfluence;
    };
    document.addEventListener('mousemove', this._onMouseMove);

    // Touch listeners for mobile camera look
    if (this.isMobile) {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        this._onTouchStart = (e) => {
          if (e.touches.length === 1) {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
          }
        };
        this._onTouchMove = (e) => {
          if (!this.mouseEnabled || e.touches.length !== 1) return;
          const touch = e.touches[0];
          const dx = (touch.clientX - this.touchStart.x) / window.innerWidth;
          const dy = (touch.clientY - this.touchStart.y) / window.innerHeight;
          this.touchLook.x = dx * this.touchSensitivity;
          this.touchLook.y = dy * this.touchSensitivity;
          const nx = (touch.clientX / window.innerWidth - 0.5) * 2;
          const ny = (touch.clientY / window.innerHeight - 0.5) * 2;
          this.targetLook.x = Math.max(-this.lookRange.x, Math.min(this.lookRange.x, nx * this.lookRange.x * this.touchSensitivity));
          this.targetLook.y = Math.max(-this.lookRange.y, Math.min(this.lookRange.y, -ny * this.lookRange.y * this.touchSensitivity));
        };
        this._onTouchEnd = () => {
          // Slowly return to center
          this.targetLook.x *= 0.5;
          this.targetLook.y *= 0.5;
        };
        canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
        canvas.addEventListener('touchend', this._onTouchEnd, { passive: true });
      }
    }
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

  dispose() {
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this.isMobile) {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        if (this._onTouchStart) canvas.removeEventListener('touchstart', this._onTouchStart);
        if (this._onTouchMove) canvas.removeEventListener('touchmove', this._onTouchMove);
        if (this._onTouchEnd) canvas.removeEventListener('touchend', this._onTouchEnd);
      }
    }
  }
}
