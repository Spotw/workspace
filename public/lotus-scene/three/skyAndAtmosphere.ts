import * as THREE from 'three';
import { createMoonTexture, createFireflyTexture } from './proceduralTextures.ts';

export class SkyAndAtmosphere {
  public group: THREE.Group;
  private moonMesh: THREE.Mesh;
  private moonHaloMesh: THREE.Mesh;
  private fireflies: THREE.Points;
  private fireflyPositions: Float32Array;
  private fireflyInitialPos: Float32Array;
  private fireflyPhases: Float32Array;
  private fireflyCount: number;

  constructor(sceneRadius: number = 60) {
    this.group = new THREE.Group();
    this.group.name = 'SkyAtmosphereGroup';

    // 1. Starfield (Bầu trời sao đêm lấp lánh)
    const starCount = 600;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Hemisphere distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.15); // upper sky
      const r = sceneRadius * 1.5;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starSizes[i] = 1.0 + Math.random() * 2.5;
    }

    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xdff0ff,
      size: 1.4,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeom, starMat);
    this.group.add(stars);

    // 2. Luminous Crescent Moon (Vầng Trăng Khuyết Huyền Ảo)
    const moonTex = createMoonTexture();
    const moonGeom = new THREE.PlaneGeometry(16, 16);
    const moonMat = new THREE.MeshBasicMaterial({
      map: moonTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    // Positioned in the upper right sky matching reference photo
    this.moonMesh.position.set(22, 28, -32);
    this.moonMesh.lookAt(0, 5, 0);
    this.group.add(this.moonMesh);

    // Soft celestial halo around moon
    const haloGeom = new THREE.PlaneGeometry(28, 28);
    const haloMat = new THREE.MeshBasicMaterial({
      map: moonTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.moonHaloMesh = new THREE.Mesh(haloGeom, haloMat);
    this.moonHaloMesh.position.copy(this.moonMesh.position);
    this.moonHaloMesh.position.multiplyScalar(0.98);
    this.moonHaloMesh.lookAt(0, 5, 0);
    this.group.add(this.moonHaloMesh);

    // 3. Floating Fireflies / Spiritual Orbs (Linh Khí & Đom Đóm Phát Sáng)
    this.fireflyCount = 90;
    const fireflyTex = createFireflyTexture();
    const fireflyGeom = new THREE.BufferGeometry();
    this.fireflyPositions = new Float32Array(this.fireflyCount * 3);
    this.fireflyInitialPos = new Float32Array(this.fireflyCount * 3);
    this.fireflyPhases = new Float32Array(this.fireflyCount);

    for (let i = 0; i < this.fireflyCount; i++) {
      // Dispersed over pond and near trees
      const x = (Math.random() - 0.5) * 44;
      const z = (Math.random() - 0.5) * 44;
      const y = 0.4 + Math.random() * 5.5;

      this.fireflyPositions[i * 3] = x;
      this.fireflyPositions[i * 3 + 1] = y;
      this.fireflyPositions[i * 3 + 2] = z;

      this.fireflyInitialPos[i * 3] = x;
      this.fireflyInitialPos[i * 3 + 1] = y;
      this.fireflyInitialPos[i * 3 + 2] = z;

      this.fireflyPhases[i] = Math.random() * Math.PI * 2;
    }

    fireflyGeom.setAttribute('position', new THREE.BufferAttribute(this.fireflyPositions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      map: fireflyTex,
      size: 1.6,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false,
      color: 0x6effc2, // Glowing cyan-emerald spiritual tint
    });

    this.fireflies = new THREE.Points(fireflyGeom, fireflyMat);
    this.group.add(this.fireflies);

    // 4. Perimeter Ancient Trees (Cổ thụ viền quanh khuôn viên)
    this.createPerimeterForest();
  }

  /**
   * Generates natural perimeter barrier of ancient trees (cổ thụ) around garden
   */
  private createPerimeterForest() {
    const treeGroup = new THREE.Group();
    treeGroup.name = 'PerimeterForest';

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x1b140e,
      roughness: 0.9,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x0f2e1c, // Dark nocturnal jade-green foliage
      roughness: 0.8,
      metalness: 0.05,
    });

    // Ring of 24 trees surrounding the pond background
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // Skip the front opening for the camera
      if (angle > -Math.PI * 0.15 && angle < Math.PI * 0.45) continue;

      const dist = 32 + (Math.sin(i * 3.7) * 4);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const singleTree = new THREE.Group();
      // Gnarled Trunk (3 parts)
      const trunkGeom = new THREE.CylinderGeometry(0.5, 0.9, 7 + Math.sin(i) * 2, 8);
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 3.5;
      trunk.castShadow = true;
      singleTree.add(trunk);

      // Canopy foliage clouds (spherical lobes)
      const canopyCount = 4 + Math.floor(Math.random() * 3);
      for (let c = 0; c < canopyCount; c++) {
        const rad = 2.5 + Math.random() * 1.5;
        const leafSphereGeom = new THREE.DodecahedronGeometry(rad, 1);
        const foliage = new THREE.Mesh(leafSphereGeom, foliageMat);
        foliage.position.set(
          (Math.random() - 0.5) * 3.5,
          6.5 + Math.random() * 3.5,
          (Math.random() - 0.5) * 3.5
        );
        foliage.castShadow = true;
        singleTree.add(foliage);
      }

      singleTree.position.set(x, 0, z);
      treeGroup.add(singleTree);
    }

    this.group.add(treeGroup);
  }

  /**
   * Update fireflies and moon glow animation
   */
  public update(elapsed: number, activeCount: number = 90) {
    const pos = this.fireflies.geometry.attributes.position as THREE.BufferAttribute;
    const pArr = pos.array as Float32Array;

    for (let i = 0; i < this.fireflyCount; i++) {
      if (i >= activeCount) {
        // hide inactive fireflies under the water
        pArr[i * 3 + 1] = -100;
        continue;
      }

      const phase = this.fireflyPhases[i];
      const ix = this.fireflyInitialPos[i * 3];
      const iy = this.fireflyInitialPos[i * 3 + 1];
      const iz = this.fireflyInitialPos[i * 3 + 2];

      // Gentle natural sinusoidal floating motion
      pArr[i * 3] = ix + Math.sin(elapsed * 0.7 + phase) * 1.2;
      pArr[i * 3 + 1] = iy + Math.sin(elapsed * 1.3 + phase * 2.0) * 0.6;
      pArr[i * 3 + 2] = iz + Math.cos(elapsed * 0.8 + phase) * 1.2;
    }

    pos.needsUpdate = true;

    // Gentle lunar pulsing halo
    const haloScale = 1.0 + Math.sin(elapsed * 0.5) * 0.05;
    this.moonHaloMesh.scale.set(haloScale, haloScale, 1.0);
  }
}
