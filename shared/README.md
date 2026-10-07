# shared/

- `emu/`: the Howard Woods "emulator" console shell (verbatim from `howard-woods-games@live:games/emu/`, the same on every branch).
  `shell.js` loads `cart/<name>.html` into the iframe (`?cart=<name>`, `[a-z0-9-]+`) and relays START/PAUSE/FULLSCREEN over postMessage.
  `cart.js` is the cartridge-side half.
- `hub/`: **offline shims** with the same file names and globals as the hosted `/hub/*.js`. `save.js` uses localStorage only
  (`HWSave.load/save/flush`), `level-gate.js` is always allowed (`HWLevelGate.enter/blocked`), and the others are no-ops. The game loads these.
- `hub-live/`: the real hub scripts from production, kept for reference only. They call `/api/*` on play.jaguarutz.com and include
  `gate.js`, the name gate.
