/* =========================================================
   Nácar Clínica Dental — interacción (sin la parte 3D)
   CONFIG: teléfono, WhatsApp y horario de la clínica
   ========================================================= */
const CONFIG = {
  whatsapp: '34600000000',            // número ficticio
  horario: {                          // 0 = domingo … 6 = sábado
    1: [['09:30', '14:00'], ['16:00', '21:00']],
    2: [['09:30', '14:00'], ['16:00', '21:00']],
    3: [['09:30', '14:00'], ['16:00', '21:00']],
    4: [['09:30', '14:00'], ['16:00', '21:00']],
    5: [['09:30', '15:00']]
  },
  huecos: ['09:30', '10:30', '11:30', '12:30', '16:30', '17:30', '18:30', '19:30'],
  huecosViernes: ['09:30', '10:30', '11:30', '12:30', '13:30']
};

/* Guía VITA ordenada de más clara a más oscura (la usa también escena.js) */
window.NACAR_TONOS = [
  { nombre: 'BL1', color: '#FBFAF5', nota: 'el blanco más luminoso' },
  { nombre: 'BL3', color: '#F4F0E6', nota: 'blanco natural' },
  { nombre: 'A1', color: '#EEE5D0', nota: 'muy claro, natural' },
  { nombre: 'B2', color: '#E8DABD', nota: 'claro cálido' },
  { nombre: 'A2', color: '#E3D2B1', nota: 'tono medio' },
  { nombre: 'A3', color: '#D9C39C', nota: 'tu tono de partida típico' },
  { nombre: 'A3,5', color: '#CFB588', nota: 'tono oscuro' },
  { nombre: 'A4', color: '#C2A474', nota: 'muy oscuro' }
];

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Cabecera: fondo al bajar y color sobre secciones claras ---------- */
  const header = $('[data-header]');
  const claras = $$('.sec--perla, .sec--perla2, .sonrisa, .peques');
  function cabecera() {
    header.classList.toggle('is-scrolled', scrollY > 20);
    const y = header.getBoundingClientRect().bottom - 10;
    header.classList.toggle('on-light', claras.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
  }
  addEventListener('scroll', cabecera, { passive: true });
  cabecera();

  /* ---------- Menú móvil ---------- */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  function abrirMenu(abrir) {
    menu.hidden = !abrir;
    toggle.setAttribute('aria-expanded', String(abrir));
    toggle.querySelector('use').setAttribute('href', abrir ? '#i-close' : '#i-menu');
    toggle.querySelector('.sr-only').textContent = abrir ? 'Cerrar menú' : 'Abrir menú';
    document.body.style.overflow = abrir ? 'hidden' : '';
    header.classList.toggle('on-light', false);
  }
  toggle.addEventListener('click', () => abrirMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) abrirMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { abrirMenu(false); toggle.focus(); } });

  /* ---------- Revelado al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; io.observe(el); });

  // Si no hay 3D, el título se muestra igualmente
  setTimeout(() => document.documentElement.classList.add('is-ready'), 2500);

  /* ---------- Contador de pacientes ---------- */
  const cnt = $('[data-count]');
  if (cnt && !reduce) {
    const fin = +cnt.dataset.count;
    const t0 = performance.now() + 600;
    const paso = now => {
      const k = Math.min(1, Math.max(0, (now - t0) / 1800));
      cnt.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))).toLocaleString('es-ES');
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ---------- Simulador de blanqueamiento ---------- */
  const shade = $('[data-shade]');
  if (shade) {
    const T = window.NACAR_TONOS;
    const sw = $('[data-swatches]');
    sw.innerHTML = T.map(t => `<li style="background:${t.color}">${t.nombre}</li>`).join('');
    const nombre = $('[data-shade-name]'), nota = $('[data-shade-note]'), res = $('[data-shade-result]');
    const actualizar = () => {
      const i = +shade.value;
      nombre.textContent = T[i].nombre;
      nota.textContent = T[i].nota;
      shade.setAttribute('aria-valuetext', `${T[i].nombre}, ${T[i].nota}`);
      $$('li', sw).forEach((li, k) => li.classList.toggle('is-on', k === i));
      const meta = Math.max(2, i - 3);
      if (i <= 1) res.innerHTML = `${T[i].nombre} es un tono «bleach»: se consigue con el blanqueamiento combinado y férulas en casa.`;
      else if (i === 2) res.innerHTML = `${T[i].nombre} ya es un tono muy claro. Con una higiene cada seis meses lo mantienes.`;
      else res.innerHTML = `Con un blanqueamiento combinado pasarías de ${T[i].nombre} a <strong>${T[meta].nombre}</strong>: unos ${(i - meta) * 2} tonos más claro.`;
    };
    shade.addEventListener('input', actualizar);
    actualizar();
  }

  /* ---------- Calculadora de financiación ---------- */
  const calc = $('[data-calc]');
  if (calc) {
    const tot = $('[data-calc-total]'), mes = $('[data-calc-meses]');
    const eur = n => n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const f = () => {
      $('[data-calc-total-out]').textContent = `${eur(+tot.value)} €`;
      $('[data-calc-meses-out]').textContent = mes.value;
      $('[data-calc-fee]').textContent = (tot.value / mes.value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    tot.addEventListener('input', f);
    mes.addEventListener('input', f);
    f();
  }

  /* ---------- Vídeo interactivo ---------- */
  const player = $('[data-player]');
  if (player) {
    const video = $('[data-video]', player);
    const big = $('[data-big-play]', player);
    const btn = $('[data-toggle]', player);
    const track = $('[data-track]', player);
    const fill = $('[data-fill]', player);
    const time = $('[data-time]', player);
    const hsBox = $('[data-hotspots]', player);
    const card = $('[data-card]', player);
    const caps = $$('[data-chapter]', player);
    const DUR = 24;
    const PUNTOS = [
      { desde: 1.5, hasta: 5.5, x: 50, y: 46, txt: 'Escáner', k: '0:00 · Escáner intraoral', t: '20 micras de precisión', p: 'Una cámara del tamaño de un cepillo toma 6.000 imágenes por segundo. En dos minutos tenemos tu boca en 3D, sin pasta de impresiones.' },
      { desde: 7.5, hasta: 11.5, x: 50, y: 42, txt: 'Corona', k: '0:06 · Diseño digital', t: 'Tu corona, diseñada en pantalla', p: 'Ajustamos forma, mordida y color sobre tu escáner. Antes de fabricar nada, ves el resultado y das el visto bueno.' },
      { desde: 13, hasta: 17.5, x: 50, y: 57, txt: 'Implante', k: '0:12 · Implante guiado', t: 'Titanio grado 5', p: 'El tornillo entra por una férula impresa en 3D, con el ángulo y la profundidad planificados sobre tu TAC.' },
      { desde: 19, hasta: 23.5, x: 50, y: 40, txt: 'Resultado', k: '0:18 · Tu nueva sonrisa', t: 'Como un diente propio', p: 'La corona de zirconio se atornilla al pilar. Muerdes, limpias y sonríes como con tus dientes naturales.' }
    ];
    $('[data-marks]', player).innerHTML = [6, 12, 18].map(s => `<i style="left:${s / DUR * 100}%"></i>`).join('');
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const dur = () => (isFinite(video.duration) && video.duration > 0 ? video.duration : DUR);
    let activos = new Set();

    const play = () => { card.hidden = true; video.play().catch(() => {}); };
    const pause = () => video.pause();
    big.addEventListener('click', play);
    btn.addEventListener('click', () => (video.paused ? play() : pause()));
    video.addEventListener('click', () => (video.paused ? play() : pause()));
    video.addEventListener('play', () => {
      player.classList.add('is-playing');
      $('[data-icon-play]', btn).hidden = true; $('[data-icon-pause]', btn).hidden = false;
      btn.setAttribute('aria-label', 'Pausar');
    });
    video.addEventListener('pause', () => {
      $('[data-icon-play]', btn).hidden = false; $('[data-icon-pause]', btn).hidden = true;
      btn.setAttribute('aria-label', 'Reproducir');
    });
    video.addEventListener('ended', () => player.classList.remove('is-playing'));

    function pintar() {
      const c = video.currentTime, d = dur();
      fill.style.transform = `scaleX(${c / d})`;
      time.textContent = fmt(c);
      track.setAttribute('aria-valuenow', c.toFixed(1));
      track.setAttribute('aria-valuetext', `${Math.round(c)} segundos`);
      caps.forEach((b, i) => {
        const a = +b.dataset.chapter, z = caps[i + 1] ? +caps[i + 1].dataset.chapter : 1e9;
        b.classList.toggle('is-on', c >= a && c < z);
      });
      const ahora = new Set(PUNTOS.filter(p => c >= p.desde && c <= p.hasta));
      const igual = ahora.size === activos.size && [...ahora].every(p => activos.has(p));
      if (!igual) {
        activos = ahora;
        hsBox.innerHTML = '';
        ahora.forEach(p => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'hotspot';
          b.style.left = `${p.x}%`;
          b.style.top = `${p.y}%`;
          b.setAttribute('aria-label', `Más información: ${p.t}`);
          b.innerHTML = `<span>${p.txt}</span>`;
          b.addEventListener('click', e => {
            e.stopPropagation();
            pause();
            $('[data-card-kicker]', card).textContent = p.k;
            $('[data-card-title]', card).textContent = p.t;
            $('[data-card-text]', card).textContent = p.p;
            card.hidden = false;
            $('[data-card-close]', card).focus();
          });
          hsBox.appendChild(b);
        });
      }
    }
    video.addEventListener('timeupdate', pintar);
    let raf;
    const bucle = () => { pintar(); raf = requestAnimationFrame(bucle); };
    video.addEventListener('play', () => { cancelAnimationFrame(raf); bucle(); });
    video.addEventListener('pause', () => cancelAnimationFrame(raf));
    $('[data-card-close]', card).addEventListener('click', play);

    const ir = s => { video.currentTime = Math.max(0, Math.min(dur() - 0.05, s)); pintar(); };
    caps.forEach(b => b.addEventListener('click', () => { ir(+b.dataset.chapter + 0.01); play(); }));
    // Arrastrar por la barra
    const desdeX = x => { const r = track.getBoundingClientRect(); return (x - r.left) / r.width * dur(); };
    let arr = false;
    track.addEventListener('pointerdown', e => { arr = true; track.setPointerCapture(e.pointerId); ir(desdeX(e.clientX)); });
    track.addEventListener('pointermove', e => { if (arr) ir(desdeX(e.clientX)); });
    track.addEventListener('pointerup', () => { arr = false; });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { ir(video.currentTime + 2); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { ir(video.currentTime - 2); e.preventDefault(); }
      if (e.key === ' ' || e.key === 'Enter') { video.paused ? play() : pause(); e.preventDefault(); }
    });
    // Reproduce solo cuando se ve (y se pausa al salir)
    new IntersectionObserver(([en]) => {
      if (!en.isIntersecting && !video.paused) pause();
    }, { threshold: 0.2 }).observe(player);
  }

  /* ---------- Cita ---------- */
  const form = $('[data-form]');
  if (form) {
    const days = $('[data-days]'), slots = $('[data-slots]'), err = $('[data-form-error]');
    const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const lista = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    while (lista.length < 8) {
      d.setDate(d.getDate() + 1);
      if (CONFIG.horario[d.getDay()]) lista.push(new Date(d));
    }
    days.innerHTML = lista.map((x, i) => `<label><input type="radio" name="dia" value="${x.toISOString().slice(0, 10)}" data-dow="${x.getDay()}" ${i === 0 ? 'checked' : ''}><span><small>${DIAS[x.getDay()]}</small>${x.getDate()} ${MESES[x.getMonth()]}</span></label>`).join('');
    const pintarHuecos = () => {
      const sel = $('input[name="dia"]:checked', days);
      const h = sel && +sel.dataset.dow === 5 ? CONFIG.huecosViernes : CONFIG.huecos;
      slots.innerHTML = h.map((x, i) => `<label><input type="radio" name="hora" value="${x}" ${i === 0 ? 'checked' : ''}><span>${x}</span></label>`).join('');
    };
    days.addEventListener('change', pintarHuecos);
    pintarHuecos();
    // El botón «Quiero este tono» preselecciona blanqueamiento
    $('[data-shade-cta]')?.addEventListener('click', () => { const r = $('input[value="Blanqueamiento"]', form); if (r) r.checked = true; });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const nombre = (fd.get('nombre') || '').toString().trim();
      if (!nombre) { err.textContent = 'Escribe tu nombre para que sepamos a quién llamar.'; err.hidden = false; form.nombre.focus(); return; }
      if (!fd.get('ok')) { err.textContent = 'Marca la casilla de privacidad para continuar.'; err.hidden = false; return; }
      err.hidden = true;
      const dia = new Date(`${fd.get('dia')}T12:00:00`);
      const fecha = dia.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const msg = `Hola, soy ${nombre}. Quiero pedir cita en Nácar para: ${fd.get('trat')}. Me vendría bien el ${fecha} a las ${fd.get('hora')}. ¿Está libre?`;
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
  }

  /* ---------- Horario: hoy y «abierto ahora» ---------- */
  const ahora = new Date();
  const hoy = ahora.getDay();
  $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', tr.dataset.day.split(' ').includes(String(hoy))));
  const open = $('[data-open-now]');
  if (open) {
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    const toMin = s => { const [h, m] = s.split(':'); return +h * 60 + +m; };
    const tramos = CONFIG.horario[hoy] || [];
    const abierto = tramos.find(([a, b]) => min >= toMin(a) && min < toMin(b));
    open.textContent = abierto ? `● Abierto ahora · hasta las ${abierto[1]}` : '○ Cerrado ahora · deja tu cita y te llamamos';
    open.classList.toggle('is-open', !!abierto);
  }

  /* ---------- Cookies y mapa ---------- */
  const banner = $('[data-cookies]');
  const map = $('[data-map]');
  const leer = () => { try { return localStorage.getItem('nacar-consent'); } catch (e) { return null; } };
  const guardar = v => { try { localStorage.setItem('nacar-consent', v); } catch (e) { /* sin almacenamiento */ } };
  function cargarMapa() {
    if (!map || map.querySelector('iframe')) return;
    map.innerHTML = '<iframe title="Mapa de la zona de la clínica en Mérida" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=-6.3537%2C38.9111%2C-6.3337%2C38.9211&amp;layer=mapnik&amp;marker=38.9161%2C-6.3437"></iframe>';
  }
  const c = leer();
  if (c === 'si') cargarMapa();
  if (!c && banner) setTimeout(() => { banner.hidden = false; }, 1800);
  $$('[data-cookie]').forEach(b => b.addEventListener('click', () => {
    guardar(b.dataset.cookie);
    banner.hidden = true;
    if (b.dataset.cookie === 'si') cargarMapa();
  }));
  $('[data-map-load]')?.addEventListener('click', cargarMapa);
  $('[data-cookie-open]')?.addEventListener('click', () => { banner.hidden = false; });
})();
