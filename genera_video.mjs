#!/usr/bin/env node
/**
 * Motore video Scart Up — da JSON di contenuto a MP4 animato.
 *
 * Stessa identità del motore caroselli (genera_grafiche.py): Poppins, viola +
 * verde lime, logo "su". Qui però le slide diventano SCENE animate: ogni scena
 * è HTML/CSS, il tempo lo guidiamo noi fotogramma per fotogramma (niente
 * registrazione dello schermo: il risultato è identico a ogni giro).
 *
 * Uso:
 *   node genera_video.mjs                       # tutti i JSON in contenuti/video/
 *   node genera_video.mjs quanto-tempo          # solo quelli che contengono "quanto-tempo"
 *   node genera_video.mjs quanto-tempo --solo 9x16
 *   node genera_video.mjs quanto-tempo --anteprima 6.5   # un solo fotogramma PNG a 6,5 s
 *
 * Esce in public/video/:
 *   <slug>.mp4        1080×1920  (Reel Instagram / Facebook)
 *   <slug>_4x5.mp4    1080×1350  (LinkedIn, feed)
 *   <slug>_cover.jpg  copertina
 *
 * Tipi di scena: hook · testo · numero · confronto · calcolo · lista · griglia · cta
 * Campi extra: "tema" (viola|ink|bianco|lilla), "sfondo" (scritta fantasma che scorre dietro),
 * "icona" sulle carte (fattura|invio|chat|penna|scatola|confronto|appunti|grafico|orologio).
 * Serve: ffmpeg nel PATH e Playwright (o playwright-core + Chrome installato).
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const CONTENUTI = path.join(ROOT, 'contenuti', 'video')
const USCITA = path.join(ROOT, 'public', 'video')
const FONTS = path.join(ROOT, 'video', 'fonts')
const FPS = 30

// --- Palette Scart Up (identica a genera_grafiche.py) ------------------------
const VIOLA = '#4718B8', VIOLA_SCURO = '#2C0E78', INK = '#1B1140', VERDE = '#8BC63F'
const VERDE_SCURO = '#5E8B1E', LILLA = '#F2EEFC', MUTE = '#6B6392', VERDE_INK = '#26400a'

// k = scala tipografica. Le zone "sicure" del 9:16 tengono conto dell'interfaccia
// dei Reel (nome profilo e caption in basso, pulsanti a destra).
const FORMATI = {
  '9x16': { w: 1080, h: 1920, suffisso: '', k: 1, pad: '250px 84px 400px' },
  '4x5': { w: 1080, h: 1350, suffisso: '_4x5', k: 0.8, pad: '110px 84px 120px' },
}

const TEMI = {
  viola: { scuro: 1, bg: `radial-gradient(120% 80% at 50% 0%,#5B2AD6 0%,${VIOLA} 45%,${VIOLA_SCURO} 100%)`, testo: '#fff', titolo: '#fff', occ: '#CDBEF6', sub: '#E4DAFB', lb: '#fff', lf: VIOLA, chip: 'rgba(255,255,255,.13)', d1: 'rgba(139,198,63,.55)', d2: 'rgba(160,110,255,.75)', num: `linear-gradient(100deg,#fff 20%,#D9F7A8 50%,${VERDE} 80%)`, riga: 'rgba(255,255,255,.20)', ghost: 'rgba(255,255,255,.13)' },
  ink: { scuro: 1, bg: `radial-gradient(120% 80% at 50% 0%,#3A2392 0%,${INK} 50%,#0C0620 100%)`, testo: '#fff', titolo: '#fff', occ: VERDE, sub: '#C9BEEA', lb: '#fff', lf: VIOLA, chip: 'rgba(255,255,255,.10)', d1: 'rgba(139,198,63,.45)', d2: 'rgba(110,60,255,.80)', num: `linear-gradient(100deg,#E9FFC4 15%,${VERDE} 50%,#D9F7A8 85%)`, riga: 'rgba(139,198,63,.30)', ghost: 'rgba(255,255,255,.10)' },
  bianco: { bg: `radial-gradient(120% 80% at 50% 0%,#fff 0%,#fff 50%,${LILLA} 100%)`, testo: INK, titolo: INK, occ: VIOLA, sub: MUTE, lb: VIOLA, lf: '#fff', chip: LILLA, d1: 'rgba(139,198,63,.38)', d2: 'rgba(71,24,184,.22)', num: `linear-gradient(100deg,${VIOLA_SCURO} 15%,${VIOLA} 45%,#8A5CF0 85%)`, riga: 'rgba(71,24,184,.16)', ghost: 'rgba(71,24,184,.09)' },
  lilla: { bg: `radial-gradient(120% 80% at 50% 0%,#fff 0%,${LILLA} 55%,#E3D9FA 100%)`, testo: INK, titolo: INK, occ: VIOLA, sub: MUTE, lb: VIOLA, lf: '#fff', chip: '#FFFFFF', d1: 'rgba(139,198,63,.40)', d2: 'rgba(71,24,184,.26)', num: `linear-gradient(100deg,${VIOLA_SCURO} 15%,${VIOLA} 45%,#8A5CF0 85%)`, riga: 'rgba(71,24,184,.18)', ghost: 'rgba(71,24,184,.10)' },
}
const TEMA_DEFAULT = { hook: 'viola', testo: 'bianco', numero: 'ink', confronto: 'bianco', calcolo: 'lilla', lista: 'bianco', griglia: 'lilla', cta: 'ink' }
const DURATA_DEFAULT = { hook: 3.4, testo: 3.6, numero: 4.2, confronto: 4.8, calcolo: 5.2, lista: 5, griglia: 5.4, cta: 3.8 }
// le transizioni girano a rotazione: ogni cambio scena è diverso dal precedente
const TRANSIZIONI = ['tr-cerchio', 'tr-diagonale', 'tr-su', 'tr-sinistra']

// Icone al tratto (24×24): si disegnano da sole quando entra la carta.
const ICONE = {
  fattura: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7',
  invio: 'M3 11l18-8-8 18-2-8z',
  chat: 'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5',
  penna: 'M4 20l1-5L16 4l4 4L9 19z M14 6l4 4',
  scatola: 'M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5 M12 13v8',
  confronto: 'M4 8h14l-4-4 M20 16H6l4 4',
  appunti: 'M8 4h8v3H8z M8 5H5v16h14V5h-3 M9 12h6 M9 16h6',
  grafico: 'M4 20h16 M7 20v-7 M12 20V6 M17 20v-11',
  orologio: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2',
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Testo con [[evidenziato]] in verde, senza animazione parola-per-parola. */
const marcato = (s, d = 0) =>
  esc(s).replace(/\[\[(.+?)\]\]/g, (_, x) => `<span class="mk" style="--d:${(d + 0.35).toFixed(2)}s">${x}</span>`)

