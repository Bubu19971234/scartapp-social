// Pubblicazione organica su Facebook (Pagina) e Instagram (account Business)
// tramite Graph API. Adattato da ai-som-saas-live/lib/social.ts, già in produzione.
//
// I media devono essere URL PUBBLICI: Meta se li scarica da solo, non accetta
// upload diretti per i caroselli. Per questo i PNG stanno in public/img/ di
// questa stessa app: una volta deployata, ogni immagine ha il suo URL.
//
// Env richieste:
//   META_PAGE_ID      id della Pagina Facebook CDF
//   META_PAGE_TOKEN   token System User (vedi README: NON un token Pagina normale)
//   META_IG_USER_ID   id dell'account Instagram Business collegato alla Pagina

const V = process.env.META_API_VERSION || 'v21.0'
const BASE = `https://graph.facebook.com/${V}`

export type TipoPost = 'immagine' | 'carosello'

function env(nome: string): string {
  const v = process.env[nome]
  if (!v) throw new Error(`Variabile d'ambiente mancante: ${nome}`)
  return v
}

async function graph(path: string, params: Record<string, unknown>, method: 'GET' | 'POST' = 'POST') {
  const url = new URL(BASE + path)
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (method === 'GET') url.searchParams.set(k, val)
    else body.set(k, val)
  }
  const res = await fetch(url.toString(), method === 'GET' ? {} : { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) {
    const e = data?.error
    throw new Error(`Graph ${path}: ${e?.message || res.statusText}${e?.error_user_msg ? ' — ' + e.error_user_msg : ''}`)
  }
  return data
}

const attesa = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Il token con cui si pubblica DEVE essere quello della Pagina, non dell'utente
// che la amministra. Con un token utente le letture funzionano benissimo — il
// pre-volo passa, i nomi di Pagina e Instagram si leggono — ma la pubblicazione
// muore con «(#200) Unpublished posts must be posted to a page as the page
// itself». È successo davvero il 29/07/2026, al primo post CDF.
//
// Invece di pretendere che nell'ambiente ci sia già il token giusto, lo si
// ricava qui: chiedere alla Pagina il proprio `access_token` funziona sia se il
// token configurato è dell'utente sia se è già della Pagina (in quel caso
// risponde con se stesso). Se la chiamata non lo restituisce si usa quello
// configurato: peggio di così non va, e l'errore resta parlante.
let tokenCache: string | null = null

async function tokenPagina(): Promise<string> {
  if (tokenCache) return tokenCache
  const configurato = env('META_PAGE_TOKEN')
  try {
    const r = await graph(`/${env('META_PAGE_ID')}`, { fields: 'access_token', access_token: configurato }, 'GET')
    tokenCache = r?.access_token || configurato
  } catch {
    tokenCache = configurato
  }
  return tokenCache as string
}

// ---------------------------------------------------------------- Facebook

export async function pubblicaFacebook(tipo: TipoPost, media: string[], caption: string): Promise<string> {
  const page = env('META_PAGE_ID')
  const access_token = await tokenPagina()

  if (tipo === 'immagine') {
    const r = await graph(`/${page}/photos`, { url: media[0], caption, access_token })
    return r.post_id || r.id
  }

  // Carosello = album: carico le foto non pubblicate, poi le allego a un unico post
  const ids: string[] = []
  for (const url of media) {
    const r = await graph(`/${page}/photos`, { url, published: false, access_token })
    ids.push(r.id)
  }
  const post = await graph(`/${page}/feed`, {
    message: caption,
    ...Object.fromEntries(ids.map((media_fbid, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid })])),
    access_token,
  })
  return post.id
}

// --------------------------------------------------------------- Instagram

// Il container non è pronto subito: Meta scarica ed elabora il media (anche le
// immagini — pubblicare prima di FINISHED dà "Media ID is not available").
//
// 60 secondi (i 20 tentativi di prima) bastavano per un'immagine sola e non per
// un carosello: il 29/07/2026 il primo post CDF, tre slide, è scaduto proprio
// qui. Meta deve scaricare ogni figlio dal nostro dominio prima di montare il
// contenitore, quindi il tempo cresce col numero di slide — e i post di agosto
// ne hanno fino a sette. Ora la finestra è di tre minuti, dentro i cinque di
// maxDuration della route.
async function attendiContainer(id: string, access_token: string, tentativi = 60) {
  let ultimo = '(nessuna risposta)'
  for (let i = 0; i < tentativi; i++) {
    const r = await graph(`/${id}`, { fields: 'status_code,status', access_token }, 'GET')
    ultimo = `${r.status_code ?? 'status_code assente'}${r.status ? ' — ' + r.status : ''}`
    if (r.status_code === 'FINISHED') return
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') {
      throw new Error(`Container Instagram in stato ${r.status_code}: ${r.status || ''}`)
    }
    await attesa(3000)
  }
  // Senza l'ultimo stato visto questo errore non dice niente e si finisce a
  // tirare a indovinare: «status_code assente» significa che il token non
  // riesce a leggere il container, IN_PROGRESS che Meta sta ancora scaricando.
  throw new Error(`Timeout dopo ${tentativi * 3}s: Instagram non ha finito. Ultimo stato: ${ultimo}`)
}

