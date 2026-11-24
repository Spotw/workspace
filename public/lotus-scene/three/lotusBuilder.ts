import * as THREE from 'three';
import {
  createGoldenLotusPetalTexture,
  createPinkLotusPetalTexture,
  createLotusLeafTexture,
} from './proceduralTextures.ts';

export interface LotusFlowerOptions {
  type: 'golden' | 'pink' | 'bud';
  scale?: number;
  bloomProgress?: number; // 0 = closed bud, 1 = fully open
  withLight?: boolean;
  lightIntensity?: number;
}

/**
 * Creates a curved, boat-shaped lotus petal geometry using parametric curves
 */
function createPetalGeometry(width: number, length: number, cupping: number): THREE.BufferGeometry {
  const segmentsU = 16;
  const segmentsV = 16;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segmentsV; iv++) {
    const v = iv / segmentsV; // 0 = base, 1 = tip
    const y = v * length;
    
    // Petal width profile: narrow base, wide middle, tapered pointed tip
    const widthFactor = Math.sin(v * Math.PI) * Math.pow(1 - v * 0.25, 0.5);
    const halfW = (width * 0.5) * widthFactor;
    
    // Cup curve (petal curls inward)
    const cupZ = Math.sin(v * Math.PI * 0.8) * cupping * 1.2;

    for (let iu = 0; iu <= segmentsU; iu++) {
      const u = iu / segmentsU; // 0 to 1 across width
      const signedU = (u - 0.5) * 2; // -1 to +1
      
      const x = signedU * halfW;
      // Arch across petal cross section
      const crossArch = (1 - signedU * signedU) * cupping * 0.4;
      const z = cupZ + crossArch;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Create grid faces
  for (let iv = 0; iv < segmentsV; iv++) {
    for (let iu = 0; iu < segmentsU; iu++) {
      const a = iv * (segmentsU + 1) + iu;
      const b = (iv + 1) * (segmentsU + 1) + iu;
      const c = (iv + 1) * (segmentsU + 1) + (iu + 1);
      const d = iv * (segmentsU + 1) + (iu + 1);

      // Two triangles per quad
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a Lotus Leaf geometry with natural concave saucer shape and V-shaped notch
 */
export function createLotusLeafGeometry(radius: number): THREE.BufferGeometry {
  const segments = 48;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Center point
  positions.push(0, 0, 0);
  uvs.push(0.5, 0.5);

  // Rim points with a notch (open angle ~ 25 degrees)
  const notchAngle = Math.PI * 0.12;
  const startAngle = notchAngle;
  const endAngle = Math.PI * 2 - notchAngle;
  const angleRange = endAngle - startAngle;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * angleRange;
    
    // Natural wavy edge
    const edgeWave = Math.sin(angle * 7) * 0.04 + Math.cos(angle * 13) * 0.02;
    const r = radius * (1 + edgeWave);

    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    // Upturned saucer rim
    const y = Math.pow(r / radius, 2.2) * (radius * 0.18) + Math.sin(angle * 4) * 0.03;

    positions.push(x, y, z);
    uvs.push(0.5 + (x / (radius * 2.2)), 0.5 + (z / (radius * 2.2)));
  }

  // Triangles from center
  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export class LotusBuilder {
  private goldenPetalTex: THREE.CanvasTexture;
  private pinkPetalTex: THREE.CanvasTexture;
  private leafTex: THREE.CanvasTexture;

  // Shared materials for high performance
  private goldenPetalMaterial: THREE.MeshPhysicalMaterial;
  private pinkPetalMaterial: THREE.MeshPhysicalMaterial;
  private receptacleMaterial: THREE.MeshStandardMaterial;
  private stamenMaterial: THREE.MeshStandardMaterial;
  private stalkMaterial: THREE.MeshStandardMaterial;
  private leafMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.goldenPetalTex = createGoldenLotusPetalTexture();
    this.pinkPetalTex = createPinkLotusPetalTexture();
    this.leafTex = createLotusLeafTexture();

    // Golden Lotus PBR Physical Material: Translucent, glowing amber/gold with subsurface-like transmission
    this.goldenPetalMaterial = new THREE.MeshPhysicalMaterial({
      map: this.goldenPetalTex,
      color: 0xffe28a,
      emissive: 0xff9c22,
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
      depthWrite: true,
    });

    // Pink Lotus PBR Material
    this.pinkPetalMaterial = new THREE.MeshPhysicalMaterial({
      map: this.pinkPetalTex,
      color: 0xffffff,
      emissive: 0xd4497a,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.6,
      side: THREE.DoubleSide,
    });

    // Golden Lotus Seed Head / Receptacle (Đài Sen)
    this.receptacleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc433,
      emissive: 0x9e6804,
      emissiveIntensity: 0.6,
      roughness: 0.45,
      metalness: 0.2,
    });

    // Stamen ring (Nhụy sen)
    this.stamenMaterial = new THREE.MeshStandardMaterial({
      color: 0xffef9e,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.3,
    });

    // Lotus Stalk (Cuống sen)
    this.stalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x224b2b,
      roughness: 0.65,
      metalness: 0.1,
    });

    // Lotus Leaf
    this.leafMaterial = new THREE.MeshStandardMaterial({
      map: this.leafTex,
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Builds a multi-part composite Lotus Flower model (THREE.Group with 3-12 parts)
   */
  public createLotusFlower(options: LotusFlowerOptions): THREE.Group {
    const group = new THREE.Group();
    group.name = options.type === 'golden' ? 'HeroGoldenLotus' : 'LotusFlower';
    const scale = options.scale ?? 1.0;
    const isGolden = options.type === 'golden';
    const petalMat = isGolden ? this.goldenPetalMaterial : this.pinkPetalMaterial;

    // 1. Part 1: Lotus Stalk (Cuống sen uốn mềm mại)
    const stalkCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, -1.2, 0),
      new THREE.Vector3(0.08, -0.6, 0.04),
      new THREE.Vector3(-0.04, -0.2, -0.02),
      new THREE.Vector3(0, 0, 0)
    );
    const stalkGeom = new THREE.TubeGeometry(stalkCurve, 16, 0.038, 8, false);
    const stalkMesh = new THREE.Mesh(stalkGeom, this.stalkMaterial);
    stalkMesh.castShadow = true;
    group.add(stalkMesh);

    // 2. Part 2: Lotus Seed Head / Receptacle (Đài Sen hình nón cụt)
    const receptacleGeom = new THREE.CylinderGeometry(0.24, 0.12, 0.2, 18);
    const receptacleMesh = new THREE.Mesh(receptacleGeom, this.receptacleMaterial);
    receptacleMesh.position.y = 0.08;
    group.add(receptacleMesh);

    // Seed indentations on top of receptacle
    const seedGeom = new THREE.SphereGeometry(0.022, 8, 8);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0x4a7322, roughness: 0.5 });
    for (let s = 0; s < 12; s++) {
      const seedMesh = new THREE.Mesh(seedGeom, seedMat);
      const angle = (s / 12) * Math.PI * 2;
      const dist = s < 4 ? 0.07 : 0.16;
      seedMesh.position.set(Math.cos(angle) * dist, 0.18, Math.sin(angle) * dist);
      group.add(seedMesh);
    }

    // 3. Part 3: Stamen Ring (Vòng nhụy hoa sen tua tủa bao quanh đài)
    const stamenCount = 36;
    const stamenInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.16, 5),
      this.stamenMaterial,
      stamenCount
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < stamenCount; i++) {
      const angle = (i / stamenCount) * Math.PI * 2;
      const r = 0.22;
      dummy.position.set(Math.cos(angle) * r, 0.15, Math.sin(angle) * r);
      dummy.rotation.x = 0.15 * Math.sin(angle);
      dummy.rotation.z = -0.15 * Math.cos(angle);
      dummy.rotation.y = angle;
      dummy.updateMatrix();
      stamenInst.setMatrixAt(i, dummy.matrix);
    }
    stamenInst.instanceMatrix.needsUpdate = true;
    group.add(stamenInst);

    // 4. Petals: 3 Distinct concentric tiers
    // Tier 1: Outer Petals (broad, open, flaring)
    const outerPetalGeom = createPetalGeometry(0.42, 0.95, 0.16);
    const outerCount = 9;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2;
      const petalMesh = new THREE.Mesh(outerPetalGeom, petalMat);
      petalMesh.position.set(Math.cos(angle) * 0.18, 0.05, Math.sin(angle) * 0.18);
      petalMesh.rotation.y = -angle + Math.PI / 2;
      petalMesh.rotation.x = Math.PI * 0.38; // flared outward
      petalMesh.castShadow = true;
      group.add(petalMesh);
    }

    // Tier 2: Middle Petals (standing upright, cupping inward)
    const midPetalGeom = createPetalGeometry(0.36, 0.85, 0.18);
    const midCount = 8;
    for (let i = 0; i < midCount; i++) {
      const angle = (i / midCount) * Math.PI * 2 + (Math.PI / outerCount);
      const petalMesh = new THREE.Mesh(midPetalGeom, petalMat);
      petalMesh.position.set(Math.cos(angle) * 0.14, 0.08, Math.sin(angle) * 0.14);
      petalMesh.rotation.y = -angle + Math.PI / 2;
      petalMesh.rotation.x = Math.PI * 0.24;
      petalMesh.castShadow = true;
      group.add(petalMesh);
    }

    // Tier 3: Inner Petals (tender blooming core)
    const innerPetalGeom = createPetalGeometry(0.28, 0.65, 0.14);
    const innerCount = 7;
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2;
      const petalMesh = new THREE.Mesh(innerPetalGeom, petalMat);
      petalMesh.position.set(Math.cos(angle) * 0.1, 0.12, Math.sin(angle) * 0.1);
      petalMesh.rotation.y = -angle + Math.PI / 2;
      petalMesh.rotation.x = Math.PI * 0.14;
      group.add(petalMesh);
    }

    // 5. Part 5: Warm Point Light & Core Glow if enabled
    if (options.withLight) {
      const lightColor = isGolden ? 0xffb732 : 0xff88aa;
      const pointLight = new THREE.PointLight(lightColor, options.lightIntensity ?? 3.5, 6, 1.8);
      pointLight.position.set(0, 0.35, 0);
      pointLight.castShadow = false; // keep software webgl safe
      group.add(pointLight);

      // Subtle luminous halo mesh at center
      const haloGeom = new THREE.SphereGeometry(0.3, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: lightColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      const haloMesh = new THREE.Mesh(haloGeom, haloMat);
      haloMesh.position.y = 0.25;
      group.add(haloMesh);
    }

    // Set overall scale and bottom center pivot
    group.scale.set(scale, scale, scale);
    return group;
  }

  /**
   * Creates a Lotus Leaf on water or elevated stalk
   */
  public createLotusLeaf(radius: number, elevatedHeight: number = 0): THREE.Group {
    const leafGroup = new THREE.Group();
    leafGroup.name = 'LotusLeaf';

    const leafGeom = createLotusLeafGeometry(radius);
    const leafMesh = new THREE.Mesh(leafGeom, this.leafMaterial);
    leafMesh.receiveShadow = true;
    leafMesh.castShadow = elevatedHeight > 0.1;
    leafGroup.add(leafMesh);

    // If elevated above water, add supporting stalk
    if (elevatedHeight > 0.05) {
      const stalkCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, -elevatedHeight, 0),
        new THREE.Vector3(0.04, -elevatedHeight * 0.5, 0.02),
        new THREE.Vector3(-0.02, -elevatedHeight * 0.2, -0.01),
        new THREE.Vector3(0, 0, 0)
      );
      const stalkGeom = new THREE.TubeGeometry(stalkCurve, 12, 0.035, 8, false);
      const stalk = new THREE.Mesh(stalkGeom, this.stalkMaterial);
      stalk.castShadow = true;
      leafGroup.add(stalk);
    }

    return leafGroup;
  }

  /**
   * Set dynamic glow intensity for golden lotuses
   */
  public setGoldenGlowIntensity(intensity: number) {
    this.goldenPetalMaterial.emissiveIntensity = 0.85 * intensity;
  }
}
