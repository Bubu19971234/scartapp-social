# scartapp-social

Publisher social di **Scart Up** (@scartapp). Fa tre cose:

1. **Genera** i caroselli come PNG (`genera_grafiche.py`, da JSON in `contenuti/`).
2. **Pubblica** un carosello su Instagram + Facebook via Graph API, e ne **ospita** i PNG
   (in `public/img/`, che su Vercel diventano URL pubblici che Meta scarica).

3. **Genera video animati** (`genera_video.mjs`, da JSON in `contenuti/video/`) per Reel e LinkedIn.

Clonato da `cdf-social`, stessa logica Meta già in produzione su AI Som/CDF.

## Come si genera un carosello

```bash
python3 genera_grafiche.py auto-poster   # legge contenuti/auto-poster.json → public/img/auto-poster_NN.png
```

## Come si genera un video animato

```bash
node genera_video.mjs                         # tutti i JSON in contenuti/video/
node genera_video.mjs quanto-tempo            # solo quello
node genera_video.mjs quanto-tempo --solo 9x16 --anteprima 6.5   # un fotogramma PNG di controllo
```

Esce in `public/video/`: `<slug>.mp4` (1080×1920, Reel IG/FB), `<slug>_4x5.mp4` (1080×1350,
LinkedIn) e `<slug>_cover.jpg`. Serve `ffmpeg` e Playwright (`npm i -D playwright-core` usa il
Chrome già installato). Il video è muto (traccia audio silenziosa): la musica si aggiunge in app.

Scene disponibili: `hook` · `testo` · `numero` · `confronto` · `calcolo` · `lista` · `griglia` · `cta`.
Ogni JSON ha anche `caption` (Instagram) e `linkedin` (testo del post sul profilo di Marco).
Il piano della serie è in `contenuti/video/piano.json`.

**Regola sui numeri:** ogni cifra a schermo ha una fonte (`"fonte"`) oppure è dichiarata come conto/ipotesi.

⚠️ `/api/pubblica` oggi pubblica solo caroselli di immagini: i video per ora si caricano a mano.

## Pubblicazione — è DELIBERATA, non automatica

Non c'è nessun cron che pubblica da solo. Si chiama a mano l'endpoint protetto:

```
# anteprima (NON pubblica): mostra media + caption
GET /api/pubblica?slug=auto-poster&secret=IL_TUO_CRON_SECRET&dry=1

# pubblica davvero su IG + FB
GET /api/pubblica?slug=auto-poster&secret=IL_TUO_CRON_SECRET
```

Pre-volo credenziali (verifica token/id senza pubblicare):

```
GET /api/verifica?slug=auto-poster
```

## Variabili d'ambiente (Vercel → Settings → Environment Variables, scope Production)

| Nome | Valore | Chi la mette |
|------|--------|--------------|
| `META_PAGE_ID` | `122342340951300` | già noto |
| `META_IG_USER_ID` | `17841456745014788` | già noto |
| `META_PAGE_TOKEN` | il token System User (dal file `scartup .rtf`) | **Marco** — è segreto |
| `META_API_VERSION` | `v21.0` | opzionale |
| `CRON_SECRET` | una stringa lunga a piacere | protegge /api/pubblica |
| `SITO_BASE` | lasciare vuoto | Vercel usa da solo il dominio |

Dopo aver aggiunto/cambiato le env → **Redeploy**.

⚠️ La pubblicazione di un carosello IG a 10 slide può durare un paio di minuti
(`maxDuration=300`): richiede piano **Vercel Pro**. Su Hobby il tetto è 60s.