/** Titolo cinetico: ogni parola entra da sola, la parte [[evidenziata]] si colora dopo. */
function parole(s, d0 = 0, passo = 0.08) {
  let d = d0
  const pezzo = (testo) =>
    testo.split(/\s+/).filter(Boolean).map((w) => {
      const h = `<span class="w" style="--d:${d.toFixed(2)}s">${esc(w)}</span>`
      d += passo
      return h
    }).join(' ')
  const html = String(s ?? '').split(/(\[\[.+?\]\])/).filter(Boolean).map((seg) => {
    const m = seg.match(/^\[\[(.+)\]\]$/)
    if (!m) return pezzo(seg)
    const inizio = d
    return `<span class="mk" style="--d:${(inizio + 0.3).toFixed(2)}s">${pezzo(m[1])}</span>`
  }).join(' ')
  // niente spazio tra la parola evidenziata e la punteggiatura che la segue
  return { html: html.replace(/<\/span> (<span class="w"[^>]*>[.,;:!?])/g, '</span>$1'), fine: d }
}

const logo = () => `<span class="logo">su</span><span class="marchio">Scart Up</span>`
const a = (cls, d, dentro, extra = '') => `<div class="a ${cls}" style="--d:${d.toFixed(2)}s${extra}">${dentro}</div>`
const occhiello = (s, d = 0.3) => (s.occhiello ? a('occhiello', d, `<i></i>${esc(s.occhiello)}`) : '')
const fonte = (s) => (s.fonte ? `<div class="a fonte" style="--d:1.1s">Fonte: ${esc(s.fonte)}</div>` : '')
const conta = (v, off, dur = 1.1) => {
  const dec = String(v).includes('.') ? String(v).split('.')[1].length : 0
  return `<span class="conta" data-a="${Number(v)}" data-dec="${dec}" data-off="${off}" data-dur="${dur}">0</span>`
}
/** Esplosione di particelle + onde d'urto, centrata sul contenitore. */
function botto(d, n = 16) {
  const pt = Array.from({ length: n }, (_, i) => {
    const ang = (360 / n) * i + (i % 2 ? 9 : -6)
    const dist = 300 + ((i * 53) % 190)
    const lato = 14 + ((i * 7) % 20)
    return `<i class="pt" style="--ang:${ang}deg;--dist:${dist}px;--lato:${lato}px;--col:${i % 3 === 0 ? '#fff' : i % 3 === 1 ? VERDE : '#A98BF5'}"></i>`
  }).join('')
  return `<span class="botto" style="--d:${d.toFixed(2)}s"><i class="onda"></i><i class="onda onda--2"></i>${pt}</span>`
}

