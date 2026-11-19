import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PERIODS } from "./coffee-time.js";

export function createPourOver(host, card, controls, onBloom, onUnavailable) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  let renderer, environment, pmrem, frame = 0, disposed = false;
  const listeners = [];
  let observer;
  const scene = new THREE.Scene();
  function listen(target, event, callback, options) {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    listeners.forEach(remove => remove());
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    textures.forEach(item => item.dispose());
    scene.traverse(item => { item.shadow?.dispose(); if (item.isInstancedMesh) item.dispose(); });
    environment?.dispose();
    pmrem?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    card.style.removeProperty("transform");
  }
  try {
    // Keep the static reduced-motion frame available to browser compositing/capture.
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    const gl = renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const software = /swiftshader|llvmpipe|software|basic render/i.test(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "");
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, software ? 1 : 1.7));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = software ? THREE.PCFShadowMap : THREE.VSMShadowMap;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "button");
    canvas.setAttribute("aria-label", "Bình V60 3D. Nhấn Enter hoặc chạm vào bình để kích hoạt bloom.");
    host.appendChild(canvas);
    listen(canvas, "webglcontextlost", event => { event.preventDefault(); dispose(); onUnavailable(); });

    pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 30);
    camera.position.set(3.7, 4.1, 6.3);
    camera.lookAt(0, 1.35, 0);
    const model = new THREE.Group();
    model.rotation.y = -0.22;
    scene.add(model);
    const assembly = new THREE.Group();
    model.add(assembly);

    function material(options, physical = false) {
      const result = physical ? new THREE.MeshPhysicalMaterial(options) : new THREE.MeshStandardMaterial(options);
      materials.add(result);
      return result;
    }
    function mesh(geometry, surface, parent = assembly) {
      geometries.add(geometry);
      const result = new THREE.Mesh(geometry, surface);
      result.castShadow = true;
      result.receiveShadow = true;
      parent.add(result);
      return result;
    }
    function lathe(points, surface, parent = assembly) {
      return mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 64), surface, parent);
    }
    function texture(kind) {
      const surface = document.createElement("canvas");
      surface.width = surface.height = 256;
      const ctx = surface.getContext("2d");
      // Seeded grain keeps the still life consistent after resizing and remounting.
      let seed = 47;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      ctx.fillStyle = kind === "wood" ? "#65412a" : kind === "bloom" ? "#482d1c" : kind === "brass" ? "#af8d51" : "#ded0b7";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < (kind === "bloom" ? 1300 : 650); i++) {
        const x = random() * 256, y = random() * 256;
        ctx.beginPath();
        if (kind === "wood" || kind === "brass") {
          ctx.strokeStyle = kind === "wood" ? `rgba(33,16,6,${random() * .35})` : `rgba(255,235,177,${random() * .3})`;
          ctx.moveTo(x, y); ctx.bezierCurveTo(x + 20, y + 1, x + 45, y - 3, x + 90, y + 1); ctx.stroke();
        } else {
          ctx.fillStyle = kind === "bloom" ? ["#674126", "#a17a4d", "#2e1c12", "#b08b56"][i % 4] : ["#b5a28a", "#f3e8d5", "#b98c6b", "#c4b399"][i % 4];
          ctx.ellipse(x, y, random() * (kind === "bloom" ? 2 : 4) + .4, random() * 2 + .4, random() * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (kind === "bloom") for (let i = 0; i < 26; i++) {
        const x = random() * 256, y = random() * 256, r = 2 + random() * 5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = "#24170d"; ctx.fill();
        ctx.strokeStyle = "#bd965e"; ctx.lineWidth = 1.2; ctx.stroke();
      }
      const result = new THREE.CanvasTexture(surface);
      result.colorSpace = THREE.SRGBColorSpace;
      result.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      textures.add(result);
      return result;
    }
    function softTexture(steam = false) {
      const surface = document.createElement("canvas"); surface.width = surface.height = 128;
      const ctx = surface.getContext("2d");
      const gradient = ctx.createRadialGradient(64, 64, 3, 64, 64, 64);
      gradient.addColorStop(0, steam ? "rgba(255,249,227,.65)" : "rgba(48,28,12,.34)");
      gradient.addColorStop(.45, steam ? "rgba(255,247,222,.2)" : "rgba(48,28,12,.13)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
      const result = new THREE.CanvasTexture(surface); textures.add(result); return result;
    }

    const stone = material({ map: texture("stone"), roughness: .88, color: 0xf0e1ca });
    lathe([[0, .02], [1.23, .02], [1.29, .06], [1.29, .13], [1.23, .17], [0, .17]], stone);
    const glass = material({ color: 0xfff4e3, roughness: .06, metalness: 0, transmission: software ? 0 : .96, thickness: .13, ior: 1.52, transparent: true, opacity: software ? .22 : .78, depthWrite: false, side: THREE.DoubleSide }, true);
    const vessel = lathe([[.08, .19], [.47, .19], [.61, .24], [.66, .38], [.62, .68], [.48, .96], [.29, 1.22], [.27, 1.39], [.34, 1.58], [.48, 1.75], [.52, 1.78], [.49, 1.8], [.45, 1.75], [.31, 1.56], [.24, 1.39], [.26, 1.22], [.45, .94], [.59, .67], [.63, .38], [.58, .27], [.45, .23], [.08, .23]], glass);
    vessel.castShadow = false; vessel.renderOrder = 3;
    const glassRim = mesh(new THREE.TorusGeometry(.505, .019, 10, 64), glass);
    glassRim.rotation.x = Math.PI / 2; glassRim.position.y = 1.785; glassRim.castShadow = false;
    const coffee = material({ color: 0x77320d, roughness: .24, metalness: .04 });
    lathe([[0, .24], [.46, .24], [.59, .3], [.61, .43], [.57, .64], [0, .64]], coffee);
    const liquid = material({ color: 0x9b4417, roughness: .2, metalness: .1 });
    const ripple = { time: { value: 0 }, strength: { value: .003 } };
    liquid.onBeforeCompile = shader => {
      shader.uniforms.uTime = ripple.time; shader.uniforms.uStrength = ripple.strength;
      shader.vertexShader = `uniform float uTime; uniform float uStrength;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>\nfloat radius = length(position.xz);\ntransformed.y += sin(radius * 35.0 - uTime * 4.0) * uStrength * (1.0 - smoothstep(0.0, 0.57, radius));`);
    };
    const water = mesh(new THREE.CircleGeometry(.568, 64), liquid);
    water.rotation.x = -Math.PI / 2;
    // Put the surface in the XZ plane before the ripple shader displaces world-up.
    water.geometry.rotateX(-Math.PI / 2); water.rotation.x = 0; water.position.y = .646;
    const wood = material({ map: texture("wood"), roughness: .58 });
    lathe([[.27, 1.17], [.36, 1.18], [.35, 1.44], [.28, 1.49], [.25, 1.42], [.25, 1.23]], wood);
    const brass = material({ map: texture("brass"), metalness: .8, roughness: .35, anisotropy: .65 }, true);
    const strap = mesh(new THREE.TorusGeometry(.35, .022, 8, 64), brass);
    strap.rotation.x = Math.PI / 2; strap.position.y = 1.32;
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const rivet = mesh(new THREE.SphereGeometry(.036, 12, 8), brass);
      rivet.position.set(Math.sin(angle) * .357, 1.32, Math.cos(angle) * .357);
    }
    const ceramic = material({ color: 0xf7ead0, roughness: .32, metalness: .015 });
    const dripper = new THREE.Group(); assembly.add(dripper);
    lathe([[.11, 1.72], [.16, 1.74], [.62, 2.37], [.65, 2.42], [.65, 2.45], [.61, 2.46], [.57, 2.39], [.115, 1.8], [.08, 1.76]], ceramic, dripper);
    lathe([[.15, 1.73], [.55, 1.73], [.57, 1.77], [.55, 1.81], [.17, 1.81]], ceramic, dripper);
    const handleCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(.46, 2.24, 0), new THREE.Vector3(.85, 2.33, 0), new THREE.Vector3(.9, 2.04, 0), new THREE.Vector3(.39, 1.95, 0)]);
    mesh(new THREE.TubeGeometry(handleCurve, 32, .055, 10, false), ceramic, dripper);
    const ribPoints = Array.from({ length: 22 }, (_, i) => {
      const t = i / 21, radius = .16 + t * .405, angle = t * .48;
      return new THREE.Vector3(Math.cos(angle) * radius, 1.86 + t * .53, Math.sin(angle) * radius);
    });
    const ribGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPoints), 24, .014, 6, false);
    geometries.add(ribGeometry);
    const ribs = new THREE.InstancedMesh(ribGeometry, ceramic, 12);
    const rotation = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) ribs.setMatrixAt(i, rotation.makeRotationY(i * Math.PI / 6));
    dripper.add(ribs);
    const grounds = mesh(new THREE.CircleGeometry(.49, 64), material({ map: texture("bloom"), color: 0xc7a779, roughness: .9 }), dripper);
    grounds.rotation.x = -Math.PI / 2; grounds.position.y = 2.31;

    const drops = [];
    const dropGeometry = new THREE.SphereGeometry(.023, 10, 8);
    for (let i = 0; i < 4; i++) {
      const drop = mesh(dropGeometry, coffee); drop.scale.set(.8, 1.7, .8); drops.push(drop);
    }
    const steamMaterial = new THREE.SpriteMaterial({ map: softTexture(true), transparent: true, opacity: .3, depthWrite: false, color: 0xfff1d8 });
    materials.add(steamMaterial);
    const steam = Array.from({ length: 7 }, (_, i) => {
      const spriteMaterial = steamMaterial.clone(); materials.add(spriteMaterial);
      const sprite = new THREE.Sprite(spriteMaterial); sprite.userData.offset = i / 7;
      assembly.add(sprite); return sprite;
    });

    const cupGroup = new THREE.Group(); cupGroup.position.set(-.93, .17, .58); model.add(cupGroup);
    const terracotta = material({ color: 0xad5c33, roughness: .55 });
    lathe([[.01, 0], [.18, 0], [.23, .05], [.27, .35], [.26, .39], [.235, .39], [.20, .08], [.01, .06]], terracotta, cupGroup);
    const cupCoffee = mesh(new THREE.CircleGeometry(.232, 32), coffee, cupGroup);
    cupCoffee.rotation.x = -Math.PI / 2; cupCoffee.position.y = .31;
    const cupHandle = mesh(new THREE.TorusGeometry(.11, .035, 8, 24), terracotta, cupGroup); cupHandle.position.set(-.26, .22, 0);
    const beanMaterial = material({ color: 0x59321d, roughness: .67 });
    const grooveMaterial = material({ color: 0x24130b, roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const bean = new THREE.Group(); bean.position.set(.56 + i * .2, .22, .7 + (i % 2) * .17); bean.rotation.y = i * 1.3;
      model.add(bean);
      const body = mesh(new THREE.SphereGeometry(1, 20, 14), beanMaterial, bean); body.scale.set(.1, .065, .16);
      const groove = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .04, -.135), new THREE.Vector3(-.015, .067, -.05), new THREE.Vector3(.014, .067, .06), new THREE.Vector3(0, .04, .135)]);
      mesh(new THREE.TubeGeometry(groove, 16, .009, 5, false), grooveMaterial, bean);
    }
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: softTexture(), transparent: true, depthWrite: false }); materials.add(shadowMaterial);
    const contact = mesh(new THREE.PlaneGeometry(3.5, 3), shadowMaterial, model); contact.rotation.x = -Math.PI / 2; contact.position.y = -.005; contact.castShadow = false;
    const shadow = new THREE.ShadowMaterial({ color: 0x573b22, opacity: .07 }); materials.add(shadow);
    const floor = mesh(new THREE.PlaneGeometry(6, 6), shadow, model); floor.rotation.x = -Math.PI / 2; floor.position.y = -.008; floor.castShadow = false;
    const key = new THREE.DirectionalLight(0xffdcac, 3.3); key.position.set(-3, 5, 4); key.castShadow = true;
    key.shadow.mapSize.set(software ? 256 : 1024, software ? 256 : 1024); key.shadow.normalBias = .025; key.shadow.bias = -.0003;
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -3, near: .1, far: 15 }); key.shadow.radius = 4;
    scene.add(key, new THREE.HemisphereLight(0xfff0d4, 0x7b6043, 2));
    const rim = new THREE.DirectionalLight(0xffebc6, 2.2); rim.position.set(3, 3, -4); scene.add(rim);

    // Invisible layer 1 is pickable without intersecting the glass or steam.
    const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false }); materials.add(proxyMaterial);
    const proxy = mesh(new THREE.CylinderGeometry(.72, .7, 2.3, 16), proxyMaterial);
    proxy.position.y = 1.33; proxy.layers.set(1); proxy.castShadow = false;
    const raycaster = new THREE.Raycaster(); raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    listen(canvas, "click", event => {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(proxy).length) onBloom();
    });
    listen(canvas, "keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onBloom(); } });
    const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
    const target = new THREE.Vector2(), tilt = new THREE.Vector2();
    listen(card, "pointermove", event => {
      if (event.pointerType === "touch" || motionQuery.matches) return;
      const rect = card.getBoundingClientRect();
      target.set((event.clientX - rect.left) / rect.width - .5, (event.clientY - rect.top) / rect.height - .5);
    });
    listen(card, "pointerleave", () => target.set(0, 0));
    listen(motionQuery, "change", () => { target.set(0, 0); tilt.set(0, 0); card.style.removeProperty("transform"); dirty = true; });
    let dirty = true;
    function resize() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height;
      camera.position.set(3.7, 4.1, 6.3).multiplyScalar(Math.max(1, .83 / camera.aspect));
      camera.lookAt(0, 1.35, 0); camera.updateProjectionMatrix(); dirty = true;
    }
    observer = new ResizeObserver(resize); observer.observe(host); resize();
    let lastDraw = performance.now(), elapsed = 0, dropPhase = 0, previousPeriod, previousBloom = 0;
    let frameBudget = software ? 1000 / 24 : 1000 / 60;
    let drawAverage = 0, slowFrames = 0;
    function afterDraw(cost) {
      drawAverage += (cost - drawAverage) * .08;
      frameBudget = THREE.MathUtils.clamp(Math.max(software ? 1000 / 24 : 1000 / 60, drawAverage * 1.4), 1000 / 60, 125);
      slowFrames = drawAverage > 50 ? slowFrames + 1 : 0;
      if (slowFrames === 30 && glass.transmission > 0) {
        glass.transmission = 0; glass.opacity = .22; glass.needsUpdate = true;
        renderer.setPixelRatio(1); resize();
      }
    }
    function animate(now) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (document.hidden || now - lastDraw < frameBudget) return;
      const changed = controls.period !== previousPeriod || controls.bloom !== previousBloom;
      // Refresh static frames for browser compositing without advancing animation.
      if (motionQuery.matches && !dirty && !changed && now - lastDraw < 250) return;
      const dt = Math.min((now - lastDraw) / 1000, .1); lastDraw = now;
      const started = performance.now();
      const details = PERIODS[controls.period];
      if (controls.period !== previousPeriod) {
        key.color.setHex(details.light); coffee.color.setHex(details.coffee); liquid.color.setHex(details.coffee).multiplyScalar(1.22);
        renderer.toneMappingExposure = details.exposure; previousPeriod = controls.period;
      }
      const bloom = controls.bloom ? Math.max(0, 1 - (now - controls.bloom) / 2600) : 0;
      previousBloom = controls.bloom;
      if (!motionQuery.matches) {
        elapsed += dt; dropPhase += dt * (1.1 + bloom * 2.3);
        tilt.lerp(target, 1 - Math.exp(-7 * dt));
        card.style.transform = `perspective(1100px) rotateX(${-tilt.y * 3}deg) rotateY(${tilt.x * 3}deg)`;
        model.rotation.y = -.22 + tilt.x * .15;
        grounds.rotation.z = Math.sin(elapsed * 1.6) * bloom * .12;
      }
      ripple.time.value = motionQuery.matches ? 0 : elapsed;
      ripple.strength.value = motionQuery.matches ? 0 : .003 + bloom * .025;
      drops.forEach((drop, i) => { const t = (dropPhase + i / drops.length) % 1; drop.position.set(0, 1.73 - t * t * 1.07, 0); drop.visible = !motionQuery.matches; });
      steam.forEach((sprite, i) => {
        const t = (elapsed * .17 + sprite.userData.offset) % 1;
        sprite.position.set(Math.sin(t * 5 + i) * .11, 2.43 + t * .75, Math.cos(i) * .08);
        sprite.scale.set(.16 + t * .25, .27 + t * .35, 1);
        sprite.material.opacity = Math.sin(t * Math.PI) * .24;
      });
      renderer.render(scene, camera); dirty = false;
      afterDraw(performance.now() - started);
    }
    frame = requestAnimationFrame(animate);
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
