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

function makePanel(width, height, depth, x, y, z, material, rotationY = 0) {
  const mesh = makeWall(width, height, depth, x, y, z, material);
  mesh.rotation.y = rotationY;
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

function makeFramedWindow(width, height, x, y, z, rotationY, materials, split = false) {
  const group = new THREE.Group();
  const recess = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, height + 0.11, 0.045), materials.recess);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.032), materials.glass);
  glass.position.z = 0.032;
  const frameThickness = 0.035;
  const frameDepth = 0.052;
  const parts = [
    [width + 0.08, frameThickness, frameDepth, 0, height / 2 + frameThickness / 2, 0.06],
    [width + 0.08, frameThickness, frameDepth, 0, -height / 2 - frameThickness / 2, 0.06],
    [frameThickness, height + 0.08, frameDepth, -width / 2 - frameThickness / 2, 0, 0.06],
    [frameThickness, height + 0.08, frameDepth, width / 2 + frameThickness / 2, 0, 0.06]
  ];
  if (split) parts.push([frameThickness * 0.7, height + 0.02, frameDepth, 0, 0, 0.062]);
  group.add(recess, glass);
  parts.forEach(([w, h, d, px, py, pz]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.frame);
    frame.position.set(px, py, pz);
    frame.castShadow = true;
    group.add(frame);
  });
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  return group;
}

function makeRoof(width, depth, x, y, z, material, edgeMaterial) {
  const roof = new THREE.Group();
  const slab = makeWall(width, 0.07, depth, 0, 0, 0, material);
  const lipFront = makeWall(width + 0.08, 0.045, 0.055, 0, -0.055, depth / 2 + 0.035, edgeMaterial);
  const lipBack = makeWall(width + 0.08, 0.035, 0.04, 0, -0.045, -depth / 2 - 0.025, edgeMaterial);
  const lipLeft = makeWall(0.045, 0.04, depth + 0.08, -width / 2 - 0.03, -0.05, 0, edgeMaterial);
  const lipRight = makeWall(0.045, 0.04, depth + 0.08, width / 2 + 0.03, -0.05, 0, edgeMaterial);
  const seamA = makeWall(width - 0.22, 0.012, 0.016, 0, 0.045, -depth * 0.14, edgeMaterial);
  const seamB = makeWall(width - 0.34, 0.012, 0.014, 0.04, 0.047, depth * 0.17, edgeMaterial);
  roof.add(slab, lipFront, lipBack, lipLeft, lipRight, seamA, seamB);
  roof.position.set(x, y, z);
  return roof;
}

function makeSteps(material) {
  const steps = new THREE.Group();
  [
    [0.7, 0.045, 0.24, 0.02, 0.025, 0],
    [0.56, 0.045, 0.2, 0.02, 0.08, -0.17],
    [0.42, 0.04, 0.16, 0.02, 0.132, -0.31]
  ].forEach(([w, h, d, x, y, z]) => steps.add(makeWall(w, h, d, x, y, z, material)));
  steps.position.set(-0.35, 0.34, 0.98);
  return steps;
}

function makeDoor(materials) {
  const door = new THREE.Group();
  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.042), materials.recess);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.48, 0.04), materials.wood);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.05), materials.frame);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), materials.roofEdge);
  panel.position.z = 0.034;
  lintel.position.set(0, 0.292, 0.052);
  knob.position.set(0.095, -0.02, 0.064);
  door.add(recess, panel, lintel, knob);
  door.position.set(-0.72, 0.36, 0.704);
  return door;
}

function makeRail(material) {
  const rail = new THREE.Group();
  const top = makeWall(0.78, 0.025, 0.028, 0, 0.26, 0, material);
  const posts = [-0.34, -0.12, 0.12, 0.34].map((x) => makeWall(0.024, 0.24, 0.024, x, 0.14, 0, material));
  rail.add(top, ...posts);
  rail.position.set(0.54, 0.44, 1.18);
  return rail;
}

