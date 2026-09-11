#!/usr/bin/env python3
"""Carica i PNG di un carosello sul CDN Shopify (Files) e stampa gli URL pubblici.

Byte-channel per ospitare le immagini: Instagram scarica i media da un URL https
pubblico, e il CDN Shopify (cdn.shopify.com) lo è. Riusa l'auth degli script CDF.

    python3 carica_su_shopify.py auto-poster

Scrive gli URL, in ordine di slide, in public/img/<slug>.urls.json
"""
import json
import os
import pathlib
import subprocess
import sys
import time

# Riusa l'autenticazione Shopify già configurata in cdf-feed-fix/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "cdf-feed-fix"))
import shopify_auth  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent
IMG = ROOT / "public" / "img"

STAGED = """
mutation($input:[StagedUploadInput!]!){
  stagedUploadsCreate(input:$input){
    stagedTargets{ url resourceUrl parameters{ name value } }
    userErrors{ field message }
  }
}
"""

FILECREATE = """
mutation($files:[FileCreateInput!]!){
  fileCreate(files:$files){
    files{ id fileStatus alt }
    userErrors{ field message }
  }
}
"""

NODES = """
query($ids:[ID!]!){
  nodes(ids:$ids){
    ... on MediaImage { id fileStatus image { url } }
  }
}
"""


def slide_png(slug):
    return sorted(IMG.glob(f"{slug}_*.png"))


def carica(slug):
    files = slide_png(slug)
    if not files:
        sys.exit(f"Nessun PNG per '{slug}' in {IMG}")
    store, token = shopify_auth.avvia()
    print(f"Store {store} — {len(files)} immagini")

    # 1) staged targets
    inp = [{"filename": f"scartapp-{slug}-{i+1:02d}.png", "mimeType": "image/png",
            "httpMethod": "POST", "resource": "IMAGE"} for i, _ in enumerate(files)]
    d = shopify_auth.chiama_api(store, token, STAGED, {"input": inp})
    res = d["stagedUploadsCreate"]
    if res["userErrors"]:
        sys.exit(f"stagedUploadsCreate: {res['userErrors']}")
    targets = res["stagedTargets"]

    # 2) upload di ogni file al suo target (curl multipart)
    resource_urls = []
    for f, t in zip(files, targets):
        args = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", t["url"]]
        for p in t["parameters"]:
            args += ["-F", f"{p['name']}={p['value']}"]
        args += ["-F", f"file=@{f}"]
        code = subprocess.run(args, capture_output=True, text=True, timeout=120).stdout.strip()
        ok = code.startswith("2")
        print(f"  {'OK ' if ok else 'ERR'} upload {f.name} -> HTTP {code}")
        if not ok:
            sys.exit(f"upload fallito per {f.name}")
        resource_urls.append(t["resourceUrl"])

    # 3) fileCreate dai resourceUrl
    fc = shopify_auth.chiama_api(store, token, FILECREATE, {
        "files": [{"originalSource": u, "contentType": "IMAGE", "alt": f"{slug} slide"} for u in resource_urls]
    })
    r = fc["fileCreate"]
    if r["userErrors"]:
        sys.exit(f"fileCreate: {r['userErrors']}")
    ids = [x["id"] for x in r["files"]]

    # 4) poll finché ogni file è READY e ha image.url
    urls = {}
    for _ in range(30):
        nd = shopify_auth.chiama_api(store, token, NODES, {"ids": ids})
        pronti = 0
        for n in nd["nodes"]:
            if n and n.get("fileStatus") == "READY" and n.get("image", {}).get("url"):
                urls[n["id"]] = n["image"]["url"]
                pronti += 1
        print(f"  pronti {pronti}/{len(ids)}")
        if pronti == len(ids):
            break
        time.sleep(3)

    ordinati = [urls[i] for i in ids if i in urls]
    if len(ordinati) != len(ids):
        sys.exit("Alcuni file non sono diventati READY: riprova tra poco.")

    out = IMG / f"{slug}.urls.json"
    out.write_text(json.dumps(ordinati, indent=2), encoding="utf-8")
    print(f"\n{len(ordinati)} URL pubblici salvati in {out}")
    for u in ordinati:
        print(" ", u)
    return ordinati


if __name__ == "__main__":
    slug = sys.argv[1] if len(sys.argv) > 1 else "auto-poster"
    carica(slug)
