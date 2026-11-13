# Progetto AVATAR — scheda del personaggio (v0.3, bozza)

Influencer virtuale con profilo proprio. Parla di vino, enogastronomia e di app/AI
legate a quel mondo; sponsorizza i prodotti di Marco in modo dichiarato.

> Stato: bozza da validare. Le voci marcate **[DA DECIDERE]** bloccano la produzione
> delle immagini di riferimento.

## 1. L'idea in una riga

Un dandy che non ha un palato ma ha letto tutto: **non degusta, racconta**.

Il vincolo è il posizionamento: un personaggio virtuale che dice "questo vino è
buono" non è credibile, perché non può berlo. Quindi non recensisce mai al gusto.
Racconta storie, territori, etichette, dati, strumenti. E ci scherza sopra
("Io non bevo. Leggo."). L'autoironia sul fatto di essere artificiale è il tratto
che lo rende simpatico invece che inquietante.

## 1b. Cosa sponsorizza e a chi parla

Fonte: repository dei due siti (letti il 13/11/2026).

| Prodotto | Cos'è | Chi lo compra |
|----------|-------|---------------|
| **AI Som** | sommelier digitale nel menù QR: il cliente dice cosa mangia e riceve consigli solo tra i vini della carta del locale. 8 lingue. 350 €/anno + IVA | ristoranti, pizzerie, bar, enoteche |
| **AI Som Margini** | food cost, prezzo minimo e prezzo consigliato di ogni piatto, da fatture e costi fissi. 600 €/anno + IVA | gli stessi |
| **Centro Distribuzione Bevande** | distributore di Cerreto Guidi (FI), dal 1981: vino, bollicine, spirits, birra, food. Accesso su richiesta | locali e, in parte, privati |
| Vino di terzi | più avanti, non è il focus iniziale | — |
| Scart Up | in attesa | — |

Tutti e tre i prodotti si vendono a **chi ha un locale**, non a chi beve vino a casa.
Quindi il pubblico da costruire è: ristoratori, baristi, enotecari, personale di sala.
Il vino resta l'argomento, ma visto dal lato di chi lo vende: la carta, il servizio,
il margine sul calice, cosa chiede il cliente.

Coerenza del personaggio: AI Som è un sommelier che non beve. Monò anche.

## 2. Identità

| Voce | Proposta | Stato |
|------|----------|-------|
| Nome | **Monò** (da "monocolo"); nome esteso "Leone Monò" | [DA DECIDERE] — handle non verificati |
| Alternative | "Conte Cavatappi", "Ottavio Sughero" | |
| Età apparente | 40–45 | |
| Genere | maschile | deciso |
| Origine dichiarata | "nato in una cantina, cresciuto in un server" | |
| Resa visiva | **fotorealistica** | deciso |

Perché fotorealistica: il personaggio deve parlare e muoversi in video (labiale,
trasferimento di movimento, voce). Questi strumenti rendono meglio su un volto realistico.

Prezzo da pagare: monocolo, catena e ricciolo sono i dettagli che si deformano per
primi in video. Regole per tenerli realistici:
- monocolo vero da oculista d'epoca: lente leggermente convessa con riflesso,
  montatura sottile in ottone con galleria, incastrato tra zigomo e arcata;
- catena corta e tesa verso il bavero, mai penzolante davanti alla bocca
  (disturba il labiale);
- nei video parlati inquadratura a mezzo busto e testa quasi ferma; i movimenti
  ampi solo in clip senza parlato;
- ogni clip si controlla fotogramma per fotogramma su monocolo e catena prima di uscire.

### Video e voce — cosa si può fare

- **Sì**: rifare un *formato* virale (struttura, gancio, ritmo, audio disponibile
  in piattaforma) con riprese generate da zero.
- **Sì**: trasferire sul personaggio il movimento di un video girato da Marco o
  da un attore che ha dato il consenso.
- **No**: sostituire il personaggio dentro il video virale di un altro creator.
  Il video è suo e il corpo/movimento è di una persona reale: rischio rimozione,
  segnalazione per violazione di copyright e uso dell'immagine altrui.
- **Voce**: sintetica progettata da zero, oppure clonata da Marco o da un doppiatore
  con consenso scritto. Mai la voce di una persona reale senza consenso.

## 3. Aspetto (elementi fissi — non cambiano mai)

1. **Cappello**: fedora a tesa corta in feltro color vinaccia, nastro in cuoio.
2. **Capigliatura**: un grande ricciolo a spirale, a forma di cavatappi, color rame,
   che esce dal cappello sul lato sinistro. Resto dei capelli corto e ordinato.
3. **Monocolo**: montatura in ottone sull'occhio destro, catena fine in ottone
   fino all'occhiello del bavero.
4. **Abito**: tre pezzi verde bottiglia, camicia crema, cravatta vinaccia.
5. **Pelle**: brogue color cognac, cintura e guanti coordinati, tracolla
   porta-bottiglia in cuoio. Il cuoio è sempre della stessa tonalità.
