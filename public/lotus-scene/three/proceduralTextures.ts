import * as THREE from 'three';

/**
 * Procedural Canvas Textures for Moonlit Lotus Garden
 * All textures generated via HTML5 2D Canvas with SRGBColorSpace - 0 external file dependencies.
 */

// Helper to configure procedural color textures properly
function configureColorTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  return tex;
}

// Helper for linear data textures (normals, roughness)
function configureDataTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Golden / Amber Hero Lotus Petal Texture
 * Features warm golden gradient, luminous translucent tips, and delicate fine vein ribs
 */
export function createGoldenLotusPetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base radial gradient from rich deep amber at base to luminous translucent gold at tips
  const grad = ctx.createLinearGradient(256, 512, 256, 0);
  grad.addColorStop(0, '#ff9015');    // Warm amber base
  grad.addColorStop(0.3, '#ffaa2b');  // Radiant orange-gold
  grad.addColorStop(0.7, '#ffc75f');  // Brilliant yellow-gold
  grad.addColorStop(0.95, '#ffeebb'); // Translucent shimmering tip
  grad.addColorStop(1.0, '#ffffff');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft longitudinal petal veins
  ctx.strokeStyle = 'rgba(255, 235, 180, 0.35)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 28; i++) {
    const spread = (i - 14) * 16;
    ctx.beginPath();
    ctx.moveTo(256 + spread * 0.2, 512);
    ctx.bezierCurveTo(
      256 + spread * 0.7, 340,
      256 + spread * 0.9, 150,
      256 + spread * 0.4, 0
    );
    ctx.stroke();
  }

  // Soft golden edge glow
  const edgeGrad = ctx.createRadialGradient(256, 256, 120, 256, 256, 256);
  edgeGrad.addColorStop(0, 'rgba(255, 220, 100, 0.1)');
  edgeGrad.addColorStop(0.85, 'rgba(255, 180, 50, 0.25)');
  edgeGrad.addColorStop(1, 'rgba(255, 240, 180, 0.7)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, 512, 512);

  return configureColorTexture(canvas);
}

/**
 * Pink / Sacred Water Lotus Petal Texture
 */
export function createPinkLotusPetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(256, 512, 256, 0);
  grad.addColorStop(0, '#f8e4a0');    // Creamy golden base
  grad.addColorStop(0.4, '#f7b2c8');  // Soft blush rose
  grad.addColorStop(0.8, '#f2789f');  // Vibrant lotus pink
  grad.addColorStop(0.98, '#d4497a'); // Deep magenta tip
  grad.addColorStop(1.0, '#ffffff');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const spread = (i - 12) * 18;
    ctx.beginPath();
    ctx.moveTo(256 + spread * 0.15, 512);
    ctx.bezierCurveTo(
      256 + spread * 0.6, 320,
      256 + spread * 0.85, 140,
      256 + spread * 0.35, 0
    );
    ctx.stroke();
  }

  return configureColorTexture(canvas);
}

/**
 * Lotus Leaf (Lá Sen) Texture with radial veins radiating from center petiole
 */
export function createLotusLeafTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep aquatic emerald green radial gradient
  const grad = ctx.createRadialGradient(512, 512, 10, 512, 512, 500);
  grad.addColorStop(0, '#2e6b42');    // Center bright petiole green
  grad.addColorStop(0.4, '#1b4a2c');  // Rich emerald green
  grad.addColorStop(0.85, '#12351f'); // Deep dark jade
  grad.addColorStop(1.0, '#265431');  // Subtle lighter rim

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(512, 512, 500, 0, Math.PI * 2);
  ctx.fill();

  // Radial leaf veins (gân lá sen tỏa tròn)
  const veinCount = 22;
  ctx.strokeStyle = '#43925c';
  ctx.lineWidth = 3.5;
  for (let i = 0; i < veinCount; i++) {
    const angle = (i / veinCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(512, 512);
    const endX = 512 + Math.cos(angle) * 490;
    const endY = 512 + Math.sin(angle) * 490;
    ctx.quadraticCurveTo(
      512 + Math.cos(angle + 0.05) * 260,
      512 + Math.sin(angle + 0.05) * 260,
      endX, endY
    );
    ctx.stroke();

    // Branching fine veinlets
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(70, 160, 95, 0.4)';
    for (let j = 1; j <= 5; j++) {
      const frac = j / 6;
      const vx = 512 + (endX - 512) * frac;
      const vy = 512 + (endY - 512) * frac;
      const branchAngle = angle + 0.35 * (j % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + Math.cos(branchAngle) * 35, vy + Math.sin(branchAngle) * 35);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Pale yellow-green center button
  const centerGrad = ctx.createRadialGradient(512, 512, 0, 512, 512, 28);
  centerGrad.addColorStop(0, '#a7d977');
  centerGrad.addColorStop(0.7, '#6aa146');
  centerGrad.addColorStop(1, 'rgba(46, 107, 66, 0)');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(512, 512, 28, 0, Math.PI * 2);
  ctx.fill();

  return configureColorTexture(canvas);
}

/**
 * Water Normal Map for animated ripples
 */
export function createWaterNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  // Synthesize wave normal vectors (RGB = Normal X, Y, Z in tangent space)
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const u = (x / 512) * Math.PI * 12;
      const v = (y / 512) * Math.PI * 12;
      
      // Multi-frequency wave perturbation
      const dx = Math.sin(u) * 0.4 + Math.sin(u * 2.3 + v * 1.5) * 0.2 + Math.cos(u * 4.1) * 0.1;
      const dy = Math.cos(v) * 0.4 + Math.cos(v * 2.1 + u * 1.7) * 0.2 + Math.sin(v * 4.2) * 0.1;

      // Tangent normal vector: (-dx, -dy, 1.0) normalized to [0, 255]
      const nx = Math.max(-1, Math.min(1, -dx * 0.5));
      const ny = Math.max(-1, Math.min(1, -dy * 0.5));
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

      const idx = (y * 512 + x) * 4;
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return configureDataTexture(canvas);
}

/**
 * Traditional Chinese/Vietnamese Architecture Wood Lacquer Texture
 */
export function createWoodLacquerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep imperial reddish-brown lacquer
  ctx.fillStyle = '#421f15';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle natural longitudinal wood fibers
  ctx.fillStyle = 'rgba(28, 12, 8, 0.35)';
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 512;
    const w = 2 + Math.random() * 8;
    ctx.fillRect(x, 0, w, 512);
  }

  ctx.fillStyle = 'rgba(95, 45, 30, 0.25)';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const w = 1 + Math.random() * 4;
    ctx.fillRect(x, 0, w, 512);
  }

  return configureColorTexture(canvas);
}

