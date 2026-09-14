#!/usr/bin/env python3
"""Motore grafico social Scart Up — da JSON di contenuto a PNG pronti per Meta.

Adattato dal motore CDF (stesso rendering HTML→PNG via Chrome headless), ma con
l'identità Scart Up: font Poppins, viola + verde lime, direzione "B" (copertina
viola piena, interni bianchi). Formato 1080×1350.

Uso:
    python3 genera_grafiche.py                 # tutti i JSON in contenuti/
    python3 genera_grafiche.py auto-poster     # solo quello

Tipi di slide: cover · testo · pipeline · checklist · prova · cta
"""
import html as _h
import json
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
CONTENUTI = ROOT / "contenuti"
IMG = ROOT / "public" / "img"

# --- Palette Scart Up (dal logo) --------------------------------------------
VIOLA = "#4718B8"
VIOLA_SCURO = "#2C0E78"
INK = "#1B1140"
VERDE = "#8BC63F"
VERDE_SCURO = "#5E8B1E"
BIANCO = "#FFFFFF"
LILLA = "#F2EEFC"
MUTE = "#6B6392"
VERDE_INK = "#26400a"

W, H = 1080, 1350

CHROME_CANDS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]

MARCHIO = "Scart Up"


def esc(s):
    return _h.escape(str(s or ""))


def testo_marcato(s):
    """Evidenzia col verde le parole tra [[doppie parentesi]]."""
    out = esc(s)
    return re.sub(
        r"\[\[(.+?)\]\]",
        r'<span class="mk">\1</span>',
        out,
    )


def logo():
    """Marchio 'su': quadrato arrotondato + quadratino verde. I colori del
    quadrato arrivano da --logo-bg/--logo-fg (cambiano con lo stile/fondo)."""
    return ('<span class="logo">su</span>'
            f'<span class="marchio">{esc(MARCHIO)}</span>')


def css():
    return f"""
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=block');
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px}}
body{{padding:96px 90px;display:flex;flex-direction:column;
     font-family:'Poppins','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}

.top{{display:flex;align-items:center;gap:20px}}
.logo{{width:64px;height:64px;border-radius:18px;background:var(--logo-bg);color:var(--logo-fg);position:relative;
      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;letter-spacing:-1px}}
.logo::after{{content:"";position:absolute;top:9px;right:9px;width:15px;height:15px;border-radius:4px;background:{VERDE}}}
.marchio{{font-size:30px;font-weight:700;letter-spacing:-.5px}}

.centro{{flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px}}
.centro--cover{{align-items:center;text-align:center;gap:40px}}

.occhiello{{font-size:27px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--occ)}}
.titolo{{font-weight:800;line-height:1.08;letter-spacing:-.02em;font-size:70px;color:var(--titolo)}}
.titolo--cover{{font-size:96px}}
.sub{{font-size:37px;line-height:1.42;font-weight:500;color:var(--sub)}}

.mk{{background:{VERDE};color:{VERDE_INK};border-radius:8px;padding:0 14px;
    box-decoration-break:clone;-webkit-box-decoration-break:clone}}

.piede{{display:flex;align-items:center;gap:16px;font-size:26px;font-weight:600;color:var(--piede)}}
.scorri{{margin-left:auto;font-size:26px;letter-spacing:.06em;font-weight:600}}

.pipe{{display:flex;align-items:center;gap:16px;margin:8px 0}}
.pipe .st{{flex:1;background:var(--chip-bg);border-radius:20px;padding:34px 10px;text-align:center;
         font-size:34px;font-weight:700;color:{VIOLA}}}
.pipe .ar{{color:{VERDE_SCURO};font-weight:800;font-size:44px}}

.voce{{display:flex;gap:24px;align-items:flex-start;font-size:40px;line-height:1.3;font-weight:600}}
.tick{{width:46px;height:46px;border-radius:12px;background:{VERDE};color:{VERDE_INK};flex:none;
      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;margin-top:4px}}

.pillola{{align-self:flex-start;background:{VERDE};color:{VERDE_INK};font-weight:700;
        font-size:38px;padding:22px 46px;border-radius:999px}}
.pillola--cover{{align-self:center}}
"""


