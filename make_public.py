#!/usr/bin/env python3
"""Rende pubblico il repo (per servire i PNG da raw.githubusercontent) e verifica.
Token letto dal file scartup .rtf, mai stampato."""
import json
import re
import subprocess
import urllib.request

RTF = "/Users/marcotinti/Desktop/scartup .rtf"
OWNER = "Bubu19971234"
REPO = "scartapp-social"


def token():
    t = open(RTF, encoding="utf-8", errors="ignore").read().replace("\\\n", "")
    m = re.search(r"(github_pat_[A-Za-z0-9_]{30,}|ghp_[A-Za-z0-9]{30,})", t)
    if not m:
        raise SystemExit("token GitHub non trovato")
    return m.group(1)


def main():
    tok = token()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}",
        data=json.dumps({"private": False}).encode(),
        method="PATCH",
        headers={"Authorization": f"token {tok}", "Accept": "application/vnd.github+json",
                 "User-Agent": "scartapp"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    print("private ora:", d.get("private"))

    raw = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/main/public/img/auto-poster_01.png"
    out = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "HTTP %{http_code} type=%{content_type} size=%{size_download}", raw],
        capture_output=True, text=True).stdout
    print("raw img:", out)
    print("BASE_RAW=" + f"https://raw.githubusercontent.com/{OWNER}/{REPO}/main/public")


if __name__ == "__main__":
    main()
