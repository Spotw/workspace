import * as THREE from 'three';
import { createTaihuStoneTexture } from './proceduralTextures.ts';

/**
 * Procedural Scholar's Rock / Karst Rockery (Hòn Non Bộ Đá Thái Hồ)
 * Assembled as a composite 3D model with 7-12 interlocking organic karst formations,
 * hollow passages, and weathered mossy crevices.
 */
export class RockeryBuilder {
  private stoneTex: THREE.CanvasTexture;
  private stoneMaterial: THREE.MeshStandardMaterial;
  private mossMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.stoneTex = createTaihuStoneTexture();

    this.stoneMaterial = new THREE.MeshStandardMaterial({
      map: this.stoneTex,
      roughness: 0.85,
      metalness: 0.1,
      color: 0x3d4952,
    });

    this.mossMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d3a24,
      roughness: 0.95,
      metalness: 0.05,
    });
  }

  /**
   * Displaces vertices of a geometry to give weathered limestone karst ridges & holes
   */
  private createKarstNodeGeometry(radius: number, detail: number, seed: number): THREE.BufferGeometry {
    const geom = new THREE.DodecahedronGeometry(radius, detail);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      
      // Multi-octave 3D pseudo noise for craggy limestone
      const n1 = Math.sin(v.x * 2.2 + seed) * Math.cos(v.y * 2.5 + seed * 1.3) * Math.sin(v.z * 2.1);
      const n2 = Math.sin(v.x * 5.1) * Math.sin(v.z * 5.3 + seed) * 0.35;
      const n3 = Math.cos(v.y * 7.4 + seed) * 0.15;
      
      const displacement = 1.0 + (n1 + n2 + n3) * 0.32;
      v.multiplyScalar(displacement);

      // Flatted base so it sits stably in the lake bed
      if (v.y < -radius * 0.7) {
        v.y = -radius * 0.7 + (v.y + radius * 0.7) * 0.2;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Builds the central Karst Non Bộ composition
   */
  public createTaihuRockery(): THREE.Group {
    const rockeryGroup = new THREE.Group();
    rockeryGroup.name = 'TaihuRockery';

    // 1. Central Hero Spire (Cột đá chính cao sừng sững với hốc xuyên tâm)
    const spireGeom = this.createKarstNodeGeometry(1.6, 2, 42);
    spireGeom.scale(0.85, 2.3, 0.95);
    const mainSpire = new THREE.Mesh(spireGeom, this.stoneMaterial);
    mainSpire.position.set(0, 2.6, 0);
    mainSpire.castShadow = true;
    mainSpire.receiveShadow = true;
    rockeryGroup.add(mainSpire);

    // 2. Hollow Eye / Perforation in center (Đặc trưng "Thấu - Lậu" của đá Thái Hồ)
    // We add an arching flank to frame an organic hole
    const archGeom = this.createKarstNodeGeometry(1.2, 2, 88);
    archGeom.scale(0.7, 1.8, 0.65);
    const archFlank = new THREE.Mesh(archGeom, this.stoneMaterial);
    archFlank.position.set(-0.95, 1.8, 0.3);
    archFlank.rotation.z = 0.22;
    archFlank.castShadow = true;
    rockeryGroup.add(archFlank);

    // 3. Right shoulder boulder
    const shoulderGeom = this.createKarstNodeGeometry(1.3, 2, 19);
    shoulderGeom.scale(0.9, 1.4, 0.85);
    const shoulderMesh = new THREE.Mesh(shoulderGeom, this.stoneMaterial);
    shoulderMesh.position.set(0.95, 1.4, -0.2);
    shoulderMesh.rotation.z = -0.18;
    shoulderMesh.castShadow = true;
    rockeryGroup.add(shoulderMesh);

    // 4. Submerged base foundation rocks
    const basePositions = [
      { x: -1.2, y: 0.3, z: -0.6, r: 1.1, s: 7 },
      { x: 1.1, y: 0.25, z: 0.7, r: 0.95, s: 13 },
      { x: 0.2, y: 0.2, z: 1.2, r: 0.85, s: 29 },
      { x: -0.3, y: 0.15, z: -1.1, r: 0.9, s: 51 },
    ];

    basePositions.forEach(b => {
      const bGeom = this.createKarstNodeGeometry(b.r, 1, b.s);
      bGeom.scale(1.2, 0.65, 1.2);
      const bMesh = new THREE.Mesh(bGeom, this.stoneMaterial);
      bMesh.position.set(b.x, b.y, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      rockeryGroup.add(bMesh);
    });

    // 5. Crown Pinnacle & Moss Accents
    const crownGeom = this.createKarstNodeGeometry(0.65, 2, 103);
    crownGeom.scale(0.6, 1.4, 0.6);
    const crown = new THREE.Mesh(crownGeom, this.stoneMaterial);
    crown.position.set(-0.15, 4.4, 0.1);
    crown.castShadow = true;
    rockeryGroup.add(crown);

    // Moss clusters in moist hollow crevices
    const mossGeom = new THREE.DodecahedronGeometry(0.35, 1);
    const mossSpots = [
      { x: -0.6, y: 1.3, z: 0.7 },
      { x: 0.5, y: 2.1, z: 0.4 },
      { x: -0.2, y: 0.8, z: 0.9 },
      { x: 0.7, y: 0.6, z: -0.6 },
    ];
    mossSpots.forEach(m => {
      const mossMesh = new THREE.Mesh(mossGeom, this.mossMaterial);
      mossMesh.position.set(m.x, m.y, m.z);
      mossMesh.scale.set(1.4, 0.4, 1.2);
      rockeryGroup.add(mossMesh);
    });

    return rockeryGroup;
  }
}