/**
 * Traditional Curved Roof Tile Texture (Ngói Âm Dương)
 */
export function createRoofTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark charcoal slate with blue-grey tint
  ctx.fillStyle = '#1c2128';
  ctx.fillRect(0, 0, 512, 512);

  // Ribbed tile rows
  const rows = 16;
  const h = 512 / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * h;
    const tileGrad = ctx.createLinearGradient(0, y, 0, y + h);
    tileGrad.addColorStop(0, '#2d333b');
    tileGrad.addColorStop(0.5, '#1e2329');
    tileGrad.addColorStop(0.9, '#121519');
    tileGrad.addColorStop(1.0, '#0a0d10');
    ctx.fillStyle = tileGrad;
    ctx.fillRect(0, y, 512, h);

    // Weathered highlights and seams
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, y, 512, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, y + h - 2, 512, 2);
  }

  return configureColorTexture(canvas);
}

/**
 * Warm Paper Lantern Texture (Lồng Đèn Cung Đình)
 */
export function createLanternTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm glowing amber/crimson silk paper
  const grad = ctx.createLinearGradient(128, 0, 128, 256);
  grad.addColorStop(0, '#d13c19');    // Top frame
  grad.addColorStop(0.2, '#f37526');  // Bright orange
  grad.addColorStop(0.5, '#ffc04d');  // Luminous candle center
  grad.addColorStop(0.8, '#f37526');
  grad.addColorStop(1, '#a6240c');    // Bottom rim

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Vertical bamboo frame ribs
  ctx.strokeStyle = '#5a1308';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * 256;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  return configureColorTexture(canvas);
}

/**
 * Karst Scholar's Rock (Đá Thái Hồ / Hòn Non Bộ) Texture
 */
export function createTaihuStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3a444c'; // Dark slate-grey limestone
  ctx.fillRect(0, 0, 512, 512);

  // Perlin-style organic noise blotches for weathered porous limestone
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 5 + Math.random() * 30;
    const darkness = Math.random() * 0.3;
    ctx.fillStyle = Math.random() > 0.4 
      ? `rgba(20, 26, 32, ${darkness})` 
      : `rgba(45, 60, 48, ${darkness * 0.8})`; // Ancient moss tint
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTexture(canvas);
}

/**
 * Glowing Firefly / Spiritual Orb Particle Texture
 */
export function createFireflyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const radGrad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  radGrad.addColorStop(0.2, 'rgba(150, 255, 220, 0.9)'); // Cyan-emerald spiritual glow
  radGrad.addColorStop(0.6, 'rgba(70, 230, 160, 0.3)');
  radGrad.addColorStop(1.0, 'rgba(20, 180, 120, 0)');

  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 64, 64);

  return configureColorTexture(canvas);
}

/**
 * Luminous Moon Texture with soft halo
 */
export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  // Crescent moon silhouette
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 256, 170, -Math.PI * 0.45, Math.PI * 0.55, false);
  ctx.bezierCurveTo(340, 300, 340, 160, 256 + 170 * Math.cos(-Math.PI * 0.45), 256 + 170 * Math.sin(-Math.PI * 0.45));
  ctx.closePath();

  // Lunar surface gradient
  const moonGrad = ctx.createRadialGradient(230, 230, 30, 256, 256, 200);
  moonGrad.addColorStop(0, '#ffffff');
  moonGrad.addColorStop(0.5, '#eef6ff');
  moonGrad.addColorStop(0.85, '#c8dcfa');
  moonGrad.addColorStop(1.0, '#98bceb');
  ctx.fillStyle = moonGrad;
  ctx.fill();

  // Subtle craters
  ctx.fillStyle = 'rgba(170, 195, 225, 0.25)';
  const craters = [
    { x: 210, y: 220, r: 18 },
    { x: 235, y: 270, r: 24 },
    { x: 220, y: 310, r: 15 },
    { x: 250, y: 340, r: 12 },
    { x: 195, y: 180, r: 14 }
  ];
  craters.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Ethereal outer halo
  const haloGrad = ctx.createRadialGradient(256, 256, 150, 256, 256, 250);
  haloGrad.addColorStop(0, 'rgba(210, 235, 255, 0.4)');
  haloGrad.addColorStop(0.5, 'rgba(140, 195, 255, 0.15)');
  haloGrad.addColorStop(1.0, 'rgba(100, 160, 240, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  return configureColorTexture(canvas);
}
