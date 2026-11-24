import * as THREE from 'three';
import {
  createWoodLacquerTexture,
  createRoofTileTexture,
  createLanternTexture,
} from './proceduralTextures.ts';

export class CourtyardBuilder {
  private woodTex: THREE.CanvasTexture;
  private tileTex: THREE.CanvasTexture;
  private lanternTex: THREE.CanvasTexture;

  private woodMaterial: THREE.MeshStandardMaterial;
  private stonePlinthMaterial: THREE.MeshStandardMaterial;
  private roofMaterial: THREE.MeshStandardMaterial;
  private lanternMaterial: THREE.MeshStandardMaterial;
  private windowPaperMaterial: THREE.MeshStandardMaterial;
  private figureMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.woodTex = createWoodLacquerTexture();
    this.tileTex = createRoofTileTexture();
    this.lanternTex = createLanternTexture();

    this.woodMaterial = new THREE.MeshStandardMaterial({
      map: this.woodTex,
      roughness: 0.45,
      metalness: 0.15,
      color: 0x4a2215,
    });

    this.stonePlinthMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b313a,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.roofMaterial = new THREE.MeshStandardMaterial({
      map: this.tileTex,
      roughness: 0.5,
      metalness: 0.25,
      color: 0x222831,
    });

    this.lanternMaterial = new THREE.MeshStandardMaterial({
      map: this.lanternTex,
      emissive: 0xff7722,
      emissiveIntensity: 1.2,
      roughness: 0.35,
      metalness: 0.05,
    });