# --- Fondi per stile x tipo di slide ----------------------------------------
# Tre stili per variare il piano editoriale:
#   A = bianco pulito (cover bianca, titolo viola)
#   B = cover viola piena, interni bianchi (default)
#   C = lilla soft (cover e interni su lilla)
# lb/lf = colori del quadrato logo (cambiano su fondo scuro/chiaro).
def _fondi(stile, tipo):
    inner_bg = LILLA if stile == "C" else BIANCO
    inner = {"bg": inner_bg, "testo": INK, "titolo": INK, "occ": VIOLA,
             "sub": MUTE, "piede": MUTE, "lb": VIOLA, "lf": "#fff"}
    if tipo == "cover":
        if stile == "B":
            return {"bg": VIOLA, "testo": "#fff", "titolo": "#fff", "occ": "#CDBEF6",
                    "sub": "#E4DAFB", "piede": "#D9CCFA", "lb": "#fff", "lf": VIOLA}
        bg = LILLA if stile == "C" else BIANCO
        return {"bg": bg, "testo": INK, "titolo": VIOLA, "occ": VIOLA,
                "sub": MUTE, "piede": MUTE, "lb": VIOLA, "lf": "#fff"}
    if tipo == "cta":
        return {"bg": INK, "testo": "#fff", "titolo": "#fff", "occ": VERDE,
                "sub": "#C9BEEA", "piede": "#C9BEEA", "lb": "#fff", "lf": VIOLA}
    if tipo == "prova":
        bg = BIANCO if stile == "C" else LILLA
        return {"bg": bg, "testo": INK, "titolo": INK, "occ": VIOLA,
                "sub": INK, "piede": MUTE, "lb": VIOLA, "lf": "#fff"}
    return inner


def _cover(s):
    piede = (f'<div class="piede">{logo()}'
             f'<span class="scorri">{esc(s.get("piede", "scorri →"))}</span></div>')
    return ("", f'<div class="centro centro--cover">'
                f'<div class="occhiello">{esc(s.get("occhiello", ""))}</div>'
                f'<div class="titolo titolo--cover">{testo_marcato(s["titolo"])}</div>'
                f'</div>{piede}')


def _testo(s):
    occ = f'<div class="occhiello">{esc(s["occhiello"])}</div>' if s.get("occhiello") else ""
    sub = f'<div class="sub">{testo_marcato(s["sub"])}</div>' if s.get("sub") else ""
    return ("", f'<div class="centro">{occ}'
                f'<div class="titolo">{testo_marcato(s["titolo"])}</div>{sub}</div>')


def _pipeline(s):
    passi = s.get("passi", [])
    chips = f'<span class="ar">→</span>'.join(f'<div class="st">{esc(p)}</div>' for p in passi)
    occ = f'<div class="occhiello" style="color:{VERDE_SCURO}">{esc(s["occhiello"])}</div>' if s.get("occhiello") else ""
    sub = f'<div class="sub">{testo_marcato(s["sub"])}</div>' if s.get("sub") else ""
    return ("", f'<div class="centro">{occ}'
                f'<div class="titolo">{testo_marcato(s["titolo"])}</div>'
                f'<div class="pipe">{chips}</div>{sub}</div>')


def _checklist(s):
    occ = f'<div class="occhiello" style="color:{VERDE_SCURO}">{esc(s["occhiello"])}</div>' if s.get("occhiello") else ""
    voci = "".join(f'<div class="voce"><span class="tick">✓</span><span>{testo_marcato(v)}</span></div>'
                   for v in s.get("voci", []))
    return ("", f'<div class="centro">{occ}'
                f'<div class="titolo" style="margin-bottom:10px">{testo_marcato(s.get("titolo",""))}</div>'
                f'{voci}</div>')


