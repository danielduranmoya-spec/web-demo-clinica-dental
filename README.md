# Nácar · Clínica Dental — web interactiva 3D (concepto)

Web de una clínica dental **ficticia** en Mérida (Badajoz). Es un ejemplo de la tarifa *Web interactiva 3D* del portfolio de Daniel Durán: una muela que se escanea con partículas, un implante que se desmonta al hacer scroll, un simulador de blanqueamiento en 3D y Perla, la mascota interactiva para peques. Todos los datos (nombre, dirección, teléfono, equipo, precios y opiniones) son inventados.

Web publicada (cuando se active GitHub Pages): https://danielduranmoya-spec.github.io/web-demo-clinica-dental/

```
web-demo-clinica-dental/
├── index.html          ← estructura, textos, SEO (meta, Open Graph, JSON-LD Dentist + FAQPage)
├── style.css           ← estilos: colores, tipografías y medidas en :root
├── script.js           ← menú, simulador VITA, financiación, vídeo interactivo, cita por WhatsApp, horario, cookies
├── escena.js           ← escena 3D (three.js): partículas, escáner, implante, muela VITA y Perla
├── modelos.js          ← modelos 3D generados con código: muela, corona, pilar, tornillo, encía, hueso y Perla
├── video/              ← vídeo del tratamiento (MP4 + WebM) y su póster
├── vendor/             ← three.js 0.180 (MIT) dentro del repo: no depende de ningún CDN
├── herramientas/       ← video.html: genera el vídeo fotograma a fotograma (no forma parte de la web)
├── aviso-legal.html, privacidad.html, cookies.html   ← plantillas: completa los [PENDIENTE]
├── og.jpg, favicon.svg, robots.txt, sitemap.xml
```

## Qué tiene

| Requisito | Dónde |
|---|---|
| Animación de motionsites.ai | Inicio, inspirado en **Bionova Biotech**: una nube de partículas en doble hélice de ADN se posa sobre la muela y un anillo de escáner la barre de arriba abajo revelando la muela sólida de nácar (material iridiscente). |
| Escena 3D y producto 3D | Implante (corona de zirconio, pilar anodizado y tornillo de titanio con rosca real) que se ve por rayos X, se despieza y se atornilla según bajas. |
| Personaje 3D | **Perla**: muela con lazo que sigue el cursor con los ojos, parpadea, saluda, salta, gira y se cepilla. |
| Vídeo interactivo | Sección «Tu tratamiento en 24 segundos»: capítulos, barra arrastrable y puntos pulsables que pausan el vídeo y explican cada fase. |
| Interacción extra | Simulador de blanqueamiento con la guía VITA (la muela 3D cambia de color y se gira arrastrando) y calculadora de financiación. |
| SEO | Título y descripción, canonical, Open Graph con imagen, JSON-LD `Dentist` y `FAQPage`, sitemap, HTML semántico y accesible. |
| Legal | Aviso legal (LSSI, registro sanitario, publicidad sanitaria), privacidad (RGPD con datos de salud) y cookies. |
| Pantallas | Probada a 390, 768 y 1440 px de ancho, sin scroll horizontal. Respeta «reducir movimiento». |

Tipografías: **Instrument Serif** (titulares), Hanken Grotesk (texto) y Martian Mono (detalles). Paleta: azul abisal `#0A2530`, perla `#F5F2ED`, menta quirúrgica `#5FE0C8` y coral encía `#F07D6A`.

## Es una demo: no se indexa

`index.html` lleva `<meta name="robots" content="noindex, nofollow">` y `robots.txt` bloquea a los buscadores, porque los datos son ficticios. Para un cliente real: quita esa línea, cambia `Disallow: /` por `Allow: /` y borra la barra «Concepto» (`.concept-bar`).

## Abrirla en local

La escena 3D es un módulo de JavaScript y no funciona con doble clic (`file://`). Usa la extensión **Live Server** de VS Code o:

```bash
npx serve .
```

## Qué cambiar para un cliente real

- **WhatsApp, horario y huecos de cita**: `CONFIG` al principio de `script.js`. Cambia también el teléfono y el horario del JSON-LD en `index.html` y la tabla `.hours`.
- **Precios**: tarjetas `.card`, tabla `.prices` y el JSON-LD de preguntas frecuentes.
- **Tonos VITA**: `NACAR_TONOS` en `script.js`.
- **Puntos del vídeo**: `PUNTOS` en la parte del vídeo de `script.js` (segundo de inicio y fin, posición en % y texto).
- **Dónde sale cada modelo 3D**: los elementos con `data-anchor` del HTML. El modelo se centra en ese elemento y ocupa su alto, así que se mueve con CSS (`.hero__anchor`, `.implante__anchor`, `.sonrisa__anchor`, `.peques__anchor`).
- **Opiniones**: son textos de ejemplo. En la web real, enlaza las reseñas de Google de la clínica; no publiques opiniones inventadas.

## Regenerar el vídeo

`herramientas/video.html` dibuja el vídeo con los mismos modelos de la web. Con la web servida en local, se graba cada fotograma con Playwright llamando a `window.renderAt(segundo)` y se codifica con ffmpeg:

```bash
ffmpeg -framerate 24 -i f%05d.jpg -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart video/tratamiento.mp4
ffmpeg -framerate 24 -i f%05d.jpg -c:v libvpx-vp9 -b:v 0 -crf 36 video/tratamiento.webm
```

## Publicar

GitHub Pages desde la rama `main`, carpeta raíz. Cada `git push` a `main` actualiza la web en uno o dos minutos.
