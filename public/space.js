(() => {
  "use strict";

  const WS = window.WS;
  const $ = (sel) => document.querySelector(sel);
  const body = document.body;

  const hasWebGL = (() => {
    try { return !!document.createElement("canvas").getContext("webgl"); } catch { return false; }
  })();

  // Thiếu thư viện hoặc WebGL: giữ giao diện phẳng để vẫn dùng được.
  if (!(WS && window.THREE && THREE.CSS3DRenderer && window.gsap && hasWebGL)) {
    body.classList.add("flat", "ready");
    return;
  }
  body.classList.add("space-on", "ready");

  const R = 1000;                // bán kính vòng đặt các bảng (px)
  const CLOCK_PX = 190;          // bán kính đồng hồ trên màn hình (px)
  const CLOCK_UP = 80;           // độ nâng đồng hồ so với tâm (px)
  const INFO_Y = -230;           // vị trí dòng giờ số dưới đồng hồ (px)

  const SLOTS = [
    { key: "clock",  label: "Đồng hồ",         el: $("#p-clock"),       w: 420, h: 130, fitH: 580, reflow: false },
    { key: "entry",  label: "Nhập thông tin",  el: $(".entry-panel"),   w: 620, h: 440 },
    { key: "portal", label: "Cổng Thông tin",  el: $(".portal-panel"),  w: 820, h: 580 },
    { key: "notes",  label: "Ghi chú tuần",    el: $(".notes-panel"),   w: 600, h: 540 },
    { key: "frames", label: "Khung tranh",     el: $(".frames-panel"),  w: 900, h: 470 },
  ];
  const N = SLOTS.length;
  const STEP = (Math.PI * 2) / N;

  let W = window.innerWidth;
  let H = window.innerHeight;

  /* ---------- Bộ dựng hình ---------- */
  const root = $("#space");
  const glRenderer = new THREE.WebGLRenderer({ antialias: true });
  glRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  glRenderer.domElement.className = "gl-layer";
  glRenderer.domElement.setAttribute("aria-hidden", "true");

  const cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.domElement.className = "css-layer";

  root.append(glRenderer.domElement, cssRenderer.domElement);

  const glScene = new THREE.Scene();
  glScene.background = new THREE.Color(0x0e141c);
  glScene.fog = new THREE.FogExp2(0x0e141c, 0.00028);
  const cssScene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, W / H, 1, 8000);
  camera.rotation.order = "YXZ";

  /* ---------- Ánh sáng, sàn, sao ---------- */
  glScene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(300, 500, 600);
  glScene.add(key);

  const floor = new THREE.GridHelper(7000, 70, 0xf2b84b, 0x2c3c52);
  floor.position.y = -420;
  glScene.add(floor);

  const starPos = new Float32Array(700 * 3);
  for (let i = 0; i < 700; i++) {
    const r = 2800 + Math.random() * 800;
    const a = Math.random() * Math.PI * 2;
    const y = -200 + Math.random() * 2200;
    starPos[i * 3] = Math.sin(a) * r;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = Math.cos(a) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fb4cc, size: 3, fog: false }));
  glScene.add(stars);

  /* ---------- Hình 3D đặt giữa các bảng ---------- */
  const geometries = [
    () => new THREE.IcosahedronGeometry(1, 0),
    () => new THREE.OctahedronGeometry(1, 0),
    () => new THREE.TorusKnotGeometry(0.7, 0.22, 90, 12),
    () => new THREE.DodecahedronGeometry(1, 0),
    () => new THREE.TorusGeometry(0.8, 0.28, 12, 40),
  ];
  const shapes = SLOTS.map((_, i) => {
    const a = (i + 0.5) * STEP;
    const mesh = new THREE.Mesh(
      geometries[i % geometries.length](),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7fd1b9 : 0xf2b84b, wireframe: true, transparent: true, opacity: 0.55 })
    );
    mesh.scale.setScalar(170);
    mesh.position.set(Math.sin(a) * 1300, 40, -Math.cos(a) * 1300);
    glScene.add(mesh);
    return mesh;
  });

  /* ---------- Đồng hồ 3D ---------- */
  const clock = new THREE.Group();
  clock.position.z = -R;
  glScene.add(clock);

  clock.add(new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.3, 72).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2b3a50, metalness: 0.25, roughness: 0.65 })
  ));

  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(2.45, 0.12, 20, 120),
    new THREE.MeshStandardMaterial({ color: 0xf2b84b, metalness: 0.7, roughness: 0.3 })
  );
  bezel.position.z = 0.02;
  clock.add(bezel);

  const tickMat = new THREE.MeshStandardMaterial({ color: 0xe8edf4, roughness: 0.5 });
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(major ? 0.1 : 0.04, major ? 0.28 : 0.12, 0.05), tickMat);
    const a = (i / 60) * Math.PI * 2;
    const r = major ? 2.0 : 2.08;
    tick.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.18);
    tick.rotation.z = -a;
    clock.add(tick);
  }

  const makeHand = (length, width, color, z) => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, length, 0.06),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 })
    );
    mesh.position.y = length / 2 - 0.15;
    group.position.z = z;
    group.add(mesh);
    clock.add(group);
    return group;
  };
  const hands = {
    h: makeHand(1.2, 0.14, 0xe8edf4, 0.22),
    m: makeHand(1.8, 0.09, 0xe8edf4, 0.26),
    s: makeHand(2.05, 0.035, 0xf2b84b, 0.30),
  };
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2b84b, metalness: 0.6, roughness: 0.3 })
  );
  cap.position.z = 0.34;
  clock.add(cap);

  const pose = { h: 0, m: 0, s: 0 }; // độ, theo chiều kim đồng hồ
  const unwrap = (prev, target) => target + Math.round((prev - target) / 360) * 360;
  let firstTick = true;

  function tickClock() {
    const { h, m, s } = WS.vnTimeParts();
    const target = {
      s: unwrap(pose.s, s * 6),
      m: unwrap(pose.m, m * 6 + s * 0.1),
      h: unwrap(pose.h, (h % 12) * 30 + m * 0.5),
    };
    if (firstTick || WS.reduceMotion) {
      Object.assign(pose, target);
      firstTick = false;
    } else {
      gsap.to(pose, { s: target.s, duration: 0.4, ease: "back.out(3)", overwrite: "auto" });
      gsap.to(pose, { m: target.m, h: target.h, duration: 0.6, ease: "power2.out" });
    }
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- Đưa các bảng HTML vào không gian ---------- */
  SLOTS.forEach((slot, i) => {
    const theta = i * STEP;
    slot.obj = new THREE.CSS3DObject(slot.el);
    slot.obj.position.set(Math.sin(theta) * R, 0, -Math.cos(theta) * R);
    slot.obj.rotation.y = -theta;
    cssScene.add(slot.obj);
  });

  /* ---------- Camera ---------- */
  const view = { yaw: 0, boost: 0 };
  const look = { yaw: 0, pitch: 0 };
  let baseFov = 50;
  let current = 0;

  function layout() {
    const availH = Math.max(320, H - 150);
    for (const s of SLOTS) {
      const fitH = s.fitH || s.h;
      let w = s.w;
      let fit = Math.min(1, (W * 0.96) / w, availH / fitH);
      if (s.reflow !== false && (W * 0.96) / w < 0.8) {
        w = Math.max(340, Math.floor((W * 0.96) / 0.85));
        fit = Math.min(1, (W * 0.96) / w, availH / fitH);
      }
      s.el.style.width = `${w}px`;
      s.el.style.height = `${s.h}px`;
      s.obj.scale.setScalar(fit);
      s.fit = fit;
    }
    const c = SLOTS[0];
    c.obj.position.y = INFO_Y * c.fit;
    clock.scale.setScalar((CLOCK_PX / 2.4) * c.fit);
    clock.position.y = CLOCK_UP * c.fit;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    baseFov = (2 * Math.atan(H / 2 / R) * 180) / Math.PI; // 1 đơn vị = 1px tại khoảng cách R
    camera.aspect = W / H;
    camera.fov = baseFov + view.boost;
    camera.updateProjectionMatrix();
    glRenderer.setSize(W, H);
    cssRenderer.setSize(W, H);
    layout();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- Thanh điều hướng ---------- */
  const dockItems = $("#dock-items");
  const dockButtons = SLOTS.map((s, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.label;
    btn.addEventListener("click", () => goTo(i));
    dockItems.append(btn);
    return btn;
  });

  function setActive(index) {
    SLOTS.forEach((s, i) => {
      const on = i === index;
      s.el.classList.toggle("is-active", on);
      s.el.inert = !on;
      if (on) dockButtons[i].setAttribute("aria-current", "true");
      else dockButtons[i].removeAttribute("aria-current");
    });
  }

  function goTo(index, intro = false) {
    index = ((index % N) + N) % N;
    current = index;
    setActive(index);

    if (intro) view.yaw = 0.9;
    const target = unwrap(view.yaw, -index * STEP);

    if (WS.reduceMotion) {
      view.yaw = target;
      view.boost = 0;
      return;
    }
    gsap.to(view, { yaw: target, duration: intro ? 1.9 : 1.4, ease: "power3.inOut", overwrite: "auto" });
    gsap.timeline({ overwrite: "auto" })
      .set(view, { boost: intro ? 22 : 0 })
      .to(view, { boost: 14, duration: 0.6, ease: "power2.out" })
      .to(view, { boost: 0, duration: 0.9, ease: "power2.inOut" });
  }

  $("#nav-prev").addEventListener("click", () => goTo(current - 1));
  $("#nav-next").addEventListener("click", () => goTo(current + 1));
  window.addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") goTo(current + 1);
    else if (e.key === "ArrowLeft") goTo(current - 1);
  });

  if (!WS.reduceMotion) {
    const lookYaw = gsap.quickTo(look, "yaw", { duration: 0.8, ease: "power3.out" });
    const lookPitch = gsap.quickTo(look, "pitch", { duration: 0.8, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      lookYaw(-(e.clientX / W - 0.5) * 0.12);
      lookPitch((0.5 - e.clientY / H) * 0.08);
    });
  }

  /* ---------- Vòng lặp vẽ ---------- */
  const timer = new THREE.Clock();
  gsap.ticker.add(() => {
    const dt = timer.getDelta();
    const t = timer.elapsedTime;

    camera.rotation.y = view.yaw + look.yaw;
    camera.rotation.x = look.pitch;
    const fov = baseFov + view.boost;
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    hands.h.rotation.z = -THREE.MathUtils.degToRad(pose.h);
    hands.m.rotation.z = -THREE.MathUtils.degToRad(pose.m);
    hands.s.rotation.z = -THREE.MathUtils.degToRad(pose.s);

    if (!WS.reduceMotion) {
      clock.rotation.y = Math.sin(t * 0.6) * 0.12;
      stars.rotation.y += dt * 0.01;
      shapes.forEach((m, i) => {
        m.rotation.x += dt * 0.3;
        m.rotation.y += dt * 0.2;
        m.position.y = 40 + Math.sin(t * 0.8 + i) * 20;
      });
    }

    glRenderer.render(glScene, camera);
    cssRenderer.render(cssScene, camera);
  });

  goTo(0, true);
})();
