// Da uno slug ai media pubblici + caption. I PNG sono già in public/img/
// (li fa genera_grafiche.py) e su Vercel diventano URL pubblici che Meta scarica.
//
// Non leggiamo la cartella public/ a runtime (non è nel bundle della funzione):
// il numero di slide lo prendiamo dal JSON del contenuto, e i nomi seguono la
// convenzione fissa <slug>_NN.png prodotta dal motore grafico.

import fs from 'node:fs'
import path from 'node:path'

export type Contenuto = {
  slug: string
  caption?: string
  didascalia?: string
  hashtag?: string[]
  slides: unknown[]
}

const CONTENUTI = path.join(process.cwd(), 'contenuti')

function base(): string {
  // I PNG sono serviti dal repo pubblico su raw.githubusercontent (image/png,
  // pubblico, stabile) invece che da Vercel: Meta li scarica da lì. Override
  // possibile con MEDIA_BASE se un giorno si cambia host.
  const raw =
    process.env.MEDIA_BASE ||
    'https://raw.githubusercontent.com/Bubu19971234/scartapp-social/main/public'
  return raw.replace(/\/$/, '')
}

export function leggiContenuto(slug: string): Contenuto {
  const p = path.join(CONTENUTI, `${slug}.json`)
  if (!fs.existsSync(p)) throw new Error(`Contenuto non trovato: contenuti/${slug}.json`)
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as Contenuto
}

export function mediaDiSlug(slug: string): string[] {
  const c = leggiContenuto(slug)
  const n = c.slides?.length ?? 0
  const b = base()
  return Array.from({ length: n }, (_, i) => `${b}/img/${slug}_${String(i + 1).padStart(2, '0')}.png`)
}

export function captionDiSlug(slug: string): string {
  const c = leggiContenuto(slug)
  const testo = c.caption || c.didascalia || ''
  const tags = Array.isArray(c.hashtag)
    ? '\n\n' + c.hashtag.map((t) => (t.startsWith('#') ? t : '#' + t)).join(' ')
    : ''
  return testo + tags
}
