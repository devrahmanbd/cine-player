# stremio-linux — production runbook (single VPS + Caddy + automatic HTTPS)

Fork runbook is `README-FORK.md` (dev). This file adds nothing to dev —
it only describes the prod overlay (`docker-compose.prod.yml` + Caddy).
No existing files were changed for prod; all prod files are new.

New files:

- `docker-compose.prod.yml` — prod override (Caddy edge, `web` internal-only).
- `docker/Caddyfile` — `{$SITE_DOMAIN}` reverse_proxy to `web:80`.
- `.env.prod.example` — prod env template.
- `README-PROD.md` — this file.

Design: `Caddy (:80/:443, auto Let's Encrypt) -> web (nginx static, internal :80) -> api (:3001, internal-only)`.

## 1. DNS A-record

1. In your registrar/DNS panel, create an `A` record:
   `SITE_DOMAIN -> <VPS public IPv4>` (TTL 300–3600, proxied OFF for first boot).
2. If you serve `www`, add a second `A` record for `www` and set
   `SITE_DOMAIN` to the canonical host (Caddy serves exactly what
   `SITE_DOMAIN` names; extra names need extra Caddyfile site blocks).
3. Wait for propagation before first boot so Let's Encrypt HTTP-01 can reach you:
   `dig +short $SITE_DOMAIN` should return your VPS IP.
4. Ports `80` and `443` (TCP, plus `443/UDP` for HTTP/3) must be reachable
   from the internet. No other ports need to be public.

## 2. First boot (on the VPS)

```bash
cp .env.prod.example .env   # set SITE_DOMAIN, ACME_EMAIL (optional), ADMIN_PASSWORD (strong!)
npm install
npm run build               # static build -> ./build (mounted read-only into `web`)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
```

First `up` boots `api` (seeds brand defaults + admin user), `web` (nginx,
no host port — internal only), and `caddy` (gets the Let's Encrypt cert).
Cert issuance takes ~30–120s on first boot with correct DNS.

## 3. Confirm HTTPS + health endpoint

```bash
# Caddy got a cert (look for "certificate obtained successfully"):
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs caddy | grep -i cert

# Public HTTPS serves the app:
curl -sSI https://$SITE_DOMAIN | head -20
# expect: HTTP/2 200, strict-transport-security, x-content-type-options: nosniff

# API health through the full chain (Caddy -> web/nginx -> api):
curl -sS https://$SITE_DOMAIN/api/health
# expect: {"ok":true}

# Direct internal check (on the VPS, bypasses Caddy):
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec web wget -qO- http://api:3001/api/health
# expect: {"ok":true}
```

If `/api/health` is not `{"ok":true}`, check `web` (nginx `/api/` proxy)
and `api` logs before touching Caddy:
`docker compose -f docker-compose.yml -f docker-compose.prod.yml logs web api`.

## 4. Admin login in prod

- URL is `https://$SITE_DOMAIN/#/admin` (HashRouter — no server rewrites needed).
- Credentials come from `.env` (`ADMIN_USER` / `ADMIN_PASSWORD`) and are
  seeded into the `brand-data` volume on first `api` start. Changing `.env`
  afterwards does NOT rotate the seeded admin — rotate in the DB or wipe
  the volume (wipes branding/uploads too).
- Sessions are in-memory: restarting the `api` container logs the admin out.
  Fine for a single instance; do not scale `api` past 1 replica without a
  shared session store.
- Always use `https://` for admin — login cookies are `HttpOnly; SameSite=Lax`
  and must not travel over plain HTTP in prod.

## 5. Public URL changes nothing about stream addons

Going live on `https://$SITE_DOMAIN` does NOT add catalog/stream content.
You must still configure stream addons in `/#/admin`:

1. Log in at `https://$SITE_DOMAIN/#/admin`.
2. Add each addon's `manifest.json` URL (POST `/api/addons` validates the
   manifest server-side: must be `http(s)` and contain `id` + `name`).
3. Enable/order them; the web app reads `GET /api/addons` for enabled addons.
4. Torrent-based addons need THEIR OWN streaming server per visitor —
   this repo ships none (see the `Streaming-server reality` comment in
   `docker-compose.prod.yml`). If playback stalls, the addon or its
   streaming server is the fault domain, not Caddy/nginx.
5. Adsterra slots render blank until the codes are approved for
   `SITE_DOMAIN` in the Adsterra dashboard — re-paste the SITE_DOMAIN-approved
   codes in `/admin` after going live.

## Appendix: MySQL in prod (optional)

Default is SQLite (`DB_DRIVER=sqlite`, zero extra services). For MySQL,
set `DB_DRIVER=mysql` + `MYSQL_DSN`/`MYSQL_ROOT_PASSWORD` in `.env` and add
`--profile mysql` to every compose invocation:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile mysql up -d --build
```
