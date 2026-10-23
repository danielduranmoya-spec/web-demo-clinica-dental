/* =========================================================
   Nácar · escena 3D (three.js)
   Un solo lienzo fijo detrás de la web. Cada modelo sigue a un
   elemento [data-anchor] del HTML:
   - hero:     nube de partículas que forma la muela + escáner (estilo Bionova)
   - implante: corona, pilar y tornillo que se despiezan con el scroll
   - sonrisa:  muela que cambia de color con la guía VITA
   - peques:   Perla, la mascota interactiva
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/addons/MeshSurfaceSampler.js';
import {
  crearDiente, crearCorona, crearPilar, crearTornillo, crearBloque, crearPerla,
  materialNacar, materialTitanio, materialAnodizado, materialEncia, materialHueso, utils
} from './modelos.js';

const { smooth, lerp, TAU } = utils;
const root = document.documentElement;
const canvas = document.getElementById('escena');
const loader = document.querySelector('[data-loader]');
const loaderBar = document.querySelector('[data-loader-bar]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = matchMedia('(max-width: 860px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

function sinWebGL() {
  root.classList.add('no-webgl');
  loader?.classList.add('is-done');
  root.classList.add('is-ready');
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  sinWebGL();
}

if (renderer) iniciar();

function iniciar() {
  const progreso = v => { if (loaderBar) loaderBar.style.width = `${Math.round(v * 100)}%`; };
  progreso(0.15);

  let dpr = Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const FOV = 30, CAMZ = 12;
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, CAMZ);

  const luz = new THREE.DirectionalLight(0xffffff, 1.6);
  luz.position.set(4, 6, 8);
  scene.add(luz);
  const luzMenta = new THREE.PointLight(0x5fe0c8, 18, 30);
  luzMenta.position.set(-5, -2, 4);
  scene.add(luzMenta);
  const luzCoral = new THREE.PointLight(0xf07d6a, 10, 30);
  luzCoral.position.set(5, -4, 2);
  scene.add(luzCoral);
  progreso(0.35);

  /* ---------- Anclas ---------- */
  const anclas = {};
  document.querySelectorAll('[data-anchor]').forEach(el => { anclas[el.dataset.anchor] = el; });
  const perPx = () => (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAMZ) / innerHeight;
  function colocar(grupo, el, alto, relleno = 1) {
    const r = el.getBoundingClientRect();
    const k = perPx();
    grupo.position.x = (r.left + r.width / 2 - innerWidth / 2) * k;
    grupo.position.y = -(r.top + r.height / 2 - innerHeight / 2) * k;
    const altoPx = Math.min(r.height, r.width * 1.25) * relleno;
    grupo.scale.setScalar((altoPx * k) / alto);
    grupo.visible = r.bottom > -innerHeight * 0.15 && r.top < innerHeight * 1.15 && r.height > 0;
    return r;
  }

  /* =====================================================
     1. HERO: muela + partículas + escáner
     ===================================================== */
  const hero = new THREE.Group();
  const heroPivot = new THREE.Group();
  hero.add(heroPivot);
  scene.add(hero);
  const geoDiente = crearDiente({ segU: movil ? 96 : 128, segV: movil ? 120 : 160 });
  const OFF_Y = 0.42; // centra la muela (va de -1.8 a 1.05)
  const planoScan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
  const matHero = materialNacar();
  matHero.clippingPlanes = [planoScan];
  const dienteHero = new THREE.Mesh(geoDiente, matHero);
  dienteHero.position.y = OFF_Y;
  heroPivot.add(dienteHero);

  // Partículas: empiezan como doble hélice de ADN y se posan sobre la muela
  const N = movil ? 4200 : 9000;
  const sampler = new MeshSurfaceSampler(dienteHero).build();
  const aEnd = new Float32Array(N * 3), aStart = new Float32Array(N * 3), aNor = new Float32Array(N * 3), aRand = new Float32Array(N);
  const v = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    sampler.sample(v, nrm);
    aEnd.set([v.x, v.y + OFF_Y, v.z], i * 3);
    aNor.set([nrm.x, nrm.y, nrm.z], i * 3);
    const t = Math.random();
    const hebra = i % 2 ? Math.PI : 0;
    const ang = t * TAU * 3.2 + hebra;
    const rad = 1.25 + (Math.random() - 0.5) * 0.18;
    if (i % 7 === 0) { // peldaños de la hélice
      const s = Math.random() * 2 - 1;
      aStart.set([Math.cos(ang) * rad * s, lerp(-2.6, 2.6, t), Math.sin(ang) * rad * s], i * 3);
    } else {
      aStart.set([Math.cos(ang) * rad, lerp(-2.6, 2.6, t) + (Math.random() - 0.5) * 0.06, Math.sin(ang) * rad], i * 3);
    }
    aRand[i] = Math.random();
  }
  const geoPts = new THREE.BufferGeometry();
  geoPts.setAttribute('position', new THREE.BufferAttribute(aEnd, 3));
  geoPts.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3));
  geoPts.setAttribute('aNor', new THREE.BufferAttribute(aNor, 3));
  geoPts.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  const uPts = {
    uMorph: { value: reduce ? 1.4 : 0 }, uTime: { value: 0 }, uScan: { value: 10 }, uFade: { value: 1 },
    uSize: { value: movil ? 2.6 : 2.2 }, uPR: { value: dpr },
    uA: { value: new THREE.Color('#5FE0C8') }, uB: { value: new THREE.Color('#F07D6A') }
  };
  const matPts = new THREE.ShaderMaterial({
    uniforms: uPts, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aStart; attribute vec3 aNor; attribute float aRand;
      uniform float uMorph, uTime, uScan, uSize, uPR;
      varying float vGlow; varying float vRand; varying float vK;
      void main() {
        float delay = aRand * 0.35 + (1.0 - clamp((position.y + 1.4) / 2.9, 0.0, 1.0)) * 0.25;
        float k = clamp((uMorph - delay) / 0.55, 0.0, 1.0);
        k = k * k * (3.0 - 2.0 * k);
        float a = uTime * 0.35 + aRand * 6.2831;
        vec3 helix = aStart;
        float c = cos(uTime * 0.6), s = sin(uTime * 0.6);
        helix.xz = mat2(c, -s, s, c) * helix.xz;
        vec3 p = mix(helix, position + aNor * (0.035 + 0.05 * sin(a * 2.0) * k), k);
        p += aNor * k * (0.12 + 0.18 * aRand) * (0.5 + 0.5 * sin(a));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vGlow = exp(-pow((p.y - uScan) * 7.0, 2.0));
        vRand = aRand; vK = k;
        gl_PointSize = uSize * uPR * (0.6 + aRand * 0.8 + vGlow * 2.2) * (14.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uA, uB; uniform float uFade;
      varying float vGlow; varying float vRand; varying float vK;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.0, r);
        vec3 col = mix(uA, uB, step(0.86, vRand));
        col = mix(col, vec3(1.0), vGlow * 0.8);
        float alpha = soft * (0.5 + vGlow * 0.9) * mix(1.0, uFade, vK);
        gl_FragColor = vec4(col, alpha);
      }`
  });
  const puntos = new THREE.Points(geoPts, matPts);
  puntos.frustumCulled = false;
  heroPivot.add(puntos);

  // Anillo del escáner
  const matScan = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uO: { value: 0 }, uC: { value: new THREE.Color('#5FE0C8') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uO; uniform vec3 uC; varying vec2 vUv;
      void main(){ float r = length(vUv - 0.5) * 2.0; float ring = smoothstep(1.0, 0.92, r) * smoothstep(0.7, 0.98, r); float fill = smoothstep(1.0, 0.0, r) * 0.18;
      gl_FragColor = vec4(uC, (ring + fill) * uO); }`
  });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9), matScan);
  scan.rotation.x = -Math.PI / 2;
  heroPivot.add(scan);
  progreso(0.6);

  /* =====================================================
     2. IMPLANTE: corona + pilar + tornillo + encía + hueso
     ===================================================== */
  const implante = new THREE.Group();
  const impPivot = new THREE.Group();
  implante.add(impPivot);
  scene.add(implante);
  const imp = new THREE.Group();
  imp.position.y = -0.1;
  impPivot.add(imp);
  const corona = new THREE.Mesh(crearCorona(), materialNacar());
  const pilar = new THREE.Mesh(crearPilar(), materialAnodizado());
  const tornillo = new THREE.Mesh(crearTornillo(), materialTitanio());
  const BASE = { corona: 0.2, pilar: -0.55, tornillo: -0.55 };
  imp.add(corona, pilar, tornillo);

  const geoEncia = crearBloque({ ancho: 2.6, y0: -0.56, y1: -0.14, fondo: 1.5, radio: 0.2 });
  const matEncia = materialEncia();
  const encia = new THREE.Mesh(geoEncia, matEncia);
  const geoHueso = crearBloque({ ancho: 2.5, y0: -2.05, y1: -0.6, fondo: 1.42, radio: 0.3 });
  const matHuesoI = materialHueso();
  matHuesoI.map = texturaHueso();
  const hueso = new THREE.Mesh(geoHueso, matHuesoI);
  const lineas = new THREE.Group();
  const matLinea = new THREE.LineBasicMaterial({ color: 0x5fe0c8, transparent: true, opacity: 0, depthWrite: false });
  lineas.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoEncia, 25), matLinea));
  lineas.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoHueso, 25), matLinea));
  imp.add(encia, hueso, lineas);
  encia.renderOrder = 2; hueso.renderOrder = 2;

  function texturaHueso() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#efe5d3'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) {
      x.fillStyle = `rgba(${150 + Math.random() * 40},${120 + Math.random() * 30},${90 + Math.random() * 20},${0.15 + Math.random() * 0.25})`;
      x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 5, 1 + Math.random() * 3, Math.random() * 3, 0, TAU); x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.8, 0.8);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const stage = document.querySelector('[data-implante]');
  const seccionImp = document.getElementById('implante');
  const rail = document.querySelector('[data-rail]');
  const ticks = stage ? stage.querySelectorAll('[data-tick]') : [];
  const specs = document.querySelector('[data-specs]');
  let pasoActual = -1;

  function animarImplante(p, t) {
    const s1 = smooth(0.18, 0.42, p);      // encía y hueso se vuelven rayos X
    const s2 = smooth(0.46, 0.66, p);      // despiece
    const s3 = smooth(0.74, 0.97, p);      // colocación
    const opac = lerp(1, 0.16, s1) + 0.24 * s3;
    for (const [m, o] of [[matEncia, opac], [matHuesoI, opac * 0.95]]) {
      m.opacity = o;
      m.depthWrite = o > 0.98;
    }
    matLinea.opacity = 0.55 * s1 * (1 - 0.5 * s3);
    const ex = s2 * (1 - s3);
    const a = smooth(0.74, 0.86, p), bb = smooth(0.84, 0.92, p), c = smooth(0.9, 0.97, p);
    tornillo.position.y = BASE.tornillo + 0.45 * s2 * (1 - a);
    tornillo.rotation.y = -a * TAU * 3;
    pilar.position.y = BASE.pilar + 0.95 * s2 * (1 - bb);
    corona.position.y = BASE.corona + 1.55 * s2 * (1 - c);
    pilar.rotation.y = ex * 0.8;
    corona.rotation.y = -ex * 0.5;
    impPivot.rotation.y = -0.5 + p * 1.3 + Math.sin(t * 0.4) * 0.05;
    impPivot.rotation.x = 0.12 + 0.12 * s2 * (1 - s3);
    const paso = Math.min(3, Math.floor(p * 4));
    if (paso !== pasoActual && stage) {
      pasoActual = paso;
      stage.dataset.paso = paso;
      ticks.forEach(el => el.classList.toggle('is-on', +el.dataset.tick <= paso));
      if (specs) specs.textContent = ['Zirconio · 1.200 MPa', 'TAC 3D · vóxel 0,08 mm', 'Ø 4,1 × 11,5 mm · Ti grado 5', 'Par de inserción 35 N·cm'][paso];
    }
    if (rail) rail.style.transform = `scaleX(${p})`;
  }
  progreso(0.75);

  /* =====================================================
     3. SONRISA: muela con el color de la guía VITA
     ===================================================== */
  const sonrisa = new THREE.Group();
  const sonPivot = new THREE.Group();
  sonrisa.add(sonPivot);
  scene.add(sonrisa);
  const matTono = materialNacar({ ligero: true });
  matTono.iridescence = 0.25;
  const dienteTono = new THREE.Mesh(geoDiente, matTono);
  dienteTono.position.y = OFF_Y;
  sonPivot.add(dienteTono);
  const colorTono = new THREE.Color('#DCC69F');
  const colorObjetivo = new THREE.Color('#DCC69F');
  const tonos = window.NACAR_TONOS || [];
  const shadeInput = document.querySelector('[data-shade]');
  const ponerTono = i => { if (tonos[i]) colorObjetivo.set(tonos[i].color); };
  if (shadeInput) {
    ponerTono(+shadeInput.value);
    colorTono.copy(colorObjetivo);
    shadeInput.addEventListener('input', () => ponerTono(+shadeInput.value));
  }
  // Girar arrastrando
  let rotSon = 0.4, velSon = 0, arrastre = null;
  const visSon = document.querySelector('.sonrisa__visual');
  if (visSon) {
    visSon.addEventListener('pointerdown', e => { arrastre = { x: e.clientX }; visSon.setPointerCapture(e.pointerId); });
    visSon.addEventListener('pointermove', e => {
      if (!arrastre) return;
      const dx = e.clientX - arrastre.x;
      arrastre.x = e.clientX;
      velSon = dx * 0.01;
      rotSon += velSon;
    });
    const fin = () => { arrastre = null; };
    visSon.addEventListener('pointerup', fin);
    visSon.addEventListener('pointercancel', fin);
  }

  /* =====================================================
     4. PEQUES: Perla
     ===================================================== */
  const peques = new THREE.Group();
  const perla = crearPerla();
  perla.position.y = 0.15;
  peques.add(perla);
  scene.add(peques);
  const P = perla.userData;
  const bubble = document.querySelector('[data-bubble]');
  const FRASES = {
    saluda: '¡Hola! Te espero en la consulta 👋',
    salta: '¡Sin caries salto más alto!',
    gira: '¡Mira qué brillo! ✨',
    cepilla: '2 minutos, 2 veces al día 🪥'
  };
  const DUR = { saluda: 1.8, salta: 1.0, gira: 1.2, cepilla: 3.2 };
  let accion = null, accionT0 = 0, parpadeo = 2;
  function hacer(nombre) {
    accion = nombre;
    accionT0 = reloj.elapsedTime;
    if (bubble) {
      bubble.textContent = FRASES[nombre];
      bubble.style.animation = 'none';
      void bubble.offsetWidth;
      bubble.style.animation = '';
    }
  }
  document.querySelectorAll('[data-perla]').forEach(b => b.addEventListener('click', () => hacer(b.dataset.perla)));
  document.querySelector('.peques__visual')?.addEventListener('click', () => {
    const op = ['salta', 'gira', 'saluda'];
    hacer(op[Math.floor(Math.random() * op.length)]);
  });

  function animarPerla(t, dt, pantalla) {
    const u = P;
    let y = Math.sin(t * 2.2) * 0.05, rotY = Math.sin(t * 0.7) * 0.25, sy = 1;
    let brazoD = 0.55 + Math.sin(t * 2.2) * 0.08, brazoI = -0.55 - Math.sin(t * 2.2) * 0.08;
    u.cepillo.visible = false;
    if (accion) {
      const k = (t - accionT0) / DUR[accion];
      if (k >= 1) accion = null;
      else if (accion === 'saluda') { brazoD = 2.6 + Math.sin(k * 30) * 0.35; }
      else if (accion === 'salta') {
        y += 4 * 0.9 * k * (1 - k);
        sy = k < 0.12 ? 0.86 : k > 0.88 ? 0.9 : 1.06;
        brazoD = 2.2; brazoI = -2.2;
      } else if (accion === 'gira') { rotY += (1 - Math.pow(1 - k, 3)) * TAU; }
      else if (accion === 'cepilla') {
        u.cepillo.visible = true;
        u.cepillo.position.x = Math.sin(k * 40) * 0.22;
        u.cepillo.rotation.z = Math.sin(k * 40) * 0.1;
        brazoD = 1.3 + Math.sin(k * 40) * 0.2;
      }
    }
    perla.position.y = 0.15 + y;
    perla.rotation.y = rotY;
    perla.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    u.brazos[1].rotation.z = lerp(u.brazos[1].rotation.z, brazoD, Math.min(1, dt * 12));
    u.brazos[0].rotation.z = lerp(u.brazos[0].rotation.z, brazoI, Math.min(1, dt * 12));
    // Ojos que siguen al cursor y parpadean
    parpadeo -= dt;
    let esc = 1;
    if (parpadeo < 0.12) esc = 0.12;
    if (parpadeo < 0) parpadeo = 2.5 + Math.random() * 2.5;
    const dx = THREE.MathUtils.clamp((puntero.x - pantalla.x) / 400, -1, 1);
    const dy = THREE.MathUtils.clamp((puntero.y - pantalla.y) / 400, -1, 1);
    for (const ojo of u.ojos) {
      ojo.scale.y = esc;
      ojo.userData.pupila.position.x = dx * 0.05;
      ojo.userData.pupila.position.y = -dy * 0.05;
    }
  }
  progreso(0.9);

  /* ---------- Puntero ---------- */
  const puntero = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  addEventListener('pointermove', e => {
    puntero.x = e.clientX; puntero.y = e.clientY;
    puntero.nx = e.clientX / innerWidth * 2 - 1;
    puntero.ny = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  /* ---------- Tamaño ---------- */
  function ajustar() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  }
  addEventListener('resize', ajustar);

  /* ---------- Fondo según la sección 3D visible ---------- */
  const secciones3d = [...document.querySelectorAll('.sec-3d')];
  function fondo() {
    let mejor = null, max = 0;
    for (const s of secciones3d) {
      const r = s.getBoundingClientRect();
      const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (vis > max) { max = vis; mejor = s; }
    }
    if (mejor && document.body.dataset.fondo !== mejor.dataset.fondo) document.body.dataset.fondo = mejor.dataset.fondo;
  }

  /* ---------- Bucle ---------- */
  const reloj = new THREE.Clock();
  let tIntro = -1, lento = 0, muestras = 0, visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  const vWorld = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(reloj.getDelta(), 0.05);
    const t = reloj.elapsedTime;
    fondo();

    // HERO
    colocar(hero, anclas.hero, 3.1, 0.95);
    if (hero.visible) {
      if (tIntro < 0) tIntro = t;
      const ti = reduce ? 10 : t - tIntro;
      uPts.uTime.value = t;
      uPts.uMorph.value = Math.min(1.4, ti / 2.2 * 1.4);
      // Escáner: barre de arriba abajo y revela la muela sólida
      const yTop = 1.35, yBot = -1.95;
      const k = smooth(1.3, 3.4, ti);
      let scanY = lerp(yTop, yBot, k);
      matScan.uniforms.uO.value = ti < 3.6 ? smooth(1.2, 1.5, ti) * (1 - smooth(3.2, 3.6, ti)) : 0.35 * Math.max(0, Math.sin((ti - 3.6) * 0.9));
      if (ti >= 3.6) scanY = lerp(yTop, yBot, (Math.cos((ti - 3.6) * 0.9 + Math.PI) * 0.5 + 0.5));
      scan.position.y = scanY;
      uPts.uScan.value = scanY;
      uPts.uFade.value = lerp(1, 0.55, smooth(2.6, 4.2, ti));
      // Plano de recorte en coordenadas del mundo
      heroPivot.updateMatrixWorld();
      const revelado = ti >= 3.4 ? -50 : lerp(yTop, yBot, k);
      vWorld.set(0, revelado, 0).applyMatrix4(heroPivot.matrixWorld);
      planoScan.constant = -vWorld.y;
      const tilt = reduce ? 0 : 1;
      heroPivot.rotation.y = lerp(heroPivot.rotation.y, 0.5 + t * 0.25 * tilt + puntero.nx * 0.35 * tilt, 0.08);
      heroPivot.rotation.x = lerp(heroPivot.rotation.x, 0.12 + puntero.ny * 0.18 * tilt, 0.08);
      if (ti > 0.3) { loader?.classList.add('is-done'); root.classList.add('is-ready'); }
    }

    // IMPLANTE
    colocar(implante, anclas.implante, 5.0, 1);
    if (implante.visible && seccionImp) {
      const r = seccionImp.getBoundingClientRect();
      const p = THREE.MathUtils.clamp(-r.top / (r.height - innerHeight), 0, 1);
      animarImplante(p, t);
    }

    // SONRISA
    colocar(sonrisa, anclas.sonrisa, 3.1, 0.92);
    if (sonrisa.visible) {
      if (!arrastre) { velSon *= 0.95; rotSon += velSon + (reduce ? 0 : dt * 0.35); }
      sonPivot.rotation.y = rotSon;
      sonPivot.rotation.x = 0.15;
      colorTono.lerp(colorObjetivo, Math.min(1, dt * 6));
      matTono.color.copy(colorTono);
    }

    // PEQUES
    const rp = colocar(peques, anclas.peques, 3.3, 0.8);
    if (peques.visible) animarPerla(t, dt, { x: rp.left + rp.width / 2, y: rp.top + rp.height / 2 });

    if (hero.visible || implante.visible || sonrisa.visible || peques.visible) {
      renderer.render(scene, camera);
      // Si va lento los primeros segundos, bajamos la resolución
      if (muestras < 90 && t > 1) {
        muestras++;
        if (dt > 1 / 38) lento++;
        if (muestras === 90 && lento > 45 && dpr > 1) {
          dpr = 1;
          renderer.setPixelRatio(dpr);
          uPts.uPR.value = dpr;
          ajustar();
        }
      }
    }
  }
  progreso(1);
  requestAnimationFrame(frame);
  window.NACAR_3D = { hacer, scene, renderer };
}
