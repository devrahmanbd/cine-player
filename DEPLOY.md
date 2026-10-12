# Deployment Guide — zero to live on a single VPS

This is the ordered path from an empty VPS to a live site. Design reference:
`README-PROD.md` (architecture, admin, MySQL, mirroring). The script
`scripts/deploy.sh` automates every check below — prefer it over manual steps.

```
Your laptop (git push) → VPS (this guide) → https://YOUR-DOMAIN
Stack on the VPS: Caddy (:80/:443, auto HTTPS) → web (nginx static) → api (:3001)
```

## Prerequisites

- A VPS (1 vCPU / 1 GB RAM minimum) with a public IPv4 address.
- A domain name you control.
- On the VPS: `docker` + `docker compose` plugin, `node` + `npm`, `curl`.
  (`dig`/`nslookup` optional — used for the DNS pre-check only.)

## Step 0 — Point DNS at the VPS

Create an `A` record: `YOUR-DOMAIN -> <VPS public IPv4>` (proxied **OFF**
on first boot). Wait until `dig +short YOUR-DOMAIN` returns the VPS IP —
Let's Encrypt cannot issue until then. Ports `80`/`443` TCP must be open.

## Step 1 — Get the code and configure

```bash
git clone https://github.com/devrahmanbd/cine-player .
cp .env.prod.example .env
# edit .env: SITE_DOMAIN=yourdomain.com, ACME_EMAIL (optional),
# ADMIN_PASSWORD=<strong, generated: openssl rand -base64 24>
```

The script **refuses** placeholder passwords (`changeme`, …) — this is
intentional, not a bug.

## Step 2 — Deploy (one command)

```bash
sh scripts/deploy.sh
```

What it does, in order: prerequisites → env validation (domain shape,
strong password) → DNS-vs-host check → `npm run build` → `compose up` →
waits for internal api health (~2 min budget) → waits for public HTTPS +
cert (~5 min budget) → prints the admin URL. Re-running is safe. Flags:
`--check-only` (validate without changing anything),
`--env-file .env.example.com` (mirrors, see `scripts/mirror.sh`),
`--profile mysql`, `--skip-build`.

## Step 3 — First login and content

1. Open `https://YOUR-DOMAIN/#/admin`, log in with `.env` credentials.
2. **Addons**: paste each addon `manifest.json` URL (server-validated),
   enable + order. No content exists before this step — an empty catalog
   here is normal, not an error.
3. **Brand**: upload logo, set site name (title, PWA, and copy follow).
4. **Ads**: re-paste Adsterra codes approved for **this exact domain**
   (codes are domain-bound; old-domain codes render blank).

## Step 4 — Verify live

```bash
curl -sS https://YOUR-DOMAIN/api/health   # {"ok":true}
npm run deploy                             # local guard (dev machines)
```

Then click through: board renders, a stream plays, no console errors.

## Troubleshooting

| Symptom | Check |
|---|---|
| Script refuses at env step | `.env` missing field or placeholder password — fix `.env`, re-run |
| DNS mismatch error | A record wrong/stale — fix DNS, wait TTL, re-run |
| `api unhealthy` | `docker compose … logs web api` — usually DB volume or env typo |
| Cert never issues | DNS not propagated, port 80 blocked, or proxied CDN in front — `logs caddy \| grep -i cert` |
| Blank catalogs | Normal until Step 3.2 (addons) is done |
| Blank ads | Codes not approved for this domain — Step 3.4 |

## Rollback / updates

- **Update code**: `git pull`, `sh scripts/deploy.sh` (rebuilds + rechecks).
- **Rollback code**: `git checkout <sha>`, `sh scripts/deploy.sh`.
- **Data**: `brand-data` volume holds brand/addons/uploads — back it up
  (`docker run --rm -v brand-data:/d -v $PWD:/b alpine tar czf /b/brand-backup.tgz /d`)
  before risky changes. Never delete the volume unless you mean to reset
  branding, addons, and uploads together.
- **Local dev** runs natively (launchd), not via this script — see `README-FORK.md`.
