import * as THREE from 'three';

export class Table {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.build();
    this.scene.add(this.group);
  }

  build() {
    this.createTableTop();
    this.createTableRail();
    this.createTableLegs();
    this.createFelt();
    this.createDealerButton();
  }

  createTableTop() {
    const shape = new THREE.Shape();
    const rx = 2.0;
    const ry = 1.2;
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a1008,
      roughness: 0.5,
      metalness: 0.15,
    });

    const tableTop = new THREE.Mesh(geo, mat);
    tableTop.rotation.x = -Math.PI / 2;
    tableTop.position.y = 0.85;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.group.add(tableTop);
  }

  createFeltTexture() {
    const w = 1024, h = 600;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Base green felt gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    grad.addColorStop(0, '#1a6b3a');
    grad.addColorStop(0.7, '#145a2e');
    grad.addColorStop(1, '#0e4422');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Felt noise texture (subtle fiber pattern)
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const a = Math.random() * 0.08;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${a})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Center oval line (betting area)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Dealer spot
    ctx.beginPath();
    ctx.arc(w * 0.68, h * 0.7, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // POKARE text watermark
    ctx.fillStyle = 'rgba(255, 215, 0, 0.04)';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POKARE', w / 2, h / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  createFelt() {
    const shape = new THREE.Shape();
    const rx = 1.85;
    const ry = 1.05;
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    const feltTex = this.createFeltTexture();
    const geo = new THREE.ShapeGeometry(shape, 64);
    const mat = new THREE.MeshStandardMaterial({
      map: feltTex,
      color: 0x1a8a40,
      roughness: 0.92,
      metalness: 0.0,
      bumpScale: 0.003,
    });

    const felt = new THREE.Mesh(geo, mat);
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.95;
    felt.receiveShadow = true;
    this.group.add(felt);
    this.felt = felt;
  }

  createTableRail() {
    const curve = new THREE.EllipseCurve(0, 0, 2.05, 1.25, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(64);
    const path = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p.x, 0.95, p.y))
    );
    path.closed = true;

    // Padded leather rail
    const railGeo = new THREE.TubeGeometry(path, 64, 0.065, 12, true);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3a1810,
      roughness: 0.7,
      metalness: 0.08,
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.castShadow = true;
    this.group.add(rail);

    // Gold trim ring on top of rail
    const trimGeo = new THREE.TubeGeometry(path, 64, 0.008, 6, true);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xc8a84e,
      roughness: 0.2,
      metalness: 0.8,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = 0.06;
    this.group.add(trim);
  }

  createTableLegs() {
    const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.85, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x1a0820,
      metalness: 0.5,
      roughness: 0.3,
    });

    const positions = [
      [-1.4, 0.425, -0.6],
      [1.4, 0.425, -0.6],
      [-1.4, 0.425, 0.6],
      [1.4, 0.425, 0.6],
    ];

    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.group.add(leg);
    });
  }

  createDealerButton() {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.1,
    });
    this.dealerButton = new THREE.Mesh(geo, mat);
    this.dealerButton.position.set(0.8, 0.96, 0.5);
    this.group.add(this.dealerButton);
  }

  // Get positions around the table for players
  getPlayerPositions(numPlayers) {
    const positions = [];
    // Player 0 is always at the front (the human player)
    // Others distributed around the table
    const baseAngles = {
      1: [Math.PI],
      2: [Math.PI * 0.65, Math.PI * 1.35],
      3: [Math.PI * 0.5, Math.PI, Math.PI * 1.5],
      4: [Math.PI * 0.45, Math.PI * 0.85, Math.PI * 1.15, Math.PI * 1.55],
    };

    const angles = baseAngles[numPlayers] || baseAngles[3];

    // Human player position
    positions.push({
      seat: new THREE.Vector3(0, 0.96, 1.35),
      lookAt: new THREE.Vector3(0, 0.96, 0),
      cardPos: new THREE.Vector3(0, 0.965, 0.85),
      betPos: new THREE.Vector3(0, 0.96, 0.55),
      angle: 0,
    });

    // Bot positions
    angles.forEach(angle => {
      const rx = 1.6;
      const ry = 0.95;
      const x = Math.cos(angle) * rx;
      const z = Math.sin(angle) * ry;
      positions.push({
        seat: new THREE.Vector3(x, 0.96, z),
        lookAt: new THREE.Vector3(0, 0.96, 0),
        cardPos: new THREE.Vector3(x * 0.7, 0.965, z * 0.7),
        betPos: new THREE.Vector3(x * 0.45, 0.96, z * 0.45),
        angle: angle,
      });
    });

    return positions;
  }

  // Get community card positions
  getCommunityPositions() {
    const positions = [];
    const startX = -0.5;
    for (let i = 0; i < 5; i++) {
      positions.push(new THREE.Vector3(startX + i * 0.25, 0.965, -0.1));
    }
    return positions;
  }

  moveDealerButton(position) {
    if (this.dealerButton && position) {
      this.dealerButton.position.x = position.x + 0.15;
      this.dealerButton.position.z = position.z + 0.1;
    }
  }
}
