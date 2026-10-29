# Admin Ad Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One master "Enable ads" switch + five ad-type toggles (Popunder, Social bar, Native, Banners, Smartlink) in `/#/admin`, a blocker-proof first-party smartlink CTA on Board, and an adblock wall that never fires while ads are off.

**Architecture:** Layered settings over the existing `adslots` table: a new single-row `ads_settings` table holds the master flag; type toggles flip `enabled` on their slot groups via the existing PUT route; BrandingContext gates everything through one kill point (`ads = {}` when master is off); the wall decision moves into a pure `resolveWallMode` gated by `adsEnabled`.

**Tech Stack:** CommonJS throughout. API: node:http + SQLite (`node --test`). Frontend: React providers/components (jest for pure logic only — no RTL in repo), react-i18next + `src/i18n/en.json` for visitor strings, less modules.

**Spec:** `docs/superpowers/specs/2026-10-29-admin-ad-controls-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- Server access: `ssh -p 22 cinemavi1@65.181.116.46` only. **Never touch 157.90.23.43. Never use GitHub SSH secrets.**
- Admin credentials never pasted into chat, commits, or logs; read server-side into shell vars only.
- CommonJS only (`require`/`module.exports`); no new npm dependencies; no test framework additions (components are verified via build + browser, per repo convention).
- Visitor-facing JSX strings via `t()` + one new key in `src/i18n/en.json`; Admin route keeps the inline `STR` map.
- Test commands: `npm test` (jest, src/), `cd api && npm test` (`node --test tests/*.test.js`), `pnpx jest ./tests/i18nScan.test.js`. Lint: `npx eslint src --max-warnings 287` → 0 errors.
- The 10 slot keys are exact and fixed: `popunder, socialbar, native, banner_728x90, banner_468x60, banner_300x250, banner_160x600, banner_160x300, banner_320x50, smartlink`.
- `master` and `enabled` are numeric `0|1` on the wire and in the DB; comparisons are strict (`=== 1`).
- Ad state must end **exactly as found**: master 0, every slot 0 (unless the user explicitly asks to go live).
- Deploy (Task 6 only): local `npm run build` + bundle upload + `SKIP_WEB_BUILD=1 bash ~/deploy-shared-host.sh`; end state local = GitHub = server, dirty 0, unpushed 0.

## Review Focus

1. **Strict numeric coercion** — `master`/`enabled` compared with `=== 1`; a truthy string would silently enable everything. Pinned by api test `master toggle round-trips and stays numeric` (Task 2) asserting `typeof body.master === 'number'`.
2. **Type toggles must not persist dirty textarea edits** — snapshot ref semantics. Pinned by browser step `type toggle preserves unsaved advanced edit` (Task 6).
3. **Boot `Promise.all` partial failure** — a dead `/api/adslots` must not skip the brand apply (guard: `const { master = 0, slots = [] } = adPayload || {}`). Pinned by the branch-review step (Task 6) plus the browser console check.
4. **Wall grace flow with master ON** — authed+fresh firstSeen → `notice`, authed+stale → `wall`, unauth → `wall`. Pinned by jest matrix `resolveWallMode delegation` (Task 3).
5. **i18n/lint regressions from new JSX** — raw strings in SmartlinkCTA/Board/Admin. Pinned by `scan-translations` + eslint steps in Tasks 4 and 5.

---

### Task 1: `adTypes` pure module

**Files:**
- Create: `src/branding/adTypes.js`
- Test: `src/branding/__tests__/adTypes.test.js`

**Interfaces:**
- Produces (consumed by Tasks 2 and 5):
  - `AD_TYPES` — `Array<{ key: string, slots: string[] }>` — exactly 5 entries in order: `popunder`, `socialbar`, `native`, `banners` (6 banner slots), `smartlink`.
  - `typeActive(slots, typeKey) -> boolean` — true iff ANY slot in the group has `enabled === 1`.
  - `togglePlan(slots, typeKey) -> { [slot_key]: 0|1 }` — whole group set to `!typeActive`.
  - Input contract (module-header comment): `slots` is the array shape from `GET /api/adslots` (numeric `enabled`), *not* BrandingContext's boolean ads map.

- [ ] **Step 1: Write the failing tests**

`src/branding/__tests__/adTypes.test.js` — jest, `const { AD_TYPES, typeActive, togglePlan } = require('../adTypes');`. Four tests:

1. `covers every slot exactly once` — flatten all `AD_TYPES[*].slots`, sort, deep-equal the sorted 10-key list from Global Constraints; also assert `AD_TYPES.map(t => t.key)` deep-equals `['popunder','socialbar','native','banners','smartlink']`.
2. `typeActive: none/one/all` — group state builder `mk = (enabledVals) => keys.map((k,i) => ({slot_key: k, enabled: enabledVals[i]}))`; for `banners`: all 0 → false; first slot 1, rest 0 → true; all 1 → true.
3. `togglePlan: off → all 1` — all-0 banners → every value `1`.
4. `togglePlan: on → all 0 and mixed normalizes to all 0` — all-1 → all 0; mixed `[1,1,0,0,0,0]` → all 0.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/branding/__tests__/adTypes.test.js`
Expected: FAIL — module `../adTypes` not found.

- [ ] **Step 3: Implement `src/branding/adTypes.js`**

Copyright header (`// Copyright (C) 2026 stremio-linux fork. GPL-2.0.`), input-contract comment, `AD_TYPES` (5 entries, exact keys/slots above), `typeActive`, `togglePlan`, `module.exports = { AD_TYPES, typeActive, togglePlan };`. Body is fully determined by the tests; `togglePlan` computes `const active = typeActive(slots, typeKey); return Object.fromEntries(group.slots.map(k => [k, active ? 0 : 1]))`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/branding/__tests__/adTypes.test.js`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/branding/adTypes.js src/branding/__tests__/adTypes.test.js
git commit -m "feat(ads): pure AD_TYPES map with typeActive/togglePlan"
```

---

### Task 2: API — `ads_settings` table, master in adslots routes

**Files:**
- Modify: `api/schema.sql` (append)
- Modify: `api/seed.js` `seedDefaults()` (after the slots loop)
- Modify: `api/server.js:300-319` (GET + PUT `/api/adslots`)
- Test: `api/tests/server.test.js`

**Interfaces:**
- Consumes: `AD_TYPES` from Task 1 (test-only, via `require('../../src/branding/adTypes')` — pure CJS, node-safe).
- Produces (consumed by Tasks 3 and 5):
  - `GET /api/adslots` → `{ master: 0|1, slots: [{slot_key, enabled, code}, ...] }` (public).
  - `PUT /api/adslots` `{master: 0|1}` → admin-only → `{ master }`; anything else → existing slot path, unchanged.

- [ ] **Step 1: Write the failing tests**

In `api/tests/server.test.js`:

1. Update existing `'health + public branding + adslots'`: replace `assert.equal(slots.length, 10)` with `const body = ...; assert.equal(body.master, 0); assert.equal(body.slots.length, 10);`.
2. New test `'ad slots master toggle requires auth'` — `PUT {master:1}` without cookie → 401.
3. New test `'master toggle round-trips and stays numeric'` — login (existing cookie pattern at lines 61-64), `PUT {master:1}` with cookie → 200, `body.master === 1 && typeof body.master === 'number'`; `GET` → `master === 1`; `PUT {master:0}` → GET back to `0`.
4. New test `'adTypes map matches the seeded slot keys'` — `const { SLOT_KEYS } = require('../seed');` and `const { AD_TYPES } = require('../../src/branding/adTypes');` → `AD_TYPES.flatMap(t => t.slots).sort()` deep-equals `[...SLOT_KEYS].sort()`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && npm test`
Expected: existing shape test FAIL (`body.master` undefined) and new tests FAIL (master not persisted / cross-check module missing if Task 1 not merged — it is).

- [ ] **Step 3: Implement**

1. `api/schema.sql` — append:
   ```sql
   CREATE TABLE IF NOT EXISTS ads_settings (
       id INTEGER PRIMARY KEY,
       master_enabled INTEGER NOT NULL DEFAULT 0
   );
   ```
2. `api/seed.js` `seedDefaults()` — after the slots loop, SELECT id from `ads_settings` WHERE id = 1; INSERT `(1, 0)` if missing (same idempotent pattern as branding).
3. `api/server.js` GET handler — query `SELECT master_enabled FROM ads_settings WHERE id = 1`, respond `send(response, 200, { master: (row && row.master_enabled) || 0, slots: rows })`.
4. `api/server.js` PUT handler — after the existing `authed` 401 check, dispatch: if `Object.prototype.hasOwnProperty.call(body, 'master')` → `const master = body.master ? 1 : 0; await db.query('UPDATE ads_settings SET master_enabled = ? WHERE id = 1', [master]); return send(response, 200, { master });` — else the existing slot path, untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && npm test`
Expected: all tests PASS (existing suite grew by 3).

- [ ] **Step 5: Commit**

```bash
git add api/schema.sql api/seed.js api/server.js api/tests/server.test.js
git commit -m "feat(api): ads_settings master flag in GET/PUT /api/adslots"
```

---

### Task 3: Frontend master gate + wall fix

**Files:**
- Modify: `src/branding/adblockLogic.js` (add `resolveWallMode`, export it)
- Test: `src/branding/__tests__/adblockWall.test.js` (extend)
- Modify: `src/branding/BrandingContext.js` (boot Promise.all handler + `applyAdblockVerdict`)

**Interfaces:**
- Consumes: new `GET /api/adslots` shape (Task 2).
- Produces: `resolveWallMode({ adsEnabled, detected, actionable, transportOk, authed, firstSeen, now }) -> 'none'|'notice'|'wall'` — pure; `!adsEnabled` short-circuits to `'none'`; `!transportOk` → `'wall'`; otherwise delegates to the existing `resolveAdblockMode({detected: true, authed, firstSeen, now})` (unchanged, its 6 tests stand). BrandingContext exports unchanged (context value `ads` now `{}` when master ≠ 1).

- [ ] **Step 1: Write the failing tests (pure logic)**

Extend `src/branding/__tests__/adblockWall.test.js` with a `describe('resolveWallMode')`:

1. `ads off never walls, regardless of every other input` — for each combo of `detected` (true), `actionable` (true), `transportOk` (true/false), `authed` (true/false) → `resolveWallMode({adsEnabled: false, ...}) === 'none'` (8 asserts).
2. `ads on, transport missing → wall` — `{adsEnabled: true, detected: true, actionable: true, transportOk: false, authed: false, firstSeen: Date.now(), now: Date.now()}` → `'wall'`.
3. `ads on, non-actionable detection → none` — `actionable: false, transportOk: true` → `'none'`.
4. `delegation: authed + fresh grace → notice; authed + stale grace → wall; unauth → wall` — `adsEnabled: true, transportOk: true`, `firstSeen: now - 60_000, now` + `authed: true` → `'notice'`; `firstSeen: now - GRACE_MS - 1` + `authed: true` → `'wall'`; `authed: false` → `'wall'` (import `GRACE_MS` already exported).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/branding/__tests__/adblockWall.test.js`
Expected: FAIL — `resolveWallMode` not a function.

- [ ] **Step 3: Implement `resolveWallMode` in `src/branding/adblockLogic.js`**

Add the function exactly as specced (§5 of the design doc) and export it. Then re-run: PASS.

- [ ] **Step 4: Run pure tests + wire BrandingContext**

Run: `npx jest src/branding/__tests__/adblockWall.test.js` → PASS, then wire the provider (no jest for providers — browser evidence in Task 6):

1. `const adMasterRef = React.useRef(0);` near the other refs, with a comment on the pre-fetch race.
2. Boot handler: change `.then(([brand, slots]) => {` to `.then(([brand, adPayload]) => {` and add `const { master = 0, slots = [] } = adPayload || {};` before the ads loop; after building `ads`: `adMasterRef.current = master;` and `const ads = master === 1 ? built : {};` (rename the loop output `built`).
3. Both verdict paths (boot inline `detectAdblock().then` block and `applyAdblockVerdict`): read `const adsEnabled = adMasterRef.current === 1;` at the top; move `writeFirstSeen` behind `if (adsEnabled)`; replace every direct `setAdblockMode('wall' | resolveAdblockMode(...))` with `setAdblockMode(resolveWallMode({ adsEnabled, detected: true, actionable: true, transportOk, authed, firstSeen: readFirstSeen(), now: Date.now() }))` (`transportOk: false, authed: false` in the transport-missing and `.catch` branches; `transportOk: true, authed` in the success branch).

- [ ] **Step 5: Full frontend suite + lint + commit**

Run: `npm test && npx eslint src --max-warnings 287`
Expected: jest 165+ PASS (161 existing + 4+ new), eslint exit 0.

```bash
git add src/branding/adblockLogic.js src/branding/BrandingContext.js src/branding/__tests__/adblockWall.test.js
git commit -m "feat(ads): master gate in BrandingContext + resolveWallMode wall fix"
```

---

### Task 4: Smartlink CTA component + Board placement

**Files:**
- Create: `src/components/SmartlinkCTA/SmartlinkCTA.js`
- Create: `src/components/SmartlinkCTA/styles.less`
- Modify: `src/i18n/en.json` (append one key before closing brace)
- Modify: `src/routes/Board/Board.js` (import + render)
- Test: `src/branding/__tests__/adInjector.test.js` (new — getSmartlink is currently untested)

**Interfaces:**
- Consumes: `useBranding()` (`{ ads }`), `getSmartlink(ads)` from `src/branding/adInjector.js` (returns trimmed `https://` URL or `null`).
- Produces: `<SmartlinkCTA />` — self-gating component (renders `null` without a valid enabled smartlink); en.json key `SMARTLINK_CTA` (`"Support us"`).

- [ ] **Step 1: Write the failing getSmartlink tests**

`src/branding/__tests__/adInjector.test.js` — `const { getSmartlink } = require('../adInjector');` (pure function, no DOM):

1. `enabled + https code → trimmed url`
2. `disabled → null`
3. `http:// (non-https) → null`
4. `missing slot / empty code → null`
5. `code with surrounding whitespace → trimmed url returned`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/branding/__tests__/adInjector.test.js`
Expected: PASS already (getSmartlink exists) — this is a regression pin, not new logic; if any case fails, the existing function deviates from the spec: stop and reconcile before building the CTA on it.

- [ ] **Step 3: Implement SmartlinkCTA**

`SmartlinkCTA.js`: GPL header; `require('react')`, `{ useTranslation } = require('react-i18next')`, `{ useBranding } = require('../../branding/BrandingContext')`, `getSmartlink`, `PropTypes`, `styles = require('./styles.less')`. Body: `const url = getSmartlink(ads); if (!url) return null;` → `<a className={styles['smartlink-cta']} href={url} target={'_blank'} rel={'sponsored noopener noreferrer'}>{t('SMARTLINK_CTA')}</a>`. `styles.less`: one centered, compact row style (padding + accent-colored border, ≤15 lines). `en.json`: `"SMARTLINK_CTA": "Support us"` appended after the NEWSLETTER keys (tab-indented, comma preserved).

- [ ] **Step 4: Place on Board + suites**

`Board.js`: require SmartlinkCTA next to the AdSlot require; render `<SmartlinkCTA />` inside `.board-content`, directly after the catalog-rows `.map(...)` closing `}` and before the `</div>` that ends `.board-content`.

Run: `npm test && npx eslint src --max-warnings 287 && pnpx jest ./tests/i18nScan.test.js`
Expected: all PASS, 0 eslint errors, i18nScan "No hardcoded strings".

- [ ] **Step 5: Commit**

```bash
git add src/components/SmartlinkCTA src/i18n/en.json src/routes/Board/Board.js src/branding/__tests__/adInjector.test.js
git commit -m "feat(ads): first-party smartlink CTA on Board"
```

---

### Task 5: Admin Ads tab rewrite

**Files:**
- Modify: `src/routes/Admin/Admin.js` (STR additions + `AdsForm` rewrite)

**Interfaces:**
- Consumes: `AD_TYPES`/`typeActive`/`togglePlan` (Task 1); `GET /api/adslots` → `{master, slots}` + `PUT {master}` (Task 2); existing `api()` helper (same-origin fetch, throws on non-OK).
- Produces: none (leaf UI).

- [ ] **Step 1: Add STR keys**

Extend the inline `STR` map: `enableAds: 'Enable ads'`, `adsTypes: 'Ad types'`, `typePopunder: 'Popunder'`, `typeSocialbar: 'Social bar'`, `typeNative: 'Native'`, `typeBanners: 'Banners'`, `typeSmartlink: 'Smartlink'`, `advanced: 'Advanced (ad code)'`, `adsSavedReload: 'Saved. Reload the site to see changes.'`, `adsFailedLoad: 'Failed to load ad settings'`, `adsSaveFailed: 'Save failed (session expired? log in again).'`.

- [ ] **Step 2: Rewrite `AdsForm`**

State: `cfg` (`null` until `GET /api/adslots` resolves; `{master, slots}`), `status`; plus `snapshot = React.useRef([])` — the last-GET slots (codes for toggles). Render, in order:

1. `<h2>{STR.ads}</h2>`
2. Master row: `<label><input type={'checkbox'} checked={cfg.master === 1} onChange={...} />{STR.enableAds}</label>` — change → `api('/api/adslots', {method:'PUT', body: JSON.stringify({ master: e.target.checked ? 1 : 0 })})` → update `cfg.master`, status `STR.adsSavedReload`; catch → `STR.adsSaveFailed` + re-GET resync.
3. `<h3>{STR.adsTypes}</h3>` then `AD_TYPES.map`: label from a `TYPE_LABELS` const keyed by type key → STR values; checkbox `checked={typeActive(cfg.slots, key)}`; change → `const plan = togglePlan(cfg.slots, key);` `Promise.all(Object.keys(plan).map(k => api('/api/adslots', {method:'PUT', body: JSON.stringify({ slot_key: k, enabled: plan[k], code: (snapshot.current.find(s => s.slot_key === k) || {}).code || '' })})))` → update `cfg.slots` for the group per `plan` + status `STR.adsSavedReload`; on **any** failure → re-GET `/api/adslots`, rebuild `cfg` and `snapshot`, status `STR.adsSaveFailed`.
4. `<details><summary>{STR.advanced}</summary>` containing the current per-slot textarea block unchanged (checkbox + textarea + per-slot save button), operating on `cfg.slots` as today.
5. Status div as today.

- [ ] **Step 3: Suites + commit**

Run: `npm test && npx eslint src --max-warnings 287`
Expected: all PASS, 0 errors (Admin strings live in the STR map, which i18nScan does not flag).

```bash
git add src/routes/Admin/Admin.js
git commit -m "feat(admin): ad master switch + type toggles, code editing under Advanced"
```

---

### Task 6: Verification, review gate, deploy, live evidence

**Files:** none created; bundle + deploy only.

**Interfaces:**
- Consumes: Tasks 1-5; established deploy flow (local build, `SKIP_WEB_BUILD=1`, shim `~/deploy-shared-host.sh`).

- [ ] **Step 1: Full local suite**

Run: `npm test && npx eslint src --max-warnings 287 && cd api && npm test && cd .. && bash -n scripts/deploy-shared-host.sh`
Expected: jest PASS (all), eslint 0 errors, api `node --test` PASS, `bash -n` silent.

- [ ] **Step 2: Branch review gate (fresh reviewer)**

Dispatch a subagent to review `git diff main...HEAD` (or the full changeset vs the last deploy SHA) against the spec — focus: the Review Focus list above, especially items 1-3. Fix findings, re-run suites.

- [ ] **Step 3: Build + deploy**

`npm run build` → upload `build/` (tar over ssh, established one-liner) → `SKIP_WEB_BUILD=1 bash` the deploy **on the server via ssh** (the shim) → confirm output `player=` SHA equals local `git rev-parse HEAD`; three-way sync check (local = GitHub = server, dirty 0, unpushed 0).

- [ ] **Step 4: Live API evidence**

`curl -s https://cinemavilla.cc/api/adslots | python3 -m json.tool | head` → `{master: 0, slots: [10 × {slot_key, enabled, code}]}`.

- [ ] **Step 5: Browser evidence (chrome-devtools MCP, admin login via UI)**

1. `/#/admin` → Ads tab shows master switch (off), 5 type rows (all off), collapsed Advanced with the 10 saved codes intact.
2. `type toggle preserves unsaved advanced edit` (Review Focus #2): open Advanced, type junk into the popunder textarea (do NOT save), flip the Popunder type ON, reload → code in DB/Advanced must be the **original** (toggle used the snapshot), junk gone.
3. Master ON + Popunder ON → reload home → `document.querySelectorAll('script[data-adslot="popunder"]').length === 1` in `<head>`; `performance.getEntriesByType('navigation').length` unchanged (no extra reload).
4. Smartlink ON (valid stored URL) → Board shows the CTA anchor; `href` matches the stored URL; click not required. OFF → anchor gone.
5. Console: zero errors on Board + admin.
6. **Restore**: Popunder OFF, Smartlink OFF, master OFF → reload → no `data-adslot` scripts, CTA absent. DB back to exactly as found.

- [ ] **Step 6: Cleanup + closeout**

Remove any test rows made (none expected — no accounts/emails created by this feature); confirm `git status` clean, three-way SHA match; mark the brainstorm checklist file complete; report with evidence paths (test counts, curl output, screenshots/snapshot excerpts).

```bash
# no code changes expected in this task; deploy commits only if the reviewer
# gate produced fixes (then re-run Steps 1-5)
```
