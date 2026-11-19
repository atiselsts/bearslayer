# Lāčplēsis / Bearslayer

Client-only top-down browser game for a 6-year-old, set in Latvia. Lāčplēsis travels between small
places picked on a map of Latvia, beats monsters whose number is smaller than his, and beats each
place's boss to open the next ones. In-game text is Latvian, with an English translation (see
Language). `spec.md` is the full design and `README.md` covers how it plays and how to run it.

## Layout

- `index.html`: the page; `game.js`: all game code, a classic script with global state, divided by
  `// ---------- Section ----------` comments
- `tools/check-locations.js`: headless check of every location, bosses, burning and unlocking
- `tools/make_geo.py`: regenerates the Latvia map data in `game.js` from Natural Earth GeoJSON

## Running and checking

Open `index.html` directly; no server, build step or network is needed. After changing locations,
bosses, terrain or movement, run:

    node --check game.js
    node tools/check-locations.js

## How it fits together

- `LOCATIONS` (near the top) defines each place: its pin on the map (`ll`), region and novads,
  and its layout in fractions of the 2600 × 1800 world (start, forests, river with bridges, lakes,
  sea, landmark, village, houses, boss). `buildLocation()` turns that into the terrain grid with a
  fixed seed per location, so layouts are the same every game. Removing or reordering locations
  changes the later seeds, and so their layouts.
- Unlocking: opening a place's golden chest opens its `next` places. `regionBoss` marks each
  region's main boss, and the `final` place (Tērvetes pilskalns) opens only when all of those are
  beaten (`isUnlocked`).
- Terrain is a 25 px grid. `blocked` is 0 free, 1 water (swim or fly), 2 hard (sea, edge belt,
  buildings) and 3 forest (burn or fly). The edge belt (`T_EDGE`) looks like forest but never burns.
  `swamp` marks free cells that halve walking speed; `buildSwamps()` uses its own seed, so adding or
  tuning swamps doesn't change the rest of a layout. `buildIslands()` makes islands (land in water,
  not in `L.reach`, so nothing spawns there except their `gifts`) and `reefs` (sea turned into
  swimmable water).
- Scenery (`L.decor`: trees, flowers, rocks, reeds, puddles) is drawn through `drawDecorSprite()`,
  which draws each type, size and look variant once into a small canvas and then copies it on whole
  pixels; that was most of the CPU time. A new decor type needs its extent in `DECOR_BOX` (or it is
  drawn the slow way), and `DECOR_VARIES` if its look depends on `d.v`.
- The ground under the scenery (ground picture, rivers, lakes, islands, water names) is drawn once
  into 256-unit tiles by `drawGroundLayer()` and copied each frame; anything that moves or must sit
  on top of the rivers (waves, river flow, waterfall, bridges, fields) is drawn per frame in
  `drawWorld()`. Changing the ground of a place after it is built needs `clearGroundTiles()`.
- The map screen draws `ovCanvas`, built once from the `LV_LL`, `NEIGH_LL`, `RIVERS_LL`, `LAKES_LL`
  and `REGION_GRID` data, which `tools/make_geo.py` generates. River widths are set by hand.
- Language: every shown text goes through `tr()`, which looks the Latvian text up in the `EN`
  table when English is picked (a missing entry shows as it is, so proper names need none); `{n}`
  in a text is filled from its args. A new text needs its `EN` entry. The choice is kept under
  `localStorage` key `lacplesis-lang`, or set with `?lang=`; `setLang()` rebuilds `ovCanvas` and
  the ground tiles, which hold drawn text.
- Save: `localStorage` key `lacplesis-v4`: strength, current place, beaten bosses, opened chests, and
  each Jods's head numbers from the first visit (`jods`; older saves without it just start empty).
  Changing its shape needs handling in `loadSave()` or a new key.

## Design decisions that are easy to undo by accident

- No death, no game over, no timer. A stronger enemy only pushes him back. Debuffs on him are rare,
  short and harmless.
- Everything scales with his strength: enemy and boss numbers are set relative to it while out of
  sight and stay fixed while on screen, so picking up a weapon nearby really helps.
- Strength grows slowly and keeps fractions (`GAIN`, `DECAY`); the number shown only goes up a whole
  point at a time. The user asked for this pace, so don't speed it back up.
- Tap pathfinding only takes short detours, so the forest mazes still have to be explored.
- Trees are drawn taller than their cell, so a tap on a treetop counts as the trunk below.
- Text is short, written in Latvian (with its `EN` entry), and comes with an icon, because the
  player reads slowly.

## Coding practices

- No dependencies, image or audio files: all art is canvas drawing and all sound is WebAudio.
- Two-space indent, single quotes, semicolons. Comments explain why.
- Wrap `localStorage` access in try/catch.
- Touch must cover everything: moving, popups, the map and the ending.
- Keep `spec.md` and `README.md` in step with gameplay changes.

## Testing

Always launch headless browsers with `--mute-audio`, and confirm none are left running afterwards.
Chromium here is a snap: it can't read or write `/tmp`, so put test pages and screenshots under
`~/snap/chromium/common/`. Headless rendering is slow and sometimes hangs; give it a timeout and
retry. Run `tools/check-locations.js` rather than relying on screenshots for game logic.
