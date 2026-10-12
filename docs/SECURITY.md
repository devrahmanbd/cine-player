# SECURITY — network exposure, secrets, log hygiene

## Bind expectations

- Prod: `Caddy :80/:443` → `web` (nginx, internal `:80` only) → `api`
  (`expose: 3001`, no published ports). See `docker-compose.prod.yml`.
- Dev only: `native-web.js :8080` (static + `/api` → `127.0.0.1:3001`,
  media → `127.0.0.1:11470`) and `api :3001` both `listen()` without a
  host, i.e. all interfaces (`*`). Never expose these raw (below).
- `:3001`/`:11470` on `*` is a known gap being fixed separately (bind to
  `127.0.0.1`); this doc covers mitigation until then.

## Firewall: close everything but 80/443

```bash
# ufw
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow 80,443/tcp && sudo ufw allow 22/tcp && sudo ufw enable

# iptables (equivalent)
sudo iptables -P INPUT DROP && sudo iptables -A INPUT -m conntrack \
  --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
```

Verify: `ss -tlnp` should show only `:80`/`:443` (plus `:22`) public;
`:3001`, `:8080`, `:11470` must be `127.0.0.1` or firewalled.

## IP masking (Cloudflare orange-cloud)

1. DNS `A` record `domain → VPS IP`, then toggle proxy **ON** (orange cloud).
2. SSL mode `Full (strict)`; origin stays Caddy with Let's Encrypt.
3. Firewall the VPS to Cloudflare ranges only for `80/443`
   (`https://www.cloudflare.com/ips/`), keeping SSH allowlisted to your IP.

## Why :8080 must never be public raw

`native-web.js` is a dev stand-in: plain HTTP (no TLS), no security
headers, `*` bind, and it proxies `/api/` + `/streaming/` with upstream
headers passed through. Public exposure leaks origin IP, serves over
cleartext, and bypasses the Caddy/nginx hardening. Use only via
`127.0.0.1` (SSH tunnel) or behind Caddy.

## Secrets

- `.env` is git-ignored (`.gitignore`: `.env`, `.env.*` except
  `.env.example` / `.env.prod.example` — verified). Never commit `.env`.
- Copy `.env.prod.example` → `.env` on the VPS; generate with
  `openssl rand -base64 24`. Deploy script refuses placeholders.
- Rotate on suspected leak: new `ADMIN_PASSWORD`, `MYSQL_ROOT_PASSWORD`,
  restart (`docker compose up -d`), old sessions expire (admin 12h).

## Log hygiene

- `api/server.js` logs only `otp mail failed <message>` and
  `api error <message>` (5xx path, server-side). Grepped `console.*`:
  no tokens, passwords, hashes, or cookies are logged.
- Keep it that way: never `console.log(body)`, tokens, `password_hash`,
  or `Set-Cookie` values. Client 5xx is always generic
  `{ error: 'server error' }` (see `api/server.js` catch block).
