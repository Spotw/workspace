import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LotusBuilder } from './lotusBuilder.ts';
import { CourtyardBuilder } from './courtyardBuilder.ts';
import { RockeryBuilder } from './rockeryBuilder.ts';
import { WaterSurface } from './waterSurface.ts';
import { SkyAndAtmosphere } from './skyAndAtmosphere.ts';
import { CameraPresetId, LightingMoodId, SceneConfig } from '../types.ts';
import { audioEngine } from '../audio/ambientAudio.ts';

// Pre-allocated reusable module math helpers for zero GC in animation loop
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetCamLookAt = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export class SceneManager {
  private container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private isSoftwareGl: boolean;
  private frameId: number = 0;
  private clock: THREE.Clock;

  // Scene sub-components
  private lotusBuilder: LotusBuilder;
  private courtyardBuilder: CourtyardBuilder;
  private rockeryBuilder: RockeryBuilder;
  private waterSurface: WaterSurface;
  private skyAtmosphere: SkyAndAtmosphere;

  // Lights
  private moonDirectionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private heroLotusPointLight: THREE.PointLight | null = null;
  private heroLotusGroup: THREE.Group | null = null;

  // Camera animation interpolation
  private isTransitioningCamera: boolean = false;
  private camTransitionProgress: number = 1.0;
  private startCamPos = new THREE.Vector3();
  private startCamTarget = new THREE.Vector3();
  private destCamPos = new THREE.Vector3();
  private destCamTarget = new THREE.Vector3();

  // Active configuration
  private config: SceneConfig;

  // Interactive clicked lotuses
  private interactiveFlowers: THREE.Object3D[] = [];

  constructor(container: HTMLElement, initialConfig: SceneConfig) {
    this.container = container;
    this.config = { ...initialConfig };
    this.clock = new THREE.Clock();

    // 1. Software-WebGL Detection Directive
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. High-performance PBR Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // for photo capture
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // 3. Scene and Horizon-matched Night Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050c18);
    this.scene.fog = new THREE.FogExp2(0x050c18, 0.015);

    // 4. Studio Environment Reflection (Mandatory RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Camera & Orbit Controls
    this.camera = new THREE.PerspectiveCamera(
      48,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      250
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.49; // Don't dip below water plane
    this.controls.minDistance = 2;
    this.controls.maxDistance = 65;

    // Cancel automated camera transition on manual user interaction
    this.controls.addEventListener('start', () => {
      this.isTransitioningCamera = false;
    });

    // 6. Lighting Rig
    // Cool moonlight key light
    this.moonDirectionalLight = new THREE.DirectionalLight(0xbadaff, 1.4);
    this.moonDirectionalLight.position.set(22, 28, -30);
    this.moonDirectionalLight.castShadow = !this.isSoftwareGl;
    if (this.moonDirectionalLight.castShadow) {
      this.moonDirectionalLight.shadow.mapSize.width = 1024;
      this.moonDirectionalLight.shadow.mapSize.height = 1024;
      this.moonDirectionalLight.shadow.camera.near = 10;
      this.moonDirectionalLight.shadow.camera.far = 80;
      const d = 25;
      this.moonDirectionalLight.shadow.camera.left = -d;
      this.moonDirectionalLight.shadow.camera.right = d;
      this.moonDirectionalLight.shadow.camera.top = d;
      this.moonDirectionalLight.shadow.camera.bottom = -d;
      this.moonDirectionalLight.shadow.bias = -0.0005;
      this.moonDirectionalLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.moonDirectionalLight);

    // Cool ambient hemisphere fill
    this.hemisphereLight = new THREE.HemisphereLight(0x19283d, 0x07111b, 0.7);
    this.scene.add(this.hemisphereLight);

    // 7. Sub-systems initialization
    this.lotusBuilder = new LotusBuilder();
    this.courtyardBuilder = new CourtyardBuilder();
    this.rockeryBuilder = new RockeryBuilder();
    this.waterSurface = new WaterSurface(90, this.isSoftwareGl);
    this.skyAtmosphere = new SkyAndAtmosphere(50);

    this.scene.add(this.waterSurface.mesh);
    this.scene.add(this.skyAtmosphere.group);

    // Build the Lotus Lake Garden
    this.populateGarden();

    // Initial camera position (Exact Photo Match)
    this.setCameraPreset(this.config.preset, false);

    // Bind event listeners
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

    // Pre-warm shaders
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Start render loop
    this.startLoop();
  }

  /**
   * Assembles the 3D Lotus Garden matching the reference image
   */
  private populateGarden() {
    // 1. Classical Covered Promenade Corridor on the left/background
    const courtyardPromenade = this.courtyardBuilder.createPromenadeCorridor();
    this.scene.add(courtyardPromenade);

    // 2. Central Karst Rockery (Hòn Non Bộ Đá Thái Hồ) in midground pond
    const rockery = this.rockeryBuilder.createTaihuRockery();
    rockery.position.set(0.2, 0.0, -11.5);
    rockery.rotation.y = 0.35;
    this.scene.add(rockery);

    // 3. Hero Foreground Golden Lotuses (Matching the prominent glowing flowers on right & foreground)
    // Primary Hero Golden Lotus (Foreground Right - as seen in photo!)
    const heroGoldenLotus = this.lotusBuilder.createLotusFlower({
      type: 'golden',
      scale: 1.45,
      withLight: true,
      lightIntensity: 3.8,
    });
    heroGoldenLotus.position.set(2.4, 0.35, -2.2);
    heroGoldenLotus.rotation.y = -0.55;
    heroGoldenLotus.rotation.x = -0.08;
    this.scene.add(heroGoldenLotus);
    this.heroLotusGroup = heroGoldenLotus;
    this.interactiveFlowers.push(heroGoldenLotus);

    // Hero Golden Lotus Point Light reference for dynamic controls
    const ptLight = heroGoldenLotus.getObjectByProperty('type', 'PointLight') as THREE.PointLight;
    if (ptLight) this.heroLotusPointLight = ptLight;

    // Secondary Foreground Golden Lotus (Lower Right corner)
    const secondaryGolden1 = this.lotusBuilder.createLotusFlower({
      type: 'golden',
      scale: 1.15,
      withLight: true,
      lightIntensity: 2.2,
    });
    secondaryGolden1.position.set(3.4, 0.22, -0.6);
    secondaryGolden1.rotation.y = 0.4;
    this.scene.add(secondaryGolden1);
    this.interactiveFlowers.push(secondaryGolden1);

    // Foreground Left Golden Lotus
    const leftGoldenLotus = this.lotusBuilder.createLotusFlower({
      type: 'golden',
      scale: 1.1,
      withLight: true,
      lightIntensity: 2.4,
    });
    leftGoldenLotus.position.set(-3.2, 0.25, -2.5);
    leftGoldenLotus.rotation.y = 0.7;
    this.scene.add(leftGoldenLotus);
    this.interactiveFlowers.push(leftGoldenLotus);

    // 4. Lake Surface Lotus Pads (Lá Sen) and Blooming Flowers distribution
    // Layered across the pond
    const lotusPondClusters = [
      // Near hero lotus
      { x: 1.8, z: -1.8, r: 0.9, h: 0.04, leafOnly: true },
      { x: 2.9, z: -2.8, r: 1.1, h: 0.05, leafOnly: true },
      { x: 2.2, z: -3.4, r: 0.8, h: 0.22, flower: 'pink', fScale: 0.85 },
      { x: 3.8, z: -3.0, r: 1.0, h: 0.04, leafOnly: true },

      // Midground around Rockery
      { x: -1.2, z: -8.5, r: 1.2, h: 0.18, flower: 'pink', fScale: 0.95 },
      { x: 1.4, z: -9.0, r: 0.95, h: 0.05, flower: 'golden', fScale: 0.75 },
      { x: -2.4, z: -10.2, r: 1.3, h: 0.28, flower: 'pink', fScale: 0.9 },
      { x: 2.2, z: -10.5, r: 1.1, h: 0.06, leafOnly: true },
      { x: -0.6, z: -12.8, r: 1.0, h: 0.05, leafOnly: true },
      { x: 1.6, z: -13.2, r: 1.2, h: 0.15, flower: 'pink', fScale: 0.8 },

      // In front of covered promenade
      { x: -4.5, z: -6.5, r: 1.2, h: 0.05, flower: 'pink', fScale: 0.8 },
      { x: -3.8, z: -8.0, r: 1.4, h: 0.24, leafOnly: true },
      { x: -5.2, z: -9.8, r: 1.1, h: 0.12, flower: 'golden', fScale: 0.7 },
      { x: -6.0, z: -12.0, r: 1.3, h: 0.05, leafOnly: true },

      // Wide pond scatter
      { x: 0.3, z: -4.8, r: 1.1, h: 0.05, flower: 'pink', fScale: 0.7 },
      { x: -1.5, z: -4.2, r: 1.3, h: 0.06, leafOnly: true },
      { x: -2.8, z: -4.0, r: 0.9, h: 0.15, flower: 'golden', fScale: 0.8 },
      { x: 0.8, z: -6.5, r: 1.2, h: 0.04, leafOnly: true },
      { x: 3.2, z: -7.5, r: 1.0, h: 0.05, flower: 'pink', fScale: 0.75 },
      { x: 4.5, z: -9.2, r: 1.3, h: 0.16, leafOnly: true },
      { x: -0.8, z: -15.0, r: 1.2, h: 0.05, flower: 'pink', fScale: 0.7 },
      { x: 2.0, z: -16.5, r: 1.1, h: 0.05, leafOnly: true },
    ];

    lotusPondClusters.forEach((c, idx) => {
      // Leaf pad
      const leaf = this.lotusBuilder.createLotusLeaf(c.r, c.h);
      leaf.position.set(c.x, 0.02, c.z);
      leaf.rotation.y = idx * 0.73;
      this.scene.add(leaf);

      // Associated flower if specified
      if (c.flower) {
        const flower = this.lotusBuilder.createLotusFlower({
          type: c.flower as 'golden' | 'pink',
          scale: c.fScale ?? 0.8,
          withLight: c.flower === 'golden',
          lightIntensity: 1.5,
        });
        flower.position.set(c.x + 0.25, c.h + 0.12, c.z + 0.15);
        flower.rotation.y = idx * 1.1;
        this.scene.add(flower);
        this.interactiveFlowers.push(flower);
      }
    });
  }

  /**
   * Set Camera Presets with smooth exponential damping
   */
  public setCameraPreset(presetId: CameraPresetId, smooth: boolean = true) {
    const presets: Record<CameraPresetId, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
      // 1. EXACT Reference Image View
      photo_match: {
        pos: [-0.6, 1.35, 4.2],
        lookAt: [0.8, 1.4, -9.5],
      },
      // 2. Hero Golden Lotus Close-Up
      golden_lotus: {
        pos: [2.1, 0.95, -0.6],
        lookAt: [2.4, 0.55, -2.2],
      },
      // 3. Classical Covered Pavilion & Lantern Promenade
      pavilion: {
        pos: [-7.8, 2.2, -4.5],
        lookAt: [-12.5, 2.0, -14.0],
      },
      // 4. Central Karst Rockery (Taihu Non Bộ)
      rockery: {
        pos: [0.0, 2.2, -4.8],
        lookAt: [0.2, 2.2, -11.5],
      },
      // 5. Panoramic Wide Angle Lake View
      wide_panoramic: {
        pos: [0.0, 7.5, 12.0],
        lookAt: [0.0, 1.5, -9.0],
      },
      // 6. Moonlit Celestial Sky View
      moon_view: {
        pos: [1.5, 1.8, 1.5],
        lookAt: [18.0, 24.0, -28.0],
      },
    };

    const target = presets[presetId] || presets.photo_match;

    if (!smooth || this.isSoftwareGl) {
      this.camera.position.set(...target.pos);
      this.controls.target.set(...target.lookAt);
      this.controls.update();
      this.isTransitioningCamera = false;
    } else {
      this.startCamPos.copy(this.camera.position);
      this.startCamTarget.copy(this.controls.target);
      this.destCamPos.set(...target.pos);
      this.destCamTarget.set(...target.lookAt);
      this.camTransitionProgress = 0.0;
      this.isTransitioningCamera = true;
    }
  }

  /**
   * Update Lighting Mood (Mystic Night / Golden Moon / Twilight)
   */
  public setLightingMood(moodId: LightingMoodId) {
    if (moodId === 'mystic_night') {
      this.scene.background = new THREE.Color(0x050c18);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x050c18);
      this.moonDirectionalLight.color.setHex(0xbadaff);
      this.moonDirectionalLight.intensity = 1.4;
      this.hemisphereLight.color.setHex(0x19283d);
      this.renderer.toneMappingExposure = 1.15;
    } else if (moodId === 'golden_moon') {
      this.scene.background = new THREE.Color(0x090b14);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x090b14);
      this.moonDirectionalLight.color.setHex(0xffeaad);
      this.moonDirectionalLight.intensity = 1.8;
      this.hemisphereLight.color.setHex(0x28231c);
      this.renderer.toneMappingExposure = 1.25;
    } else if (moodId === 'twilight_dusk') {
      this.scene.background = new THREE.Color(0x140e21);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x140e21);
      this.moonDirectionalLight.color.setHex(0xdbb7ff);
      this.moonDirectionalLight.intensity = 1.2;
      this.hemisphereLight.color.setHex(0x321e42);
      this.renderer.toneMappingExposure = 1.1;
    }
  }

  /**
   * Update runtime configuration
   */
  public updateConfig(newConfig: Partial<SceneConfig>) {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.lotusGlowMultiplier !== undefined) {
      this.lotusBuilder.setGoldenGlowIntensity(newConfig.lotusGlowMultiplier);
      if (this.heroLotusPointLight) {
        this.heroLotusPointLight.intensity = 3.8 * newConfig.lotusGlowMultiplier;
      }
    }

    if (newConfig.preset !== undefined) {
      this.setCameraPreset(newConfig.preset, true);
    }

    if (newConfig.mood !== undefined) {
      this.setLightingMood(newConfig.mood);
    }
  }

  /**
   * Pointer down handler: click to chime & wave lotus petals
   */
  private onPointerDown = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_mouse, this.camera);
    const intersects = _raycaster.intersectObjects(this.interactiveFlowers, true);

    if (intersects.length > 0) {
      // Lotus chime sound effect
      audioEngine.playLotusChime();

      // Gentle interactive flutter animation
      const hitObj = intersects[0].object;
      let targetGroup: THREE.Object3D | null = hitObj;
      while (targetGroup && !targetGroup.name.includes('Lotus') && targetGroup.parent) {
        targetGroup = targetGroup.parent;
      }
      if (targetGroup) {
        const origScale = targetGroup.scale.clone();
        targetGroup.scale.multiplyScalar(1.15);
        setTimeout(() => {
          targetGroup?.scale.copy(origScale);
        }, 320);
      }
    }
  };

  /**
   * Responsive window resize handler
   */
  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Software WebGL fenceSync pacing directive
   */
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  /**
   * Continuous animation render tick
   */
  private tick = () => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 1. Water ripples animation
    this.waterSurface.update(elapsed, this.config.waterRippleSpeed);

    // 2. Fireflies and celestial lunar halo animation
    this.skyAtmosphere.update(elapsed, this.config.fireflyCount);

    // 3. Gentle breathing pulse for hero golden lotus
    if (this.heroLotusGroup) {
      const breath = 1.0 + Math.sin(elapsed * 1.8) * 0.025;
      this.heroLotusGroup.scale.set(1.45 * breath, 1.45 * breath, 1.45 * breath);
    }

    // 4. Smooth Camera Preset transitions
    if (this.isTransitioningCamera) {
      this.camTransitionProgress += delta * 1.5;
      const t = Math.min(1.0, this.camTransitionProgress);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(this.startCamPos, this.destCamPos, ease);
      this.controls.target.lerpVectors(this.startCamTarget, this.destCamTarget, ease);
      this.controls.update();

      if (t >= 1.0) {
        this.isTransitioningCamera = false;
      }
    } else {
      // Auto-rotation when enabled
      if (this.config.autoRotate && !this.isSoftwareGl) {
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
      } else {
        this.controls.autoRotate = false;
      }
      this.controls.update();
    }

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);

    // 6. Schedule next frame adhering to Three.js skill directive
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public startLoop() {
    this.clock.start();
    this.tick();
  }

  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public dispose() {
    if (this.isSoftwareGl) {
      clearTimeout(this.frameId);
    } else {
      cancelAnimationFrame(this.frameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
