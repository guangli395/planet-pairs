This stage adapts https://github.com/Lone3m-tech/prism-holo-pack (MIT, Copyright 2026 SimpleMkt).

`engine.js`, `sound.js`, `upstream.css`, and the stage markup were imported on 2026-11-24. The original 240 Hz spring solver, tearing geometry, foil curl, ribbons, particles, ejection, orbit and shader calculations are retained. `LICENSE.txt` includes the upstream license.

Integration changes:

- Card definitions come from the parent game's `BLESSINGS`; the pack always contains all six once.
- The random rarity economy, binder persistence, external images and brand assets are removed or disabled.
- The five-card fan becomes a three-column, two-row layout with six concealed faces in a saved shuffled order. One free click reveals and locks a card. Only a completed parent-owned rewarded ad reveals the rest sequentially and enables free selection.
- Game state and sound preference belong to the parent. Messages are accepted only from the same-origin parent window; the parent also verifies the sending frame and blessing ID.
- Removing the stage document disposes its loop, timers and audio context.
- `integration.css` adjusts sizing, typography and the procedural stage background. The foil, hologram and animation effects remain in the upstream files.
- The parent mounts the live `jetAnchor` SVG in a full-page, non-interactive effect layer. The engine keeps updating the same ribbon nodes; only their clipping boundary moves outside the iframe. Parent-supplied `ribbonOverflow` bounds extend the existing 32 streams to the page's top and sides. The original pack/card viewport, projection and timing stay in place. The parent observes layout changes and removes the effect layer and observer when leaving the pack.
