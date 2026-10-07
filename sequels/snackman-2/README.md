# Snackman 2: Bid, HODL, Digest (separate sequel)

- Replit app: https://replit.com/@josetoriello/Snackman-2-Bid-HODL-Digest (last updated 2026-10-05 07:31 CST)
- Published: https://snackman-2-bid-hodl-digest.replit.app (deployment `c4f0c984-…`)
- Stack: pnpm monorepo, React + Vite + TypeScript front end (`artifacts/snackman-2`), Express 5 + Postgres/Drizzle `api-server`.
  Requires the `DATABASE_URL` secret in Replit. It was not read or copied.
- Concept (from the app's `replit.md`): a short, narrated, one-tap business-model film in five chapters
  (concreto plástico → sorting/recyclables → proposed pyrolysis energy loop → reinvest margin → Caribbean vision), with a snarky British
  narrator, roast scenes between chapters, and 16-bit Snackman. All economics are illustrative. The notes say "Leave Snackman 1 intact".

## What's here

`published-build/` is a byte-for-byte snapshot of the currently **published** bundle (index.html, `assets/index-*.js|css`, favicon, robots).
It uses absolute `/assets/` paths, so serve that folder as the web root:

    cd sequels/snackman-2/published-build && python3 -m http.server 8001

⚠ **The published build is older than the source.** It doesn't include the story chapters, roast scenes or narration audio that exist in the
Replit source (`src/story/*`, `attached_assets/generated_audio/snackman-{story-0..5,roast-0..10}.mp3`).

## Source files in Replit (not copied)

Copy them with Replit's "Download as zip", or connect the Repl to Git.

    artifacts/snackman-2/  index.html package.json vite.config.ts components.json tsconfig.json
      src/App.tsx main.tsx index.css
      src/game/      audio.ts context.tsx economy.ts maze.ts
      src/story/     chapters.ts experience.tsx/.css pixel-snackman.tsx roast-scene.tsx/.css story-stage.tsx/.css use-story-audio.ts
      src/pages/     home how-to-play market not-found scores stash (.tsx)
      src/components/ arcade board-preview error-boundary mascot plastic-lessons play-modal shell (.tsx), ui/ (shadcn)
      src/hooks/, src/lib/
      public/audio/  crokie-take2-loop.{m4a,ogg} (name matches Snackman 1's `act2-crokie-take2-loop`, bytes not compared), README.md
    artifacts/api-server/, lib/ (api-spec, db, …), scripts/, attached_assets/generated_audio/ (17 MP3s), replit.md
