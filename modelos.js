/* =========================================================
   Nácar · modelos 3D generados con código (sin descargas)
   - crearDiente: muela con cúspides, surcos y dos raíces
   - crearCorona, crearPilar, crearTornillo: piezas del implante
   - crearBloque: encía y hueso
   - crearPerla: la mascota (muela con ojos, lazo y brazos)
   Lo usan escena.js (la web) y herramientas/video.html (el vídeo)
   ========================================================= */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* Perfiles (radio, altura) de abajo arriba. La línea de la encía está en y = 0 */
const PERFIL_MUELA = [
  [0.0, -0.46], [0.22, -0.45], [0.42, -0.36], [0.53, -0.18], [0.6, 0.02],
  [0.74, 0.2], [0.82, 0.42], [0.8, 0.62], [0.71, 0.78], [0.52, 0.87], [0.26, 0.88], [0.0, 0.86]
];
const PERFIL_CORONA = [
  [0.0, -0.3], [0.2, -0.3], [0.33, -0.26], [0.5, -0.1], [0.6, 0.02],
  [0.74, 0.2], [0.82, 0.42], [0.8, 0.62], [0.71, 0.78], [0.52, 0.87], [0.26, 0.88], [0.0, 0.86]
];

/* Relieve de la cara de masticar: 4 cúspides, fosa central y surcos en cruz */
function cuspides(x, z) {
  let h = 0;
  for (const [cx, cz, a] of [[0.33, 0.27, 0.2], [-0.33, 0.27, 0.18], [0.33, -0.27, 0.19], [-0.33, -0.27, 0.17]]) {
    h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.05);
  }
  h -= 0.07 * Math.exp(-(x * x + z * z) / 0.05);
  h -= 0.05 * Math.exp(-(z * z) / 0.004) * (1 - smooth(0.42, 0.62, Math.abs(x)));
  h -= 0.04 * Math.exp(-(x * x) / 0.004) * (1 - smooth(0.36, 0.52, Math.abs(z)));
  return h;
}

/* Superficie de revolución deformada: sección «cuadrada» redondeada,
   raíces que se separan en dos y cúspides arriba */
function superficie(perfil, { segU = 120, segV = 150 } = {}) {
  const curva = new THREE.SplineCurve(perfil.map(([r, y]) => new THREE.Vector2(r, y)));
  const pos = [];
  const idx = [];
  const n = 2.5;
  for (let j = 0; j <= segV; j++) {
    const p = curva.getPointAt(j / segV);
    const R = Math.max(0, p.x);
    const y0 = p.y;
    for (let i = 0; i < segU; i++) {
      const th = (i / segU) * TAU;
      const c = Math.cos(th), s = Math.sin(th);
      const se = 1 / Math.pow(Math.abs(c) ** n + Math.abs(s) ** n, 1 / n) / 1.1;
      let r = R * se;
      const zf = 0.92;
      const x = r * c * 1.05;
      const z = r * s * zf;
      let y = y0;
      y += smooth(0.56, 0.82, y0) * cuspides(x, z);
      pos.push(x, y, z);
    }
  }
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * segU + i, b = j * segU + (i + 1) % segU;
      const c2 = a + segU, d = b + segU;
      idx.push(a, c2, b, b, c2, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/* Tubo que se estrecha a lo largo de una curva (cada raíz) */
function tuboConico(puntos, r0, segs = 48, radial = 28) {
  const curva = new THREE.CatmullRomCurve3(puntos.map(p => new THREE.Vector3(...p)));
  const marcos = curva.computeFrenetFrames(segs, false);
  const pos = [], idx = [];
  for (let j = 0; j <= segs; j++) {
    const t = j / segs;
    const c = curva.getPointAt(t);
    let r = r0 * (1 - 0.78 * Math.pow(t, 1.3));
    if (t > 0.86) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2));
    const N = marcos.normals[j], B = marcos.binormals[j];
    for (let i = 0; i < radial; i++) {
      const a = (i / radial) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a) * 0.82;
      pos.push(c.x + r * (ca * N.x + sa * B.x), c.y + r * (ca * N.y + sa * B.y), c.z + r * (ca * N.z + sa * B.z));
    }
  }
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * radial + i, b = j * radial + (i + 1) % radial;
      idx.push(a, b, a + radial, b, b + radial, a + radial);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/* Junta varias geometrías indexadas en una sola */