// --- Scene -------------------------------------------------------------------
const SCENE = {
  hook(s) {
    const t = parole(s.titolo, 0.5)
    return `<div class="centro centro--c zoom">${occhiello(s)}<div class="titolo titolo--xl">${t.html}</div>` +
      (s.sub ? a('sub', t.fine + 0.25, marcato(s.sub, t.fine)) : '') + `</div>`
  },
  testo(s) {
    const t = parole(s.titolo, 0.5)
    return `<div class="centro">${occhiello(s)}<div class="titolo">${t.html}</div>` +
      (s.sub ? a('sub', t.fine + 0.25, marcato(s.sub, t.fine)) : '') + `</div>${fonte(s)}`
  },
  numero(s) {
    return `<div class="centro">${occhiello(s)}` +
      `<div class="a numero-box" style="--d:.45s"><span class="numero">${esc(s.prefisso || '')}${conta(s.valore, 0.45, 1.15)}<span class="suff">${esc(s.suffisso || '')}</span></span>${botto(1.5)}</div>` +
      a('titolo titolo--m', 1.0, marcato(s.etichetta, 1.0)) +
      (s.sub ? a('sub', 1.5, marcato(s.sub, 1.5)) : '') + `</div>${fonte(s)}`
  },
  confronto(s) {
    const max = Math.max(...s.barre.map((b) => Number(b.valore)))
    const righe = s.barre.map((b, i) => {
      const d = 0.75 + i * 0.55
      const num = /^\d+$/.test(String(b.testo ?? b.valore)) ? conta(b.testo ?? b.valore, d + 0.15, 1) : esc(b.testo ?? b.valore)
      return `<div class="a riga" style="--d:${d.toFixed(2)}s"><div class="riga-et">${esc(b.etichetta)}</div>` +
        `<div class="binario"><div class="barra${b.evidenzia ? ' barra--on' : ''}" style="--w:${(100 * b.valore / max).toFixed(1)}%;--d:${(d + 0.15).toFixed(2)}s">` +
        `<span>${num}</span></div></div></div>`
    }).join('')
    const fineBarre = 0.75 + s.barre.length * 0.55 + 0.5
    return `<div class="centro">${occhiello(s)}${a('titolo titolo--m', 0.4, marcato(s.titolo, 0.4))}` +
      `<div class="barre">${righe}</div>` +
      (s.badge ? `<div class="a pop pillola-box" style="--d:${fineBarre.toFixed(2)}s"><span class="pillola lampo">${esc(s.badge)}</span>${botto(fineBarre + 0.1, 12)}</div>` : '') +
      (s.sub ? a('sub', fineBarre + 0.4, marcato(s.sub, fineBarre + 0.4)) : '') + `</div>${fonte(s)}`
  },
  calcolo(s) {
    let d = 0.7
    const righe = s.righe.map((r) => {
      const h = `<div class="a ribalta conto${r.risultato ? ' conto--ris lampo' : ''}" style="--d:${d.toFixed(2)}s">` +
        `<span class="conto-v">${esc(r.valore)}</span><span class="conto-e">${esc(r.etichetta || '')}</span>` +
        (r.risultato ? botto(d + 0.35, 14) : '') + `</div>`
      d += r.risultato ? 0.75 : 0.6
      return h
    }).join('')
    return `<div class="centro">${occhiello(s)}${a('titolo titolo--m', 0.4, marcato(s.titolo, 0.4))}` +
      `<div class="conti">${righe}</div>` + (s.sub ? a('sub', d + 0.1, marcato(s.sub, d + 0.1)) : '') + `</div>${fonte(s)}`
  },
  lista(s) {
    const voci = s.voci.map((v, i) => {
      const d = 0.85 + i * 0.5
      return `<div class="a lato voce" style="--d:${d.toFixed(2)}s;--sx:-1"><span class="tick"><b style="--d:${(d + 0.25).toFixed(2)}s">✓</b></span><span>${marcato(v, d)}</span></div>`
    }).join('')
    const fine = 0.85 + s.voci.length * 0.5
    return `<div class="centro">${occhiello(s)}${a('titolo titolo--m', 0.4, marcato(s.titolo, 0.4))}` +
      `<div class="voci">${voci}</div>` + (s.sub ? a('sub', fine + 0.15, marcato(s.sub, fine + 0.15)) : '') + `</div>${fonte(s)}`
  },
  griglia(s) {
    const carte = s.carte.map((c, i) => {
      const d = 0.8 + i * 0.42
      const ico = ICONE[c.icona] ? `<div class="ico"><svg viewBox="0 0 24 24"><path pathLength="1" d="${ICONE[c.icona]}" style="--d:${(d + 0.3).toFixed(2)}s"/></svg></div>` : ''
      return `<div class="a lato carta" style="--d:${d.toFixed(2)}s;--sx:${i % 2 ? 1 : -1}">${ico}<div><div class="carta-et">${esc(c.etichetta)}</div>` +
        `<div class="carta-t">${marcato(c.testo, d)}</div></div></div>`
    }).join('')
    return `<div class="centro">${occhiello(s)}${a('titolo titolo--m', 0.4, marcato(s.titolo, 0.4))}` +
      `<div class="carte">${carte}</div></div>${fonte(s)}`
  },
  cta(s) {
    const t = parole(s.titolo, 0.5)
    return `<div class="centro centro--c zoom">${occhiello(s)}<div class="titolo titolo--l">${t.html}</div>` +
      (s.azione ? `<div class="a pop pillola-box" style="--d:${(t.fine + 0.3).toFixed(2)}s"><i class="eco"></i><i class="eco eco--2"></i><span class="pillola lampo">${esc(s.azione)}</span>${botto(t.fine + 0.4, 18)}</div>` : '') + `</div>` +
      `<div class="a firma" style="--d:${(t.fine + 0.6).toFixed(2)}s">${logo()}</div>`
  },
}

