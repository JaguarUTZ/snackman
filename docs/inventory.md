# Snackman inventory

Collected 2026-10-07 using **read-only** access to GitHub, Vercel and Replit. Nothing remote was changed.
Times are America/Guatemala (CST, UTC-6). Blob hashes are git blob SHA-1 prefixes, and each one was checked with `git hash-object` against the GitHub tree.

## 1. Locations

| Service | Name | URL | Last updated | Snackman pieces | Status |
|---|---|---|---|---|---|
| GitHub | **JaguarUTZ/howard-woods-games**, branch **`live`** | https://github.com/JaguarUTZ/howard-woods-games/tree/live | 2026-10-05 07:21 (`363f51e`) | `games/snackman/` (shell + all carts, audio, three.js), `games/emu/`, `hub/*.js`, `assets/snackman*.png`, `assets/covers/snackman-cover.*` | **Newest deployed copy. Canonical for `game/`.** |
| GitHub | howard-woods-games, `players` / `snackman-fixes` | …/tree/players | ~2026-10-01 (`fb2ed49`, `0df9399`) | Newer gameplay in levels.js/levels.html/bonus3d.js/title/prologue (mid-level resume, 3-hit fail, watch=0 sats, `snapState` fix) | **Not merged into live.** Kept in `variants/players-snackman-fixes/` |
| GitHub | howard-woods-games, `snackman-ux` | …/tree/snackman-ux | 2026-09-30 06:43 (`63dcfce`) | Direct ancestor of live's Snackman (live = ux + Oct 5 tester-gate commits `9653a26`, `363f51e`) | Superseded by live |
| GitHub | howard-woods-games, `snackman-choice`, `snackman-players` | …/tree/snackman-choice | 2026-09-29/30 (`dd3da75`, `02ed75a`) | Intermediate levels.js/levels.html/title versions | Superseded |
| GitHub | howard-woods-games, `main`, `demo-hub` | …/tree/main | 2026-10-05 (`0a7dc83`) | Older pre-UX Snackman (levels.html 8 203 B, levels.js 24 389 B) | **Stale vs live** |
| Vercel | **howard-woods-games** (team jt-s11) | https://play.jaguarutz.com · https://howard-woods-games.vercel.app | project updated 2026-10-05 07:52; prod deploy `dpl_GA3SBTherc386oGTRCktMPdMsSz6` | Serves the `live` branch (Git integration, production branch = `live`) | Live, gated by name/cookie middleware |
| GitHub | **JaguarUTZ/forkashi-progress** (main) | https://github.com/JaguarUTZ/forkashi-progress | 2026-09-30 12:03 (last push) | Predecessors: `img_snackman*.png/.gif`, `h-4a0ac74178` (SNACKMAN 3D bid prototype → bonus3d), `h-7bf7bd38e8` (Roadmap v2 engine → levels.js), `h-1077c46b7c` (Video 2 "Snackman routes" + 2 MP4s), `h-ca99557066` `/plastic/play` (bid-game.js identical to Snackman's), `h-680e325f4c` `/pps3` (newer bid-game.js) | Historical. Copied to `assets/predecessor/` and `variants/forkashi-prototypes/` |
| Vercel | forkashi-progress | https://forkashi-progress.vercel.app | project updated 2026-09-30 10:50 | Deploys the repo above; also hosts `/api/pps-bid-total` (→ `/api/pps-bid`) used by bid-game.js | Live |
| Replit | **Snackman 2 — Bid, HODL, Digest** | https://replit.com/@josetoriello/Snackman-2-Bid-HODL-Digest · published https://snackman-2-bid-hodl-digest.replit.app | 2026-10-05 07:31 | Separate sequel (React/Vite/TS pnpm monorepo + Express/Postgres api-server): narrated 5-chapter investor film, 16-bit Snackman, roast scenes, 17 generated narration MP3s | **The published build is older than the source** (it has no story/roast chapters). Build snapshot is in `sequels/snackman-2/` |
| Replit | Howard Woods — Investor & Educational Modes | https://replit.com/@josetoriello/Howard-Woods-Investor-and-Educational-Modes | 2026-10-05 17:13 | No Snackman. Has a copy of the hub's `games/emu/cart.js` + Ahau Kakau only | Not used |
| Replit | Interactive Pitch System | (replId c06ababc-…) | 2026-10-06 15:35 | No Snackman found (jaguarutz/pitch-studio artifacts: brand/contact art) | Not used |
| Replit | BlueFire, FedUp MPC Companion, From Cloud to Cup, DJ ForKashi, ACTU 3D | — | — | Not related by title, and a Replit title search for "snackman" returned only Snackman 2 | Not inspected in depth |
| Vercel | 15 other projects (bluefire-*, falomi-prototype, around-the-world-11520-blocks, awg-*, o2a-*, …) | — | — | No Snackman (GitHub code search `snackman org:JaguarUTZ` hits only the two repos above) | — |