function juntar(geos) {
  const pos = [], idx = [];
  let base = 0;
  for (const g of geos) {
    const p = g.attributes.position.array;
    for (let k = 0; k < p.length; k++) pos.push(p[k]);
    for (const i of g.index.array) idx.push(i + base);
    base += p.length / 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/* Muela natural: corona + tronco y dos raíces que se abren y vuelven a cerrar */
export function crearDiente({ escalaRaiz = 1, segU = 120, segV = 150 } = {}) {
  const k = escalaRaiz;
  const raiz = sx => tuboConico([
    [sx * 0.2, -0.05, 0], [sx * 0.34, -0.5 * k, 0.02], [sx * 0.42, -1.0 * k, 0.04], [sx * 0.36, -1.5 * k, 0.02], [sx * 0.27, -1.8 * k, 0]
  ], 0.4);
  return juntar([superficie(PERFIL_MUELA, { segU, segV }), raiz(1), raiz(-1)]);
}
export function crearCorona(op = {}) { return superficie(PERFIL_CORONA, { segV: 110, ...op }); }

/* Pilar de titanio anodizado (de y = 0 hacia arriba) */
export function crearPilar() {
  const pts = [[0, 0], [0.19, 0], [0.23, 0.05], [0.245, 0.13], [0.21, 0.2], [0.175, 0.48], [0.14, 0.6], [0.06, 0.63], [0, 0.63]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 64);
  g.computeVertexNormals();
  return g;
}

/* Tornillo con rosca helicoidal (de y = 0 hacia abajo, largo L) */
export function crearTornillo({ L = 1.2, paso = 0.11, segU = 72, segV = 320 } = {}) {
  const pos = [];
  const idx = [];
  const filas = segV + 3;
  for (let j = 0; j < filas; j++) {
    let r, y;
    if (j === 0) { r = 0; y = 0; }
    else if (j === filas - 1) { r = 0; y = -L - 0.01; }
    else {
      const h = (j - 1) / segV;
      y = -h * L;
      r = 0.2 - 0.06 * smooth(0.6, 1, h);
      if (h > 0.9) r *= Math.sqrt(Math.max(0, 1 - ((h - 0.9) / 0.1) ** 2)) * 0.5 + 0.5;
    }
    for (let i = 0; i < segU; i++) {
      const th = (i / segU) * TAU;
      let rr = r;
      if (j > 0 && j < filas - 1) {
        const h = (j - 1) / segV;
        const fase = ((-y / paso + i / segU) % 1 + 1) % 1;
        const tri = 1 - Math.abs(2 * fase - 1);
        const prof = 0.065 * smooth(0.06, 0.12, h) * (1 - smooth(0.88, 1, h));
        rr = r + prof * Math.pow(tri, 0.7);
      }
      pos.push(rr * Math.cos(th), y, rr * Math.sin(th));
    }
  }
  for (let j = 0; j < filas - 1; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * segU + i, b = j * segU + (i + 1) % segU;
      idx.push(a, b, a + segU, b, b + segU, a + segU);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* Bloque redondeado (encía u hueso) */
export function crearBloque({ ancho = 3, y0 = -0.5, y1 = 0, fondo = 1.6, radio = 0.2 } = {}) {
  const s = new THREE.Shape();
  const x0 = -ancho / 2, x1 = ancho / 2, r = Math.min(radio, (y1 - y0) / 2);
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: fondo, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 6, curveSegments: 10 });
  g.translate(0, 0, -fondo / 2);
  return g;
}

/* ---------- Materiales ---------- */
export function materialNacar({ color = '#F4EEE3', ligero = false } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.24, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: ligero ? 0.35 : 0.65, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520],
    sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color('#BFFFF1'),
    specularIntensity: 0.9
  });
}
export const materialTitanio = () => new THREE.MeshStandardMaterial({ color: '#C3CAD1', metalness: 1, roughness: 0.27 });
export const materialAnodizado = () => new THREE.MeshPhysicalMaterial({ color: '#D9B46A', metalness: 1, roughness: 0.22, iridescence: 0.4, iridescenceIOR: 1.6 });
export const materialEncia = () => new THREE.MeshPhysicalMaterial({ color: '#EF8E80', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: new THREE.Color('#FFC2B8'), transparent: true });
export const materialHueso = () => new THREE.MeshStandardMaterial({ color: '#E9DDC8', roughness: 0.85, transparent: true });

