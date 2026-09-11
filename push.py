#!/usr/bin/env python3
"""Commit+push delle modifiche al repo (trigger deploy Vercel). Token dal file, mai stampato."""
import os
import re
import subprocess

RTF = "/Users/marcotinti/Desktop/scartup .rtf"
ROOT = os.path.dirname(os.path.abspath(__file__))
OWNER, REPO = "Bubu19971234", "scartapp-social"


def token():
    t = open(RTF, encoding="utf-8", errors="ignore").read().replace("\\\n", "")
    return re.search(r"(github_pat_[A-Za-z0-9_]{30,}|ghp_[A-Za-z0-9]{30,})", t).group(1)


def git(*a):
    r = subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True)
    print(f"  git {a[0]}: {(r.stdout + r.stderr).strip()[:200].replace(token(),'***')}")
    return r.returncode


tok = token()
git("add", "-A")
git("-c", "user.name=marco tinti", "-c", "user.email=marco.tinti1997@gmail.com",
    "commit", "-m", "media: servi i PNG da raw.githubusercontent + caption completa")
url = f"https://{OWNER}:{tok}@github.com/{OWNER}/{REPO}.git"
code = git("push", url, "main")
print("PUSH OK" if code == 0 else "PUSH FALLITO")