function makeSoftShadow(x, z, sx, sz, opacity = 0.18) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x17201b,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 36), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, 0.335, z);
  shadow.scale.set(sx, sz, 1);
  return shadow;
}

function makePlanter(x, z, width, material, leafMaterial, rotation = 0) {
  const planter = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.16), material);
  base.position.y = 0.04;
  planter.add(base);
  for (let i = 0; i < 5; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), leafMaterial);
    leaf.position.set(-width * 0.38 + i * (width * 0.19), 0.12 + (i % 2) * 0.025, 0.012);
    leaf.scale.set(1.2, 0.42, 0.7);
    leaf.rotation.y = i * 0.7;
    leaf.castShadow = true;
    planter.add(leaf);
  }
  planter.position.set(x, 0.43, z);
  planter.rotation.y = rotation;
  return planter;
}

function makeBollard(x, z, material, lightMaterial) {
  const bollard = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.18, 10), material);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), lightMaterial);
  post.position.y = 0.09;
  cap.position.y = 0.19;
  bollard.add(post, cap);
  bollard.position.set(x, 0.42, z);
  return bollard;
}

function makeLowWall(width, x, z, material, rotation = 0) {
  const wall = new THREE.Group();
  const base = makeWall(width, 0.12, 0.055, 0, 0.06, 0, material);
  const cap = makeWall(width + 0.05, 0.025, 0.075, 0, 0.135, 0, material);
  wall.add(base, cap);
  wall.position.set(x, 0.39, z);
  wall.rotation.y = rotation;
  return wall;
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
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.055 * scale, 0.5 * scale, 8), trunkMaterial);
  trunk.position.y = 0.23 * scale;
  trunk.rotation.z = 0.06;
  tree.add(trunk);
  [
    [-0.07, 0.56, 0.02, 1.05, 0.62, 0.82],
    [0.11, 0.62, -0.04, 0.82, 0.58, 0.7],
    [0.0, 0.72, 0.08, 0.74, 0.52, 0.68]
  ].forEach(([px, py, pz, sx, sy, sz], index) => {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.21 * scale, 14, 9), leafMaterial);
    crown.scale.set(sx, sy, sz);
    crown.position.set(px * scale, py * scale, pz * scale);
    crown.rotation.y = index * 0.8;
    crown.castShadow = true;
    tree.add(crown);
  });
  tree.position.set(x, 0.31, z);
  tree.castShadow = true;
  return tree;
}

function makeShrub(x, z, scale, material) {
  const shrub = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 10, 7), material);
    const angle = (i / 4) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.08 * scale, 0.07 * scale, Math.sin(angle) * 0.06 * scale);
    leaf.scale.set(1.15, 0.52, 0.82);
    leaf.rotation.y = angle;
    leaf.castShadow = true;
    shrub.add(leaf);
  }
  shrub.position.set(x, 0.38, z);
  return shrub;
}

