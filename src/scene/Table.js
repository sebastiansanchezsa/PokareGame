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
    // Oval poker table shape using ellipse
    const shape = new THREE.Shape();
    const rx = 2.0; // radius x
    const ry = 1.2; // radius y
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
      color: 0x1a0a20,
      roughness: 0.4,
      metalness: 0.3,
    });

    const tableTop = new THREE.Mesh(geo, mat);
    tableTop.rotation.x = -Math.PI / 2;
    tableTop.position.y = 0.85;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.group.add(tableTop);
  }

  createFelt() {
    // Green felt surface (slightly above table top)
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

    const geo = new THREE.ShapeGeometry(shape, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a3a20,
      roughness: 0.85,
      metalness: 0.0,
    });

    const felt = new THREE.Mesh(geo, mat);
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.95;
    felt.receiveShadow = true;
    this.group.add(felt);
    this.felt = felt;
  }

  createTableRail() {
    // Padded rail around the table
    const curve = new THREE.EllipseCurve(0, 0, 2.05, 1.25, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(64);
    const path = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p.x, 0.95, p.y))
    );
    path.closed = true;

    const railGeo = new THREE.TubeGeometry(path, 64, 0.06, 8, true);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x2a0a2a,
      roughness: 0.6,
      metalness: 0.2,
    });

    const rail = new THREE.Mesh(railGeo, railMat);
    rail.castShadow = true;
    this.group.add(rail);
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