// --- Documento ----------------------------------------------------------------
function fontFace() {
  return [400, 500, 600, 700, 800].map((p) => {
    const b64 = fs.readFileSync(path.join(FONTS, `poppins-latin-${p}-normal.woff2`)).toString('base64')
    return `@font-face{font-family:'Poppins';font-weight:${p};font-style:normal;src:url(data:font/woff2;base64,${b64}) format('woff2')}`
  }).join('\n')
}

function css(f, totale) {
  const p = (n) => `calc(${n}px * var(--k))`
  return `
${fontFace()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${f.w}px;height:${f.h}px;overflow:hidden;background:${VIOLA}}
body{--k:${f.k};font-family:'Poppins',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
*,*::before,*::after{animation-play-state:paused!important}
i{font-style:normal}

/* ---- cambio scena: due tende colorate precedono la scena nuova ---- */
.scena,.tenda{position:absolute;inset:0;animation:var(--tr) .75s var(--t0) both cubic-bezier(.76,0,.18,1)}
.scena{padding:${f.pad};display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--testo)}
.scena--prima{animation:none}
.tenda--1{background:${VERDE};animation-delay:calc(var(--t0) - .24s)}
.tenda--2{background:${VIOLA_SCURO};animation-delay:calc(var(--t0) - .12s)}
@keyframes tr-su{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes tr-sinistra{from{clip-path:inset(0 0 0 100%)}to{clip-path:inset(0 0 0 0)}}
@keyframes tr-cerchio{from{clip-path:circle(0% at 50% 58%)}to{clip-path:circle(125% at 50% 58%)}}
@keyframes tr-diagonale{from{clip-path:polygon(0 0,0 0,-45% 100%,-45% 100%)}to{clip-path:polygon(0 0,145% 0,100% 100%,-45% 100%)}}

/* ---- fondo vivo: la "camera" avanza piano per tutta la scena ---- */
.fondo{position:absolute;inset:0;pointer-events:none;animation:camera var(--dur) var(--t0) both linear}
@keyframes camera{from{transform:scale(1)}to{transform:scale(1.14)}}
.orb{position:absolute;border-radius:50%;animation:deriva var(--dur) var(--t0) both linear}
.orb--1{width:980px;height:980px;right:-420px;top:-340px;background:radial-gradient(circle,var(--d2) 0%,transparent 66%);--dx:-170px;--dy:190px}
.orb--2{width:860px;height:860px;left:-400px;bottom:-300px;background:radial-gradient(circle,var(--d1) 0%,transparent 66%);--dx:200px;--dy:-150px}
@keyframes deriva{from{transform:translate(0,0)}to{transform:translate(var(--dx),var(--dy))}}
/* pavimento a griglia in prospettiva (scene scure) */
.piano{position:absolute;left:-60%;right:-60%;bottom:-6%;height:46%;transform-origin:50% 0;transform:perspective(520px) rotateX(64deg);
  background:repeating-linear-gradient(90deg,var(--riga) 0 3px,transparent 3px 120px),repeating-linear-gradient(0deg,var(--riga) 0 3px,transparent 3px 120px);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 45%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0%,#000 45%,transparent 100%);
  animation:scorre var(--dur) var(--t0) both linear}
@keyframes scorre{from{background-position:0 0,0 0}to{background-position:0 0,0 360px}}
/* puntini (scene chiare) */
.punti{position:absolute;inset:-10%;background:radial-gradient(circle,var(--riga) 0 3.5px,transparent 4.5px) 0 0/54px 54px;
  -webkit-mask-image:radial-gradient(ellipse 75% 60% at 60% 75%,#000 0%,transparent 75%);mask-image:radial-gradient(ellipse 75% 60% at 60% 75%,#000 0%,transparent 75%);
  animation:puntini var(--dur) var(--t0) both linear}
@keyframes puntini{from{background-position:0 0}to{background-position:-108px 162px}}
/* scritta fantasma al tratto che scorre dietro */
.ghost{position:absolute;left:0;bottom:${f.h > 1500 ? '3%' : '0%'};white-space:nowrap;font-weight:800;font-size:${p(430)};line-height:1;letter-spacing:-.04em;
  color:transparent;-webkit-text-stroke:4px var(--ghost);animation:nastro var(--dur) var(--t0) both linear}
@keyframes nastro{from{transform:translateX(8%)}to{transform:translateX(-32%)}}
/* quadratini che galleggiano (il quadratino verde del logo) */
.fl{position:absolute;left:var(--x);top:var(--y);width:var(--l);height:var(--l);border-radius:26%;background:var(--c);opacity:var(--o);
  animation:galleggia var(--dur) var(--t0) both linear}
@keyframes galleggia{from{transform:translate(0,0) rotate(var(--r0))}to{transform:translate(var(--fx),var(--fy)) rotate(var(--r1))}}

.top{position:relative;display:flex;align-items:center;gap:${p(20)};animation:su .6s calc(var(--t0) + .15s) both cubic-bezier(.2,.8,.2,1)}
.logo{width:${p(72)};height:${p(72)};border-radius:${p(20)};background:var(--lb);color:var(--lf);position:relative;
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${p(31)};letter-spacing:-1px}
.logo::after{content:"";position:absolute;top:${p(10)};right:${p(10)};width:${p(17)};height:${p(17)};border-radius:${p(5)};background:${VERDE}}
.marchio{font-size:${p(34)};font-weight:700;letter-spacing:-.5px}
.serie{margin-left:auto;font-size:${p(24)};font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--occ);
  border:2px solid currentColor;border-radius:999px;padding:${p(8)} ${p(22)}}

.centro{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:${p(36)}}
.centro--c{align-items:center;text-align:center}
.zoom{animation:zoom 1.5s var(--t0) both cubic-bezier(.1,.8,.2,1)}
@keyframes zoom{from{transform:scale(1.28)}to{transform:none}}

.a{animation:su .7s calc(var(--t0) + var(--d)) both cubic-bezier(.2,.8,.2,1)}
@keyframes su{from{opacity:0;transform:translateY(60px);filter:blur(14px)}to{opacity:1;transform:none;filter:blur(0)}}
.pop{animation-name:pop;animation-timing-function:cubic-bezier(.3,1.7,.5,1)}
@keyframes pop{from{opacity:0;transform:scale(.3) rotate(-8deg)}to{opacity:1;transform:none}}
.ribalta{animation-name:ribalta;transform-origin:50% 0;animation-timing-function:cubic-bezier(.3,1.4,.5,1)}
@keyframes ribalta{from{opacity:0;transform:perspective(900px) rotateX(-88deg)}to{opacity:1;transform:perspective(900px) rotateX(0)}}
.lato{animation-name:lato;animation-duration:.8s;animation-timing-function:cubic-bezier(.2,1.2,.3,1)}
@keyframes lato{from{opacity:0;transform:perspective(1100px) translateX(calc(var(--sx) * 260px)) rotateY(calc(var(--sx) * 48deg)) scale(.86)}
  to{opacity:1;transform:perspective(1100px) translateX(0) rotateY(0) scale(1)}}

.occhiello{display:flex;align-items:center;gap:${p(18)};font-size:${p(31)};letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--occ)}
.occhiello i{width:${p(64)};height:${p(6)};border-radius:3px;background:${VERDE};transform-origin:left;animation:tratto .6s calc(var(--t0) + var(--d) + .15s) both cubic-bezier(.6,0,.2,1)}
@keyframes tratto{from{transform:scaleX(0)}to{transform:none}}
.titolo{text-wrap:balance;font-weight:800;line-height:1.08;letter-spacing:-.025em;font-size:${p(96)};color:var(--titolo)}
.titolo--xl{font-size:${p(110)}}
.titolo--l{font-size:${p(100)}}
.titolo--m{font-size:${p(74)};line-height:1.12}
.sub{font-size:${p(46)};line-height:1.4;font-weight:500;color:var(--sub)}

.w{display:inline-block;transform-origin:0 100%;animation:parola .7s calc(var(--t0) + var(--d)) both cubic-bezier(.2,1.3,.3,1)}
@keyframes parola{from{opacity:0;transform:translateY(.7em) rotate(8deg) scale(.7);filter:blur(16px)}60%{filter:blur(0)}to{opacity:1;transform:none;filter:blur(0)}}

.mk{border-radius:${p(12)};padding:0 ${p(14)};margin:0 ${p(-4)};background:linear-gradient(${VERDE},${VERDE}) no-repeat left center/0% 100%;
  box-decoration-break:clone;-webkit-box-decoration-break:clone;
  animation:evidenzia .5s calc(var(--t0) + var(--d)) both cubic-bezier(.6,0,.2,1)}
@keyframes evidenzia{to{background-size:100% 100%;color:${VERDE_INK}}}

/* ---- numero gigante: conta, brilla, esplode ---- */
.numero-box{position:relative;align-self:flex-start}
.numero{display:inline-block;font-size:${p(330)};font-weight:800;line-height:1.02;letter-spacing:-.05em;font-variant-numeric:tabular-nums;
  background:var(--num) 0 0/220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:brilla 2.6s calc(var(--t0) + .5s) both ease-in-out,colpo .5s calc(var(--t0) + 1.5s) both cubic-bezier(.3,2,.5,1)}
.numero .suff{font-size:.5em;letter-spacing:-.02em;margin-left:.04em}
@keyframes brilla{from{background-position:100% 0}to{background-position:0 0}}
@keyframes colpo{0%{transform:scale(1)}40%{transform:scale(1.09)}100%{transform:scale(1)}}

.botto{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:5}
.onda{position:absolute;left:-150px;top:-150px;width:300px;height:300px;border-radius:50%;border:10px solid ${VERDE};
  animation:onda .9s calc(var(--t0) + var(--d)) both cubic-bezier(.1,.7,.2,1)}
.onda--2{border-color:#A98BF5;animation-delay:calc(var(--t0) + var(--d) + .14s)}
@keyframes onda{from{opacity:.95;transform:scale(.2)}to{opacity:0;transform:scale(3.4)}}
.pt{position:absolute;left:calc(var(--lato) / -2);top:calc(var(--lato) / -2);width:var(--lato);height:var(--lato);border-radius:28%;background:var(--col);
  animation:scheggia 1.1s calc(var(--t0) + var(--d)) both cubic-bezier(.1,.8,.2,1)}
@keyframes scheggia{from{opacity:0;transform:rotate(var(--ang)) translateX(40px) rotate(0) scale(1.2)}12%{opacity:1}
  to{opacity:0;transform:rotate(var(--ang)) translateX(var(--dist)) rotate(260deg) scale(.2)}}

/* riflesso che attraversa pillole e risultati */
.lampo{position:relative;overflow:hidden}
.lampo::after{content:"";position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent);
  animation:lampo .9s calc(var(--t0) + var(--d) + .45s) both ease-in-out}
@keyframes lampo{from{transform:translateX(-130%) skewX(-18deg)}to{transform:translateX(340%) skewX(-18deg)}}

.barre{display:flex;flex-direction:column;gap:${p(34)};margin:${p(10)} 0}
.riga-et{font-size:${p(36)};font-weight:700;margin-bottom:${p(14)};color:var(--sub)}
.binario{height:${p(110)};border-radius:${p(28)};background:var(--chip);overflow:hidden}
.barra{position:relative;overflow:hidden;height:100%;width:var(--w);border-radius:${p(28)};background:linear-gradient(90deg,#CFC2F2,#A98BF5);display:flex;align-items:center;justify-content:flex-end;
  padding-right:${p(30)};font-size:${p(48)};font-weight:800;color:${INK};font-variant-numeric:tabular-nums;
  animation:cresce 1.1s calc(var(--t0) + var(--d)) both cubic-bezier(.3,1.25,.4,1)}
.barra--on{background:linear-gradient(90deg,#B6E86B,${VERDE});color:${VERDE_INK};box-shadow:0 0 50px rgba(139,198,63,.7)}
.barra::after{content:"";position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);
  animation:lampo 1s calc(var(--t0) + var(--d) + .7s) both ease-in-out}
@keyframes cresce{from{width:0}to{width:var(--w)}}

.pillola-box{position:relative;align-self:flex-start}
.centro--c .pillola-box{align-self:center}
.pillola{display:inline-block;background:linear-gradient(90deg,#B6E86B,${VERDE});color:${VERDE_INK};font-weight:800;font-size:${p(50)};
  padding:${p(26)} ${p(54)};border-radius:999px;box-shadow:0 14px 60px rgba(139,198,63,.55)}
.eco{position:absolute;inset:0;border-radius:999px;border:6px solid ${VERDE};animation:eco 1.3s calc(var(--t0) + var(--d) + .5s) 3 both ease-out}
.eco--2{animation-delay:calc(var(--t0) + var(--d) + .95s)}
@keyframes eco{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(1.3,1.8)}}

.conti{display:flex;flex-direction:column;gap:${p(22)}}
.conto{position:relative;display:flex;align-items:baseline;gap:${p(26)};padding:${p(24)} ${p(36)};border-radius:${p(28)};background:var(--chip);
  box-shadow:0 12px 40px rgba(43,14,120,.10)}
.conto-v{font-size:${p(80)};font-weight:800;letter-spacing:-.03em;color:${VIOLA};white-space:nowrap}
.conto-e{font-size:${p(38)};font-weight:600;color:var(--sub);line-height:1.2}
.conto--ris{background:linear-gradient(90deg,#B6E86B,${VERDE});box-shadow:0 14px 70px rgba(139,198,63,.7);overflow:visible}
.conto--ris.lampo{overflow:hidden}
.conto--ris .conto-v,.conto--ris .conto-e{color:${VERDE_INK}}

.voci{display:flex;flex-direction:column;gap:${p(34)}}
.voce{display:flex;gap:${p(26)};align-items:flex-start;font-size:${p(50)};line-height:1.25;font-weight:600}
.tick{width:${p(60)};height:${p(60)};border-radius:${p(17)};background:${VERDE};color:${VERDE_INK};flex:none;box-shadow:0 0 34px rgba(139,198,63,.7);
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${p(36)};margin-top:${p(2)}}
.tick b{animation:pop .5s calc(var(--t0) + var(--d)) both cubic-bezier(.3,2,.5,1)}

.carte{display:flex;flex-direction:column;gap:${p(24)}}
.carta{display:flex;align-items:center;gap:${p(30)};background:var(--chip);border-radius:${p(32)};padding:${p(30)} ${p(34)};
  box-shadow:0 16px 50px rgba(43,14,120,.13);border:2px solid rgba(255,255,255,.35)}
.ico{flex:none;width:${p(112)};height:${p(112)};border-radius:${p(30)};background:linear-gradient(140deg,#6A35E8,${VIOLA_SCURO});
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 34px rgba(71,24,184,.45)}
.ico svg{width:58%;height:58%;fill:none;stroke:${VERDE};stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ico path{stroke-dasharray:1;animation:disegna 1s calc(var(--t0) + var(--d)) both cubic-bezier(.5,0,.2,1)}
@keyframes disegna{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.carta-et{font-size:${p(28)};letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:${VERDE_SCURO};margin-bottom:${p(6)}}
.scuro .carta-et{color:${VERDE}}
.carta-t{font-size:${p(44)};font-weight:700;line-height:1.2}

.fonte{position:relative;font-size:${p(27)};line-height:1.35;font-weight:500;color:var(--sub);opacity:.9}
.firma{position:relative;display:flex;align-items:center;justify-content:center;gap:${p(20)}}

.avanzamento{position:absolute;left:0;top:0;height:12px;width:100%;background:linear-gradient(90deg,${VERDE},#D9F7A8);box-shadow:0 0 24px ${VERDE};transform-origin:left;
  animation:avanza ${totale}s 0s both linear;z-index:999}
@keyframes avanza{from{transform:scaleX(0)}to{transform:scaleX(1)}}
`
}