/* ---------- Perla, la mascota ---------- */
export function crearPerla() {
  const g = new THREE.Group();
  g.name = 'perla';
  const cuerpo = new THREE.Mesh(crearDiente({ escalaRaiz: 0.42, segU: 96, segV: 120 }), materialNacar({ color: '#FFFBF4', ligero: true }));
  g.add(cuerpo);

  const blanco = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
  const negro = new THREE.MeshStandardMaterial({ color: '#0A2530', roughness: 0.15 });
  const coral = new THREE.MeshStandardMaterial({ color: '#F07D6A', roughness: 0.5 });
  const ojos = [];
  for (const sx of [-1, 1]) {
    const ojo = new THREE.Group();
    ojo.position.set(sx * 0.27, 0.38, 0.66);
    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), blanco);
    globo.scale.set(1, 1.15, 0.55);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), negro);
    pupila.position.z = 0.07;
    pupila.scale.set(1, 1.15, 0.5);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), blanco);
    brillo.position.set(0.03, 0.04, 0.05);
    pupila.add(brillo);
    ojo.add(globo, pupila);
    ojo.userData.pupila = pupila;
    g.add(ojo);
    ojos.push(ojo);
  }
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 12, 32, Math.PI), negro);
  boca.rotation.z = Math.PI;
  boca.position.set(0, 0.14, 0.7);
  g.add(boca);
  for (const sx of [-1, 1]) {
    const mejilla = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: '#F07D6A', transparent: true, opacity: 0.55 }));
    mejilla.position.set(sx * 0.46, 0.18, 0.66);
    mejilla.rotation.y = sx * 0.45;
    g.add(mejilla);
  }
  // Lazo coral (la muela presumida)
  const lazo = new THREE.Group();
  for (const sx of [-1, 1]) {
    const ala = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 24), coral);
    ala.rotation.z = sx * Math.PI / 2;
    ala.position.x = sx * 0.17;
    lazo.add(ala);
  }
  lazo.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), coral));
  lazo.position.set(0.36, 1.05, 0.12);
  lazo.rotation.z = -0.35;
  g.add(lazo);
  // Brazos
  const brazos = [];
  for (const sx of [-1, 1]) {
    const hombro = new THREE.Group();
    hombro.position.set(sx * 0.8, 0.32, 0.1);
    const brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 8, 16), materialNacar({ color: '#FFFBF4', ligero: true }));
    brazo.position.y = -0.2;
    hombro.add(brazo);
    hombro.rotation.z = sx * 0.5;
    g.add(hombro);
    brazos.push(hombro);
  }
  // Cepillo (sale al pulsar «¿Cuánto me cepillo?»)
  const cepillo = new THREE.Group();
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.9, 16), new THREE.MeshStandardMaterial({ color: '#5FE0C8', roughness: 0.35 }));
  mango.rotation.z = Math.PI / 2;
  const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.09), new THREE.MeshStandardMaterial({ color: '#5FE0C8', roughness: 0.35 }));
  cabeza.position.x = 0.5;
  const cerdas = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.08), blanco);
  cerdas.position.set(0.5, 0.09, 0);
  cepillo.add(mango, cabeza, cerdas);
  cepillo.position.set(0, 0.15, 1.0);
  cepillo.visible = false;
  g.add(cepillo);

  g.userData = { cuerpo, ojos, boca, brazos, cepillo, lazo };
  return g;
}

export const utils = { smooth, lerp, TAU };