export async function pubblicaInstagram(tipo: TipoPost, media: string[], caption: string): Promise<string> {
  const ig = env('META_IG_USER_ID')
  const access_token = await tokenPagina()

  let creation_id: string
  if (tipo === 'immagine') {
    const r = await graph(`/${ig}/media`, { image_url: media[0], caption, access_token })
    creation_id = r.id
  } else {
    // Carosello: prima i figli, poi il contenitore che li raccoglie.
    // Ogni figlio va atteso PRIMA di montare il contenitore: se si assembla
    // mentre Meta sta ancora scaricando le immagini, il contenitore resta
    // IN_PROGRESS all'infinito e il post scade in timeout senza dire perché.
    const children: string[] = []
    for (const image_url of media) {
      const c = await graph(`/${ig}/media`, { image_url, is_carousel_item: true, access_token })
      await attendiContainer(c.id, access_token)
      children.push(c.id)
    }
    const r = await graph(`/${ig}/media`, {
      media_type: 'CAROUSEL', children: children.join(','), caption, access_token,
    })
    creation_id = r.id
  }

  await attendiContainer(creation_id, access_token)
  const pub = await graph(`/${ig}/media_publish`, { creation_id, access_token })
  return pub.id
}

// ------------------------------------------------------------------ Comodi

// Verifica che token e id siano validi, senza pubblicare niente.
//
// Controlla anche CHE TIPO di token è configurato: leggere la Pagina riesce
// anche con un token utente, quindi un pre-volo che si limita a leggere dà
// verde e poi la pubblicazione fallisce. `/me` su un token di Pagina risponde
// con la Pagina stessa; su un token utente risponde con la persona.
export async function verificaCredenziali() {
  const configurato = env('META_PAGE_TOKEN')
  const pagina = await graph(`/${env('META_PAGE_ID')}`, { fields: 'name,id', access_token: configurato }, 'GET')
  const igId = process.env.META_IG_USER_ID
  const instagram = igId ? await graph(`/${igId}`, { fields: 'username,id', access_token: configurato }, 'GET') : null

  let token: Record<string, unknown>
  try {
    const io = await graph('/me', { fields: 'id,name', access_token: configurato }, 'GET')
    const eDellaPagina = io.id === pagina.id
    const derivato = await tokenPagina()
    token = {
      configurato_e: eDellaPagina ? 'token della Pagina' : `token dell'utente «${io.name}»`,
      si_pubblica_con: derivato === configurato
        ? (eDellaPagina ? 'quello configurato' : '⚠️ quello configurato — la pubblicazione fallirà')
        : 'token di Pagina ricavato a runtime',
    }
  } catch (e) {
    token = { errore: e instanceof Error ? e.message : String(e) }
  }

  return { pagina, instagram, token }
}

// ------------------------------------------------------------------ Insight
//
// Numeri veri dei post già usciti. Serve a chiudere le ipotesi di
// `social-intelligence/`: senza salvataggi e reach si pubblica alla cieca.
//
// ⚠️ Due limiti onesti dell'API, da conoscere prima di leggere i risultati:
//  · `impressions` non esiste più per i media creati dopo luglio 2024 — la
//    metrica di copertura è `reach` e basta.
//  · la retention slide-per-slide di un carosello NON è esposta: l'Ipotesi 1
//    (la slide 2 come secondo amo) resta leggibile solo a mano nell'app IG.
//
// Le metriche disponibili cambiano col tipo di media, e una metrica non
// supportata fa fallire l'intera chiamata invece di essere ignorata. Per questo
// si prova il set ricco e si ripiega su quello minimo, invece di dare errore.
export type Metriche = Record<string, number | string>

const IG_RICCO = 'reach,saved,shares,likes,comments,total_interactions'
const IG_MINIMO = 'reach,saved'

async function igInsight(idIg: string, token: string): Promise<Metriche> {
  for (const metric of [IG_RICCO, IG_MINIMO]) {
    try {
      const r = await graph(`/${idIg}/insights`, { metric, access_token: token }, 'GET')
      const out: Metriche = {}
      for (const v of r.data || []) out[v.name] = v.values?.[0]?.value ?? 0
      return out
    } catch (e) {
      if (metric === IG_MINIMO) return { errore: e instanceof Error ? e.message : String(e) }
    }
  }
  return {}
}

// Le metriche dei post di Pagina sono state potate più volte da Meta: un nome
// non più valido fa fallire tutta la chiamata con «(#100) The value must be a
// valid insights metric», senza dire QUALE dei nomi è quello sbagliato. Quindi
// si prova una scala, dal set ricco al minimo, e si tiene il primo che risponde.
const FB_SCALA = [
  'post_impressions_unique,post_engaged_users,post_clicks',
  'post_impressions_unique,post_clicks',
  'post_impressions_unique',
  'post_impressions',
  'post_reactions_by_type_total',
]

async function fbInsight(idFb: string, token: string, forzata?: string): Promise<Metriche> {
  const scala = forzata ? [forzata] : FB_SCALA
  let ultimo = ''
  for (const metric of scala) {
    try {
      const r = await graph(`/${idFb}/insights`, { metric, access_token: token }, 'GET')
      const out: Metriche = {}
      for (const v of r.data || []) out[v.name] = v.values?.[0]?.value ?? 0
      if (Object.keys(out).length) return out
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e)
    }
  }
  return { errore: ultimo || 'nessuna metrica disponibile' }
}

export async function insightDiUnPost(idFb: string | null, idIg: string | null, fbMetric?: string) {
  const token = await tokenPagina()
  const vuoto: Promise<Metriche> = Promise.resolve({})
  const [instagram, facebook] = await Promise.all([
    idIg ? igInsight(idIg, token) : vuoto,
    idFb ? fbInsight(idFb, token, fbMetric) : vuoto,
  ])
  return { instagram, facebook }
}