/** Quadratini galleggianti: posizioni fisse ai margini, così non coprono mai il testo. */
function galleggianti(i, scuro) {
  const posti = [[1, 34, 44], [88, 4, 34], [91, 80, 64], [2, 88, 40], [70, 91, 26], [50, 3, 22]]
  return posti.map(([x, y, l], j) => {
    const c = j % 2 === 0 ? VERDE : scuro ? '#A98BF5' : VIOLA
    const s = (i + j) % 2 ? 1 : -1
    return `<i class="fl" style="--x:${x}%;--y:${y}%;--l:${l}px;--c:${c};--o:${j % 3 === 0 ? 0.95 : 0.55};--r0:${j * 31}deg;--r1:${j * 31 + s * 150}deg;--fx:${s * (50 + j * 14)}px;--fy:${-90 - j * 22}px"></i>`
  }).join('')
}

function documento(post, f) {
  let t0 = 0
  const scene = post.scene.map((s, i) => {
    if (!SCENE[s.tipo]) throw new Error(`tipo scena sconosciuto: ${s.tipo} (ammessi: ${Object.keys(SCENE).join(', ')})`)
    const dur = Number(s.durata ?? DURATA_DEFAULT[s.tipo])
    const t = TEMI[s.tema || TEMA_DEFAULT[s.tipo]]
    if (!t) throw new Error(`tema sconosciuto: ${s.tema}`)
    const tr = TRANSIZIONI[i % TRANSIZIONI.length]
    const tempo = `--t0:${t0.toFixed(2)}s;--dur:${dur}s;--tr:${tr}`
    const stile = `${tempo};--bg:${t.bg};--testo:${t.testo};--titolo:${t.titolo};--occ:${t.occ};--sub:${t.sub};--lb:${t.lb};--lf:${t.lf};` +
      `--chip:${t.chip};--d1:${t.d1};--d2:${t.d2};--num:${t.num};--riga:${t.riga};--ghost:${t.ghost};z-index:${i * 3 + 3}`
    const testata = s.tipo === 'cta' ? '' :
      `<div class="top">${logo()}${post.serie ? `<span class="serie">${esc(post.serie)}</span>` : ''}</div>`
    const ghost = s.sfondo ? `<div class="ghost">${esc(s.sfondo)} · ${esc(s.sfondo)} · ${esc(s.sfondo)}</div>` : ''
    const fondo = `<div class="fondo"><div class="orb orb--1"></div><div class="orb orb--2"></div>` +
      `<div class="${t.scuro ? 'piano' : 'punti'}"></div>${ghost}${galleggianti(i, t.scuro)}</div>`
    const tende = i === 0 ? '' :
      `<div class="tenda tenda--1" style="${tempo};z-index:${i * 3 + 1}"></div><div class="tenda tenda--2" style="${tempo};z-index:${i * 3 + 2}"></div>`
    const h = `${tende}<section class="scena${i === 0 ? ' scena--prima' : ''}${t.scuro ? ' scuro' : ''}" data-t0="${t0.toFixed(2)}" style="${stile}">` +
      `${fondo}${testata}${SCENE[s.tipo](s)}</section>`
    t0 += dur
    return h
  }).join('\n')
  const totale = t0
  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><style>${css(f, totale)}</style></head>
<body>${scene}<div class="avanzamento"></div>
<script>
const easeOut = (x) => 1 - Math.pow(1 - x, 4)
let anim = null
window.vai = (t) => {
  anim ??= document.getAnimations()
  for (const an of anim) an.currentTime = t * 1000
  for (const el of document.querySelectorAll('.conta')) {
    const t0 = Number(el.closest('.scena').dataset.t0) + Number(el.dataset.off)
    const x = Math.min(1, Math.max(0, (t - t0) / Number(el.dataset.dur)))
    const dec = Number(el.dataset.dec)
    el.textContent = (Number(el.dataset.a) * easeOut(x)).toFixed(dec).replace('.', ',')
  }
}
</script></body></html>`
  return { html, totale }
}

// --- Rendering ----------------------------------------------------------------
async function apriBrowser() {
  const require = createRequire(import.meta.url)
  let pw
  for (const nome of ['playwright', 'playwright-core', '/opt/node-tools/node_modules/playwright']) {
    try { pw = require(nome); break } catch { /* prova il prossimo */ }
  }
  if (!pw) throw new Error('Playwright non trovato: npm i -D playwright-core (usa il Chrome già installato).')
  try { return await pw.chromium.launch() } catch { return await pw.chromium.launch({ channel: 'chrome' }) }
}

function ffmpeg(uscita) {
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', uscita]
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] })
  const fine = new Promise((ok, ko) => p.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg uscito con ${c}`)))))
  return { p, fine }
}

