import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.build();
  }

  build() {
    this.createRoom();
    this.createFloor();
    this.createWalls();
    this.createCeiling();
    this.createDecorations();
    this.createFog();
  }

  createRoom() {
    // Room dimensions
    this.roomWidth = 12;
    this.roomDepth = 10;
    this.roomHeight = 4;
  }

  createFloor() {
    const geo = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e0e12,
      roughness: 0.8,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Wooden plank lines
    for (let i = -5; i <= 5; i++) {
      const lineGeo = new THREE.PlaneGeometry(0.015, this.roomDepth);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x2a1418, transparent: true, opacity: 0.4 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * 1.2, 0.001, 0);
      this.scene.add(line);
    }

    // Subtle ambient fill light from below to brighten table area
    const fillLight = new THREE.HemisphereLight(0x1a1025, 0x0a0508, 0.35);
    this.scene.add(fillLight);

    // Warm ambient for overall brightness
    const ambient = new THREE.AmbientLight(0x201218, 0.5);
    this.scene.add(ambient);
  }

  createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x180a18,
      roughness: 0.85,
      metalness: 0.02,
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomWidth, this.roomHeight),
      wallMat
    );
    backWall.position.set(0, this.roomHeight / 2, -this.roomDepth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomDepth, this.roomHeight),
      wallMat
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-this.roomWidth / 2, this.roomHeight / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomDepth, this.roomHeight),
      wallMat
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(this.roomWidth / 2, this.roomHeight / 2, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Front wall (behind player, partially visible)
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomWidth, this.roomHeight),
      wallMat
    );
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(0, this.roomHeight / 2, this.roomDepth / 2);
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    // Baseboard neon strips
    this.createNeonStrip(-this.roomWidth / 2 + 0.01, 0.05, 0, Math.PI / 2, this.roomDepth, 0xff00ff);
    this.createNeonStrip(this.roomWidth / 2 - 0.01, 0.05, 0, -Math.PI / 2, this.roomDepth, 0x00ccff);
    this.createNeonStrip(0, 0.05, -this.roomDepth / 2 + 0.01, 0, this.roomWidth, 0xff00ff);
    // Subtle front wall strip for depth
    this.createNeonStrip(0, 0.05, this.roomDepth / 2 - 0.01, Math.PI, this.roomWidth, 0x4400aa);
  }

  createNeonStrip(x, y, z, rotY, length, color) {
    const geo = new THREE.PlaneGeometry(length, 0.05);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
    });
    const strip = new THREE.Mesh(geo, mat);
    strip.position.set(x, y, z);
    strip.rotation.y = rotY;
    this.scene.add(strip);

    // Glow light
    const light = new THREE.PointLight(color, 0.5, 4);
    light.position.set(x, y + 0.1, z);
    this.scene.add(light);
  }

  createCeiling() {
    const geo = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0c0812,
      roughness: 0.95,
    });
    const ceiling = new THREE.Mesh(geo, mat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = this.roomHeight;
    this.scene.add(ceiling);
  }

  createDecorations() {
    // Neon sign on back wall - "POKARE"
    this.createNeonSign();

    // Bar shelf on left wall
    this.createShelf(-this.roomWidth / 2 + 0.3, 2.0, -2);

    // Jukebox/music player
    this.createJukebox(this.roomWidth / 2 - 0.8, 0, -3);

    // Hanging lamp over table
    this.createHangingLamp(0, this.roomHeight - 0.2, -0.5);

    // Window with neon outside glow (back wall)
    this.createWindow(3, 2.5, -this.roomDepth / 2 + 0.05);
  }

  createNeonSign() {
    // Backing plate
    const backGeo = new THREE.BoxGeometry(3, 0.8, 0.05);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0a0510, roughness: 0.9 });
    const backing = new THREE.Mesh(backGeo, backMat);
    backing.position.set(0, 3, -this.roomDepth / 2 + 0.1);
    this.scene.add(backing);

    // Neon text glow (represented as glowing boxes)
    const letters = [
      { x: -1.0, w: 0.3 }, // P
      { x: -0.5, w: 0.3 }, // O
      { x: 0.0, w: 0.3 },  // K
      { x: 0.5, w: 0.3 },  // A
      { x: 1.0, w: 0.35 }, // R
      { x: 1.55, w: 0.3 }, // E
    ];

    letters.forEach(l => {
      const geo = new THREE.BoxGeometry(l.w, 0.4, 0.03);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff6ec7,
        transparent: true,
        opacity: 0.9,
      });
      const letter = new THREE.Mesh(geo, mat);
      letter.position.set(l.x, 3, -this.roomDepth / 2 + 0.15);
      this.scene.add(letter);
    });

    // Sign glow light
    const signLight = new THREE.PointLight(0xff6ec7, 2.5, 7);
    signLight.position.set(0, 3, -this.roomDepth / 2 + 1);
    signLight.castShadow = true;
    this.scene.add(signLight);
    this.signLight = signLight;
  }

  createShelf(x, y, z) {
    const shelfGeo = new THREE.BoxGeometry(0.1, 0.03, 1.5);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x2a1520, roughness: 0.8 });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(x, y, z);
    this.scene.add(shelf);

    // Bottles
    for (let i = 0; i < 4; i++) {
      const bottleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
      const colors = [0x2233ff, 0xff2255, 0x22ff88, 0xffaa00];
      const bottleMat = new THREE.MeshStandardMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.8,
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(x + 0.02, y + 0.15, z - 0.5 + i * 0.35);
      this.scene.add(bottle);
    }
  }

  createJukebox(x, y, z) {
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 1.2, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a2a,
      metalness: 0.3,
      roughness: 0.5,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(x, y + 0.6, z);
    body.castShadow = true;
    this.scene.add(body);

    // Screen glow
    const screenGeo = new THREE.PlaneGeometry(0.35, 0.3);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.7,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(x - 0.251, y + 0.9, z);
    screen.rotation.y = -Math.PI / 2;
    this.scene.add(screen);

    // Glow
    const jukeLight = new THREE.PointLight(0x00ccff, 0.5, 3);
    jukeLight.position.set(x - 0.5, y + 0.9, z);
    this.scene.add(jukeLight);
  }

  createHangingLamp(x, y, z) {
    // Wire
    const wireGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.0);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(x, y - 0.5, z);
    this.scene.add(wire);

    // Lamp shade
    const shadeGeo = new THREE.ConeGeometry(0.4, 0.25, 16, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x1a0520,
      side: THREE.DoubleSide,
      metalness: 0.5,
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(x, y - 1.0, z);
    this.scene.add(shade);

    // Lamp bulb glow
    const bulbGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x, y - 1.1, z);
    this.scene.add(bulb);

    // Main table light - warm and bright
    const lampLight = new THREE.SpotLight(0xffd699, 4, 7, Math.PI / 3.5, 0.4, 0.8);
    lampLight.position.set(x, y - 1.0, z);
    lampLight.target.position.set(x, 0, z);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.width = 1024;
    lampLight.shadow.mapSize.height = 1024;
    this.scene.add(lampLight);
    this.scene.add(lampLight.target);

    // Secondary softer fill from lamp
    const fillSpot = new THREE.PointLight(0xffddaa, 1.2, 5);
    fillSpot.position.set(x, y - 1.2, z);
    this.scene.add(fillSpot);
  }

  createWindow(x, y, z) {
    const frameGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a0a15 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    this.scene.add(frame);

    // Window glass with outside glow
    const glassGeo = new THREE.PlaneGeometry(1.0, 0.6);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0x110022,
      transparent: true,
      opacity: 0.7,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(x, y, z + 0.03);
    this.scene.add(glass);

    // Outside neon glow
    const outGlow = new THREE.PointLight(0x8800ff, 0.8, 4);
    outGlow.position.set(x, y, z + 0.5);
    this.scene.add(outGlow);
  }

  createFog() {
    this.scene.fog = new THREE.FogExp2(0x0c0812, 0.045);
  }

  update(time) {
    // Pulsate sign light
    if (this.signLight) {
      this.signLight.intensity = 2 + Math.sin(time * 2) * 0.5;
    }
  }
}
