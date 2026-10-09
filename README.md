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

## Sound button

The game screen (`/game/`) has one 3-way sound button in the top bar. Each tap moves to the next mode: **👾 8-BIT** (default), then **🎶 FORKASHI**, then **🔇 OFF**, then back to 8-BIT.

- **👾 8-BIT** plays "Chomp Chomp HODL", an original Snackman chiptune. It is in F major at 150 BPM and loops every ~51 s. The music is synthesized live in WebAudio and needs no audio files. It has bid / HODL / digest sections, an oom-pah bass and chomp blips. It is not based on any Nintendo or Namco tune.
- **🎶 FORKASHI** streams the 10 Punk Link Radio mixes, shuffled, from `https://jaguarutz-tuner.vercel.app/radio/`. Suspected covers are never included.
- **🔇 OFF** turns off the music and the game's sound effects.

The choice is saved on the device (`localStorage` key `snackman-sound-mode`). Browsers only allow audio after a tap, so sound starts on the first tap or key press. The music gets quieter while a level card or a prologue voice line is on screen.

How it works:
- The music lives in the shell (`shared/sound/snack-sound.js`), so it keeps playing as you move between carts.
- Each cart loads `shared/sound/cart-sound.js`. Inside the shell, that script hides the cart's old sound toggle and mutes the cart's own background music. Sound effects keep working unless the mode is OFF.
- A cart opened on its own, outside the shell, behaves as before.

Tests: `node --test tests/`

## Saved run + "PREVIOUSLY ON SNACKMAN..." recap

This follows the team pattern in `team-kit/recap-spec.md` and works the same way as Punk Link.

**Saved run**
- Saved in this browser's localStorage only (`hw_save_snackman`). Nothing personal is saved and nothing is sent anywhere.
- The save holds:
  - the furthest level checkpoint and its score
  - the high score
  - the master unlock
  - the Plastic Depot record
  - the snacks eaten per cleared level
- The save is written at every level start, every level clear and every depot choice.
- Beating the Master Level clears the run but keeps the high score and the master unlock.

**Title screen**
- When a save exists, the title shows **▶ CONTINUE LVn** (the default for Enter or START) and **↺ START OVER**.
- START OVER clears the run but keeps the high score and the master unlock.

**When the recap shows**
- On CONTINUE.
- When you come back after **10+ minutes** away. Mid-level only: never over the takeaway card, the unlock or win screens, or a kit dialog.
- The away stamp is `snackman.away` in localStorage. It is written when the tab hides, read and deleted when the tab shows, and cleared on page load.

**How the recap works**
- One line at a time. Tap, **GO ▶**, Enter or → moves to the next line; **SKIP >>** (or Esc / ▼) ends it at any time.
- It is an overlay, so closing it always drops you back exactly where you were.
- The game is frozen and the music is ducked while it is up.
- Live lines are plain facts from the save: where you are, the depot choice, and what's next. Stats (sats, snacks, depot record) appear as chips on the last card.
- Copy lives in `game/cart/recap-strings.js` (PENDING JOSE'S OK). The snarky drafts there are never shown in game. The logic lives in `game/cart/recap.js`.

**Tests:** `node --test tests/`

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

## No cacophony (team Rule #1)
Two music sources never play at once. One audio manager (`music-switch.js`) owns all music: on every change
(sound button, FORKASHI track change, 8-BIT theme change, game start/continue, hidden tab) the old source fades
fully out (0.6 s) and stops, ~80 ms of silence, then the new one fades in (0.6 s). Rapid taps never stack: the last
choice wins. Ducking (cards/recap) is a level ramp on the one active source. Notable SFX dip the music fully out,
play, then the music comes back. Tuner: on `{type:'jaguarutz:audio', action:'fadeout', ms}` (any origin, exact
shape only) all game audio (music + SFX) fades to 0 within `ms`, then the AudioContext is suspended; pagehide is
the fallback. Tests: `tests/music-switch.test.mjs` (fake clock) and the Tuner test.
