// Cron di pubblicazione: gira ogni giorno e pubblica il carosello la cui data
// nel piano == oggi (fuso Europe/Rome). Così "un post ogni 2 giorni" è solo una
// questione di date nel piano, senza stato da tenere.
//
// Autorizzazione: Vercel aggiunge da solo l'header Authorization: Bearer
// <CRON_SECRET> alle chiamate del cron (perché CRON_SECRET è tra le env). Per un
// test manuale si può passare ?secret=<CRON_SECRET>.
//
// Test manuale:
//   /api/cron?secret=XXX&dry=1              -> cosa uscirebbe oggi (non pubblica)
//   /api/cron?secret=XXX&force=<slug>       -> pubblica subito quello slug
//
// Meta a volte risponde "An unexpected error, please retry" alla prima chiamata
// IG: qui si ritenta da soli, così il cron non salta un'uscita per un singhiozzo.

import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { pubblicaFacebook, pubblicaInstagram } from '@/lib/social'
import { mediaDiSlug, captionDiSlug } from '@/lib/media'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Uscita = { data: string; slug: string }

function oggiRoma(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
}

function autorizzato(req: NextRequest): boolean {
  const s = process.env.CRON_SECRET
  if (!s) return false
  if (req.headers.get('authorization') === `Bearer ${s}`) return true
  return new URL(req.url).searchParams.get('secret') === s
}

const attesa = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function conRetry<T>(fn: () => Promise<T>, tentativi: number): Promise<T> {
  let ultimo: unknown
  for (let i = 0; i < tentativi; i++) {
    try {
      return await fn()
    } catch (e) {
      ultimo = e
      const msg = e instanceof Error ? e.message : String(e)
      const transitorio = /unexpected error|please retry|temporarily|rate limit|try again/i.test(msg)
      if (!transitorio || i === tentativi - 1) throw e
      await attesa(5000)
    }
  }
  throw ultimo
}

export async function GET(req: NextRequest) {
  if (!autorizzato(req)) {
    return NextResponse.json({ errore: 'non autorizzato' }, { status: 401 })
  }
  const url = new URL(req.url)
  const dry = url.searchParams.get('dry') === '1'
  const force = url.searchParams.get('force') || ''

  try {
    const oggi = oggiRoma()
    let slug = force
    if (!slug) {
      const pianoPath = path.join(process.cwd(), 'contenuti', 'piano.json')
      const piano = JSON.parse(fs.readFileSync(pianoPath, 'utf-8')) as { uscite?: Uscita[] }
      const voce = (piano.uscite || []).find((u) => u.data === oggi)
      if (!voce) {
        return NextResponse.json({ ok: true, skip: true, oggi, messaggio: 'nessuna uscita in programma oggi' })
      }
      slug = voce.slug
    }

    const media = mediaDiSlug(slug)
    const caption = captionDiSlug(slug)
    if (media.length === 0) {
      return NextResponse.json({ ok: false, errore: `nessuna immagine per «${slug}»` }, { status: 404 })
    }
    if (dry) {
      return NextResponse.json({ dry: true, oggi, slug, quante: media.length })
    }

    const instagram = await conRetry(() => pubblicaInstagram('carosello', media, caption), 2)
    const facebook = await conRetry(() => pubblicaFacebook('carosello', media, caption), 3)
    return NextResponse.json({ ok: true, oggi, slug, instagram, facebook })
  } catch (e) {
    return NextResponse.json({ ok: false, errore: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
