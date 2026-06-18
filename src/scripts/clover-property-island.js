const instances = new WeakMap();

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
let THREE;

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && value.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}

function makeRoundedIslandShape(size = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -2.7 * size);
  shape.bezierCurveTo(1.35 * size, -2.55 * size, 2.55 * size, -1.6 * size, 2.74 * size, -0.28 * size);
  shape.bezierCurveTo(3.18 * size, 1.02 * size, 2.18 * size, 2.5 * size, 0.78 * size, 2.55 * size);
  shape.bezierCurveTo(-0.12 * size, 3.18 * size, -1.48 * size, 2.82 * size, -1.76 * size, 1.66 * size);
  shape.bezierCurveTo(-3.02 * size, 1.22 * size, -3.3 * size, -0.52 * size, -2.28 * size, -1.32 * size);
  shape.bezierCurveTo(-2.02 * size, -2.42 * size, -1.02 * size, -2.88 * size, 0, -2.7 * size);
  return shape;
}

function extrudeIsland(shape, depth, material) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 5,
    curveSegments: 34
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  return new THREE.Mesh(geometry, material);
}

function addAnimated(group, object, delay = 0, mode = "rise") {
  object.userData.delay = delay;
  object.userData.mode = mode;
  object.userData.initialScale = object.scale.clone();
  if (mode === "grow-y") object.scale.set(object.scale.x, 0.001, object.scale.z);
  if (mode === "grow") object.scale.setScalar(0.001);
  if (object.material) {
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.userData.targetOpacity = material.opacity;
      material.opacity = 0;
    });
  }
  group.add(object);
  return object;
}

function createLineFromPoints(points, material) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geometry, material);
}

function makeContour(radiusX, radiusZ, y, material, offsetX = 0, offsetZ = 0) {
  const points = [];
  for (let i = 0; i <= 160; i += 1) {
    const t = (i / 160) * Math.PI * 2;
    const wobble = 1 + Math.sin(t * 3.0) * 0.035 + Math.cos(t * 2.0) * 0.025;
    points.push(new THREE.Vector3(
      offsetX + Math.cos(t) * radiusX * wobble,
      y,
      offsetZ + Math.sin(t) * radiusZ * wobble
    ));
  }
  return createLineFromPoints(points, material);
}

function makeWall(width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeWindow(width, height, x, y, z, rotationY, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.035), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function makePath(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 32, radius, 8, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function makeTree(x, z, scale, trunkMaterial, leafMaterial) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.05 * scale, 0.46 * scale, 8), trunkMaterial);
  trunk.position.y = 0.23 * scale;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 12, 8), leafMaterial);
  crown.scale.set(1.15, 0.74, 1.02);
  crown.position.y = 0.56 * scale;
  tree.add(trunk, crown);
  tree.position.set(x, 0.31, z);
  tree.castShadow = true;
  return tree;
}

