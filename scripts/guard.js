// Snackman guard: run `node scripts/guard.js` before every deploy. Fails (exit 1) if any repo text file
// brings back a banned name, in any language, or if the served game grows a wall or a popup.
// Words are split so this file passes its own scan. Adapted from the Tuner guard (tuner/scripts/guard.js).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const j = (...p) => p.join('');
const banned = [
  new RegExp(j('hy', 'rule'), 'i'), new RegExp(j('zel', 'da'), 'i'), new RegExp(j('nin', 'tendo'), 'i'),
  new RegExp(j('pac', '[- ]?', 'man'), 'i'), new RegExp(j('ban', 'dai'), 'i'), new RegExp(j('nam', 'co'), 'i'),
  new RegExp(j('\\b', 'se', 'ga', '\\b'), 'i'), new RegExp(j('\\b', 'so', 'ny', '\\b'), 'i'), new RegExp(j('play', 'station'), 'i'),
  new RegExp(j('\\b', 'liq', 'uid', '\\b'), 'i'), new RegExp(j('root', 'stock'), 'i'), new RegExp(j('\\b', 'rs', 'k', '\\b'), 'i'),
  new RegExp(j('fork', 'ashi\\W{0,3}', 'be', 'ta'), 'i'), new RegExp(j('be', 'ta\\W{0,3}', 'fork', 'ashi'), 'i'),
  new RegExp(j('fork', 'ashi\\s+', 'univer', 'sity'), 'i'), new RegExp(j('univer', 's(?:ity|idad|ità) ', 'fork', 'ashi'), 'i'),
];
// walls / popups: only in what the game serves (game/, shared/emu, shared/hub). The vendored kit is checked
// for alert/prompt/confirm too; its tip-jar/unlock dialogs exist but the game never calls them.
const wall = [/\balert\s*\(/, /\bprompt\s*\(/, /\bconfirm\s*\(/, /type=["']?(email|password)/i, new RegExp(j('sign', '\\s?up'), 'i'), /window\.open\s*\(/];
const skipDir = new Set(['.git', 'node_modules', '.vercel']);
const textExt = /\.(html?|js|mjs|css|json|md|txt|svg|xml|webmanifest)$/i;
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (skipDir.has(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (textExt.test(e.name)) files.push(p); } })(root);
let bad = 0, served = 0;
for (const p of files) {
  const rel = path.relative(root, p); if (rel === path.join('scripts', 'guard.js')) continue;
  const text = fs.readFileSync(p, 'utf8');
  for (const re of banned) { const m = text.match(re); if (m) { console.error(`guard: ${rel} matches ${re} ("${m[0]}")`); bad++; } }
  const isServed = /^(game|shared[\\/](emu|hub))[\\/]/.test(rel) && !/three\.module\.min\.js$/.test(rel);
  if (isServed) { served++; for (const re of wall) { const m = text.match(re); if (m) { console.error(`guard: ${rel} has a wall/popup ${re} ("${m[0]}")`); bad++; } } }
}
if (bad) { console.error(`guard: BLOCKED (${bad} problem${bad === 1 ? '' : 's'})`); process.exit(1); }
console.log(`guard: ok (${files.length} text files scanned, ${served} served game files checked for walls/popups)`);
