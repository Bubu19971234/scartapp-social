# Progetto AVATAR — scheda del personaggio (v0.1, bozza)

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

## 2. Identità

| Voce | Proposta | Stato |
|------|----------|-------|
| Nome | **Monò** (da "monocolo"); nome esteso "Leone Monò" | [DA DECIDERE] — handle non verificati |
| Alternative | "Conte Cavatappi", "Ottavio Sughero" | |
| Età apparente | 40–45 | |
| Genere | maschile | [DA DECIDERE] — non specificato nel brief |
| Origine dichiarata | "nato in una cantina, cresciuto in un server" | |
| Resa visiva | 3D stilizzato / illustrazione editoriale, **non** fotorealistico | [DA DECIDERE] |

Perché stilizzato e non fotorealistico:
- monocolo, catena e capigliatura sono dettagli che i generatori deformano; lo
  stile illustrato perdona, il fotorealismo no;
- è dichiaratamente finto: nessuno si sente ingannato;
- una faccia realistica "quasi giusta" respinge, una stilizzata no.

Contro: i tool di video parlato rendono meglio sui volti realistici. Da verificare
con una prova prima di decidere.

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

- Dà del tu, frasi brevi, lessico curato ma mai snob.
- Formula ricorrente: una cosa colta + una cosa pratica ("La storia è questa.
  L'app che ti serve è quest'altra.").
- Non dice mai: "ho assaggiato", "al palato", "ve lo consiglio perché è buono".
- Dice: "mi hanno raccontato", "i numeri dicono", "l'etichetta dice", "ho letto".
- Tic verbale: chiude i post con "Monocolo giù." [Ipotesi — da testare]

## 5. Pilastri di contenuto

| Pilastro | Quota | Esempi |
|----------|-------|--------|
| Vino raccontato | 30% | come si legge un'etichetta, storia di un vitigno, falsi miti |
| Tavola e abbinamenti | 20% | regole di abbinamento spiegate, prodotti tipici, stagionalità |
| App e AI del vino | 25% | strumenti per cantine, enoteche, ristoranti; prove di app |
| Il personaggio | 10% | il guardaroba, gli accessori in pelle, la vita da virtuale |
| Prodotti di Marco | 15% | sempre dichiarati come pubblicità |

Tetto promozionale: 1 post su 6. Oltre, il profilo diventa un catalogo e smette
di crescere.

## 6. Trasparenza e regole (da far verificare a un consulente)

- **Bio**: dichiarare che è un personaggio virtuale e di chi è
  (es. "Personaggio virtuale creato con AI · un progetto di …").
- **Etichetta AI di Meta** attiva sui contenuti generati.
- **Pubblicità**: ogni contenuto sui prodotti di Marco porta `#adv` o
  `#pubblicità` in apertura. Il profilo è di proprietà del marchio: vale per tutti
  i contenuti promozionali, anche se non c'è un compenso.
- **Alcol**: niente contenuti rivolti a minori, niente associazione
  alcol–successo/guida/prestazione, niente incoraggiamento al consumo eccessivo.
  Limite d'età 18+ sul profilo se si promuovono alcolici.
- **Mai** volti, nomi o voci di persone reali.

## 7. Decisioni aperte

1. **Quali prodotti sponsorizza?** Il brief dice "i miei prodotti" ma questo repo è
   Scart Up (automazioni AI per piccole imprese), non vino. Cambia pilastri e
   regole (alcol sì/no).
2. Nome e handle (verificare disponibilità su Instagram/TikTok).
3. Genere e resa visiva (stilizzato vs fotorealistico).
4. Lingua: solo italiano o anche inglese.
5. Canali di partenza: consigliato Instagram + TikTok, uno solo per i primi 30 giorni.

## 8. Prossimi passi

1. Chiudere le decisioni 1–3.
2. Generare la tavola di riferimento del personaggio (`prompt-immagini.md`).
3. Scegliere 1 immagine "canonica" e usarla come riferimento per tutte le successive.
4. Prova video di 10 secondi parlati, per validare la resa del monocolo in movimento.
5. Primi 9 post (griglia iniziale) + bio + foto profilo.
