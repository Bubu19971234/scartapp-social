// Pubblica UN carosello su Instagram + Facebook. Azione DELIBERATA, non un cron:
// si chiama a mano (o da uno scheduler) con lo slug e il segreto. Finché Marco
// non dice il contrario, non c'è nessun cron che pubblica da solo.
//
//   Anteprima (non pubblica):  GET /api/pubblica?slug=auto-poster&secret=XXX&dry=1
//   Pubblica davvero:          GET /api/pubblica?slug=auto-poster&secret=XXX
//
// Il carosello IG richiede che Meta scarichi ogni slide dal nostro dominio prima
// di montare il contenitore: con 10 slide servono un paio di minuti, per questo
// maxDuration è alto (richiede piano Vercel Pro; su Hobby il tetto è 60s).

import { NextRequest, NextResponse } from 'next/server'
import { pubblicaFacebook, pubblicaInstagram } from '@/lib/social'
import { mediaDiSlug, captionDiSlug } from '@/lib/media'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const atteso = process.env.CRON_SECRET
  if (!atteso || secret !== atteso) {
    return NextResponse.json({ errore: 'non autorizzato' }, { status: 401 })
  }

  const slug = url.searchParams.get('slug')
  if (!slug) return NextResponse.json({ errore: 'manca il parametro ?slug=' }, { status: 400 })
  const dry = url.searchParams.get('dry') === '1'

  try {
    const media = mediaDiSlug(slug)
    const caption = captionDiSlug(slug)
    if (media.length === 0) {
      return NextResponse.json({ errore: `nessuna immagine per lo slug «${slug}»` }, { status: 404 })
    }
    if (dry) {
      return NextResponse.json({ dry: true, slug, quante: media.length, media, caption })
    }

    const instagram = await pubblicaInstagram('carosello', media, caption)
    const facebook = await pubblicaFacebook('carosello', media, caption)
    return NextResponse.json({ ok: true, slug, instagram, facebook, media })
  } catch (e) {
    return NextResponse.json(
      { ok: false, errore: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
