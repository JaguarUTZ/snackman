# Snackman: bugs, TODOs, caveats

Found while assembling this repo (2026-10-07). File paths are repo paths. "live" means `howard-woods-games@live 363f51e`.

## Bugs (present in live)

1. **LV3 / Master never start if the level gate script is missing** (`game/cart/levels.js:57`).
   `startLevel` does `if(i>=2) return window.HWLevelGate && HWLevelGate.enter(...)`. If `/hub/level-gate.js` fails to load
   (blocked, 404, offline), the expression short-circuits to `undefined` and `hwStartLevel` is never called. Suggested fix:
   `if(i>=2 && window.HWLevelGate) return HWLevelGate.enter(...); return hwStartLevel(i,keepScore)`.
   The standalone `shared/hub/level-gate.js` shim covers this locally.
2. **Levels never open if `HWSave` is missing** (`game/cart/levels.html:97`, `title.html:31`): `HWSave.load('snackman').then(...)`
   runs without a guard, so a failed `/hub/save.js` load leaves a blank cartridge. Suggested fix: `(window.HWSave ? HWSave.load('snackman') : Promise.resolve(null))`.
3. **`bid-game.js` points at an API that doesn't exist on this deployment.** `fetchTotal()` calls `/api/pps-bid-total`, which exists only on
   forkashi-progress (rewritten to `/api/pps-bid`). It's harmless today because no Snackman page calls `poll()`/`fetchTotal()` (dead code), but it would
   404 on play.jaguarutz.com if it were used.
4. **Level-gate dialog links to `/`** ("GAME SHELF"). That's fine on the hub, but it breaks if the game is hosted under a subpath.
5. `index.html` and the cart pages put `<script src="/hub/observe.js">` before `<meta charset>`. It works, but the charset should come first.

## Divergence / housekeeping

6. **The `players` / `snackman-fixes` branch is unmerged.** It has mid-level resume (`snapState`), a 3-hit fail rule, WATCH mode earning 0 sats,
   save every 4 items, and a larger bonus3d.js (38 144 B vs 34 611 B). Live descends from `snackman-ux` instead. TODO: decide whether to merge.
   The verbatim files are in `variants/players-snackman-fixes/` (diff against `game/`). Merge carefully: players lacks live's `HWLevelGate` call and
   observe/visit tags.
7. **`main` is stale.** It still carries the pre-UX Snackman (levels.js 24 389 B). Production deploys from `live`, so anyone reading `main` sees old code.
8. **Duplicate audio:** `cart/a/snackman-{hit,plop}.{ogg,m4a}` are byte-identical to `cart/audio/snackman-{hit,plop}.*`. levels.html uses `a/`, and
   bid-game.js uses `audio/`. Pointing both at one folder would save ~62 KB.
9. **Two bid-game.js lines:** Snackman ships `5a813f9f` (same as forkashi `/plastic/play`), while forkashi `/pps3` has a newer `d1668184`. TODO: decide whether
   Snackman's prologue should pick it up.
10. **Snackman 2's published Replit build is older than its source.** It has no story chapters or roast scenes. Republish in Replit when ready (not done here).
11. `three.module.min.js` (r169, 687 KB) is vendored. Fine for offline play, but it's the biggest code file.

## External dependencies

- Google Fonts (`Press Start 2P`) on every page. Offline, the game falls back to a system font. To be fully offline, vendor the font.
- The hosted build also loads Vercel Analytics (`/_vercel/insights/script.js`). That tag was removed in this repo.

## Standalone behaviour (this repo)

- No name gate, accounts, telemetry, or click counter. `shared/hub/*` are offline shims.
- Saves go to `localStorage["hw_save_snackman"] = {at, state}`, the same format as the hub's local fallback, so a browser that played on the
  hub's local mode reads the same shape.
- Run check: every referenced local file (46 URLs: pages, scripts, css, images, 18 audio files, three.js) returns 200 under
  `python3 -m http.server`. Headless Chrome loaded title, prologue, levels (LV3 directly) and bonus3d with no JS errors.

## Kit hooks (JaguarUTZ kit, added 2026-10-07)

Kit: `<script src="https://jaguarutz-kit.vercel.app/kit.js" async>` (game id `snackman`). All Snackman glue is in
`game/cart/snack-kit.js` (`window.SnackKit`). Every kit call is guarded (`typeof JUTZ` check, try/catch, async load,
no awaits on page load). If kit.js is blocked or down, the hooks stay hidden and the game plays the same. No login, no player data.

- **Tip jar** (`JUTZ.tipJar`, button label `⚡ TIP SATS`):
  - title screen: `game/cart/title.html` → `#kittip` (in the `#kit` row under the stage select)
  - Master win card: `game/cart/levels.js` → `final()` calls `SnackKit.endBlock(...)`
  - 3D bonus: `game/cart/bonus3d.html` → `#kittip3d` (start screen) and `#kit3dtip` (factory panel after 10 sorted)
- **Paid unlock** (`JUTZ.unlock`): item `golden-snackman`, 21 sats, button `★ GOLDEN SNACKMAN · 21 SATS` on the title
  screen (`#kitskin`). Cosmetic only: gold body + gold hard hat + sparkle in `levels.js` `draw()`, gold materials in
  `bonus3d.js` (after the `HAT` materials), gold-tinted GIF on the title. Never gates a level. Token lives in
  `localStorage["jutz:unlock:snackman:golden-snackman"]` (kit format). After purchase, the same button toggles
  `GOLD SKIN: ON/OFF` (`localStorage["snackman_gold_off"]`). Anyone editing the JS can fake it. That's fine for a skin.
- **Signed badge** (`JUTZ.badge`, `show:false` + our own plain panel with optional name, OPEN / COPY / SHARE and the URL):
  - main game: Master win card (`levels.js` `final()`), achievement `Beat the Master Level (<score> pts)`
  - 3D bonus: `#kit3d` in the factory panel, shown after every 10th correct sort (`bonus3d.js` sort milestone),
    achievement `Snackman 3D: sorted <n> pieces`. Badges are verifiable at the kit's `badge.html` / `/api/verify`.
    Note that anyone can call `/api/badge`, so a badge proves that the team server signed it, not that the player earned it.
- Key handlers in `title.html`, `levels.js` (`onKey`) and `bonus3d.js` ignore keys typed into inputs / the kit dialog,
  so typing a badge name doesn't steer Snackman.
- Kit-owned copy (not editable from here): modal titles/texts like "Tip the trolls ⚡", "Summoning an invoice…",
  and the badge page text "Troll to Valhalla, forks up."
