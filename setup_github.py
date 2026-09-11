#!/usr/bin/env python3
"""Crea il repo GitHub 'scartapp-social', ci mette codice+immagini e lo pusha.

Il token developer GitHub viene letto dal file sulla scrivania (scartup .rtf) e
resta in memoria: non viene mai stampato. Idempotente: se il repo esiste già,
riusa quello.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

RTF = "/Users/marcotinti/Desktop/scartup .rtf"
ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = "scartapp-social"


def estrai_token():
    with open(RTF, encoding="utf-8", errors="ignore") as f:
        testo = f.read()
    testo = testo.replace("\\\n", "").replace("\\\r\n", "")
    m = re.search(r"(github_pat_[A-Za-z0-9_]{30,}|ghp_[A-Za-z0-9]{30,})", testo)
    if not m:
        sys.exit("Token GitHub non trovato nel file scartup .rtf")
    return m.group(1)


def api(token, metodo, path, body=None):
    url = "https://api.github.com" + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=metodo, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "scartapp-setup",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def git(*args, token=None, owner=None):
    env = dict(os.environ)
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        # non stampare eventuali URL con token
        err = (r.stderr or r.stdout).replace(token or "\0", "***")
        print(f"  git {args[0]} -> {err.strip()[:300]}")
    return r.returncode == 0


def main():
    token = estrai_token()

    st, me = api(token, "GET", "/user")
    if st != 200:
        sys.exit(f"Token non valido (GET /user -> {st}): {me.get('message')}")
    owner = me["login"]
    print(f"GitHub: autenticato come {owner}")

    st, repo = api(token, "POST", "/user/repos", {"name": REPO, "private": True,
                                                  "description": "Publisher social Scart Up"})
    if st == 201:
        print(f"Repo creato: {owner}/{REPO}")
    elif st == 422:
        print(f"Repo già esistente: {owner}/{REPO}")
    else:
        sys.exit(f"Creazione repo fallita ({st}): {repo.get('message')}")

    push_url = f"https://{owner}:{token}@github.com/{owner}/{REPO}.git"

    if not os.path.isdir(os.path.join(ROOT, ".git")):
        git("init", token=token)
    git("branch", "-M", "main", token=token)
    git("add", "-A", token=token)
    git("-c", "user.name=marco tinti", "-c", "user.email=marco.tinti1997@gmail.com",
        "commit", "-m",
        "Publisher Scart Up: motore grafico + pubblicazione Meta + PNG carosello auto-poster\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>",
        token=token)
    ok = git("push", "-u", push_url, "main", token=token)
    if ok:
        print(f"\nPUSH OK -> https://github.com/{owner}/{REPO}")
        print(f"OWNER={owner}")
    else:
        sys.exit("push fallito")


if __name__ == "__main__":
    main()
