#!/usr/bin/env python3
"""Post new data.js entries to X (one post each). Ledger: tools/x_posted.json (keyed by URL)."""
import argparse, base64, hashlib, hmac, json, os, re, secrets, subprocess, sys, time, unicodedata
import urllib.error, urllib.parse, urllib.request

TWEETS = "https://api.x.com/2/tweets"
SITE = "https://nexa.nordiccrypto.no/"
LEDGER = os.path.join(os.path.dirname(__file__), "x_posted.json")
JS = 'eval(require("fs").readFileSync(0,"utf8")+";process.stdout.write(JSON.stringify(ENTRIES))")'


def entries(src):
    out = json.loads(subprocess.run(["node", "-e", JS], input=src, capture_output=True, text=True, check=True).stdout)
    return [{"name": e[1], "desc": e[2], "url": e[3]} for e in out if len(e) > 3 and e[3]]


def slug(s):
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", s).lower()))


def one_line(desc, limit=200):
    s = re.split(r"(?<=[.!?])\s", desc.strip())[0]
    return s if len(s) <= limit else s[:limit - 1].rstrip() + "…"


def _pct(s):
    return urllib.parse.quote(str(s), safe="~-._")


def oauth_header(method, url, creds):
    key, secret, token, token_secret = creds
    o = {"oauth_consumer_key": key, "oauth_nonce": secrets.token_hex(16), "oauth_signature_method": "HMAC-SHA1",
         "oauth_timestamp": str(int(time.time())), "oauth_token": token, "oauth_version": "1.0"}
    pstr = "&".join(f"{k}={v}" for k, v in sorted((_pct(k), _pct(v)) for k, v in o.items()))
    base = "&".join([method, _pct(url), _pct(pstr)])
    o["oauth_signature"] = base64.b64encode(hmac.new(f"{_pct(secret)}&{_pct(token_secret)}".encode(), base.encode(), hashlib.sha1).digest()).decode()
    return "OAuth " + ", ".join(f'{_pct(k)}="{_pct(v)}"' for k, v in sorted(o.items()))


def post(creds, text):
    req = urllib.request.Request(TWEETS, data=json.dumps({"text": text}).encode(), method="POST", headers={
        "Authorization": oauth_header("POST", TWEETS, creds), "Content-Type": "application/json", "User-Agent": "nexa-ecosystem-autopost"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())["data"]["id"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"X API -> {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--before", help="git rev of the previous data.js")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    cur = entries(open("data.js", encoding="utf-8").read())
    old = set()
    if a.before and not re.fullmatch(r"0+", a.before):
        r = subprocess.run(["git", "show", f"{a.before}:data.js"], capture_output=True, text=True)
        if r.returncode == 0:
            old = {e["url"] for e in entries(r.stdout)}
    ledger = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {}
    new = [e for e in cur if e["url"] not in old and e["url"] not in ledger]
    if not new:
        print("No new entries.")
        return
    creds = None if a.dry_run else [os.environ[k] for k in ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")]
    for e in new:
        text = f"New on the Nexa Ecosystem Directory: {e['name']}\n\n{one_line(e['desc'])}\n\n{SITE}#{slug(e['name'])}"
        if a.dry_run:
            print("---\n" + text)
            continue
        ledger[e["url"]] = {"name": e["name"], "post_id": post(creds, text), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        print(f"Posted: {e['name']}")
        with open(LEDGER, "w") as f:
            json.dump(ledger, f, indent=1, ensure_ascii=False)
        time.sleep(5)


if __name__ == "__main__":
    sys.exit(main())
