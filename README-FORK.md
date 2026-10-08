# stremio-linux — runbook

Fork of [Stremio/stremio-web](https://github.com/Stremio/stremio-web)
(upstream `development` @ `1eba5a5`), GPL-2.0. Adds: runtime branding CMS,
Linux-desktop chrome, Adsterra slots, `/admin`. Player, core worker, addons
and catalog logic are untouched.

## First boot

```bash
cp .env.example .env   # set ADMIN_PASSWORD, SITE_NAME, SITE_DOMAIN
npm install
npm run build          # static build -> ./build
docker compose up -d --build
```

The API seeds itself on first start (brand defaults + 10 Adsterra slots +
admin user). Open the site, then `/#/admin` to rebrand and paste ad codes.

## Notes

- Admin URL is `/#/admin` (HashRouter — no server rewrites needed).
- Adsterra codes are domain-bound: slots render blank on localhost or any
  domain that is not approved in the Adsterra dashboard. That is expected.
- Uploads (logo/favicon) live in the `brand-data` volume at `/data/uploads`, served at `/brand/*`.
- Sessions are in-memory: restarting the api container logs the admin out. Fine for a single instance.
- MySQL instead of SQLite: set `DB_DRIVER=mysql` in `.env` and start with
  `docker compose --profile mysql up -d`. Same schema, no code changes
  (the api image bakes the `mysql2` driver).
- License: keep `LICENSE.md` and copyright headers intact; keep this fork's
  source available when distributing or hosting it (GPL-2.0).
