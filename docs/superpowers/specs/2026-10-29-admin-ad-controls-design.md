# Design — Admin ad controls: master switch + type picker + smartlink CTA

- Date: 2026-10-29
- Status: approved (user: "complete it"; approach A, keep smartlink)
- Repo: stremio-linux (CinemaVilla / LinuxStream), live at https://cinemavilla.cc

## Goal

Let the operator enable/disable all advertising from one clear place in
`/#/admin`: a **master "Enable ads" switch** plus **five type toggles**
(Popunder, Social bar, Native, Banners, Smartlink) — no raw HTML editing
required — and wire the `smartlink` slot (Adsterra direct link) to a real,
blocker-resistant first-party CTA on the home Board. Fix the adblock wall so
it never appears while ads are off.

## Non-goals (deferred, per "quickest")

- First-party ad-script proxy (Approach B: serving Adsterra scripts from
  cinemavilla.cc to evade domain blocklists). Future spec.
- Wiring the 4 dead banner sizes (300x250, 160x600, 160x300, 320x50) to
  placements. They stay editable under Advanced; the Banners type works via
  its 3 live placements (728x90 Board, 468x60 MetaDetails, native Discover).
- Live ad toggling without a page reload (injected scripts cannot cleanly
  un-inject mid-session; the panel keeps the existing "Reload the site to
  see changes" rule).
- In-Page Push / Interstitial formats (Adsterra offers them; no slots exist).

## Background (verified current state)

- `api/schema.sql` defines `adslots(slot_key, enabled, code)`; `api/seed.js`
  seeds 10 Adsterra slots (SLOT_KEYS + DEFAULT_CODES), all `enabled=0`.
  `seedDefaults()` runs at API boot (`api/server.js:984`) → schema changes
  apply on the next pm2 restart; no manual migration needed.
- `GET /api/adslots` returns the raw array; `PUT /api/adslots` (admin cookie)
  updates one slot (requires `slot_key` + `code` string ≤ 20000).
- Frontend (`src/branding/BrandingContext.js`) fetches branding + adslots at
  boot, builds `ads[slot_key] = {enabled, code}`, calls
  `injectSiteScripts(ads)` (popunder + socialbar only), and stores `ads` in
  context. `AdSlot` components render `native` (Discover), `banner_728x90`
  (Board), `banner_468x60` (MetaDetails); `active = ready && entry &&
  entry.enabled && code` — a missing entry renders nothing.
- `getSmartlink(ads)` (src/branding/adInjector.js) returns the smartlink URL
  when the slot is enabled and `https://`-shaped — but has **zero consumers**.
- Adblock wall (`src/branding/adblockLogic.js` + `AdblockWall`) fires for
  blocker users **regardless of whether any ads are enabled** — a live bug
  (every slot is off, yet adblock users get a full-screen "disable your ad
  blocker" wall). Two verdict paths exist: inline at boot and
  `applyAdblockVerdict` (live re-checks via `watchAdblock`).
- Admin `AdsForm` (src/routes/Admin/Admin.js): per-slot checkbox + code
  textarea + save. English-only inline `STR` map is the repo pattern for this
  route; visitor-facing components use `react-i18next` `t()` + `src/i18n/en.json`
  (enforced by `tests/i18nScan.test.js`, which flags raw JSX text/literals but
  skips `t(...)` calls).
- API tests: `node --test api/tests/*.test.js` (real sqlite in tmpdir +
  `startServer`, cookie from login `set-cookie`). Jest runs the frontend suite
  (incl. `src/branding/__tests__/*` pure-logic tests).

## Design

### 1. Data — `ads_settings` table

`api/schema.sql`, appended in the existing portable style:

```sql
CREATE TABLE IF NOT EXISTS ads_settings (
    id INTEGER PRIMARY KEY,
    master_enabled INTEGER NOT NULL DEFAULT 0
);
```

`api/seed.js` `seedDefaults()`: after the slots loop, SELECT id=1 from
ads_settings; if missing, INSERT (1, 0) — same idempotent pattern as
branding/admins. Ads ship **off** (matches today's all-slots-off reality →
zero behavior change on deploy). `seedDefaults` runs at API boot, so the
table + row appear on the next deploy restart.

### 2. API — extend the two existing routes (no new routes)

- `GET /api/adslots` → `{ master: 0|1, slots: [{slot_key, enabled, code}, ...] }`.
  `master` = `ads_settings.master_enabled` of row id=1, defensive `|| 0` if the
  row is absent.
- `PUT /api/adslots` body dispatch:
  - `master` present → admin-only (existing `authed` check → 401) →
    `const master = body.master ? 1 : 0` → `UPDATE ads_settings SET
    master_enabled = ? WHERE id = 1` → respond `{ master }`.
  - otherwise → existing slot path unchanged (`slot_key` ∈ SLOT_KEYS, `code`
    string ≤ 20000, `enabled` 0/1).

Both consumers of the response shape (BrandingContext, Admin.js) live in this
repo and change in the same deploy.

### 3. Type system — new pure module `src/branding/adTypes.js`

CommonJS, zero imports (browser + node + jest requirable):

```js
const AD_TYPES = [
    { key: 'popunder',  slots: ['popunder'] },
    { key: 'socialbar', slots: ['socialbar'] },
    { key: 'native',    slots: ['native'] },
    { key: 'banners',   slots: ['banner_728x90', 'banner_468x60', 'banner_300x250',
                                'banner_160x600', 'banner_160x300', 'banner_320x50'] },
    { key: 'smartlink', slots: ['smartlink'] },
];

function typeActive(slots, typeKey)   // true iff ANY slot of the group has enabled === 1
function togglePlan(slots, typeKey)   // { slot_key: 0|1 } for the whole group = all !typeActive
```

Semantics: a type reads "on" when at least one of its slots is enabled;
toggling sets **every** slot in the group to the same fresh value (mixed
states are normalized by the first click). Union of all group slots must
equal the 10 SLOT_KEYS exactly — guarded by tests (drift here = a toggle that
lies).

### 4. Frontend gating — one kill point in BrandingContext

In the boot `Promise.all` handler:

- Destructure `{ master, slots }` from `/api/adslots`.
- Build the per-slot `ads` map as today, then:
  `const ads = master === 1 ? built : {}`.
  This single gate switches off, at once: `injectSiteScripts` (no-op on `{}`),
  every `AdSlot` (missing entry → null), and the smartlink CTA (see §6).
- `adMasterRef.current = master` — a ref (not state) so both adblock verdict
  paths read the current value without re-running effects.

Fetch failure keeps today's fail-safe: `ads` stays `{}` → ads off, wall off.

### 5. Adblock wall fix — pure `resolveWallMode`

New pure function in `src/branding/adblockLogic.js` (existing
`resolveAdblockMode` stays untouched so its 4 tests stand):

```js
function resolveWallMode({ adsEnabled, detected, actionable, transportOk, authed, firstSeen, now }) {
    if (!adsEnabled) return 'none';            // ← the bug fix: no ads, no wall
    if (!detected || !actionable) return 'none';
    if (!transportOk) return 'wall';           // cannot determine auth → wall (as today)
    return resolveAdblockMode({ detected: true, authed, firstSeen, now });
}
```

Both verdict paths (boot inline block and `applyAdblockVerdict`) are
rewritten to funnel their existing branches through `resolveWallMode` with
`adsEnabled: adMasterRef.current === 1`:

- boot: `detected` early-return, `isActionableKind(getAdblockKind())`,
  transport-missing branch (`transportOk: false`), `getState('ctx')`
  success (`transportOk: true, authed`), `.catch` (`transportOk: false`);
- live: same shape, as today.

Result: master off ⇒ `'none'` for every visitor in every branch; master on ⇒
behavior identical to today.

### 6. Smartlink CTA — new component + Board placement

`src/components/SmartlinkCTA/SmartlinkCTA.js` (+ own `styles.css` module,
PropTypes, GPL header — component conventions):

```jsx
const url = getSmartlink(ads);          // enabled + https-shaped, else null
if (!url) return null;
<a className={...} href={url} target={'_blank'} rel={'sponsored noopener noreferrer'}>
    {t('SMARTLINK_CTA')}
</a>
```

- Reads `useBranding().ads`; with master off, `ads = {}` → renders nothing.
- Visitor-facing string via `useTranslation()` + one new key in
  `src/i18n/en.json`: `"SMARTLINK_CTA": "Support us"` (label lives in the
  locale file — changeable without a code change; i18nScan satisfied).
- Placement: `src/routes/Board/Board.js`, inside `.board-content` directly
  after the catalog-rows loop, before the closing `</div>` — a compact,
  bottom-of-page row; one placement for now.
- `rel` includes `sponsored` per ad-disclosure norms; first-party anchor
  cannot be domain-blocked the way third-party scripts can — this is the
  blocker-proof revenue piece.

### 7. Admin UI — AdsForm rewrite (`src/routes/Admin/Admin.js`)

State: `cfg = { master, slots }` from `GET /api/adslots` (null while loading).

- **Master row**: `<label>` checkbox bound to `cfg.master === 1`; change →
  `PUT {master: n}` → update state; status `STR.adsSavedReload`.
- **Type rows** (iterate `AD_TYPES`): label per type (new STR entries:
  `typePopunder: 'Popunder'`, `typeSocialbar: 'Social bar'`,
  `typeNative: 'Native'`, `typeBanners: 'Banners'`,
  `typeSmartlink: 'Smartlink'`), checkbox from `typeActive(cfg.slots, key)`;
  change → for each slot in the group, `PUT {slot_key, enabled: target,
  code}` (existing slot payload from state; `Promise.all`), update state,
  status reload note.
- **Advanced** (`<details><summary>{STR.advanced}</summary>`): the current
  per-slot textarea + per-slot save, unchanged, all 10 slots — the ad-network
  code escape hatch.
- New STR keys: `enableAds: 'Enable ads'`, `adsTypes: 'Ad types'`,
  `advanced: 'Advanced (ad code)'`, `adsSavedReload: 'Saved. Reload the site
  to see changes.'`, `adsFailedLoad: 'Failed to load ad settings'`,
  `adsSaveFailed: 'Save failed (session expired? log in again).'`, plus the 5
  type labels above.
- The master checkbox gates nothing client-side beyond the API call — the
  server + BrandingContext own the truth (no UI-only illusion).

## Tests

Jest (frontend, pure logic):

- `src/branding/__tests__/adTypes.test.js`:
  - union of AD_TYPES slots === the 10 expected slot keys, no duplicates;
  - `typeActive`: none-off → false; one-of-group on → true; all on → true;
  - `togglePlan`: off→all-1, on→all-0, mixed (2 banners on)→all-0
    (normalization).
- `src/branding/__tests__/adblockWall.test.js` (extend): `resolveWallMode`
  — `adsEnabled:false` → `'none'` for every combination of the other fields
  (regression for the wall-with-no-ads bug); `adsEnabled:true, transportOk:false`
  → `'wall'`; `adsEnabled:true, actionable:false` → `'none'`; success path
  delegates to `resolveAdblockMode` (notice vs wall by auth/grace).
- `src/branding/__tests__/adblockWall.test.js` or new: `getSmartlink` cases
  if not already covered (enabled+https → url; disabled → null; http:// →
  null).

API (`node --test api/tests/server.test.js`):

- Update existing `slots.length === 10` assertion to the new shape
  (`body.master === 0`, `body.slots.length === 10`).
- New test: unauthenticated `PUT {master:1}` → 401; login → `PUT {master:1}`
  → 200 `{master:1}`; subsequent GET reflects `master:1`; `PUT {master:0}`
  restores 0.
- New cross-check test: require `../../src/branding/adTypes` (pure CJS — safe
  in node) and assert `union(AD_TYPES.slots)` deep-equals `SLOT_KEYS` from
  `../seed` — guards drift between the type map and the DB slot list on the
  API side too.

Repo checks (existing suites, all must stay green): `npm test` (jest),
`npx eslint src` (0 errors), `node --test api/tests/*.test.js`,
`bash -n scripts/deploy-shared-host.sh`.

## Verification (post-deploy evidence)

1. Deploy via `SKIP_WEB_BUILD=1 bash ~/deploy-shared-host.sh` after local
   `npm run build` + bundle upload (established flow); confirm `player=` SHA
   matches local/GitHub (three-way sync, dirty 0, unpushed 0).
2. API: `curl /api/adslots` → `{master: 0, slots: [...]}` on the live domain.
3. Browser (chrome-devtools MCP) with admin login:
   - `/#/admin` → Ads tab shows master switch, 5 type rows, collapsed
     Advanced with the existing textareas + saved codes intact.
   - Flip master ON + Popunder ON → reload site → `script[data-adslot="popunder"]`
     present in `<head>`; flip back OFF → absent after reload; DB restored to
     master=0 (site must not be left running unintended ads).
   - Smartlink: temporarily enable + valid URL already stored
     (`https://directyp.org/...`) → Board renders the CTA anchor with correct
     `href`; disable again → CTA gone. (Leave state exactly as the user had
     it: all off, master off, unless the user asks to go live.)
   - Console: no JS errors on Board/admin.
4. Adblock wall: real-blocker behavior cannot be simulated in the MCP browser;
   covered by the `resolveWallMode` unit matrix + both call paths passing
   `adsEnabled` (code-reviewed in the spec review + plan review steps).

## Risks & mitigations

- **Response-shape break** of `GET /api/adslots`: both consumers ship in the
  same commit/deploy; nothing else calls it (grep-verified: BrandingContext +
  Admin.js only).
- **Schema on live DB**: `CREATE TABLE IF NOT EXISTS` via `seedDefaults` at
  boot — idempotent, additive, no data touched. Rollback = redeploy previous
  SHA; table is ignored by old code.
- **Type toggle spams N PUTs** (banners = 6): sequential-enough
  (`Promise.all`), admin-only, no rate limit on this route today; acceptable.
- **Wall never re-evaluates master mid-session**: `adMasterRef` updates only
  on boot fetch — consistent with the "reload to see changes" rule.
- **Adsterra code preservation**: type toggles PUT the existing `code` from
  state verbatim; no code is generated or altered by the panel.

## Out-of-scope follow-ups (recorded, not built)

1. First-party script proxy (`/brand/ad/<slot>.js`) for domain-blocklist
   evasion — the "Approach B" spec.
2. Placements for the 4 dormant banner sizes.
3. Extra CTA placements (MetaDetails) if Board CTA data justifies it.
4. In-Page Push / Interstitial slots if the operator wants more formats.
