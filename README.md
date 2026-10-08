# Snackman

**Play online:** https://snackman.vercel.app/game/ · 3D bonus: https://snackman.vercel.app/game/?cart=bonus3d · shelf: https://snackman.vercel.app/

**Snackman** is a 16-bit arcade pitch game from the *Howard Woods Interactive Pitching System* (Jaguar Utz).
Snackman is the only creature that can **eat plastic** (and, in cartoon terms, produce Bitcoin). The game walks
players through the plastic-to-value business model:

- **Title → Prologue** ("put a bid on plastic": a bid/auction mini-game with the act1/act2 soundtrack)
- **Levels 1–3**: a 30-second maze-chomper. LV1 *Sort + Wash* (clean rigid plastic → concrete plastic), LV2 *Wah Wah* (pyrolysis: trash → oil + energy),
  LV3 *Partner Chain* (plastic in, shopping credit out), with a *Plastic Depot* sell/hoard screen between levels
- **Master level**: *The Supermarket Deal* (secret bonus unlocked after LV3)
- **Snackman 3D bonus** (`?cart=bonus3d`, three.js)

It runs inside the hub's "emulator" shell: `game/index.html` is the console frame (START / PAUSE / FULLSCREEN)
and each screen is a *cartridge* page in `game/cart/` loaded in an iframe. They talk through `postMessage` (`shared/emu/`).

## Run locally

```bash
cd snackman-repo
python3 -m http.server 8000
# open http://localhost:8000/            (local shelf)
#      http://localhost:8000/game/       (Snackman)
#      http://localhost:8000/game/?cart=bonus3d   (3D bonus)
```

Serve the **repo root** (the game references `../shared/`). All paths are relative, so it also works under a subpath
such as GitHub Pages. You don't need a name gate, account, or API. Progress is saved in this browser's localStorage under the same key
the hosted hub uses (`hw_save_snackman`). Only external dependency: Google Fonts (Press Start 2P). Without network access, the game
falls back to a system font.

## Where it is deployed

| What | URL | Source |
|---|---|---|
| **Live (production)** | https://play.jaguarutz.com/games/snackman/ (also howard-woods-games.vercel.app) | Vercel project `howard-woods-games` ← GitHub `JaguarUTZ/howard-woods-games`, branch **`live`** (commit `363f51e`, 2026-10-05 07:21 CST) |
| Predecessor prototypes | https://forkashi-progress.vercel.app (`/plastic`, `/pps3`, `/pitch`) | GitHub `JaguarUTZ/forkashi-progress@main` |
| Snackman 2 (separate sequel) | https://snackman-2-bid-hodl-digest.replit.app | Replit app "Snackman 2 — Bid, HODL, Digest" |

On the live site, every path is behind a name/cookie gate (`middleware.js` + `hub/gate.js`), and LV3/Master check `/api/access`.
This repo removes both (see "Standalone changes").

## Repo layout / source map

| Path | Contents | Came from |
|---|---|---|
| `index.html` | Local shelf (new) | — |
| `game/` | Playable game: emu shell `index.html` + `cart/` (title, prologue, levels, bonus3d, JS, three.js, audio, gif) | `howard-woods-games@live:games/snackman/` |
| `shared/emu/` | Emulator shell (`shell.js`, `shell.css`, `cart.js`), unmodified | `howard-woods-games@live:games/emu/` (identical on every branch) |
| `shared/hub/` | **Standalone shims** for `/hub/*.js`: localStorage save, always-open level gate, no-op telemetry | new |
| `shared/hub-live/` | The real hub scripts, kept for reference (they call `/api/*` and are not used locally) | `howard-woods-games@live:hub/` |
| `assets/` | Snackman art, 3D art, covers (png/webp) | `howard-woods-games@live:assets/` |
| `assets/predecessor/` | Earlier Snackman sprites, 3D prototype thumb, "Video 2" posters | `forkashi-progress@main` |
| `variants/players-snackman-fixes/` | **Unmerged** newer gameplay branch (mid-level resume, 3-hit fail, watch mode earns 0) | `howard-woods-games@players` (`fb2ed49`) |
| `variants/forkashi-prototypes/` | Origins: 3D bid prototype, Roadmap-v2 level engine, Video 2 page | `forkashi-progress@main` |
| `sequels/snackman-2/` | Published build of Snackman 2 plus a source map (the TypeScript source stays in Replit) | Replit |
| `docs/inventory.md` | Every location, with links, dates, hashes and conflicts | — |
| `docs/notes.md` | Bugs, TODOs, and caveats | — |

## Standalone changes (vs. live)

Git history keeps them separate. Commit 1 is the verbatim import, and the second commit has the patches:

1. In `game/index.html` and `game/cart/*.html`: absolute `/hub/*` → relative `../shared/hub/*` (cart pages: `../../shared/hub/*`),
   `../emu/` → `../shared/emu/`, the shelf link `../../` → `../`, and the Vercel Analytics `<script src="/_vercel/insights/script.js">` tag removed.
2. `shared/hub/*` replaces the server-backed hub with offline shims that use the same globals (`HWSave`, `HWLevelGate`, `HWClicks`, `HW`).

The game JS (`levels.js`, `bonus3d.js`, `bid-game.js`, `three.module.min.js`) and all media are byte-identical to `live`.
