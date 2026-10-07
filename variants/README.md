# variants/

Copies of Snackman code that are **not** what's deployed, kept verbatim for reference and merging. None of it is wired into `game/`.

- `players-snackman-fixes/`: `JaguarUTZ/howard-woods-games@players` (`fb2ed49`; `snackman-fixes` `0df9399` has the same Snackman blobs).
  Same layout as `game/` (`index.html`, `cart/*.html|js`). The binaries are identical to `game/cart/`, so only the text files are included.
  To try it locally, copy these over a scratch copy of `game/` and fix the `/hub/` paths the same way as in `game/`.
  Compare with: `diff <(tr ';' '\n' < game/cart/levels.js) <(tr ';' '\n' < variants/players-snackman-fixes/cart/levels.js)`
- `forkashi-prototypes/`: the predecessors in `JaguarUTZ/forkashi-progress@main`:
  - `snackman3d-prototype/` = `h-4a0ac74178` ("SNACKMAN 3D · Put a bid on plastic (prototype)"), the origin of `bonus3d`
  - `roadmap-v2-engine/` = `h-7bf7bd38e8/game.js`, the origin of `levels.js`
  - `video2-routes/` = `h-1077c46b7c/index.html` ("Video 2 redo (preview): Snackman routes"). The MP4s (18.3 MB + 15.4 MB) were not copied.
  These pages expect their original forkashi-progress siblings, so they won't all run from here.
