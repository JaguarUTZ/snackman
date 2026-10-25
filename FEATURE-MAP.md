# Snackman · Feature Map

Live: https://snackman.vercel.app/game/ (no gate, no signup). Shelf: https://snackman.vercel.app/
Repo: JaguarUTZ/snackman. Read this before touching the game; update it in the same commit as any feature change.
Not this repo: snackman.forkashi.com (EcoAlquimia business page, forkashi-progress).

| Feature | Files | Phone test (390 wide) |
|---|---|---|
| Console frame: START, pause, fullscreen | `game/index.html`, `shared/emu/shell.js`, `shell.css`, `cart.js` | Open /game/. Tap START, then ❚❚ and ⛶. Game pauses and goes fullscreen. |
| Title screen + continue | `game/cart/title.html` | Tap ▶ PRESS START. With a save, it reads ▶ CONTINUE LV2/3 or MASTER LEVEL. |
| Stage select (Prologue, LV1–3, Bonus 3D; Master locked until LV3) | `game/cart/title.html` | Under PRESS START, tap any stage. 🔒 MASTER LEVEL stays dim until unlocked. |
| ◂ SHELF back to game list | `game/index.html`, `index.html` | Tap ◂ SHELF top left. Lands on the shelf page. |
| Loop links strip (◀ Snackman → snackman.forkashi.com, Blue Fire ▸ → bluefire.love; new tab, hidden in fullscreen) | `game/index.html` | Open /game/ (and ?cart=bonus3d). Strip sits at the bottom, away from START. Tap ◀ Snackman: the pitch opens in a new tab, the game keeps running. |
| Prologue: put a bid on plastic | `game/cart/prologue.html`, `game/cart/bid-game.js`, `game/cart/audio/*` | Tap ▶ PLAY SNACKMAN, then Ⓐ PUT A BID. LEVEL 1 ▶ shows after the drop (auto at 26 s). |
| Levels 1–3 maze chomper (30 s each) | `game/cart/levels.html`, `game/cart/levels.js` | Swipe to eat. Ghost hit costs 3 s. LV1 Sort+Wash, LV2 Wah Wah pyrolysis, LV3 Partner Chain. |
| Autoplay | `game/cart/levels.js` (`setAuto`, `watchStart`) | Tap ▶ WATCH, or wait 8 s idle. Button turns ● AUTO. |
| Plastic Depot between levels | `game/cart/levels.js` (`depot`) | Clear a level, tap NEXT. Pick 🛒💵 CASH IN or 🛢 HOARD +1 DAY; score changes. |
| Secret Master Level: The Supermarket Deal | `game/cart/levels.js` (`unlock`, `final`) | Clear LV3 + depot. 🔓 card, then ▶ PLAY THE MASTER LEVEL, end card "YOU WON". |
| 3D bonus | `game/cart/bonus3d.html`, `bonus3d.js`, `three.module.min.js` | Open /game/?cart=bonus3d. Scene renders and moves on touch. |
| Local save (no account) | `shared/hub/save.js`, `level-gate.js` (always open) | Play LV1, reload. Title offers CONTINUE. Key `hw_save_snackman`. |
| No telemetry / no API | `shared/hub/observe.js`, `visit.js`, `clicks.js` (no-ops) | Console clean; no /api calls in the network tab. |
| Language button EN / ES / IT (kit pill, choice remembered) | `game/shared/vendor/jaguarutz-kit.js` (jaguarutz-kit 1.1.2, vendored byte copy of team-kit public/kit.js @ 92457d5), `game/shared/i18n/strings.js` (all text, `// JOKE: native check` marks), `game/index.html`, `shared/emu/shell.css`, `cart.js`, every `game/cart/*.html`, `bid-game.js`, `levels.js`, `bonus3d.js` | Open /game/. Tap the pill top right, pick ES. Title reads CAGA BITCOIN; IT reads MANGIA PLASTICA. Reload: the pick stays. Pill clears START, ❚❚ and ⛶. |
| Works offline after one visit | `game/sw.js` (registered in `game/index.html`) | Load /game/ once, go to airplane mode, reload. The game still plays. |

Before every deploy: `node scripts/guard.js` (banned names in any language, no walls or popups).

Reference only (not served by the game): `shared/hub-live/` (old gated hub), `variants/`, `sequels/snackman-2/`.
Saved Oct 7–8 additions (sound button, recap, NO CACOPHONY): tag `snackman-now-1`.