def _prova(s):
    sub = f'<div class="sub" style="font-weight:600">{testo_marcato(s["sub"])}</div>' if s.get("sub") else ""
    return ("", f'<div class="centro">'
                f'<div class="occhiello">{esc(s.get("occhiello","La prova"))}</div>'
                f'<div class="titolo">{testo_marcato(s["titolo"])}</div>{sub}</div>')


def _cta(s):
    azione = f'<div class="pillola pillola--cover">{esc(s["azione"])}</div>' if s.get("azione") else ""
    return ("", f'<div class="centro centro--cover">'
                f'<div class="occhiello">{esc(s.get("occhiello",""))}</div>'
                f'<div class="titolo titolo--cover" style="font-size:78px">{testo_marcato(s["titolo"])}</div>'
                f'{azione}</div>'
                f'<div class="piede" style="justify-content:center">{logo()}</div>')


RENDERER = {"cover": _cover, "testo": _testo, "pipeline": _pipeline,
            "checklist": _checklist, "prova": _prova, "cta": _cta}


def documento(slide, stile="B"):
    tipo = slide["tipo"]
    if tipo not in RENDERER:
        raise ValueError(f"tipo slide sconosciuto: {tipo} (ammessi: {', '.join(RENDERER)})")
    f = _fondi(stile, tipo)
    _, corpo = RENDERER[tipo](slide)
    testata = "" if tipo in ("cover", "cta") else f'<div class="top">{logo()}</div>'
    chip = "#FFFFFF" if f["bg"] == LILLA else LILLA
    body_style = (f"background:{f['bg']};color:{f['testo']};--titolo:{f['titolo']};"
                  f"--occ:{f['occ']};--sub:{f['sub']};--piede:{f['piede']};"
                  f"--logo-bg:{f['lb']};--logo-fg:{f['lf']};--chip-bg:{chip}")
    return (f'<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">'
            f'<style>{css()}</style></head><body style="{body_style}">'
            f'{testata}{corpo}</body></html>')


def genera(percorso, chrome):
    post = json.loads(percorso.read_text(encoding="utf-8"))
    stile = post.get("stile", "B")
    fatti = []
    for i, slide in enumerate(post["slides"], 1):
        doc = documento(slide, stile)
        nome = f"{post['slug']}_{i:02d}"
        htmlp, pngp = IMG / f"{nome}.html", IMG / f"{nome}.png"
        htmlp.write_text(doc, encoding="utf-8")
        subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--force-device-scale-factor=1", "--virtual-time-budget=4000",
             f"--window-size={W},{H}", f"--screenshot={pngp}", f"file://{htmlp}"],
            capture_output=True, timeout=90)
        if pngp.exists():
            htmlp.unlink()
            fatti.append(pngp.name)
            print(f"  OK {pngp.name}  ({W}x{H}, slide '{slide['tipo']}')")
        else:
            print(f"  ERR {nome} — Chrome non ha prodotto il PNG")
    return fatti


def main():
    chrome = next((c for c in CHROME_CANDS if os.path.exists(c)), None)
    if not chrome:
        sys.exit("Nessun Chrome/Chromium trovato: serve per il rendering.")
    IMG.mkdir(parents=True, exist_ok=True)
    filtro = sys.argv[1] if len(sys.argv) > 1 else ""
    files = sorted(p for p in CONTENUTI.glob("*.json") if filtro in p.name)
    if not files:
        sys.exit(f"Nessun contenuto in {CONTENUTI}" + (f" con '{filtro}'" if filtro else ""))
    totale = 0
    for p in files:
        print(f"\n{p.name}")
        totale += len(genera(p, chrome))
    print(f"\n{totale} immagini in {IMG}")


if __name__ == "__main__":
    main()
