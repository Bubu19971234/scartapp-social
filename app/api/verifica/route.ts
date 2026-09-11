// Pre-volo: verifica token e id, e mostra i media che uscirebbero — senza
// pubblicare niente. Utile prima del primo post per capire se il token è quello
// giusto (di Pagina) e se le immagini sono raggiungibili.
//
//   GET /api/verifica?slug=auto-poster

import { NextRequest, NextResponse } from 'next/server'
import { verificaCredenziali } from '@/lib/social'
import { mediaDiSlug, captionDiSlug } from '@/lib/media'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug') || undefined
  try {
    const credenziali = await verificaCredenziali()
    let media: string[] = []
    let caption = ''
    if (slug) {
      media = mediaDiSlug(slug)
      caption = captionDiSlug(slug)
    }
    return NextResponse.json({ ok: true, credenziali, slug, media, caption })
  } catch (e) {
    return NextResponse.json(
      { ok: false, errore: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
