# scartapp-social

Publisher social di **Scart Up** (@scartapp). Fa due cose:

1. **Genera** i caroselli come PNG (`genera_grafiche.py`, da JSON in `contenuti/`).
2. **Pubblica** un carosello su Instagram + Facebook via Graph API, e ne **ospita** i PNG
   (in `public/img/`, che su Vercel diventano URL pubblici che Meta scarica).

Clonato da `cdf-social`, stessa logica Meta già in produzione su AI Som/CDF.

## Come si genera un carosello

```bash
python3 genera_grafiche.py auto-poster   # legge contenuti/auto-poster.json → public/img/auto-poster_NN.png
```

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