    this.windowPaperMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd580,
      emissive: 0xff9922,
      emissiveIntensity: 0.7,
      roughness: 0.6,
    });

    this.figureMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8eef5,
      roughness: 0.7,
      metalness: 0.05,
    });
  }

  /**
   * Builds the curved covered promenade corridor (hành lang đình viện)
   */
  public createPromenadeCorridor(): THREE.Group {
    const pavilionGroup = new THREE.Group();
    pavilionGroup.name = 'PavilionPromenade';

    // The promenade forms a gentle curved arc along the shore (R ~ 24m)
    // We compose it of 7 connected bays/sections
    const bayCount = 7;
    const startAngle = -Math.PI * 0.75;
    const endAngle = -Math.PI * 0.25;
    const radius = 22;

    const lanternLights: THREE.PointLight[] = [];

    for (let i = 0; i <= bayCount; i++) {
      const t = i / bayCount;
      const angle = startAngle + t * (endAngle - startAngle);
      const nextAngle = startAngle + ((i + 1) / bayCount) * (endAngle - startAngle);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const nextX = Math.cos(nextAngle) * radius;
      const nextZ = Math.sin(nextAngle) * radius;

      // 1. Pillar pair (outer facing lake, inner facing courtyard)
      const outerPillarGeom = new THREE.CylinderGeometry(0.14, 0.16, 3.4, 12);
      const outerPillar = new THREE.Mesh(outerPillarGeom, this.woodMaterial);
      outerPillar.position.set(x, 1.7, z);
      outerPillar.castShadow = true;
      pavilionGroup.add(outerPillar);

      // Inner pillar (offset radially inward by 2.6m)
      const innerX = Math.cos(angle) * (radius - 2.6);
      const innerZ = Math.sin(angle) * (radius - 2.6);
      const innerPillar = new THREE.Mesh(outerPillarGeom, this.woodMaterial);
      innerPillar.position.set(innerX, 1.7, innerZ);
      innerPillar.castShadow = true;
      pavilionGroup.add(innerPillar);

      // Stone plinth under pillars
      const plinthGeom = new THREE.BoxGeometry(0.5, 0.3, 0.5);
      const plinthOuter = new THREE.Mesh(plinthGeom, this.stonePlinthMaterial);
      plinthOuter.position.set(x, 0.15, z);
      pavilionGroup.add(plinthOuter);

      const plinthInner = new THREE.Mesh(plinthGeom, this.stonePlinthMaterial);
      plinthInner.position.set(innerX, 0.15, innerZ);
      pavilionGroup.add(plinthInner);

      // 2. Crossbeams and longitudinal beams (xà ngang, xà dọc)
      if (i < bayCount) {
        // Wooden walkway floor between bays
        const floorLen = Math.hypot(nextX - x, nextZ - z);
        const floorAngle = Math.atan2(nextZ - z, nextX - x);
        const floorGeom = new THREE.BoxGeometry(floorLen, 0.2, 2.7);
        const floorMesh = new THREE.Mesh(floorGeom, this.woodMaterial);
        const midX = (x + nextX + innerX + Math.cos(nextAngle) * (radius - 2.6)) * 0.25;
        const midZ = (z + nextZ + innerZ + Math.sin(nextAngle) * (radius - 2.6)) * 0.25;
        floorMesh.position.set(midX, 0.25, midZ);
        floorMesh.rotation.y = -floorAngle;
        floorMesh.receiveShadow = true;
        pavilionGroup.add(floorMesh);

        // Stone foundation plinth beneath floor
        const baseGeom = new THREE.BoxGeometry(floorLen, 0.4, 2.9);
        const baseMesh = new THREE.Mesh(baseGeom, this.stonePlinthMaterial);
        baseMesh.position.set(midX, -0.05, midZ);
        baseMesh.rotation.y = -floorAngle;
        pavilionGroup.add(baseMesh);

        // Top Roof Section for this bay (sweeping curved eaves)
        const roofLen = floorLen * 1.15;
        const roofWidth = 3.8;
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-roofWidth * 0.5, 0);
        // Concave curved sweep up to the ridge
        roofShape.quadraticCurveTo(-roofWidth * 0.2, 0.5, 0, 1.1);
        roofShape.quadraticCurveTo(roofWidth * 0.2, 0.5, roofWidth * 0.5, 0);
        roofShape.lineTo(roofWidth * 0.46, -0.15);
        roofShape.quadraticCurveTo(roofWidth * 0.18, 0.35, 0, 0.9);
        roofShape.quadraticCurveTo(-roofWidth * 0.18, 0.35, -roofWidth * 0.46, -0.15);
        roofShape.closePath();

        const extrudeSettings = {
          steps: 2,
          depth: roofLen,
          bevelEnabled: true,
          bevelThickness: 0.08,
          bevelSize: 0.08,
          bevelSegments: 2,
        };
        const roofGeom = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        const roofMesh = new THREE.Mesh(roofGeom, this.roofMaterial);
        roofMesh.position.set(x, 3.4, z);
        roofMesh.rotation.y = -floorAngle - Math.PI / 2;
        roofMesh.castShadow = true;
        pavilionGroup.add(roofMesh);

        // Wooden lattice back wall with glowing paper windows
        const windowWallGeom = new THREE.BoxGeometry(floorLen, 2.2, 0.1);
        const windowWall = new THREE.Mesh(windowWallGeom, this.windowPaperMaterial);
        const backX = (innerX + Math.cos(nextAngle) * (radius - 2.6)) * 0.5;
        const backZ = (innerZ + Math.sin(nextAngle) * (radius - 2.6)) * 0.5;
        windowWall.position.set(backX, 1.8, backZ);
        windowWall.rotation.y = -floorAngle;
        pavilionGroup.add(windowWall);

        // Decorative wooden lattice ribs on window
        const latticeGeom = new THREE.BoxGeometry(floorLen, 0.08, 0.14);
        for (let l = 0; l < 4; l++) {
          const lat = new THREE.Mesh(latticeGeom, this.woodMaterial);
          lat.position.set(backX, 0.9 + l * 0.55, backZ);
          lat.rotation.y = -floorAngle;
          pavilionGroup.add(lat);
        }

        // Lake-facing carved wooden railing & balustrade (lan can)
        const railingGeom = new THREE.BoxGeometry(floorLen, 0.08, 0.1);
        const topRailing = new THREE.Mesh(railingGeom, this.woodMaterial);
        const lakeEdgeX = (x + nextX) * 0.5;
        const lakeEdgeZ = (z + nextZ) * 0.5;
        topRailing.position.set(lakeEdgeX, 1.1, lakeEdgeZ);
        topRailing.rotation.y = -floorAngle;
        pavilionGroup.add(topRailing);

        const bottomRailing = new THREE.Mesh(railingGeom, this.woodMaterial);
        bottomRailing.position.set(lakeEdgeX, 0.5, lakeEdgeZ);
        bottomRailing.rotation.y = -floorAngle;
        pavilionGroup.add(bottomRailing);

        // Veranda bench seat (băng ghế thủy tạ)
        const benchGeom = new THREE.BoxGeometry(floorLen, 0.1, 0.5);
        const bench = new THREE.Mesh(benchGeom, this.woodMaterial);
        bench.position.set(lakeEdgeX - Math.sin(-floorAngle) * 0.3, 0.65, lakeEdgeZ - Math.cos(-floorAngle) * 0.3);
        bench.rotation.y = -floorAngle;
        pavilionGroup.add(bench);

        // 3. Hanging glowing Chinese/Vietnamese Lantern (Lồng Đèn Thủy Tạ)
        const lanternGroup = new THREE.Group();
        // Thin brass suspension hook & cord
        const cordGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4);
        const cordMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
        const cord = new THREE.Mesh(cordGeom, cordMat);
        cord.position.y = 0.25;
        lanternGroup.add(cord);

        // Lantern body (faceted spherical paper lantern)
        const bodyGeom = new THREE.SphereGeometry(0.28, 14, 12);
        bodyGeom.scale(1, 1.25, 1);
        const lanternBody = new THREE.Mesh(bodyGeom, this.lanternMaterial);
        lanternGroup.add(lanternBody);

        // Top cap & bottom rim
        const capGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12);
        const topCap = new THREE.Mesh(capGeom, this.woodMaterial);
        topCap.position.y = 0.34;
        lanternGroup.add(topCap);

        const bottomCap = new THREE.Mesh(capGeom, this.woodMaterial);
        bottomCap.position.y = -0.34;
        lanternGroup.add(bottomCap);

        // Silk tassel hanging below
        const tasselGeom = new THREE.ConeGeometry(0.05, 0.35, 8);
        const tasselMat = new THREE.MeshStandardMaterial({ color: 0xb52410, roughness: 0.6 });
        const tassel = new THREE.Mesh(tasselGeom, tasselMat);
        tassel.rotation.x = Math.PI;
        tassel.position.y = -0.55;
        lanternGroup.add(tassel);

        // Position lantern under bay center eaves
        const lanternX = (lakeEdgeX + backX) * 0.5;
        const lanternZ = (lakeEdgeZ + backZ) * 0.5;
        lanternGroup.position.set(lanternX, 2.7, lanternZ);
        pavilionGroup.add(lanternGroup);

        // Warm lantern point light casting soft glow on corridor and water
        const lanternLight = new THREE.PointLight(0xff9433, 1.6, 7.5, 1.8);
        lanternLight.position.set(lanternX, 2.3, lanternZ);
        pavilionGroup.add(lanternLight);
        lanternLights.push(lanternLight);
      }
    }

    // 4. Sitting figures (tiên hiệp / thi nhân ngồi ngắm cảnh hồ sen đêm trăng như trong ảnh)
    // Place them in bay 2 on the veranda bench looking out at the golden lotus
    const bayIdx = 2;
    const tFig = (bayIdx + 0.45) / bayCount;
    const figAngle = startAngle + tFig * (endAngle - startAngle);
    const fx = Math.cos(figAngle) * (radius - 0.5);
    const fz = Math.sin(figAngle) * (radius - 0.5);

    const figuresGroup = this.createSittingFigures();
    figuresGroup.position.set(fx, 0.65, fz);
    figuresGroup.rotation.y = -figAngle - Math.PI / 2;
    pavilionGroup.add(figuresGroup);

    return pavilionGroup;
  }

  /**
   * Creates two traditional seated figures in flowing robes looking at the lake
   */
  private createSittingFigures(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ContemplatingPoets';

    // Figure 1 (White / Jade flowing robes - Tiên nhân áo trắng)
    const fig1 = new THREE.Group();
    // Torso / robe
    const torsoGeom = new THREE.ConeGeometry(0.24, 0.75, 10);
    const robe1Mat = new THREE.MeshStandardMaterial({ color: 0xebf2f8, roughness: 0.7 });
    const torso1 = new THREE.Mesh(torsoGeom, robe1Mat);
    torso1.position.y = 0.38;
    fig1.add(torso1);

    // Head with topknot (búi tóc quan ngọc)
    const headGeom = new THREE.SphereGeometry(0.1, 10, 10);
    const head1 = new THREE.Mesh(headGeom, this.figureMaterial);
    head1.position.y = 0.85;
    fig1.add(head1);

    const hairGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.09, 8);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const topknot1 = new THREE.Mesh(hairGeom, hairMat);
    topknot1.position.y = 0.98;
    fig1.add(topknot1);

    // Legs seated on bench
    const legsGeom = new THREE.BoxGeometry(0.3, 0.18, 0.35);
    const legs1 = new THREE.Mesh(legsGeom, robe1Mat);
    legs1.position.set(0, 0.1, 0.1);
    fig1.add(legs1);

    fig1.position.set(-0.25, 0, 0);
    group.add(fig1);

    // Figure 2 (Deep Teal / Indigo robes - Giai nhân áo xanh)
    const fig2 = new THREE.Group();
    const robe2Mat = new THREE.MeshStandardMaterial({ color: 0x224959, roughness: 0.7 });
    const torso2 = new THREE.Mesh(torsoGeom, robe2Mat);
    torso2.position.y = 0.35;
    fig2.add(torso2);

    const head2 = new THREE.Mesh(headGeom, this.figureMaterial);
    head2.position.y = 0.8;
    fig2.add(head2);

    const topknot2 = new THREE.Mesh(hairGeom, hairMat);
    topknot2.position.y = 0.92;
    fig2.add(topknot2);

    const legs2 = new THREE.Mesh(legsGeom, robe2Mat);
    legs2.position.set(0, 0.09, 0.1);
    fig2.add(legs2);

    fig2.position.set(0.25, 0, -0.05);
    group.add(fig2);

    return group;
  }
}