function makeResident(x, z, scale, materials, rotation = 0) {
  const person = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * scale, 0.018 * scale, 0.18 * scale, 8), materials.dark);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055 * scale, 0.14 * scale, 6, 10), materials.green);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 12, 8), materials.wood);
  legs.position.y = 0.09 * scale;
  body.position.y = 0.25 * scale;
  head.position.y = 0.42 * scale;
  person.add(legs, body, head);
  person.position.set(x, 0.43, z);
  person.rotation.y = rotation;
  person.scale.set(1, 1, 1);
  return person;
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
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
  camera.position.set(5.38, 3.24, 5.68);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "clover-island-canvas";
  renderer.domElement.style.touchAction = "pan-y";
  canvasHost.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.082;
  controls.enablePan = false;
  controls.rotateSpeed = 0.18;
  controls.zoomSpeed = 0.11;
  controls.minPolarAngle = Math.PI * 0.285;
  controls.maxPolarAngle = Math.PI * 0.355;
  controls.minAzimuthAngle = -Math.PI * 0.072;
  controls.maxAzimuthAngle = Math.PI * 0.072;
  controls.minDistance = 6.38;
  controls.maxDistance = 6.82;
  controls.target.set(0.06, 0.56, 0.0);

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  controls.enableZoom = !isMobile;
  controls.minDistance = isMobile ? 6.28 : 7.05;
  controls.maxDistance = isMobile ? 6.68 : 7.34;

  scene.add(new THREE.HemisphereLight(0xf8fbf8, 0xb8c3ba, 2.04));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.35);
  keyLight.position.set(4.2, 6.4, 4.6);
  keyLight.castShadow = !isMobile;
  keyLight.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe6eee8, 0.94);
  fillLight.position.set(-3.6, 3.2, -4.4);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xf1e6cf, 0.78);
  rimLight.position.set(-3.2, 4.8, 3.4);
  scene.add(rimLight);
  const windowGlow = new THREE.PointLight(0xf4e9c6, 0.32, 3.4);
  windowGlow.position.set(-0.24, 1.0, 0.86);
  scene.add(windowGlow);

  const island = new THREE.Group();
  island.rotation.y = -0.16;
  island.scale.setScalar(0.92);
  scene.add(island);

  const mat = {
    base: new THREE.MeshStandardMaterial({ color: 0xe5ebe6, roughness: 0.9, metalness: 0.01 }),
    baseEdge: new THREE.MeshStandardMaterial({ color: 0xcbd5ce, roughness: 0.88 }),
    mid: new THREE.MeshStandardMaterial({ color: 0xd7dfd8, roughness: 0.92 }),
    turf: new THREE.MeshStandardMaterial({ color: 0x9aac8e, roughness: 0.92 }),
    turfAlt: new THREE.MeshStandardMaterial({ color: 0x7f956f, roughness: 0.94 }),
    natural: new THREE.MeshStandardMaterial({ color: 0xbbb7aa, roughness: 0.96 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xc9d0ca, roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xd3dad5, roughness: 0.86 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0xedf1ec, roughness: 0.82 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xdfe7df, roughness: 0.86 }),
    wallAlt: new THREE.MeshStandardMaterial({ color: 0xcbd8cd, roughness: 0.9 }),
    wallWarm: new THREE.MeshStandardMaterial({ color: 0xded5c8, roughness: 0.88 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xd8c9b3, roughness: 0.9 }),
    ochre: new THREE.MeshStandardMaterial({ color: 0xe8dfbd, roughness: 0.88 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb9a27c, roughness: 0.82 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x24302a, roughness: 0.82 }),
    roofEdge: new THREE.MeshStandardMaterial({ color: 0x151d19, roughness: 0.86 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2f4d2c, roughness: 0.86 }),
    softGreen: new THREE.MeshStandardMaterial({ color: 0x506f45, roughness: 0.9 }),
    line: new THREE.LineBasicMaterial({ color: 0xaab4ad, transparent: true, opacity: 0.24 }),
    recess: new THREE.MeshStandardMaterial({ color: 0x233129, roughness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x29352f, roughness: 0.78 }),
    lightFrame: new THREE.MeshStandardMaterial({ color: 0xe7ece8, roughness: 0.76 }),
    warmGlow: new THREE.MeshStandardMaterial({ color: 0xf3ebd4, emissive: 0xf0dfad, emissiveIntensity: 0.18, roughness: 0.56 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xd7e5df,
      roughness: 0.22,
      transmission: 0.22,
      transparent: true,
      opacity: 0.64,
      thickness: 0.22,
      metalness: 0
    })
  };

  const lower = extrudeIsland(makeRoundedIslandShape(0.88), 0.078, mat.base);
  lower.position.y = -0.105;
  lower.scale.set(1, 1, 0.86);
  lower.receiveShadow = true;
  addAnimated(island, lower, 0, "grow-y");

  const bevelBand = extrudeIsland(makeRoundedIslandShape(0.82), 0.026, mat.baseEdge);
  bevelBand.position.y = -0.026;
  bevelBand.scale.set(1, 1, 0.84);
  bevelBand.receiveShadow = true;
  addAnimated(island, bevelBand, 0.1, "grow-y");

  const middle = extrudeIsland(makeRoundedIslandShape(0.76), 0.058, mat.mid);
  middle.position.y = 0.025;
  middle.scale.set(1, 1, 0.81);
  middle.receiveShadow = true;
  addAnimated(island, middle, 0.16, "grow-y");

  const top = extrudeIsland(makeRoundedIslandShape(0.68), 0.064, mat.turf);
  top.position.y = 0.115;
  top.scale.set(1.04, 1, 0.78);
  top.receiveShadow = true;
  addAnimated(island, top, 0.28, "grow-y");

  const meadowA = extrudeIsland(makeRoundedIslandShape(0.18), 0.012, mat.turfAlt);
  meadowA.position.set(-1.08, 0.205, 1.2);
  meadowA.scale.set(1.4, 1, 0.7);
  const meadowB = extrudeIsland(makeRoundedIslandShape(0.13), 0.012, mat.turfAlt);
  meadowB.position.set(1.2, 0.208, -1.12);
  meadowB.scale.set(1.1, 1, 0.66);
  addAnimated(island, meadowA, 0.54, "grow");
  addAnimated(island, meadowB, 0.6, "grow");

  const contourGroup = new THREE.Group();
  [2.42, 1.94, 1.48].forEach((radius, index) => {
    const line = makeContour(radius, radius * 0.72, 0.27 + index * 0.012, mat.line, index === 1 ? 0.12 : 0, index === 2 ? -0.12 : 0.02);
    line.scale.set(0.001, 0.001, 0.001);
    line.userData.delay = 0.42 + index * 0.08;
    line.userData.mode = "line";
    contourGroup.add(line);
  });
  island.add(contourGroup);

  const shadowGroup = new THREE.Group();
  [
    makeSoftShadow(-0.1, 0.18, 1.35, 0.78, 0.13),
    makeSoftShadow(-1.8, 0.74, 0.26, 0.16, 0.16),
    makeSoftShadow(1.62, 0.98, 0.22, 0.14, 0.14),
    makeSoftShadow(1.85, -0.94, 0.22, 0.14, 0.12)
  ].forEach((shadow) => shadowGroup.add(shadow));
  island.add(shadowGroup);

  const pathMaterial = mat.concrete.clone();
  pathMaterial.emissive = new THREE.Color(0xf2e9c7);
  pathMaterial.emissiveIntensity = 0.02;
  const gardenPathMaterial = mat.stone.clone();
  gardenPathMaterial.emissive = new THREE.Color(0xe8f0df);
  gardenPathMaterial.emissiveIntensity = 0.01;
  const driveway = makePath([
    new THREE.Vector3(-2.16, 0.38, -1.42),
    new THREE.Vector3(-1.28, 0.42, -1.02),
    new THREE.Vector3(-0.6, 0.44, -0.54),
    new THREE.Vector3(-0.08, 0.45, 0.0)
  ], 0.135, pathMaterial);
  addAnimated(island, driveway, 0.96, "grow");

  const gardenPath = makePath([
    new THREE.Vector3(1.42, 0.4, 1.0),
    new THREE.Vector3(0.74, 0.43, 0.62),
    new THREE.Vector3(0.12, 0.44, 0.84),
    new THREE.Vector3(-0.52, 0.44, 1.28)
  ], 0.065, gardenPathMaterial);
  addAnimated(island, gardenPath, 1.02, "grow");

  const court = makeWall(1.3, 0.035, 0.78, 0.52, 0.39, 0.9, mat.concreteLight);
  court.rotation.y = -0.05;
  addAnimated(island, court, 0.94, "grow-y");

  const privacyWall = makeWall(0.92, 0.18, 0.055, -0.98, 0.5, 0.9, mat.concrete);
  privacyWall.rotation.y = 0.08;
  addAnimated(island, privacyWall, 1.08, "grow-y");

  const secondaryPaving = makeWall(0.86, 0.026, 0.52, 1.05, 0.375, -0.78, mat.stone);
  secondaryPaving.rotation.y = 0.12;
  addAnimated(island, secondaryPaving, 1.02, "grow-y");

  const serviceCourt = makeWall(0.72, 0.024, 0.42, -1.24, 0.385, -0.64, mat.ochre);
  serviceCourt.rotation.y = -0.12;
  addAnimated(island, serviceCourt, 1.04, "grow-y");

  const gardenWallA = makeLowWall(0.72, -1.46, 0.62, mat.clay, 0.18);
  const gardenWallB = makeLowWall(0.54, 1.28, 0.72, mat.concrete, -0.2);
  addAnimated(island, gardenWallA, 1.1, "grow-y");
  addAnimated(island, gardenWallB, 1.14, "grow-y");

  const house = new THREE.Group();
  house.position.set(0.02, 0.47, -0.16);
  const mainBlock = makeWall(1.56, 0.86, 1.08, -0.18, 0.43, 0.06, mat.wall);
  const sideBlock = makeWall(0.86, 0.66, 0.96, 0.82, 0.33, -0.28, mat.wallWarm);
  const entryBlock = makeWall(0.48, 0.74, 0.52, -1.02, 0.37, -0.06, mat.wallAlt);
  const plinthA = makePanel(1.62, 0.075, 1.14, -0.18, 0.045, 0.06, mat.concrete);
  const plinthB = makePanel(0.9, 0.065, 1.0, 0.82, 0.04, -0.28, mat.concrete);
  const roofA = makeRoof(1.78, 1.22, -0.18, 0.91, 0.06, mat.dark, mat.roofEdge);
  const roofB = makeRoof(1.0, 1.08, 0.82, 0.69, -0.28, mat.dark, mat.roofEdge);
  const roofC = makeRoof(0.62, 0.66, -1.02, 0.78, -0.06, mat.dark, mat.roofEdge);
  const terrace = makeWall(1.16, 0.05, 0.68, 0.5, 0.07, 0.87, mat.concrete);
  const deck = makeWall(0.92, 0.035, 0.46, -0.68, 0.06, 0.78, mat.wood);
  const door = makeDoor(mat);
  const rail = makeRail(mat.roofEdge);
  const entryCanopy = makePanel(0.62, 0.04, 0.34, -0.72, 0.68, 0.79, mat.dark);
  const timberScreen = new THREE.Group();
  [-0.18, 0, 0.18].forEach((px) => {
    const slat = makePanel(0.035, 0.56, 0.045, px, 0.32, 0, mat.wood);
    timberScreen.add(slat);
  });
  timberScreen.position.set(-1.34, 0.2, 0.2);
  timberScreen.rotation.y = 0.02;
  const frontGlass = makeFramedWindow(0.82, 0.4, -0.2, 0.5, 0.705, 0, mat, true);
  const sideGlass = makeFramedWindow(0.5, 0.32, 1.35, 0.4, -0.28, Math.PI / 2, mat);
  const entryGlass = makeFramedWindow(0.24, 0.42, -1.08, 0.4, 0.205, 0, mat);
  const clerestory = makeFramedWindow(0.56, 0.16, 0.52, 0.68, 0.705, 0, mat, true);
  const upperGlass = makeFramedWindow(0.46, 0.22, 0.25, 0.69, -0.505, Math.PI, mat, true);
  const facadeBand = makePanel(1.12, 0.055, 0.052, -0.2, 0.19, 0.62, mat.clay);
  const upperSill = makePanel(0.88, 0.035, 0.05, -0.2, 0.27, 0.705, mat.ochre);
  const sidePlanter = makePlanter(0, 0, 0.38, mat.concrete, mat.softGreen, 0);
  sidePlanter.position.set(0.88, 0.16, 0.68);
  sidePlanter.scale.set(0.86, 0.86, 0.86);
  const balcony = new THREE.Group();
  const balconyDeck = makeWall(0.62, 0.035, 0.25, 0, 0, 0, mat.concreteLight);
  const balconyTop = makeWall(0.68, 0.026, 0.03, 0, 0.22, 0.12, mat.lightFrame);
  [-0.28, -0.09, 0.09, 0.28].forEach((px) => {
    balcony.add(makeWall(0.022, 0.2, 0.024, px, 0.12, 0.12, mat.lightFrame));
  });
  balcony.add(balconyDeck, balconyTop);
  balcony.position.set(0.52, 0.55, -0.58);
  const steps = makeSteps(mat.concreteLight);
  const accentPanel = makePanel(0.5, 0.58, 0.045, 0.48, 0.36, 0.615, mat.wood);
  const serviceVolume = makeWall(0.42, 0.4, 0.38, -0.9, 0.2, -0.58, mat.concrete);
  const slimPergola = new THREE.Group();
  [-0.34, -0.12, 0.1, 0.32].forEach((px) => {
    slimPergola.add(makeWall(0.03, 0.035, 0.78, px, 0, 0, mat.wood));
  });
  slimPergola.position.set(0.46, 0.79, 0.78);
  slimPergola.rotation.y = -0.05;
  const commerceSign = new THREE.Group();
  const signBase = makeWall(0.44, 0.19, 0.035, 0, 0, 0, mat.concreteLight);
  const signLineA = makeWall(0.24, 0.018, 0.04, 0, 0.045, 0.01, mat.green);
  const signLineB = makeWall(0.31, 0.014, 0.04, 0, -0.025, 0.01, mat.dark);
  commerceSign.add(signBase, signLineA, signLineB);
  commerceSign.position.set(-1.48, 0.48, -1.08);
  commerceSign.rotation.y = 0.22;
  const apartmentMarker = new THREE.Group();
  const markerCore = makeWall(0.3, 0.92, 0.22, 0, 0.46, 0, mat.wallAlt);
  const markerWarm = makeWall(0.035, 0.82, 0.235, -0.135, 0.42, 0.0, mat.clay);
  const markerCap = makeWall(0.36, 0.045, 0.28, 0, 0.94, 0, mat.dark);
  [-0.28, -0.08, 0.12, 0.32].forEach((py) => {
    apartmentMarker.add(makeWall(0.13, 0.045, 0.03, 0.035, 0.48 + py, 0.112, mat.glass));
  });
  apartmentMarker.add(markerCore, markerWarm, markerCap);
  apartmentMarker.position.set(1.2, 0.43, -0.94);
  apartmentMarker.rotation.y = -0.28;
  [mainBlock, sideBlock, entryBlock, plinthA, plinthB, roofA, roofB, roofC, terrace, deck, door, rail, entryCanopy, timberScreen, frontGlass, sideGlass, entryGlass, clerestory, upperGlass, facadeBand, upperSill, sidePlanter, balcony, accentPanel, serviceVolume, slimPergola, commerceSign, apartmentMarker, steps].forEach((part, index) => {
    part.userData.delay = 0.7 + index * 0.035;
    part.userData.mode = "grow-y";
    part.userData.initialScale = part.scale.clone();
    part.scale.set(part.scale.x, 0.001, part.scale.z);
    part.traverse((child) => {
      if (!child.material) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.userData.targetOpacity = material.opacity;
        material.opacity = 0;
      });
    });
    house.add(part);
  });
  island.add(house);

  const vegetation = new THREE.Group();
  const trees = isMobile ? [
    [-1.64, 0.74, 0.78], [1.58, 1.02, 0.62], [1.74, -1.0, 0.58]
  ] : [
    [-1.72, 0.76, 0.82], [-1.3, 1.22, 0.58], [1.54, 1.08, 0.68],
    [1.82, -0.86, 0.6], [1.02, -1.42, 0.5]
  ];
  trees.forEach(([x, z, scale], index) => {
    const tree = makeTree(x, z, scale, mat.dark, index % 2 ? mat.softGreen : mat.green);
    tree.userData.delay = 1.22 + index * 0.05;
    tree.userData.mode = "grow-y";
    tree.userData.initialScale = tree.scale.clone();
    tree.scale.set(1, 0.001, 1);
    vegetation.add(tree);
  });
  [
    [-0.94, 1.48, 0.9],
    [-1.18, -1.08, 0.72],
    [1.14, 1.34, 0.68],
    [1.82, 0.24, 0.58],
    [0.28, -1.42, 0.48]
  ].forEach(([x, z, scale], index) => {
    const shrub = makeShrub(x, z, scale, index % 2 ? mat.turfAlt : mat.softGreen);
    addAnimated(vegetation, shrub, 1.32 + index * 0.04, "grow");
  });
  [
    [-0.86, 0.86, 0.42, 0.05],
    [0.76, 0.64, 0.5, -0.16]
  ].forEach(([x, z, width, rotation], index) => {
    const planter = makePlanter(x, z, width, mat.concrete, index % 2 ? mat.green : mat.softGreen, rotation);
    addAnimated(vegetation, planter, 1.42 + index * 0.05, "grow-y");
  });
  [
    [-0.28, 0.98],
    [0.34, 0.78],
    [-1.22, -0.72]
  ].forEach(([x, z], index) => {
    const bollard = makeBollard(x, z, mat.dark, mat.warmGlow);
    addAnimated(vegetation, bollard, 1.46 + index * 0.04, "grow-y");
  });
  [
    [-0.66, 1.12, 0.72, -0.4],
    [-0.46, 1.0, 0.58, 0.35]
  ].forEach(([x, z, scale, rotation], index) => {
    const resident = makeResident(x, z, scale, mat, rotation);
    addAnimated(vegetation, resident, 1.48 + index * 0.08, "grow-y");
  });
  island.add(vegetation);

  const rocks = new THREE.Group();
  for (let i = 0; i < (isMobile ? 3 : 5); i += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + (i % 3) * 0.017, 0), mat.natural);
    rock.position.set(-1.74 + i * 0.44, 0.41, 1.62 - (i % 2) * 0.22);
    rock.rotation.set(0.2 * i, 0.7 * i, 0.12 * i);
    rock.scale.set(1.1 + i * 0.05, 0.42, 0.75 + (i % 2) * 0.15);
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
  signature.position.set(-1.55, 0.52, -1.5);
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
    const rect = canvasHost.getBoundingClientRect();
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
        if (child.material) child.material.opacity = 0.24 * eased;
        return;
      }
      const initial = child.userData.initialScale || new THREE.Vector3(1, 1, 1);
      if (child.userData.mode === "grow-y") child.scale.set(initial.x, Math.max(0.001, initial.y * eased), initial.z);
      if (child.userData.mode === "grow") child.scale.setScalar(Math.max(0.001, eased));
      child.traverse((part) => {
        if (!part.material) return;
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        materials.forEach((material) => {
          const target = material.userData.targetOpacity ?? 1;
          material.opacity = target * eased;
        });
      });
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
      const targetRotation = -0.16 + Math.sin(elapsed * 0.24) * 0.028;
      island.rotation.y += (targetRotation - island.rotation.y) * 0.028;
      island.rotation.x = Math.sin(elapsed * 0.18) * 0.006;
    }

    const activeGlow = interacting ? 0.2 : 0.035 + Math.sin(elapsed * 0.72) * 0.012;
    pathMaterial.emissiveIntensity += (activeGlow - pathMaterial.emissiveIntensity) * 0.08;
    gardenPathMaterial.emissiveIntensity += (activeGlow * 0.6 - gardenPathMaterial.emissiveIntensity) * 0.08;
    windowGlow.intensity += ((interacting ? 0.42 : 0.3) - windowGlow.intensity) * 0.06;

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
