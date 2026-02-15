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
    this.roomWidth = 12;
    this.roomDepth = 10;
    this.roomHeight = 4;
  }

  // ===== CANVAS TEXTURE GENERATORS =====
  generateBrickTexture(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // Base wall color - warm dark red/brown
    ctx.fillStyle = '#3d2020';
    ctx.fillRect(0, 0, w, h);

    const bw = 48, bh = 22, gap = 3;
    for (let row = 0; row < Math.ceil(h / (bh + gap)); row++) {
      const offsetX = (row % 2) * (bw / 2);
      for (let col = -1; col < Math.ceil(w / (bw + gap)) + 1; col++) {
        const x = col * (bw + gap) + offsetX;
        const y = row * (bh + gap);

        // Vary brick color
        const r = 85 + Math.random() * 40;
        const g = 30 + Math.random() * 20;
        const b = 25 + Math.random() * 15;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, bw, bh);

        // Subtle highlight on top edge
        ctx.fillStyle = `rgba(255,200,150,${0.05 + Math.random() * 0.06})`;
        ctx.fillRect(x, y, bw, 2);

        // Shadow on bottom edge
        ctx.fillStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.08})`;
        ctx.fillRect(x, y + bh - 2, bw, 2);
      }
    }

    // Mortar noise
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 80 : 40},${Math.random() > 0.5 ? 30 : 15},${Math.random() > 0.5 ? 25 : 10},${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  generateCarpetTexture(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // Deep casino red base
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#6b1a2a');
    grad.addColorStop(0.6, '#4d1220');
    grad.addColorStop(1, '#3a0e18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Diamond pattern (casino carpet style)
    ctx.strokeStyle = 'rgba(180,120,60,0.12)';
    ctx.lineWidth = 1.5;
    const spacing = 40;
    for (let x = 0; x < w; x += spacing) {
      for (let y = 0; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, y - spacing / 2);
        ctx.lineTo(x + spacing / 2, y);
        ctx.lineTo(x, y + spacing / 2);
        ctx.lineTo(x - spacing / 2, y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Gold ornamental border lines
    ctx.strokeStyle = 'rgba(200,168,78,0.15)';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, w - 80, h - 80);
    ctx.strokeRect(55, 55, w - 110, h - 110);

    // Carpet fiber noise
    for (let i = 0; i < 30000; i++) {
      const a = Math.random() * 0.06;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 200 : 80},${Math.random() > 0.5 ? 60 : 20},${Math.random() > 0.5 ? 50 : 30},${a})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }

    // Corner flourishes
    const corners = [[60, 60], [w - 60, 60], [60, h - 60], [w - 60, h - 60]];
    corners.forEach(([cx, cy]) => {
      ctx.strokeStyle = 'rgba(200,168,78,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.stroke();
    });

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  generatePaintingTexture(w, h, style) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    if (style === 'landscape') {
      // Night city skyline
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a0020');
      skyGrad.addColorStop(0.5, '#1a0040');
      skyGrad.addColorStop(1, '#330055');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
      // Buildings
      for (let i = 0; i < 12; i++) {
        const bx = i * (w / 12);
        const bh2 = h * 0.3 + Math.random() * h * 0.4;
        ctx.fillStyle = `rgba(${20 + Math.random() * 30},${5 + Math.random() * 15},${30 + Math.random() * 30},0.9)`;
        ctx.fillRect(bx, h - bh2, w / 14, bh2);
        // Windows
        for (let wy = h - bh2 + 5; wy < h - 5; wy += 8) {
          for (let wx = bx + 3; wx < bx + w / 14 - 3; wx += 6) {
            if (Math.random() > 0.4) {
              ctx.fillStyle = `rgba(255,${180 + Math.random() * 75},${50 + Math.random() * 100},${0.3 + Math.random() * 0.5})`;
              ctx.fillRect(wx, wy, 3, 4);
            }
          }
        }
      }
      // Neon reflections
      ctx.fillStyle = 'rgba(255,110,199,0.05)';
      ctx.fillRect(0, h * 0.7, w, h * 0.3);
    } else {
      // Abstract poker art
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#1a0a15');
      bgGrad.addColorStop(1, '#0a0520');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      // Card suits in artistic arrangement
      ctx.font = `bold ${h * 0.6}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
      const colors = ['rgba(255,255,255,0.15)', 'rgba(255,50,80,0.15)', 'rgba(255,50,80,0.12)', 'rgba(255,255,255,0.12)'];
      ctx.fillStyle = colors[Math.floor(Math.random() * 4)];
      ctx.fillText(suits[Math.floor(Math.random() * 4)], w / 2, h / 2);
      // Gold accent line
      ctx.strokeStyle = 'rgba(200,168,78,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.85);
      ctx.lineTo(w * 0.9, h * 0.85);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ===== FLOOR =====
  createFloor() {
    const carpetTex = this.generateCarpetTexture(1024, 800);
    const geo = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth);
    geo.attributes.uv.array.forEach((v, i) => {
      // Stretch UV to cover full carpet
    });
    const mat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.92,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  // ===== WALLS =====
  createWalls() {
    const brickTex = this.generateBrickTexture(512, 256);
    brickTex.repeat.set(3, 2);

    const wallMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.85,
      metalness: 0.02,
    });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomHeight), wallMat);
    backWall.position.set(0, this.roomHeight / 2, -this.roomDepth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const brickTexL = this.generateBrickTexture(512, 256);
    brickTexL.repeat.set(2.5, 2);
    brickTexL.wrapS = THREE.RepeatWrapping; brickTexL.wrapT = THREE.RepeatWrapping;
    const wallMatL = new THREE.MeshStandardMaterial({ map: brickTexL, roughness: 0.85, metalness: 0.02 });
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomDepth, this.roomHeight), wallMatL);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-this.roomWidth / 2, this.roomHeight / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomDepth, this.roomHeight), wallMatL.clone());
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(this.roomWidth / 2, this.roomHeight / 2, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomHeight), wallMat.clone());
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(0, this.roomHeight / 2, this.roomDepth / 2);
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    // Baseboard - dark wood trim along floor
    const baseGeo = new THREE.BoxGeometry(this.roomWidth + 0.1, 0.15, 0.06);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a1510, roughness: 0.6, metalness: 0.1 });
    const baseBack = new THREE.Mesh(baseGeo, baseMat);
    baseBack.position.set(0, 0.075, -this.roomDepth / 2 + 0.03);
    this.scene.add(baseBack);

    // Neon strips
    this.createNeonStrip(-this.roomWidth / 2 + 0.01, 0.18, 0, Math.PI / 2, this.roomDepth, 0xff00ff);
    this.createNeonStrip(this.roomWidth / 2 - 0.01, 0.18, 0, -Math.PI / 2, this.roomDepth, 0x00ccff);
    this.createNeonStrip(0, 0.18, -this.roomDepth / 2 + 0.01, 0, this.roomWidth, 0xff00ff);
  }

  createNeonStrip(x, y, z, rotY, length, color) {
    const geo = new THREE.PlaneGeometry(length, 0.04);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const strip = new THREE.Mesh(geo, mat);
    strip.position.set(x, y, z);
    strip.rotation.y = rotY;
    this.scene.add(strip);

    const light = new THREE.PointLight(color, 0.6, 4);
    light.position.set(x, y + 0.1, z);
    this.scene.add(light);
  }

  // ===== CEILING =====
  createCeiling() {
    const geo = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth);
    const mat = new THREE.MeshStandardMaterial({ color: 0x251828, roughness: 0.85 });
    const ceiling = new THREE.Mesh(geo, mat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = this.roomHeight;
    this.scene.add(ceiling);

    // Crown molding (gold trim at ceiling edge)
    const moldGeo = new THREE.BoxGeometry(this.roomWidth + 0.1, 0.08, 0.06);
    const moldMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, roughness: 0.3, metalness: 0.7 });
    const moldBack = new THREE.Mesh(moldGeo, moldMat);
    moldBack.position.set(0, this.roomHeight - 0.04, -this.roomDepth / 2 + 0.03);
    this.scene.add(moldBack);
  }

  // ===== DECORATIONS =====
  createDecorations() {
    this.createNeonSign();

    // Bar shelf on left wall
    this.createShelf(-this.roomWidth / 2 + 0.3, 2.0, -2);
    this.createShelf(-this.roomWidth / 2 + 0.3, 2.6, -1);

    // Jukebox
    this.createJukebox(this.roomWidth / 2 - 0.8, 0, -3);

    // Hanging lamp
    this.createHangingLamp(0, this.roomHeight - 0.2, -0.5);

    // Windows
    this.createWindow(3, 2.5, -this.roomDepth / 2 + 0.05);
    this.createWindow(-3, 2.5, -this.roomDepth / 2 + 0.05);

    // Wall sconces (gold bracket style)
    this.createSconce(-this.roomWidth / 2 + 0.15, 2.5, 2, Math.PI / 2, 0xffcc66);
    this.createSconce(this.roomWidth / 2 - 0.15, 2.5, 2, -Math.PI / 2, 0xffcc66);
    this.createSconce(-this.roomWidth / 2 + 0.15, 2.5, -1, Math.PI / 2, 0xffcc66);
    this.createSconce(this.roomWidth / 2 - 0.15, 2.5, -1, -Math.PI / 2, 0xffcc66);

    // Luxurious gilt picture frames
    this.createLuxuryFrame(-2.5, 2.3, -this.roomDepth / 2 + 0.06, 'landscape');
    this.createLuxuryFrame(2.5, 2.3, -this.roomDepth / 2 + 0.06, 'abstract');
    this.createLuxuryFrame(-this.roomWidth / 2 + 0.06, 2.3, 2.5, 'landscape', Math.PI / 2);
    this.createLuxuryFrame(this.roomWidth / 2 - 0.06, 2.3, -2.5, 'abstract', -Math.PI / 2);

    // Gold statues
    this.createGoldStatue(-this.roomWidth / 2 + 0.7, 0, 3.5);
    this.createGoldStatue(this.roomWidth / 2 - 0.7, 0, 3.5);
    this.createGoldStatue(-this.roomWidth / 2 + 0.7, 0, -3.5);
    this.createGoldStatue(this.roomWidth / 2 - 0.7, 0, -3.5);

    // Neon clock
    this.createNeonClock(this.roomWidth / 2 - 0.06, 3.2, 0);

    // Velvet rope stanchions near entrance
    this.createStanchion(-2, 0, 4);
    this.createStanchion(2, 0, 4);
  }

  createNeonSign() {
    const backGeo = new THREE.BoxGeometry(3, 0.8, 0.05);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x150a10, roughness: 0.9 });
    const backing = new THREE.Mesh(backGeo, backMat);
    backing.position.set(0, 3, -this.roomDepth / 2 + 0.1);
    this.scene.add(backing);

    const letters = [
      { x: -1.0, w: 0.3 }, { x: -0.5, w: 0.3 }, { x: 0.0, w: 0.3 },
      { x: 0.5, w: 0.3 }, { x: 1.0, w: 0.35 }, { x: 1.55, w: 0.3 },
    ];

    letters.forEach(l => {
      const geo = new THREE.BoxGeometry(l.w, 0.4, 0.03);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff6ec7, transparent: true, opacity: 0.9 });
      const letter = new THREE.Mesh(geo, mat);
      letter.position.set(l.x, 3, -this.roomDepth / 2 + 0.15);
      this.scene.add(letter);
    });

    const signLight = new THREE.PointLight(0xff6ec7, 3.0, 8);
    signLight.position.set(0, 3, -this.roomDepth / 2 + 1);
    signLight.castShadow = true;
    this.scene.add(signLight);
    this.signLight = signLight;
  }

  createShelf(x, y, z) {
    const shelfGeo = new THREE.BoxGeometry(0.1, 0.03, 1.5);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3a1a10, roughness: 0.7, metalness: 0.1 });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(x, y, z);
    this.scene.add(shelf);

    for (let i = 0; i < 4; i++) {
      const bottleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
      const colors = [0x2244ff, 0xff3366, 0x22ff88, 0xffaa00];
      const bottleMat = new THREE.MeshStandardMaterial({
        color: colors[i], transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.8,
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(x + 0.02, y + 0.15, z - 0.5 + i * 0.35);
      this.scene.add(bottle);
    }
  }

  createJukebox(x, y, z) {
    const bodyGeo = new THREE.BoxGeometry(0.5, 1.2, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a1535, metalness: 0.4, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(x, y + 0.6, z);
    body.castShadow = true;
    this.scene.add(body);

    // Gold trim on jukebox
    const trimGeo = new THREE.BoxGeometry(0.52, 0.04, 0.42);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.7, roughness: 0.3 });
    const trimTop = new THREE.Mesh(trimGeo, trimMat);
    trimTop.position.set(x, y + 1.22, z);
    this.scene.add(trimTop);

    const screenGeo = new THREE.PlaneGeometry(0.35, 0.3);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(x - 0.251, y + 0.9, z);
    screen.rotation.y = -Math.PI / 2;
    this.scene.add(screen);

    const jukeLight = new THREE.PointLight(0x00ccff, 0.6, 3);
    jukeLight.position.set(x - 0.5, y + 0.9, z);
    this.scene.add(jukeLight);
  }

  createHangingLamp(x, y, z) {
    // Chain (multiple links)
    for (let i = 0; i < 5; i++) {
      const linkGeo = new THREE.TorusGeometry(0.015, 0.003, 4, 8);
      const linkMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.8, roughness: 0.2 });
      const link = new THREE.Mesh(linkGeo, linkMat);
      link.position.set(x, y - 0.15 - i * 0.15, z);
      link.rotation.x = (i % 2) * Math.PI / 2;
      this.scene.add(link);
    }

    // Lamp shade - gold/dark
    const shadeGeo = new THREE.ConeGeometry(0.4, 0.25, 16, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x2a1020, side: THREE.DoubleSide, metalness: 0.4,
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(x, y - 1.0, z);
    this.scene.add(shade);

    // Gold trim on shade
    const shadeRingGeo = new THREE.TorusGeometry(0.4, 0.008, 6, 32);
    const shadeRingMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.8, roughness: 0.2 });
    const shadeRing = new THREE.Mesh(shadeRingGeo, shadeRingMat);
    shadeRing.position.set(x, y - 1.12, z);
    shadeRing.rotation.x = Math.PI / 2;
    this.scene.add(shadeRing);

    // Bulb
    const bulbGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x, y - 1.1, z);
    this.scene.add(bulb);

    // Main spotlight - bright and warm
    const lampLight = new THREE.SpotLight(0xffeedd, 5, 8, Math.PI / 3, 0.3, 0.7);
    lampLight.position.set(x, y - 1.0, z);
    lampLight.target.position.set(x, 0, z);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.width = 1024;
    lampLight.shadow.mapSize.height = 1024;
    this.scene.add(lampLight);
    this.scene.add(lampLight.target);

    const fillSpot = new THREE.PointLight(0xffeecc, 1.5, 6);
    fillSpot.position.set(x, y - 1.2, z);
    this.scene.add(fillSpot);
  }

  createWindow(x, y, z) {
    // Ornate frame
    const frameGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.5, metalness: 0.2 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    this.scene.add(frame);

    // Gold border on frame
    const borderGeo = new THREE.BoxGeometry(1.28, 0.88, 0.02);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, roughness: 0.3, metalness: 0.7 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(x, y, z - 0.01);
    this.scene.add(border);

    const glassGeo = new THREE.PlaneGeometry(1.0, 0.6);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x150030, transparent: true, opacity: 0.6 });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(x, y, z + 0.03);
    this.scene.add(glass);

    const outGlow = new THREE.PointLight(0x9944ff, 1.0, 5);
    outGlow.position.set(x, y, z + 0.5);
    this.scene.add(outGlow);
  }

  createSconce(x, y, z, rotY, color) {
    // Gold bracket
    const bracketGeo = new THREE.BoxGeometry(0.04, 0.15, 0.08);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.7, roughness: 0.3 });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.position.set(x, y, z);
    this.scene.add(bracket);

    // Arm
    const armGeo = new THREE.BoxGeometry(0.12, 0.02, 0.03);
    const arm = new THREE.Mesh(armGeo, bracketMat);
    const offset = rotY > 0 ? 0.08 : -0.08;
    arm.position.set(x + offset, y + 0.05, z);
    this.scene.add(arm);

    // Glass bulb
    const bulbGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x + offset * 2, y + 0.05, z);
    this.scene.add(bulb);

    const light = new THREE.PointLight(color, 1.0, 5);
    light.position.set(x + offset * 2.5, y + 0.05, z);
    this.scene.add(light);
  }

  createLuxuryFrame(x, y, z, style, rotY = 0) {
    const painting = this.generatePaintingTexture(256, 160, style);

    // Ornate gold frame
    const frameW = 0.85, frameH = 0.6;
    const outerGeo = new THREE.BoxGeometry(frameW + 0.1, frameH + 0.1, 0.04);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, roughness: 0.25, metalness: 0.8 });
    const outer = new THREE.Mesh(outerGeo, goldMat);
    outer.position.set(x, y, z);
    outer.rotation.y = rotY;
    this.scene.add(outer);

    // Inner dark inset
    const innerGeo = new THREE.BoxGeometry(frameW - 0.02, frameH - 0.02, 0.02);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x1a0a08, roughness: 0.9 });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(x, y, z);
    inner.rotation.y = rotY;
    this.scene.add(inner);

    // Painting canvas
    const canvasGeo = new THREE.PlaneGeometry(frameW - 0.06, frameH - 0.06);
    const canvasMat = new THREE.MeshBasicMaterial({ map: painting });
    const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
    const fwd = new THREE.Vector3(0, 0, 0.025).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    canvasMesh.position.set(x + fwd.x, y, z + fwd.z);
    canvasMesh.rotation.y = rotY;
    this.scene.add(canvasMesh);

    // Spotlight on painting
    const spotGeo = new THREE.SpotLight(0xffeecc, 0.5, 3, Math.PI / 6, 0.5, 1);
    spotGeo.position.set(x, y + 0.6, z);
    spotGeo.target.position.set(x, y, z);
    this.scene.add(spotGeo);
    this.scene.add(spotGeo.target);
  }

  createGoldStatue(x, y, z) {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4a847, roughness: 0.2, metalness: 0.9,
    });

    // Pedestal
    const pedGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x2a1818, roughness: 0.5, metalness: 0.15 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(x, y + 0.3, z);
    ped.castShadow = true;
    this.scene.add(ped);

    // Gold trim on pedestal
    const pedTrimGeo = new THREE.BoxGeometry(0.32, 0.04, 0.32);
    const pedTrim = new THREE.Mesh(pedTrimGeo, goldMat);
    pedTrim.position.set(x, y + 0.62, z);
    this.scene.add(pedTrim);

    // Statue body (stylized abstract figure)
    const bodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8);
    const body = new THREE.Mesh(bodyGeo, goldMat);
    body.position.set(x, y + 0.9, z);
    body.castShadow = true;
    this.scene.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(x, y + 1.2, z);
    this.scene.add(head);

    // Arms (small cylinders)
    [-1, 1].forEach(side => {
      const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6);
      const arm = new THREE.Mesh(armGeo, goldMat);
      arm.position.set(x + side * 0.1, y + 0.95, z);
      arm.rotation.z = side * 0.6;
      this.scene.add(arm);
    });

    // Holding a chip (disc)
    const chipGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xff6ec7, metalness: 0.5, roughness: 0.3 });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.position.set(x, y + 1.05, z + 0.08);
    chip.rotation.x = Math.PI / 4;
    this.scene.add(chip);

    // Soft spotlight on statue
    const light = new THREE.PointLight(0xffd700, 0.4, 2.5);
    light.position.set(x, y + 1.4, z);
    this.scene.add(light);
  }

  createStanchion(x, y, z) {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc8a84e, metalness: 0.8, roughness: 0.2 });

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.9, 8);
    const pole = new THREE.Mesh(poleGeo, goldMat);
    pole.position.set(x, y + 0.45, z);
    this.scene.add(pole);

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.04, 12);
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.set(x, y + 0.02, z);
    this.scene.add(base);

    // Top ball
    const ballGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const ball = new THREE.Mesh(ballGeo, goldMat);
    ball.position.set(x, y + 0.92, z);
    this.scene.add(ball);
  }

  createNeonClock(x, y, z) {
    const faceGeo = new THREE.CircleGeometry(0.25, 32);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x150a12, roughness: 0.9 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(x, y, z);
    face.rotation.y = -Math.PI / 2;
    this.scene.add(face);

    const ringGeo = new THREE.TorusGeometry(0.25, 0.015, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    ring.rotation.y = -Math.PI / 2;
    this.scene.add(ring);

    const clockLight = new THREE.PointLight(0x00ffaa, 0.5, 3);
    clockLight.position.set(x - 0.3, y, z);
    this.scene.add(clockLight);
  }

  createFog() {
    this.scene.fog = new THREE.FogExp2(0x201428, 0.006);
  }

  update(time) {
    if (this.signLight) {
      this.signLight.intensity = 3.0 + Math.sin(time * 2) * 0.5;
    }
  }
}
