import * as THREE from 'three';
import { createWaterNormalTexture } from './proceduralTextures.ts';

export class WaterSurface {
  public mesh: THREE.Mesh;
  public normalMap: THREE.CanvasTexture;
  private material: THREE.MeshPhysicalMaterial;

  constructor(size: number = 80, isSoftwareGl: boolean = false) {
    this.normalMap = createWaterNormalTexture();
    this.normalMap.repeat.set(16, 16);

    // Lake water geometry with subdivision for smooth specular response
    const geom = new THREE.PlaneGeometry(size, size, 48, 48);
    geom.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshPhysicalMaterial({
      color: 0x051a24, // Deep nocturnal jade/indigo pond water
      roughness: 0.08,
      metalness: 0.1,
      normalMap: this.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      ior: 1.333,
      transmission: isSoftwareGl ? 0 : 0.45,
      transparent: true,
      opacity: 0.92,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.y = 0.0;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'LotusPondWater';
  }

  /**
   * Animates water wave ripples each frame
   */
  public update(time: number, speedMultiplier: number = 1.0) {
    const s = 0.018 * speedMultiplier;
    this.normalMap.offset.x = (time * s) % 1;
    this.normalMap.offset.y = (time * s * 0.7) % 1;
  }
}
