/* Snackman "PREVIOUSLY ON SNACKMAN..." recap copy. Team pattern: team-kit/recap-spec.md (Alice); same behaviour as Punk Link.
   Writers edit the lines here; game/cart/recap.js only fills them in.
   ALL COPY HERE IS PENDING JOSE'S OK.
   - Live lines (shown in game): plain facts from the saved run only: the level, the depot choice, and what's next.
     No digits in the lines; numbers only appear as stat chips that the game already shows (sats, snacks, depot record).
   - drafts: snarky versions in Snackman's voice. PENDING JOSE'S OK. NEVER shown in game. */
(function (root) {
  var SNACK_RECAP = {
    header: 'PREVIOUSLY ON SNACKMAN...',
    opener: 'Snackman was out on a plastic run.',
    levels: [
      { word: 'One', title: 'SORT + WASH' },
      { word: 'Two', title: 'WAH WAH' },
      { word: 'Three', title: 'PARTNER CHAIN' },
      { word: 'Master', title: 'THE SUPERMARKET DEAL' }
    ],
    clearedNone: 'No levels cleared yet.',
    clearedOne: 'You cleared Level One: SORT + WASH.',
    clearedTwo: 'You cleared Level One: SORT + WASH, and Level Two: WAH WAH.',
    clearedAll: 'You cleared all three levels and unlocked the Master Level.',
    depot: {
      cash: 'At the Plastic Depot you cashed in right away.',
      hoard: 'At the Plastic Depot you hodled your plastic, then cashed in.',
      over: 'At the Plastic Depot you hodled until the bin overflowed.'
    },
    next: 'Now: Level {word}, {title}.',
    nextMaster: 'Now: the Master Level, THE SUPERMARKET DEAL.',
    chips: { score: '{v} SATS', snacks: '🍽 {v} SNACKS', bag: '🛒{cash} 🛢{hoard} 💥{over}' },
    go: 'GO ▶', play: 'PLAY ▶', skip: 'SKIP >>', hint: 'TAP OR GO FOR THE NEXT LINE', count: '{n}/{N}',
    portraitAlt: 'Snackman',

    // PENDING JOSE'S OK. Snarky drafts in Snackman's voice. NOT shown in game.
    drafts: {
      status: "PENDING JOSE'S OK",
      opener: 'Previously on Snackman... I ate plastic. A lot of plastic. Keep up.',
      clearedNone: "I haven't cleared a single level. I was pacing myself.",
      clearedOne: 'I sorted the river mix. The bags and wrappers had nowhere to go. Rude.',
      clearedTwo: 'Then the plastic nobody wanted went WAH WAH, and I turned it into oil and energy. You are welcome.',
      clearedAll: 'Three levels down. The Master Level is open and it is staring at me.',
      depotCash: 'At the depot I cashed in on day zero. Patience is for people who are not hungry.',
      depotHoard: 'I HODLed my plastic for a better price, then sold. Diamond jaws.',
      depotOver: 'I HODLed so hard the bin overflowed and I paid to dump it. Lesson digested.',
      next: 'Now: {title}. Stay hungry.',
      nextMaster: 'Now: the Supermarket Deal. One more bite.'
    }
  };
  root.SNACK_RECAP = SNACK_RECAP;
  if (typeof module !== 'undefined' && module.exports) module.exports = SNACK_RECAP;
})(typeof window !== 'undefined' ? window : globalThis);