async function createScene(root) {
  const [THREE_MODULE, { OrbitControls }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js")
  ]);
  THREE = THREE_MODULE;

  const canvasHost = root.querySelector("[data-island-canvas]");
  const fallback = root.querySelector("[data-island-fallback]");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(5.8, 4.6, 6.8);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "clover-island-canvas";
  renderer.domElement.style.touchAction = "pan-y";
  canvasHost.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.36;
  controls.minPolarAngle = Math.PI * 0.23;
  controls.maxPolarAngle = Math.PI * 0.43;
  controls.minAzimuthAngle = -Math.PI * 0.2;
  controls.maxAzimuthAngle = Math.PI * 0.2;
  controls.minDistance = 6.4;
  controls.maxDistance = 10.2;
  controls.target.set(0, 0.46, 0);

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  controls.enableZoom = !isMobile;

  scene.add(new THREE.AmbientLight(0xf3f7f4, 1.9));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
  keyLight.position.set(5, 7, 4);
  keyLight.castShadow = !isMobile;
  keyLight.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdde7df, 1.2);
  fillLight.position.set(-4, 3.2, -4);
  scene.add(fillLight);

  const island = new THREE.Group();
  island.rotation.y = -0.16;
  scene.add(island);

  const mat = {
    base: new THREE.MeshStandardMaterial({ color: 0xc7d0ca, roughness: 0.86, metalness: 0.02 }),
    mid: new THREE.MeshStandardMaterial({ color: 0xdde2df, roughness: 0.9 }),
    turf: new THREE.MeshStandardMaterial({ color: 0x7f9076, roughness: 0.88 }),
    natural: new THREE.MeshStandardMaterial({ color: 0xaeb9b0, roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xd3d9d5, roughness: 0.82 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0xeff2f0, roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x17201b, roughness: 0.74 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2f4d2c, roughness: 0.82 }),
    softGreen: new THREE.MeshStandardMaterial({ color: 0x496a3b, roughness: 0.86 }),
    line: new THREE.LineBasicMaterial({ color: 0x9eaaa3, transparent: true, opacity: 0.76 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xc7dad1,
      roughness: 0.18,
      transmission: 0.35,
      transparent: true,
      opacity: 0.58,
      thickness: 0.22,
      metalness: 0
    })
  };

  const lower = extrudeIsland(makeRoundedIslandShape(1.06), 0.36, mat.base);
  lower.position.y = -0.26;
  lower.receiveShadow = true;
  addAnimated(island, lower, 0, "grow-y");

  const middle = extrudeIsland(makeRoundedIslandShape(0.92), 0.24, mat.mid);
  middle.position.y = -0.04;
  middle.scale.set(0.98, 1, 0.96);
  middle.receiveShadow = true;
  addAnimated(island, middle, 0.16, "grow-y");

  const top = extrudeIsland(makeRoundedIslandShape(0.78), 0.16, mat.turf);
  top.position.y = 0.12;
  top.scale.set(0.96, 1, 0.9);
  top.receiveShadow = true;
  addAnimated(island, top, 0.28, "grow-y");

  const contourGroup = new THREE.Group();
  [2.68, 2.24, 1.82, 1.38].forEach((radius, index) => {
    const line = makeContour(radius, radius * 0.72, 0.27 + index * 0.012, mat.line, index === 1 ? 0.12 : 0, index === 2 ? -0.12 : 0.02);
    line.scale.set(0.001, 0.001, 0.001);
    line.userData.delay = 0.42 + index * 0.08;
    line.userData.mode = "line";
    contourGroup.add(line);
  });
  island.add(contourGroup);

  const pathMaterial = mat.concrete;
  const driveway = makePath([
    new THREE.Vector3(-2.4, 0.34, -1.52),
    new THREE.Vector3(-1.15, 0.37, -1.16),
    new THREE.Vector3(-0.36, 0.39, -0.68),
    new THREE.Vector3(0.34, 0.42, -0.28)
  ], 0.12, pathMaterial);
  addAnimated(island, driveway, 0.96, "grow");

  const gardenPath = makePath([
    new THREE.Vector3(1.46, 0.35, 0.96),
    new THREE.Vector3(0.78, 0.38, 0.54),
    new THREE.Vector3(0.08, 0.39, 0.78),
    new THREE.Vector3(-0.46, 0.39, 1.34)
  ], 0.055, mat.concreteLight);
  addAnimated(island, gardenPath, 1.02, "grow");

  const court = makeWall(1.36, 0.028, 0.86, 0.62, 0.34, 0.92, mat.concreteLight);
  court.rotation.y = -0.05;
  addAnimated(island, court, 0.94, "grow-y");

  const privacyWall = makeWall(1.18, 0.26, 0.055, -0.94, 0.46, 0.9, mat.concrete);
  privacyWall.rotation.y = 0.08;
  addAnimated(island, privacyWall, 1.08, "grow-y");

  const house = new THREE.Group();
  house.position.set(0.1, 0.38, -0.2);
  const mainBlock = makeWall(1.55, 0.78, 1.22, -0.18, 0.39, 0.08, mat.concreteLight);
  const sideBlock = makeWall(0.92, 0.58, 1.02, 0.86, 0.29, -0.24, mat.concrete);
  const entryBlock = makeWall(0.48, 0.68, 0.58, -1.06, 0.34, -0.1, mat.concrete);
  const roofA = makeWall(1.72, 0.08, 1.36, -0.18, 0.83, 0.08, mat.dark);
  const roofB = makeWall(1.03, 0.07, 1.14, 0.86, 0.62, -0.24, mat.dark);
  const terrace = makeWall(1.26, 0.045, 0.7, 0.52, 0.05, 0.86, mat.concrete);
  const frontGlass = makeWindow(0.84, 0.42, -0.2, 0.48, 0.705, 0, mat.glass);
  const sideGlass = makeWindow(0.52, 0.34, 1.34, 0.38, -0.24, Math.PI / 2, mat.glass);
  const entryGlass = makeWindow(0.26, 0.44, -1.06, 0.38, 0.205, 0, mat.glass);
  [mainBlock, sideBlock, entryBlock, roofA, roofB, terrace, frontGlass, sideGlass, entryGlass].forEach((part, index) => {
    part.material = part.material.clone();
    part.userData.delay = 0.7 + index * 0.035;
    part.userData.mode = "grow-y";
    part.userData.initialScale = part.scale.clone();
    part.scale.set(part.scale.x, 0.001, part.scale.z);
    if (part.material) {
      part.material.transparent = true;
      part.material.userData.targetOpacity = part.material.opacity;
      part.material.opacity = 0;
    }
    house.add(part);
  });
  island.add(house);

  const vegetation = new THREE.Group();
  const trees = isMobile ? [
    [-1.8, 0.72, 0.9], [1.68, 1.02, 0.75], [1.82, -1.1, 0.72]
  ] : [
    [-1.9, 0.76, 0.95], [-1.46, 1.38, 0.66], [1.7, 1.08, 0.82],
    [2.08, -0.86, 0.72], [1.18, -1.62, 0.58], [-2.02, -1.2, 0.55]
  ];
  trees.forEach(([x, z, scale], index) => {
    const tree = makeTree(x, z, scale, mat.dark, index % 2 ? mat.softGreen : mat.green);
    tree.userData.delay = 1.22 + index * 0.05;
    tree.userData.mode = "grow-y";
    tree.userData.initialScale = tree.scale.clone();
    tree.scale.set(1, 0.001, 1);
    vegetation.add(tree);
  });
  island.add(vegetation);

  const rocks = new THREE.Group();
  for (let i = 0; i < (isMobile ? 3 : 5); i += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + (i % 3) * 0.018, 0), mat.natural);
    rock.position.set(-1.9 + i * 0.47, 0.35, 1.72 - (i % 2) * 0.24);
    rock.scale.y = 0.46;
    addAnimated(rocks, rock, 1.24 + i * 0.03, "grow");
  }
  island.add(rocks);

  const pin = new THREE.Group();
  const pinRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 8, 28), mat.green);
  pinRing.rotation.x = Math.PI / 2;
  const pinStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 10), mat.green);
  pinStem.position.y = -0.17;
  pin.add(pinRing, pinStem);
  pin.position.set(1.72, 0.92, -0.36);
  addAnimated(island, pin, 1.52, "grow");

  const signature = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.04), mat.concreteLight);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.048), mat.green);
  plate.position.y = 0.02;
  mark.position.set(0, 0.07, 0.015);
  signature.add(plate, mark);
  signature.position.set(-1.55, 0.47, -1.58);
  signature.rotation.y = 0.12;
  addAnimated(island, signature, 1.62, "grow");

  const clock = new THREE.Clock();
  let visible = true;
  let active = true;
  let interacting = false;
  let lastFrame = 0;
  let raf = 0;
  let disposed = false;
  let width = 0;
  let height = 0;

  const resize = () => {
    const rect = root.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
  };

  const pointerStart = () => { interacting = true; };
  const pointerEnd = () => { interacting = false; };
  controls.addEventListener("start", pointerStart);
  controls.addEventListener("end", pointerEnd);

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  }, { threshold: 0.08 });
  observer.observe(root);

  const onVisibility = () => { active = !document.hidden; };
  const onResize = () => resize();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", onResize, { passive: true });

  const animateBuild = (elapsed) => {
    island.traverse((child) => {
      const delay = child.userData.delay;
      if (delay === undefined) return;
      const t = Math.min(1, Math.max(0, (elapsed - delay) / 0.62));
      const eased = 1 - Math.pow(1 - t, 3);
      if (child.userData.mode === "line") {
        child.scale.setScalar(Math.max(0.001, eased));
        if (child.material) child.material.opacity = 0.76 * eased;
        return;
      }
      const initial = child.userData.initialScale || new THREE.Vector3(1, 1, 1);
      if (child.userData.mode === "grow-y") child.scale.set(initial.x, Math.max(0.001, initial.y * eased), initial.z);
      if (child.userData.mode === "grow") child.scale.setScalar(Math.max(0.001, eased));
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          const target = material.userData.targetOpacity ?? 1;
          material.opacity = target * eased;
        });
      }
    });
  };

  const render = (time) => {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (!active || !visible) return;
    const elapsed = clock.getElapsedTime();
    const targetInterval = interacting || elapsed < 2.8 ? 16 : 34;
    if (time - lastFrame < targetInterval) return;
    lastFrame = time;

    animateBuild(elapsed);

    if (!interacting && elapsed > 2.2) {
      const targetRotation = -0.16 + Math.sin(elapsed * 0.28) * 0.045;
      island.rotation.y += (targetRotation - island.rotation.y) * 0.035;
      island.rotation.x = Math.sin(elapsed * 0.2) * 0.009;
    }

    controls.update();
    renderer.render(scene, camera);
  };

  const destroy = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", onResize);
    controls.removeEventListener("start", pointerStart);
    controls.removeEventListener("end", pointerEnd);
    controls.dispose();
    disposeObject(scene);
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    root.removeAttribute("data-island-ready");
    root.classList.remove("is-webgl-ready");
  };

  resize();
  fallback.hidden = true;
  root.classList.add("is-webgl-ready");
  raf = requestAnimationFrame(render);
  return { destroy };
}

export async function initCloverPropertyIsland(root) {
  if (!root || root.dataset.islandReady) return;
  root.dataset.islandReady = "true";

  const reduceMotion = window.matchMedia(reduceMotionQuery).matches;
  if (reduceMotion || !webglAvailable()) {
    root.dataset.fallback = "true";
    return;
  }

  try {
    const instance = await createScene(root);
    instances.set(root, instance);
  } catch (error) {
    console.warn("Clover Property Island fallback:", error);
    root.dataset.fallback = "true";
    root.removeAttribute("data-island-ready");
  }
}

export function destroyCloverPropertyIslands() {
  document.querySelectorAll("[data-clover-island]").forEach((root) => {
    const instance = instances.get(root);
    if (instance) {
      instance.destroy();
      instances.delete(root);
    }
  });
}