**Live deploy source:** Vercel project `howard-woods-games` ← `JaguarUTZ/howard-woods-games` branch **`live`**, HEAD `363f51e` (2026-10-05 07:21).
`main` is not the production branch.

## 2. File versions and conflicts

### Snackman code (`games/snackman/`) by branch

| File | live `363f51e` (**chosen**) | players / snackman-fixes | snackman-ux | snackman-choice | main |
|---|---|---|---|---|---|
| index.html | de090a0e · 1 542 | c82d7bb2 · 1 466 | — | c82d7bb2 | feeb97a8 |
| cart/title.html | f39bf94d · 3 528 | b9a5c449 · 3 627 | 697587a2 | 223aba9f | 97568525 |
| cart/prologue.html | 670cf0f4 · 3 966 | dca9b818 · 3 927 | — | dca9b818 | 8967075e |
| cart/levels.html | cd4b55fc · 11 982 | c829abc5 · 14 291 | ce1f7941 · 11 901 | e070cfdb · 10 438 | 44e8a297 · 8 203 |
| cart/levels.js | 16058e2c · 25 010 | b7d5ce5e · 28 207 | ffea4ebb · 24 798 | eb364128 · 27 452 | 08bd614f · 24 389 |
| cart/bonus3d.html | 9ec3bcd6 · 5 984 | 141654c4 · 5 945 | — | 141654c4 | 84025db8 |
| cart/bonus3d.js | 890821cc · 34 611 | 2cec28a6 · 38 144 | — | — | 890821cc |
| cart/bid-game.js | 5a813f9f · 69 625 | same | same | same | same |
| three.module.min.js, cover7.webp, a/*, audio/* | identical on all branches | | | | |
| games/emu/* | identical on all branches | | | | |

**Conflict decision:** `game/` = **live**, because it is what is deployed and it has the newest commit. The `players` line is a *divergent* branch,
not an ancestor. It has gameplay features live lacks (mid-level resume via `snapState()`, 3 hazard hits = fail, autoplay/WATCH earns 0 sats,
save every 4 items) and lacks live's tester level gate and observe/visit telemetry. It is preserved verbatim in
`variants/players-snackman-fixes/` for a manual merge. Live does **not** contain the `snapState` fix, but it doesn't need to,
because the `snap()` clash only exists in the players feature.

### bid-game.js across repos
| Copy | Blob | Size |
|---|---|---|
| howard-woods-games `games/snackman/cart/bid-game.js` (all branches) | 5a813f9f | 69 625 |
| forkashi-progress `h-ca99557066` (`/plastic/play`, frozen) | 5a813f9f | identical |
| forkashi-progress `h-680e325f4c` (`/pps3`) and `h-d4d9c688ca` | d1668184 | 70 227 (newer, not in Snackman) |
| forkashi-progress `h-7bc065d100` (`/pitch`) | aa5416bd | — |

### Art
| File | Blob | Size | Source |
|---|---|---|---|
| assets/snackman-art.png | 7a1b0622 | 14 121 | live |
| assets/snackman3d-art.png | b82b5d32 | 112 367 | live |
| assets/covers/snackman-cover.png / .webp | 968736b7 / a0c20a47 | 1 234 291 / 237 900 | live |
| game/cart/a/snackman.gif | 981854cf | 21 677 | live, byte-identical to forkashi `img_snackman.gif` |
| assets/predecessor/snackman-hd.png | 149752e9 | 107 802 | forkashi `img_snackman-hd.png` |
| assets/predecessor/snackman.png | 24072fb7 | 2 790 | forkashi `img_snackman.png` |

## 3. Not copied (and why)

| Item | Where | Reason |
|---|---|---|
| `video2-snackman-16x9.mp4` (18.3 MB), `video2-snackman-9x16.mp4` (15.4 MB) | forkashi-progress `h-1077c46b7c/` | Too large for git. Posters are in `assets/predecessor/`, and the page is in `variants/forkashi-prototypes/video2-routes/` |
| `api/*`, `middleware.js`, `vercel.json`, `admin.html`, root `index.html` (gate/shelf), `tests/` | howard-woods-games@live | Server/auth code that isn't needed to play. No secrets were found in the parts reviewed. Env vars live in Vercel |
| Snackman 2 TypeScript source, api-server, `lib/` (db/api-spec), 17 narration MP3s | Replit Snackman 2 | The Replit connector reads one text file at a time and can't fetch binaries. See `sequels/snackman-2/README.md` |
| Snackman 2 `DATABASE_URL` | Replit Secrets | Secret. Not read, not copied |