6. **Volto**: baffi curati, sopracciglio destro leggermente alzato (regge il monocolo).

Elementi variabili: sfondo, posa, oggetto in mano (calice, bottiglia, telefono,
tablet), fazzoletto da taschino.

### Palette

| Colore | Hex | Uso |
|--------|-----|-----|
| Vinaccia | `#6B1E2E` | cappello, cravatta, accento |
| Verde bottiglia | `#1F3D2B` | abito |
| Cuoio | `#A0622D` | scarpe, accessori |
| Ottone | `#C9A227` | monocolo, catena |
| Crema | `#F3EBDD` | camicia, sfondi |

Volutamente lontana dal viola/lime di Scart Up: il personaggio ha un profilo suo.

## 4. Voce

### Come parla
- Dà del tu, frasi brevi, lessico curato ma mai snob.
- Formula ricorrente: una cosa colta + una cosa pratica ("La storia è questa.
  Il conto è quest'altro.").
- Non dice mai: "ho assaggiato", "al palato", "ve lo consiglio perché è buono".
- Dice: "mi hanno raccontato", "i numeri dicono", "l'etichetta dice", "ho letto".

### Come suona
Voce **sintetica progettata da zero** (non clonata da nessuno).

| Parametro | Valore |
|-----------|--------|
| Registro | baritono, profondo ma non cavernoso |
| Colore | caldo, accogliente, sorriso nella voce |
| Età percepita | 40–50 |
| Ritmo | lento, circa 140 parole al minuto, pause prima della battuta |
| Accento | italiano neutro; inflessione toscana leggera solo se il generatore la regge [Ipotesi] |
| Da evitare | tono da spot, da speaker radiofonico, da documentario |

Frasi di prova per scegliere la voce (stesse frasi su ogni candidata):
1. "Io non bevo. Leggo. E su questa etichetta c'è scritto molto più di quanto pensi."
2. "Un calice venduto a sei euro può farti guadagnare, oppure costarti. Dipende da un numero."
3. "Siediti. Ti racconto perché questo vino si chiama così."

Una volta scelta, la voce non cambia più: stesso modello, stesse impostazioni,
annotate qui.

## 5. Pilastri di contenuto

| Pilastro | Quota | Esempi |
|----------|-------|--------|
| Il vino raccontato | 25% | come si legge un'etichetta, storia di un vitigno, falsi miti |
| Il vino in sala | 25% | costruire una carta, vendere il calice, cosa chiede il cliente, abbinamenti |
| I conti del locale | 20% | food cost, prezzo minimo, ricarichi, errori tipici |
| App e AI per il locale | 10% | menù QR, strumenti, prove |
| Il personaggio | 5% | il guardaroba, gli accessori in pelle, la vita da virtuale |
| Prodotti di Marco | 15% | AI Som, AI Som Margini, Centro Distribuzione Bevande — sempre dichiarati |

Tetto promozionale: 1 post su 6. Oltre, il profilo diventa un catalogo e smette
di crescere.

## 6. Trasparenza e regole (da far verificare a un consulente)

- **Bio**: dichiarare che è un personaggio virtuale e di chi è
  (es. "Personaggio virtuale creato con AI · un progetto di …").
- **Etichetta AI di Meta** attiva sui contenuti generati.
- **Pubblicità**: ogni contenuto sui prodotti di Marco porta `#adv` o
  `#pubblicità` in apertura. Il profilo è di proprietà del marchio: vale per tutti
  i contenuti promozionali, anche se non c'è un compenso.
- **Alcol** (vale da subito: Centro Distribuzione Bevande distribuisce alcolici): niente contenuti rivolti a minori, niente associazione
  alcol–successo/guida/prestazione, niente incoraggiamento al consumo eccessivo.
  Limite d'età 18+ sul profilo se si promuovono alcolici.
- **Mai** volti, nomi o voci di persone reali.

## 7. Decisioni

Prese: genere maschile · resa fotorealistica · sponsorizza AI Som, AI Som Margini e
Centro Distribuzione Bevande · vino di terzi più avanti · Scart Up in attesa ·
voce sintetica profonda e accogliente.

Aperte:
1. Nome e handle (verificare disponibilità su Instagram/TikTok).
2. Pubblico: confermare che si parla a chi ha un locale (vedi 1b).
3. Generatore di voce e di video da usare.
4. Lingua e canale di partenza.

## 8. Prossimi passi

1. Chiudere le decisioni 1–3.
2. Generare la tavola di riferimento del personaggio (`prompt-immagini.md`).
3. Scegliere 1 immagine "canonica" e usarla come riferimento per tutte le successive.
4. Prova video di 10 secondi parlati, per validare la resa del monocolo in movimento.
5. Primi 9 post (griglia iniziale) + bio + foto profilo.