async function rendi(browser, post, nomeFormato, anteprima) {
  const f = FORMATI[nomeFormato]
  const { html, totale } = documento(post, f)
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h }, deviceScaleFactor: 1 })
  await page.setContent(html)
  await page.evaluate(() => document.fonts.ready)

  // controllo impaginazione: nessuna scena deve sforare la propria area
  const sforano = await page.evaluate(() => {
    window.vai(1e6)
    return [...document.querySelectorAll('.scena')].map((s, i) => {
      const c = s.querySelector('.centro')
      return c.scrollHeight > c.clientHeight + 2 || c.scrollWidth > c.clientWidth + 2 ? i + 1 : 0
    }).filter(Boolean)
  })
  if (sforano.length) console.log(`  ATTENZIONE ${nomeFormato}: il testo sfora nelle scene ${sforano.join(', ')} — accorcia o alza la durata`)

  if (anteprima !== undefined) {
    const png = path.join(USCITA, `${post.slug}${f.suffisso}_anteprima.png`)
    await page.evaluate((t) => window.vai(t), anteprima)
    await page.screenshot({ path: png })
    await page.close()
    console.log(`  OK ${path.basename(png)} (fotogramma a ${anteprima}s di ${totale.toFixed(1)}s)`)
    return
  }

  const mp4 = path.join(USCITA, `${post.slug}${f.suffisso}.mp4`)
  const { p, fine } = ffmpeg(mp4)
  const n = Math.round(totale * FPS)
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.vai(t), i / FPS)
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once('drain', r))
  }
  p.stdin.end()
  await fine

  if (nomeFormato === '9x16') {
    // copertina = fine della prima scena, con il titolo tutto entrato
    const d0 = Number(post.scene[0].durata ?? DURATA_DEFAULT[post.scene[0].tipo])
    await page.evaluate((t) => window.vai(t), d0 - 0.05)
    await page.screenshot({ path: path.join(USCITA, `${post.slug}_cover.jpg`), type: 'jpeg', quality: 92 })
  }
  await page.close()
  const mb = (fs.statSync(mp4).size / 1e6).toFixed(1)
  console.log(`  OK ${path.basename(mp4)}  (${f.w}x${f.h}, ${totale.toFixed(1)}s, ${mb} MB)`)
}

async function main() {
  const argv = process.argv.slice(2)
  const opz = (nome) => { const i = argv.indexOf(nome); return i >= 0 ? argv.splice(i, 2)[1] : undefined }
  const solo = opz('--solo')
  const ant = opz('--anteprima')
  const filtro = argv[0] || ''
  const files = fs.readdirSync(CONTENUTI).filter((n) => n.endsWith('.json') && n !== 'piano.json' && n.includes(filtro)).sort()
  if (!files.length) { console.error(`Nessun contenuto in ${CONTENUTI}${filtro ? ` con '${filtro}'` : ''}`); process.exit(1) }
  fs.mkdirSync(USCITA, { recursive: true })
  const browser = await apriBrowser()
  try {
    for (const nome of files) {
      console.log(`\n${nome}`)
      const post = JSON.parse(fs.readFileSync(path.join(CONTENUTI, nome), 'utf-8'))
      for (const nf of Object.keys(FORMATI)) {
        if (solo && solo !== nf) continue
        await rendi(browser, post, nf, ant === undefined ? undefined : Number(ant))
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
